import streamlit as st
import google.generativeai as genai
import os
from typing import List, Dict
import json
from dotenv import load_dotenv
import requests 
from bs4 import BeautifulSoup 
from ai.prompts import get_segment_recommendation_prompt
from itertools import groupby # [★수정] 그룹화를 위해 추가
import math # [★수정] 1차 추천 개수 계산을 위해 추가

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
    
    # [★수정] 2-Stage (그룹별 호출) 방식으로 로직 전면 수정
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
            # 1. 모든 세그먼트 정보 로드 (4-depth 구조)
            available_segments_info = self._get_available_segments_info()
            if not available_segments_info:
                st.error("❌ 세그먼트 데이터를 로드하지 못했습니다. (data/segments.json)")
                return []

            # 2. 세그먼트를 (대분류, 중분류, 소분류) 키로 그룹화
            def get_group_key(segment):
                return (
                    segment.get('대분류', 'N/A'), 
                    segment.get('중분류', 'N/A'), 
                    segment.get('소분류', 'N/A') # null(None) 값도 고유 키로 사용됨
                )
            
            # 정렬 후 그룹화
            segments_sorted = sorted(available_segments_info, key=get_group_key)
            grouped_segments = {k: list(g) for k, g in groupby(segments_sorted, key=get_group_key)}
            
            num_groups = len(grouped_segments)
            st.info(f"🔍 AI 타겟 분석 시작... (총 {len(available_segments_info)}개 세그먼트, {num_groups}개 그룹 분석)")

            all_recommendations = []
            
            # [★수정] 그룹별로 AI에게 1차 추천을 몇 개 받을지 결정 (최소 2개, 최대 5개)
            # 그룹이 많을수록(20개 이상) 그룹당 2-3개, 그룹이 적으면 4-5개
            num_per_group = max(2, min(5, math.ceil(100 / max(1, num_groups))))


            # 3. 각 그룹별로 AI 호출 (2-Stage의 1단계)
            for i, (group_key, segments_in_group) in enumerate(grouped_segments.items()):
                
                group_name = " > ".join(filter(None, [k if k != 'N/A' else None for k in group_key]))
                
                with st.spinner(f"🤖 AI 분석 중... ({i+1}/{num_groups}) : '{group_name}' 그룹 ({len(segments_in_group)}개)"):
                    
                    # [★수정] 그룹별 1차 추천 개수 동적 조절
                    # 그룹 내 세그먼트가 5개 미만이면 전부, 아니면 num_per_group 개수만큼
                    num_to_recommend_group = min(len(segments_in_group), num_per_group)

                    ai_response = self._recommend_with_gemini(
                        product_name, website_url, scraped_text, 
                        segments_in_group, # [★수정] 전체가 아닌 그룹 리스트 전달
                        num_to_recommend=num_to_recommend_group
                    )
                
                if not ai_response:
                    segments_from_ai = []
                else:
                    # [★수정] 제품 이해는 첫 번째 그룹 분석 시 1회만 표시
                    if i == 0:
                        product_understanding = ai_response.get("product_understanding")
                        if product_understanding:
                            st.info(f"**💡 AI가 이해한 제품:** {product_understanding}")
                    segments_from_ai = ai_response.get("recommended_segments", [])

                if not segments_from_ai:
                    continue

                # AI 응답(이름, 이유, 점수)과 원본 세그먼트 정보(설명, 경로 등)를 병합
                segment_names = [s.get("name") for s in segments_from_ai if s.get("name")]
                enriched_info_map = {
                    s.get("name"): {
                        "reason": s.get("reason", "추천 이유를 생성하지 못했습니다."),
                        "confidence_score": s.get("confidence_score", 50),
                        "key_factors": s.get("key_factors", [])
                    }
                    for s in segments_from_ai if s.get("name")
                }
                
                # 원본 세그먼트 정보에서 AI가 추천한 것만 필터링
                recommended_segments_group = self._get_segments_by_names(segment_names, segments_in_group)
                
                # 병합
                for seg in recommended_segments_group:
                    seg_name = seg['name']
                    if seg_name in enriched_info_map:
                        seg['reason'] = enriched_info_map[seg_name]['reason']
                        seg['confidence_score'] = enriched_info_map[seg_name]['confidence_score']
                        seg['key_factors'] = enriched_info_map[seg_name]['key_factors']
                
                all_recommendations.extend(recommended_segments_group)

            if not all_recommendations:
                 st.warning("⚠️ AI가 추천 세그먼트를 생성하지 못했습니다. 기본 추천을 제공합니다.")

            # 4. 1차 취합된 모든 추천 결과를 점수 순으로 정렬 (2-Stage의 2단계)
            all_recommendations.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
            
            # 중복 제거 (이름 기준)
            final_recommendations = []
            seen_names = set()
            for seg in all_recommendations:
                if seg['name'] not in seen_names:
                    final_recommendations.append(seg)
                    seen_names.add(seg['name'])

            # 5. Fallback 로직 (필요시)
            num_to_pad = num_recommendations - len(final_recommendations)
            if num_to_pad > 0:
                existing_names = [seg['name'] for seg in final_recommendations]
                fallback_segments = [seg for seg in available_segments_info if seg['name'] not in existing_names]
                
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
    
    # [★수정] available_segments_info: 이제 전체가 아닌 '특정 그룹'의 세그먼트 리스트
    def _recommend_with_gemini(self, product_name: str, website_url: str, scraped_text: str, available_segments_info: List[Dict], num_to_recommend: int) -> Dict:
        if not available_segments_info:
            # 그룹이 비어있는 경우는 오류가 아니므로 빈 dict 반환
            return {}
        
        segments_with_desc = []
        for seg in available_segments_info:
            # [★수정] 새 JSON 키 사용
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
            # [★수정] 2-Stage에서는 spinner를 외부(recommend_segments)에서 관리
            response = self.model.generate_content(prompt)
            if not response or not response.text:
                raise ValueError("Gemini API에서 빈 응답을 받았습니다.")
            raw_response_text = response.text
        except Exception as e:
            # 개별 그룹 실패 시 st.error 대신 로깅/무시
            print(f"❌ Gemini API 호출 실패 (그룹): {str(e)}")
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
    
    # [★수정] 로직은 동일, 입력되는 available_segments가 그룹 리스트일 뿐
    def _get_segments_by_names(self, segment_names: List[str], available_segments: List[Dict]) -> List[Dict]:
        recommended_segments = []
        available_names = {seg['name']: seg for seg in available_segments}
        for name in segment_names:
            if name in available_names:
                recommended_segments.append(available_names[name].copy())
        return recommended_segments
    
    # [★수정] 새 4-Depth JSON 구조를 파싱하도록 수정
    def _get_available_segments_info(self) -> List[Dict]:
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
            
            if cat3 and pd.notna(cat3) and cat3.lower() != 'null':
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
    
    # [★제거] _flatten_segments 함수는 더 이상 필요하지 않음
    
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
            score = segment.get('confidence_score', 0)
            
            # [★수정] full_path 키 사용
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
                
                # [★수정] description 키 사용
                if segment.get('description'):
                    st.write(f"**📋 설명:** {segment['description']}")
                
                # '추천 광고주' 항목은 이전에 제거 요청됨
                # if segment.get('recommended_advertisers'):
                #     st.write(f"**🎯 추천 광고주:** {segment['recommended_advertisers']}")

                if segment.get('key_factors'):
                    tags_html = "".join([f"<span class='tag-box'>{factor}</span>" for factor in segment['key_factors']])
                    st.markdown(f"**🔑 핵심 매칭 요소:** {tags_html}", unsafe_allow_html=True)

                st.divider()

                if segment.get('reason'):
                    if score >= 60:
                        st.success(f"**{reason_prefix}** {segment['reason']}")
                    else:
                        st.info(f"**{reason_prefix}** {segment['reason']}")