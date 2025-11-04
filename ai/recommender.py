# ai/recommender.py
import streamlit as st
import google.generativeai as genai
import os
from typing import List, Dict, Set
import json
from dotenv import load_dotenv
import requests 
from bs4 import BeautifulSoup 
from ai.prompts import (
    get_segment_recommendation_prompt, 
    get_segment_filtering_prompt,
    get_mapping_and_understanding_prompt # [★수정] 0단계 프롬프트 임포트
)
import pandas as pd
import time # 429 오류(재시도/지연) 방지를 위해 time 임포트
import re # [★수정] 키워드 추출을 위해 re 임포트

load_dotenv()

class AISegmentRecommender:
    def __init__(self, data_manager):
        self.data_manager = data_manager
        self.segments_data = data_manager.load_segments()
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.model = None
        self.gemini_available = False
        self._initialize_gemini()
    
    def _initialize_gemini(self):
        if not self.api_key:
            st.error("❌ Gemini API 키가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 설정해주세요.")
            return
        try:
            genai.configure(api_key=self.api_key)
            try:
                # [★수정] 404 오류 해결: 'models/' 접두사 제거 (사장님 지시)
                # 1순위: '가장 빠른 2.0 flash'
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            except:
                # [★수정] 1순위 실패 시 2순위: 'pro'
                self.model = genai.GenerativeModel('gemini-2.0-pro')
            self.gemini_available = True
            st.success(f"✅ AI 모델 로드 성공: {self.model.model_name}")
        except Exception as e:
            st.error(f"❌ Gemini API 설정 오류: {str(e)}")
            st.error("ai/recommender.py 32~37 라인의 모델 이름을 'gemini-2.0-flash' / 'gemini-2.0-pro'로 확인하세요.")
            self.gemini_available = False

    def _generate_with_retry(self, prompt: str, max_retries: int = 3) -> str:
        """
        Gemini API 호출 시 429 오류(할당량)가 발생하면
        자동으로 재시도하는 로직 (Exponential Backoff)
        """
        retries = 0
        while retries < max_retries:
            try:
                response = self.model.generate_content(prompt)
                if not response or not response.text:
                    raise ValueError("Gemini API에서 빈 응답을 받았습니다.")
                return response.text # 성공 시 응답 텍스트 반환
            
            except Exception as e:
                if "429 Resource exhausted" in str(e) and retries < max_retries - 1:
                    retries += 1
                    wait_time = 2 ** retries 
                    st.warning(f"⚠️ API 할당량(429) 초과. {wait_time}초 후 재시도... ({retries}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    raise e 
        
        raise Exception("API 할당량 초과. 모든 재시도 실패.")

    # [★수정] '시맨틱 하이브리드' 로직으로 전면 수정
    def recommend_segments(self, product_name: str, website_url: str, num_recommendations: int = 3) -> List[Dict]:
        
        if not product_name.strip() and not website_url.strip():
            st.error("❌ '제품명' 또는 '제품 URL*'을 입력해주세요.")
            return []
            
        if not self.gemini_available or not self.model:
            st.error("❌ Gemini AI를 사용할 수 없습니다.")
            return []
            
        # --- 0-1. URL 스크래핑 ---
        scraped_text = ""
        if website_url:
            with st.spinner(f"🌐 {website_url} 웹페이지 분석 중..."):
                scraped_text = self._fetch_url_content(website_url)
                if not scraped_text:
                    st.warning("⚠️ 웹사이트 내용을 자동으로 읽어오는 데 실패했습니다. 제품명/URL로만 분석합니다.")

        try:
            # 1. 모든 세그먼트 정보 및 DB 키워드 로드
            all_segments_info = self._get_available_segments_info()
            if not all_segments_info:
                st.error("❌ 세그먼트 데이터를 로드하지 못했습니다. (data/segments.json)")
                return []
            
            db_keywords_set = self._extract_db_keywords(all_segments_info)
            db_keywords_list_str = ", ".join(sorted(list(db_keywords_set)))

            
            # --- [★수정] 0-2. AI 제품 이해 + 키워드 매핑 (0단계) ---
            product_understanding = ""
            mapped_keywords = []
            with st.spinner("🤖 AI 분석 중 (0/2): 제품 분석 및 DB 키워드 매핑 중..."):
                try:
                    mapping_json = self._get_mapping_and_understanding(
                        product_name, website_url, scraped_text, db_keywords_list_str
                    )
                    product_understanding = mapping_json.get("product_understanding", "")
                    mapped_keywords = mapping_json.get("mapped_keywords", [])
                except Exception as e:
                    st.warning(f"⚠️ AI 0단계(매핑) 실패: {e}")
            
            if not product_understanding:
                product_understanding = f"제품명: {product_name} (AI 자동 분석 실패)"
                st.warning("AI가 제품을 자동으로 이해하지 못했습니다. 제품명으로 분석을 시도합니다.")

            st.info(f"**💡 AI가 이해한 제품:** {product_understanding}")
            if mapped_keywords:
                 st.info(f"**🔑 AI가 매핑한 DB 키워드:** {', '.join(mapped_keywords)}")

            # --- [★수정] Python: 'A급 후보' 선별 ---
            a_class_segments, remaining_segments = self._get_a_class_segments(
                mapped_keywords, all_segments_info
            )
            
            if a_class_segments:
                st.success(f"✅ 'A급 후보' {len(a_class_segments)}개를 우선 확보했습니다.")

            # --- 1단계: 필터링 (B급 후보 선별) ---
            num_to_filter = max(0, 40 - len(a_class_segments)) # 40개를 채우기 위한 B급 후보 수
            b_class_candidates = []
            
            if remaining_segments and num_to_filter > 0:
                with st.spinner(f"🤖 AI 분석 중 (1/2): 나머지 {len(remaining_segments)}개 중 B급 후보 선별 중..."):
                    candidate_names = self._filter_with_gemini(
                        product_understanding, 
                        remaining_segments, # [★수정] A급을 제외한 리스트 전달
                        num_to_filter=num_to_filter
                    )
                    b_class_candidates = self._get_segments_by_names(candidate_names, remaining_segments)
            
            # --- 2단계: 재정렬 (A급 + B급) ---
            
            # [★수정] A급 후보(사장님 정답) + B급 후보(AI 추천) = 최종 후보군
            final_candidate_list = a_class_segments + b_class_candidates
            
            if not final_candidate_list:
                st.warning("⚠️ AI가 추천 후보를 생성하지 못했습니다. 기본 추천을 제공합니다.")
                final_candidate_list = all_segments_info[:20] # 비상시 전체에서 20개

            with st.spinner(f"🤖 AI 분석 중 (2/2): A/B급 후보 {len(final_candidate_list)}개 정밀 분석 및 순위 결정 중..."):
                ai_response = self._recommend_with_gemini(
                    product_understanding, 
                    final_candidate_list, # [★수정] A+B 리스트 전달
                    num_to_recommend=num_recommendations
                )

            if not ai_response:
                segments_from_ai = []
            else:
                segments_from_ai = ai_response.get("recommended_segments", [])

            if not segments_from_ai:
                 st.warning("⚠️ AI가 2단계 추천 세그먼트를 생성하지 못했습니다. 기본 추천을 제공합니다.")

            # --- AI 응답(이름, 이유, 점수)과 원본 세그먼트 정보(설명, 경로 등)를 병합 ---
            segment_names_from_ai = [s.get("name") for s in segments_from_ai if s.get("name")]
            enriched_info_map = {
                s.get("name"): {
                    "reason": s.get("reason", "추천 이유를 생성하지 못했습니다."),
                    "confidence_score": s.get("confidence_score", 50),
                    "key_factors": s.get("key_factors", [])
                }
                for s in segments_from_ai if s.get("name")
            }
            
            all_recommendations = []
            for name in segment_names_from_ai:
                seg_data = next((s for s in final_candidate_list if s.get('name') == name), None)
                if seg_data:
                    seg_copy = seg_data.copy()
                    if name in enriched_info_map:
                        seg_copy['reason'] = enriched_info_map[name]['reason']
                        seg_copy['confidence_score'] = float(enriched_info_map[name]['confidence_score'])
                        seg_copy['key_factors'] = enriched_info_map[name]['key_factors']
                    all_recommendations.append(seg_copy)

            # (★정렬 버그 수정★) 점수(숫자)로 다시 정렬
            all_recommendations.sort(key=lambda x: float(x.get('confidence_score', 0)), reverse=True)
            
            # --- 중복 제거 및 Fallback ---
            final_recommendations = []
            seen_names = set()
            for seg in all_recommendations:
                if seg['name'] not in seen_names and float(seg.get('confidence_score', 0)) > 50:
                    final_recommendations.append(seg)
                    seen_names.add(seg['name'])

            # 5. Fallback 로직 (필요시)
            num_to_pad = num_recommendations - len(final_recommendations)
            if num_to_pad > 0:
                existing_names = [seg['name'] for seg in final_recommendations]
                # [★수정] Fallback 후보는 A급, B급이 아닌 *전체* 리스트에서 찾아야 함
                fallback_segments = [seg for seg in all_segments_info if seg['name'] not in existing_names]
                
                for i in range(min(num_to_pad, len(fallback_segments))):
                    fallback_seg = fallback_segments[i].copy()
                    fallback_seg['reason'] = "제품과 관련성이 높은 기본 세그먼트입니다."
                    fallback_seg['confidence_score'] = 60 # 기본 추천 점수
                    fallback_seg['key_factors'] = ["기본 추천"]
                    final_recommendations.append(fallback_seg)
            
            st.success(f"✅ AI 타겟 분석 완료! (총 {len(final_recommendations)}개 후보 중 상위 {num_recommendations}개)")
            
            return final_recommendations[:num_recommendations]

        except Exception as e:
            st.error(f"❌ 세그먼트 추천 중 오류: {str(e)}")
            return []
    
    def _fetch_url_content(self, url: str) -> str:
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                return meta_desc.get('content').strip()
            for tag in soup.find_all(['main', 'article']):
                text = tag.get_text(separator=' ', strip=True)
                if len(text) > 100:
                    return text[:1500]
            body_text = soup.body.get_text(separator=' ', strip=True)
            return body_text[:1500]
        except:
            return ""

    def _get_mapping_and_understanding(self, product_name: str, website_url: str, scraped_text: str, db_keywords_list_str: str) -> Dict:
        """
        (★신규) 0단계: 제품 이해 + 키워드 매핑
        """
        prompt = get_mapping_and_understanding_prompt(
            product_name, website_url, scraped_text, db_keywords_list_str
        )
        
        try:
            raw_response_text = self._generate_with_retry(prompt)
        except Exception as e:
            st.error(f"❌ Gemini API 0단계(매핑) 호출 실패: {str(e)}")
            return {}
        
        try:
            cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
            parsed_data = json.loads(cleaned_text)
            
            if not isinstance(parsed_data, dict) or "product_understanding" not in parsed_data:
                raise ValueError("AI 응답이 0단계 JSON 형식이 아닙니다.")
            
            return parsed_data
        
        except json.JSONDecodeError:
            st.error(f"❌ AI가 0단계에서 유효하지 않은 JSON 형식으로 응답했습니다: {cleaned_text}")
            return {}
        except ValueError as e:
            st.error(f"❌ AI 0단계 응답 파싱 오류: {str(e)}")
            return {}

    def _filter_with_gemini(self, product_understanding: str, remaining_segments: List[Dict], num_to_filter: int) -> List[str]:
        """
        (★수정) 1단계: 필터링. B급 후보 선별
        """
        if not remaining_segments or num_to_filter <= 0:
            return []
        
        segments_with_desc = [
            f"- {seg.get('name', 'N/A')} (설명: {seg.get('description', 'N/A')})"
            for seg in remaining_segments
        ]
        segments_list_str = "\n".join(segments_with_desc)
        
        prompt = get_segment_filtering_prompt(
            product_understanding, 
            segments_list_str, 
            num_to_filter=num_to_filter
        )
        
        try:
            raw_response_text = self._generate_with_retry(prompt)
        except Exception as e:
            st.error(f"❌ Gemini API 1단계(필터링) 호출 실패: {str(e)}")
            return []
        
        try:
            cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
            parsed_data = json.loads(cleaned_text)
            
            if not isinstance(parsed_data, dict) or "candidate_segments" not in parsed_data:
                raise ValueError("AI 응답이 1단계 JSON 형식이 아닙니다. ('candidate_segments' 키 부재)")
            
            candidate_names = parsed_data.get("candidate_segments", [])
            if not isinstance(candidate_names, list):
                 raise ValueError("AI 응답 'candidate_segments'가 리스트 형식이 아닙니다.")
                 
            return [str(name) for name in candidate_names] 
        
        except json.JSONDecodeError:
            st.error(f"❌ AI가 1단계에서 유효하지 않은 JSON 형식으로 응답했습니다: {cleaned_text}")
            return []
        except ValueError as e:
            st.error(f"❌ AI 1단계 응답 파싱 오류: {str(e)}")
            return []

    def _recommend_with_gemini(self, product_understanding: str, candidate_segments_info: List[Dict], num_to_recommend: int) -> Dict:
        """
        (★수정) 2단계: 재정렬. A+B 후보 리스트를 받아 최종 순위 결정
        """
        if not candidate_segments_info:
            return {}
        
        segments_with_desc = []
        for seg in candidate_segments_info: 
            seg_str = f"- {seg.get('name', 'N/A')} (설명: {seg.get('description', 'N/A')}"
            
            advertisers = seg.get('recommended_advertisers')
            if advertisers and pd.notna(advertisers):
                clean_advertisers = str(advertisers).replace('\n', ', ')
                seg_str += f", 추천 광고주: {clean_advertisers}"
            seg_str += ")"
            segments_with_desc.append(seg_str)
        
        segments_list_str = "\n".join(segments_with_desc)
        
        prompt = get_segment_recommendation_prompt(
            product_understanding, 
            segments_list_str, 
            num_to_recommend=num_to_recommend
        )
        
        try:
            raw_response_text = self._generate_with_retry(prompt)
        except Exception as e:
            st.error(f"❌ Gemini API 2단계(재정렬) 호출 실패: {str(e)}")
            return {}
        
        try:
            cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
            parsed_data = json.loads(cleaned_text)
            if not isinstance(parsed_data, dict):
                raise ValueError("AI 응답이 2단계 딕셔너리 형식이 아닙니다.")
            return parsed_data
        except json.JSONDecodeError:
            st.error(f"❌ AI가 2단계에서 유효하지 않은 JSON 형식으로 응답했습니다: {cleaned_text}")
            return {}
    
    def _get_segments_by_names(self, segment_names: List[str], available_segments: List[Dict]) -> List[Dict]:
        """이름 리스트를 받아서 전체 세그먼트 정보가 담긴 리스트 반환"""
        recommended_segments = []
        available_names_map = {seg['name']: seg for seg in available_segments}
        
        for name in segment_names:
            if name in available_names_map:
                recommended_segments.append(available_names_map[name].copy())
        return recommended_segments
    
    # [★신규] 'A급 후보'를 선별하고, 나머지를 반환하는 헬퍼
    def _get_a_class_segments(self, mapped_keywords: List[str], all_segments_info: List[Dict]) -> (List[Dict], List[Dict]):
        if not mapped_keywords:
            return [], all_segments_info

        a_class_segments = []
        remaining_segments = []
        a_class_names = set() # 중복 방지

        for segment in all_segments_info:
            found = False
            seg_name = segment.get('name', '')
            seg_desc = segment.get('description', '')
            seg_adv = str(segment.get('recommended_advertisers', ''))

            # 'name', 'description', 'recommended_advertisers' 중 하나라도 매핑된 키워드를 포함하면 A급
            for keyword in mapped_keywords:
                if (keyword in seg_name) or (keyword in seg_desc) or (keyword in seg_adv):
                    if seg_name not in a_class_names:
                        a_class_segments.append(segment)
                        a_class_names.add(seg_name)
                    found = True
                    break # 이 세그먼트는 A급 확정이므로 다음 키워드 검사 불필요
            
            if not found:
                remaining_segments.append(segment)

        return a_class_segments, remaining_segments

    # [★신규] segments.json에서 DB 키워드 목록을 추출하는 헬퍼
    def _extract_db_keywords(self, all_segments_info: List[Dict]) -> Set[str]:
        keywords = set()
        for segment in all_segments_info:
            # 1. 'name' 자체를 키워드로 추가
            name = segment.get('name')
            if name and pd.notna(name):
                keywords.add(name.strip())

            # 2. 'recommended_advertisers'를 파싱하여 키워드로 추가
            advertisers = segment.get('recommended_advertisers')
            if advertisers and pd.notna(advertisers):
                # "자동차 브랜드, 여행사/관광청" -> "자동차 브랜드", "여행사", "관광청"
                # "자동차"와 "브랜드"로 분리하는 것은 너무 과할 수 있음
                # 쉼표, 슬래시, 줄바꿈 기준으로 분리
                split_keywords = re.split(r'[,/\n]', str(advertisers))
                for kw in split_keywords:
                    cleaned_kw = kw.strip()
                    if cleaned_kw and len(cleaned_kw) > 1: # 한 글자짜리 버리기
                        keywords.add(cleaned_kw)
        
        # '생명보험', '손해보험' 같은 구체적인 키워드만 남김
        # (예: '및', '등', '고객' 같은 일반 명사 제외 - 여기서는 길이로만 간단히 필터링)
        return {kw for kw in keywords if len(kw) > 1}


    def _get_available_segments_info(self) -> List[Dict]:
        """새 4-Depth JSON 구조를 파싱하도록 수정"""
        if 'data' not in self.segments_data or not isinstance(self.segments_data['data'], list):
            return []
            
        segments_info = []
        for segment in self.segments_data['data']:
            if not isinstance(segment, dict):
                continue
            
            cat1 = segment.get('대분류')
            cat2 = segment.get('중분류')
            cat3 = segment.get('소분류')
            name = segment.get('name', 'N/A')
            
            if cat3 and pd.notna(cat3) and str(cat3).lower() != 'null':
                full_path = f"{cat1} > {cat2} > {cat3} > {name}"
            else:
                full_path = f"{cat1} > {cat2} > {name}"

            seg_copy = segment.copy()
            seg_copy['full_path'] = full_path
            seg_copy['description'] = segment.get('description', '')
            seg_copy['recommended_advertisers'] = segment.get('recommended_advertisers', '')
            
            segments_info.append(seg_copy)
            
        return segments_info
    
    def display_recommendations(self, recommended_segments: List[Dict]):
        """추천 결과 표시"""
        if not recommended_segments:
            st.warning("❌ 추천할 세그먼트를 찾지 못했습니다.")
            return
        
        st.markdown("""
        <style>
        .tag-box {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.9em;
            font-weight: bold;
            margin-right: 5px;
            margin-top: 5px;
            margin-bottom: 5px;
        }
        </style>
        """, unsafe_allow_html=True)

        for i, segment in enumerate(recommended_segments, 1):
            score = float(segment.get('confidence_score', 0)) 
            
            title_text = f"**{i}. {segment.get('full_path', segment.get('name', 'N/A'))}**"
            
            if score <= 60: 
                 title_text += " (기본 추천)"

            with st.expander(title_text, expanded=True):
                
                if score > 60:
                    st.markdown(f"**적합도: <span style='color:#d9534f; font-weight:bold; font-size: 1.1em;'>{score:.0f}점</span>**", unsafe_allow_html=True)
                    reason_prefix = "💡 AI 추천 사유:"
                else:
                    st.markdown(f"**적합도:** {score:.0f}점")
                    reason_prefix = "ℹ️ 기본 추천 사유:"
                
                if segment.get('description'):
                    st.write(f"**📋 설명:** {segment['description']}")

                if segment.get('key_factors'):
                    tags_html = "".join([f"<span class='tag-box'>{factor}</span>" for factor in segment['key_factors']])
                    st.markdown(f"**🔑 핵심 매칭 요소:** {tags_html}", unsafe_allow_html=True)

                st.divider()

                if segment.get('reason'):
                    if score > 60:
                        st.success(f"**{reason_prefix}** {segment['reason']}")
                    else:
                        st.info(f"**{reason_prefix}** {segment['reason']}")