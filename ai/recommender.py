import streamlit as st
import google.generativeai as genai
import os
from typing import List, Dict
import json
from dotenv import load_dotenv
import requests 
from bs4 import BeautifulSoup 
from ai.prompts import get_segment_recommendation_prompt
# [★수정] groupby, math 임포트 제거
import pandas as pd 

load_dotenv()

# [★수정] 1단계에서 필터링할 후보 개수 정의
NUM_CANDIDATES_STAGE_1 = 40

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
    
    # [★수정] 'Filter & Rerank' 2-API-Call 방식으로 로직 변경
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
            # 1. 모든 세그먼트 정보 로드
            available_segments_info = self._get_available_segments_info()
            if not available_segments_info:
                st.error("❌ 세그먼트 데이터를 로드하지 못했습니다. (data/segments.json)")
                return []

            st.info(f"🔍 AI 타겟 분석 시작... (총 {len(available_segments_info)}개 세그먼트)")

            # 2. [1단계: 필터링]
            # 140개 전체 목록에서 상위 40개 후보 필터링
            with st.spinner(f"🤖 AI 분석 중... (1/2단계: {len(available_segments_info)}개 세그먼트 필터링)"):
                ai_response_s1 = self._recommend_with_gemini(
                    product_name, website_url, scraped_text, 
                    available_segments_info, 
                    num_to_recommend=NUM_CANDIDATES_STAGE_1
                )

            if (not ai_response_s1 or 
                "recommended_segments" not in ai_response_s1 or 
                not ai_response_s1["recommended_segments"]):
                st.warning("⚠️ AI가 1단계 후보를 생성하지 못했습니다. 기본 추천을 제공합니다.")
                return self._get_fallback_recommendations(available_segments_info, [], num_recommendations)

            # 제품 이해도 표시
            product_understanding = ai_response_s1.get("product_understanding")
            if product_understanding:
                st.info(f"**💡 AI가 이해한 제품:** {product_understanding}")

            segments_from_ai_s1 = ai_response_s1.get("recommended_segments", [])
            
            # AI 응답(이름만)과 원본 세그먼트 정보(설명, 경로 등)를 병합
            segment_names_s1 = [s.get("name") for s in segments_from_ai_s1 if s.get("name")]
            stage_1_candidates = self._get_segments_by_names(segment_names_s1, available_segments_info)
            
            if not stage_1_candidates:
                st.warning("⚠️ AI가 추천한 후보 세그먼트를 매칭하지 못했습니다.")
                return self._get_fallback_recommendations(available_segments_info, [], num_recommendations)

            # 3. [2단계: 재정렬]
            # 1단계에서 뽑힌 40개 후보 안에서만 최종 N개 정밀 분석
            with st.spinner(f"🤖 AI 분석 중... (2/2단계: {len(stage_1_candidates)}개 후보 정밀 분석)"):
                ai_response_s2 = self._recommend_with_gemini(
                    product_name, website_url, scraped_text,
                    stage_1_candidates, # [★핵심] 전체가 아닌 1단계 후보 리스트 전달
                    num_to_recommend=num_recommendations
                )

            if (not ai_response_s2 or 
                "recommended_segments" not in ai_response_s2 or 
                not ai_response_s2["recommended_segments"]):
                st.warning("⚠️ AI가 2단계 정밀 분석에 실패했습니다. 1단계 기준으로 추천합니다.")
                # 1단계 후보 중 상위 N개를 점수 없이 반환 (임시방편)
                enriched_candidates = self._enrich_segments(stage_1_candidates, segments_from_ai_s1)
                return enriched_candidates[:num_recommendations]

            segments_from_ai_s2 = ai_response_s2.get("recommended_segments", [])

            # 4. 최종 결과 병합
            # 2단계 AI 응답(이름, 이유, 점수)과 1단계 후보(전체 정보)를 병합
            final_segment_names = [s.get("name") for s in segments_from_ai_s2 if s.get("name")]
            final_recommendations = self._get_segments_by_names(final_segment_names, stage_1_candidates)
            
            # 이유, 점수, 키팩터 주입
            final_recommendations_enriched = self._enrich_segments(final_recommendations, segments_from_ai_s2)

            # 5. Fallback 로직 (필요시)
            final_recommendations_with_fallback = self._get_fallback_recommendations(
                available_segments_info, 
                final_recommendations_enriched, 
                num_recommendations
            )
            
            st.success(f"✅ AI 타겟 분석 완료!")
            
            # 6. 최종 개수만큼 잘라서 반환
            return final_recommendations_with_fallback[:num_recommendations]

        except Exception as e:
            st.error(f"❌ 세그먼트 추천 중 오류: {str(e)}")
            return []

    def _enrich_segments(self, segments_list: List[Dict], ai_response_list: List[Dict]) -> List[Dict]:
        """세그먼트 리스트에 AI의 응답(이유, 점수)을 병합합니다."""
        enriched_info_map = {
            s.get("name"): {
                "reason": s.get("reason", "추천 이유를 생성하지 못했습니다."),
                "confidence_score": s.get("confidence_score", 50),
                "key_factors": s.get("key_factors", [])
            }
            for s in ai_response_list if s.get("name")
        }
        
        for seg in segments_list:
            seg_name = seg['name']
            if seg_name in enriched_info_map:
                seg['reason'] = enriched_info_map[seg_name]['reason']
                seg['confidence_score'] = enriched_info_map[seg_name]['confidence_score']
                seg['key_factors'] = enriched_info_map[seg_name]['key_factors']
            else:
                # AI 응답에 누락된 경우 (발생하면 안 되지만)
                seg['reason'] = "AI 응답 누락"
                seg['confidence_score'] = 40
                seg['key_factors'] = []

        # AI 응답의 순서대로 정렬 (get_segments_by_names는 순서를 섞을 수 있음)
        name_to_seg_map = {seg['name']: seg for seg in segments_list}
        ordered_list = [
            name_to_seg_map[s['name']]
            for s in ai_response_list
            if s['name'] in name_to_seg_map
        ]
        return ordered_list

    def _get_fallback_recommendations(self, all_segments: List[Dict], current_recommendations: List[Dict], num_required: int) -> List[Dict]:
        """최종 추천 개수가 모자랄 경우 기본 세그먼트로 채웁니다."""
        num_to_pad = num_required - len(current_recommendations)
        if num_to_pad > 0:
            existing_names = {seg['name'] for seg in current_recommendations}
            
            # [★수정] Fallback 후보: '페르소나' 또는 '라이프스타일' 그룹
            fallback_candidates = [
                seg for seg in all_segments 
                if seg['name'] not in existing_names and 
                   (seg.get('중분류') == '페르소나' or seg.get('중분류') == '라이프스타일')
            ]
            
            # 후보가 없으면 전체에서 찾기
            if not fallback_candidates:
                fallback_candidates = [
                    seg for seg in all_segments if seg['name'] not in existing_names
                ]

            for i in range(min(num_to_pad, len(fallback_candidates))):
                fallback_seg = fallback_candidates[i].copy()
                fallback_seg['reason'] = "제품과 관련성이 높은 기본 세그먼트입니다."
                fallback_seg['confidence_score'] = 60 # 기본 추천 점수
                fallback_seg['key_factors'] = ["기본 추천"]
                current_recommendations.append(fallback_seg)
        
        return current_recommendations

    
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
    
    # [★수정] 이 함수는 변경 없음 (입력 리스트가 140개 또는 40개가 됨)
    def _recommend_with_gemini(self, product_name: str, website_url: str, scraped_text: str, available_segments_info: List[Dict], num_to_recommend: int) -> Dict:
        if not available_segments_info:
            return {}
        
        segments_with_desc = []
        for seg in available_segments_info:
            seg_str = f"- {seg.get('name', 'N/A')} (설명: {seg.get('description', 'N/A')}"
            
            advertisers = seg.get('recommended_advertisers')
            if pd.notna(advertisers) and advertisers:
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
            response = self.model.generate_content(prompt)
            if not response or not response.text:
                raise ValueError("Gemini API에서 빈 응답을 받았습니다.")
            raw_response_text = response.text
        except Exception as e:
            # [★수정] 2-Stage에서는 개별 실패가 치명적이지 않도록 print
            print(f"❌ Gemini API 호출 실패: {str(e)}")
            return {}
        
        try:
            cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
            parsed_data = json.loads(cleaned_text)
            if not isinstance(parsed_data, dict):
                raise ValueError("AI 응답이 딕셔너리 형식이 아닙니다.")
            return parsed_data
        except json.JSONDecodeError:
            print(f"❌ AI가 유효하지 않은 JSON 형식으로 응답했습니다: {cleaned_text}")
            return {}
    
    # [★수정] 변경 없음
    def _get_segments_by_names(self, segment_names: List[str], available_segments: List[Dict]) -> List[Dict]:
        """ AI가 반환한 이름 목록을 기반으로 전체 세그먼트 정보 목록을 반환합니다. """
        recommended_segments = []
        available_names = {seg['name']: seg for seg in available_segments}
        
        # AI 응답 순서를 유지하기 위해 segment_names 순서대로 찾음
        for name in segment_names:
            if name in available_names:
                recommended_segments.append(available_names[name].copy())
        return recommended_segments
    
    # [★수정] 변경 없음 (이전 단계에서 이미 4-depth JSON을 읽도록 수정됨)
    def _get_available_segments_info(self) -> List[Dict]:
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
            
            if pd.notna(cat3) and str(cat3).lower() != 'null':
                full_path = f"{cat1} > {cat2} > {cat3} > {name}"
            else:
                full_path = f"{cat1} > {cat2} > {name}"

            seg_copy = segment.copy()
            seg_copy['full_path'] = full_path
            seg_copy['description'] = segment.get('description', '')
            seg_copy['recommended_advertisers'] = segment.get('recommended_advertisers', '')
            
            segments_info.append(seg_copy)
            
        return segments_info
    
    # [★수정] 변경 없음
    def display_recommendations(self, recommended_segments: List[Dict]):
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
            score = segment.get('confidence_score', 0)
            
            title_text = f"**{i}. {segment.get('full_path', segment.get('name', 'N/A'))}**"
            
            if score < 60:
                 title_text += " (기본 추천)"

            with st.expander(title_text, expanded=True):
                
                if score >= 60:
                    st.markdown(f"**적합도: <span style='color:#d9534f; font-weight:bold; font-size: 1.1em;'>{score}점</span>**", unsafe_allow_html=True)
                    reason_prefix = "💡 AI 추천 사유:"
                else:
                    st.markdown(f"**적합도:** {score}점")
                    reason_prefix = "ℹ️ 기본 추천 사유:"
                
                if segment.get('description'):
                    st.write(f"**📋 설명:** {segment['description']}")

                if segment.get('key_factors'):
                    tags_html = "".join([f"<span class='tag-box'>{factor}</span>" for factor in segment['key_factors']])
                    st.markdown(f"**🔑 핵심 매칭 요소:** {tags_html}", unsafe_allow_html=True)

                st.divider()

                if segment.get('reason'):
                    if score >= 60:
                        st.success(f"**{reason_prefix}** {segment['reason']}")
                    else:
                        st.info(f"**{reason_prefix}** {segment['reason']}")