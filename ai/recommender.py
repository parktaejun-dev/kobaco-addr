# ai/recommender.py
import streamlit as st
import google.generativeai as genai
import os
from typing import List, Dict
import json
from dotenv import load_dotenv
import requests 
from bs4 import BeautifulSoup 
from ai.prompts import get_segment_recommendation_prompt, get_segment_filtering_prompt # [★수정] 1단계 프롬프트 임포트
import pandas as pd

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
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            except:
                self.model = genai.GenerativeModel('gemini-pro')
            self.gemini_available = True
        except Exception as e:
            st.error(f"❌ Gemini API 설정 오류: {str(e)}")
            self.gemini_available = False
    
    # [★수정] 2-Stage (필터링 -> 재정렬) 방식으로 로직 전면 수정
    def recommend_segments(self, product_name: str, website_url: str, num_recommendations: int = 3) -> List[Dict]:
        
        if not product_name.strip() and not website_url.strip():
            st.error("❌ '제품명' 또는 '제품 URL*'을 입력해주세요.")
            return []
            
        if not self.gemini_available or not self.model:
            st.error("❌ Gemini AI를 사용할 수 없습니다.")
            return []
            
        scraped_text = ""
        if website_url:
            with st.spinner(f"🌐 {website_url} 웹페이지 분석 중..."):
                scraped_text = self._fetch_url_content(website_url)
                if not scraped_text:
                    st.warning("⚠️ 웹사이트 내용을 자동으로 읽어오는 데 실패했습니다. 제품명/URL로만 분석합니다.")

        try:
            # 1. 모든 세그먼트 정보 로드 (140개)
            all_segments_info = self._get_available_segments_info()
            if not all_segments_info:
                st.error("❌ 세그먼트 데이터를 로드하지 못했습니다. (data/segments.json)")
                return []

            st.info(f"🔍 AI 타겟 분석 시작... (총 {len(all_segments_info)}개 세그먼트 대상)")

            # --- 1단계: 필터링 (140개 -> 40개) ---
            num_to_filter = 40 # 1단계 후보 수
            with st.spinner(f"🤖 AI 분석 중 (1/2): {len(all_segments_info)}개 중 {num_to_filter}개 후보 선별 중..."):
                candidate_names = self._filter_with_gemini(
                    product_name, website_url, scraped_text, 
                    all_segments_info, 
                    num_to_filter=num_to_filter
                )
            
            if not candidate_names:
                st.warning("⚠️ AI가 1단계 후보를 선별하지 못했습니다. 관련성 높은 40개를 임의로 사용합니다.")
                # 비상시 그냥 앞 40개 사용 (혹은 다른 로직)
                candidate_segments_info = all_segments_info[:num_to_filter] 
            else:
                # AI가 반환한 이름(40개)에 해당하는 '전체 정보'를 다시 매칭
                candidate_segments_info = self._get_segments_by_names(candidate_names, all_segments_info)
            
            st.info(f"✅ 1단계 분석 완료. {len(candidate_segments_info)}개 후보 선별.")

            # --- 2단계: 재정렬 (40개 -> 3개) ---
            with st.spinner(f"🤖 AI 분석 중 (2/2): {len(candidate_segments_info)}개 후보 정밀 분석 및 순위 결정 중..."):
                ai_response = self._recommend_with_gemini(
                    product_name, website_url, scraped_text,
                    candidate_segments_info, # [★수정] 전체(140)가 아닌 후보(40) 리스트 전달
                    num_to_recommend=num_recommendations # 사용자가 요청한 최종 개수
                )

            if not ai_response:
                segments_from_ai = []
            else:
                product_understanding = ai_response.get("product_understanding")
                if product_understanding:
                    st.info(f"**💡 AI가 이해한 제품:** {product_understanding}")
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
            
            # AI가 추천한 순서 + 정보로 최종 리스트 생성
            all_recommendations = []
            for name in segment_names_from_ai:
                # 40개 후보 리스트(candidate_segments_info)에서 원본 데이터 찾기
                seg_data = next((s for s in candidate_segments_info if s.get('name') == name), None)
                if seg_data:
                    seg_copy = seg_data.copy()
                    if name in enriched_info_map:
                        seg_copy['reason'] = enriched_info_map[name]['reason']
                        # (★정렬 버그 수정★) 점수를 float으로 저장
                        seg_copy['confidence_score'] = float(enriched_info_map[name]['confidence_score'])
                        seg_copy['key_factors'] = enriched_info_map[name]['key_factors']
                    all_recommendations.append(seg_copy)

            # --- (★정렬 버그 수정★) ---
            # AI가 반환한 순서를 존중하되, 만약을 대비해 점수(숫자)로 다시 정렬
            # 100점이 없어도 뒤죽박죽인 문제를 해결하기 위해 float()로 강제 형변환
            all_recommendations.sort(key=lambda x: float(x.get('confidence_score', 0)), reverse=True)
            
            # --- (기존 로직 재사용) 중복 제거 및 Fallback ---
            final_recommendations = []
            seen_names = set()
            for seg in all_recommendations:
                # 점수가 50 (기본값)이 아닌, AI가 생성한 유효한 추천만 먼저 추가
                if seg['name'] not in seen_names and float(seg.get('confidence_score', 0)) > 50:
                    final_recommendations.append(seg)
                    seen_names.add(seg['name'])

            # 5. Fallback 로직 (필요시)
            num_to_pad = num_recommendations - len(final_recommendations)
            if num_to_pad > 0:
                # Fallback 후보는 AI가 추천하지 않은 *전체* 세그먼트에서 찾아야 함
                existing_names = [seg['name'] for seg in final_recommendations]
                fallback_segments = [seg for seg in all_segments_info if seg['name'] not in existing_names]
                
                # Fallback 후보도 점수순(기본값)이나 다른 기준으로 정렬하면 좋지만, 여기서는 단순 추가
                for i in range(min(num_to_pad, len(fallback_segments))):
                    fallback_seg = fallback_segments[i].copy()
                    fallback_seg['reason'] = "제품과 관련성이 높은 기본 세그먼트입니다."
                    fallback_seg['confidence_score'] = 60 # 기본 추천 점수
                    fallback_seg['key_factors'] = ["기본 추천"]
                    final_recommendations.append(fallback_seg)
            
            st.success(f"✅ AI 타겟 분석 완료! (총 {len(final_recommendations)}개 후보 중 상위 {num_recommendations}개)")
            
            # 6. 최종 개수만큼 잘라서 반환
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

    def _filter_with_gemini(self, product_name: str, website_url: str, scraped_text: str, all_segments_info: List[Dict], num_to_filter: int) -> List[str]:
        """(★신규) 1단계: 필터링. 전체 세그먼트에서 후보 이름만 40개 추출"""
        if not all_segments_info:
            return []
        
        # 1단계에서는 설명만 제공 (추천 광고주 등은 제외)
        segments_with_desc = [
            f"- {seg.get('name', 'N/A')} (설명: {seg.get('description', 'N/A')})"
            for seg in all_segments_info
        ]
        segments_list_str = "\n".join(segments_with_desc)
        
        prompt = get_segment_filtering_prompt(
            product_name, website_url, scraped_text, 
            segments_list_str, 
            num_to_filter=num_to_filter
        )
        
        try:
            response = self.model.generate_content(prompt)
            if not response or not response.text:
                raise ValueError("Gemini API에서 1단계 빈 응답을 받았습니다.")
            raw_response_text = response.text
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
                 
            return [str(name) for name in candidate_names] # 이름 리스트 반환
        
        except json.JSONDecodeError:
            st.error(f"❌ AI가 1단계에서 유효하지 않은 JSON 형식으로 응답했습니다: {cleaned_text}")
            return []
        except ValueError as e:
            st.error(f"❌ AI 1단계 응답 파싱 오류: {str(e)}")
            return []

    # [★수정] 이 함수는 이제 2단계 (재정렬)을 담당
    def _recommend_with_gemini(self, product_name: str, website_url: str, scraped_text: str, candidate_segments_info: List[Dict], num_to_recommend: int) -> Dict:
        """(★수정) 2단계: 재정렬. 40개 후보 리스트를 받아 최종 3~10개 추천"""
        if not candidate_segments_info:
            # 후보 리스트가 비어있으면 빈 dict 반환
            return {}
        
        segments_with_desc = []
        for seg in candidate_segments_info: # 40개 후보 리스트 사용
            seg_str = f"- {seg.get('name', 'N/A')} (설명: {seg.get('description', 'N/A')}"
            
            advertisers = seg.get('recommended_advertisers')
            if advertisers and pd.notna(advertisers):
                clean_advertisers = str(advertisers).replace('\n', ', ')
                seg_str += f", 추천 광고주: {clean_advertisers}"
            seg_str += ")"
            segments_with_desc.append(seg_str)
        
        segments_list_str = "\n".join(segments_with_desc)
        
        prompt = get_segment_recommendation_prompt(
            product_name, website_url, scraped_text, segments_list_str, 
            num_to_recommend=num_to_recommend
        )
        
        try:
            # 2단계 스피너는 외부(recommend_segments)에서 관리
            response = self.model.generate_content(prompt)
            if not response or not response.text:
                raise ValueError("Gemini API에서 2단계 빈 응답을 받았습니다.")
            raw_response_text = response.text
        except Exception as e:
            # 2단계 실패는 중요하므로 st.error
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
        
        # AI가 반환한 이름 순서를 유지
        for name in segment_names:
            if name in available_names_map:
                recommended_segments.append(available_names_map[name].copy())
        return recommended_segments
    
    def _get_available_segments_info(self) -> List[Dict]:
        """(★수정) 새 4-Depth JSON 구조를 파싱하도록 수정"""
        if 'data' not in self.segments_data or not isinstance(self.segments_data['data'], list):
            return []
            
        segments_info = []
        for segment in self.segments_data['data']:
            if not isinstance(segment, dict):
                continue
            
            # CSV의 null을 None으로 처리
            cat1 = segment.get('대분류')
            cat2 = segment.get('중분류')
            cat3 = segment.get('소분류')
            name = segment.get('name', 'N/A')
            
            if cat3 and pd.notna(cat3) and str(cat3).lower() != 'null':
                full_path = f"{cat1} > {cat2} > {cat3} > {name}"
            else:
                full_path = f"{cat1} > {cat2} > {name}"

            # 새 구조에 맞게 복사
            seg_copy = segment.copy()
            seg_copy['full_path'] = full_path
            # 키 이름 일관성 유지 (description, recommended_advertisers는 CSV와 동일)
            seg_copy['description'] = segment.get('description', '')
            seg_copy['recommended_advertisers'] = segment.get('recommended_advertisers', '')
            
            segments_info.append(seg_copy)
            
        return segments_info
    
    def display_recommendations(self, recommended_segments: List[Dict]):
        """추천 결과 표시 (st.expander 사용, UI 수정)"""
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
            score = float(segment.get('confidence_score', 0)) # (★정렬 버그 수정★) float으로 읽기
            
            # [★수정] full_path 키 사용
            title_text = f"**{i}. {segment.get('full_path', segment.get('name', 'N/A'))}**"
            
            if score <= 60: # 60점 이하는 기본 추천으로 간주
                 title_text += " (기본 추천)"

            with st.expander(title_text, expanded=True):
                
                if score > 60:
                    st.markdown(f"**적합도: <span style='color:#d9534f; font-weight:bold; font-size: 1.1em;'>{score:.0f}점</span>**", unsafe_allow_html=True)
                    reason_prefix = "💡 AI 추천 사유:"
                else:
                    st.markdown(f"**적합도:** {score:.0f}점")
                    reason_prefix = "ℹ️ 기본 추천 사유:"
                
                # [★수정] description 키 사용
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