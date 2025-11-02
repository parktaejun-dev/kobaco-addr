import streamlit as st
import google.generativeai as genai
import os
from typing import List, Dict, Optional
import json
from dotenv import load_dotenv
import requests 
from bs4 import BeautifulSoup 
from ai.prompts import get_segment_recommendation_prompt

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
    
    def recommend_segments(self, product_name: str, website_url: str) -> List[Dict]:
        
        if not product_name.strip() and not website_url.strip():
            st.error("❌ '제품명' 또는 '제품 URL*'을 입력해주세요.")
            return []
            
        if not self.gemini_available or not self.model:
            st.error("❌ Gemini AI를 사용할 수 없습니다.")
            return []
            
        st.info(f"🔍 '{product_name or website_url}'에 대한 AI 타겟 분석을 시작합니다...")
        
        scraped_text = ""
        if website_url:
            with st.spinner(f"🌐 {website_url} 웹페이지 분석 중..."):
                scraped_text = self._fetch_url_content(website_url)
                if not scraped_text:
                    st.warning("⚠️ 웹사이트 내용을 자동으로 읽어오는 데 실패했습니다. 제품명/URL로만 분석합니다.")
        
        try:
            ai_response = self._recommend_with_gemini(product_name, website_url, scraped_text) 
            if not ai_response:
                segments_from_ai = []
            else:
                product_understanding = ai_response.get("product_understanding")
                if product_understanding:
                    st.info(f"**💡 AI가 이해한 제품:** {product_understanding}")
                segments_from_ai = ai_response.get("recommended_segments", [])

            if not segments_from_ai:
                st.warning("⚠️ AI가 추천 세그먼트를 생성하지 못했습니다. 기본 추천을 제공합니다.")

            segment_names = [s.get("name") for s in segments_from_ai if s.get("name")]
            enriched_info_map = {
                s.get("name"): {
                    "reason": s.get("reason", "추천 이유를 생성하지 못했습니다."),
                    "confidence_score": s.get("confidence_score", 50),
                    "key_factors": s.get("key_factors", [])
                }
                for s in segments_from_ai if s.get("name")
            }
            
            available_segments_info = self._get_available_segments_info()
            recommended_segments = self._get_segments_by_names(segment_names, available_segments_info)
            
            for seg in recommended_segments:
                seg_name = seg['name']
                if seg_name in enriched_info_map:
                    seg['reason'] = enriched_info_map[seg_name]['reason']
                    seg['confidence_score'] = enriched_info_map[seg_name]['confidence_score']
                    seg['key_factors'] = enriched_info_map[seg_name]['key_factors']
            
            num_to_pad = 3 - len(recommended_segments)
            if num_to_pad > 0:
                existing_names = [seg['name'] for seg in recommended_segments]
                fallback_segments = [seg for seg in available_segments_info if seg['name'] not in existing_names]
                for i in range(min(num_to_pad, len(fallback_segments))):
                    fallback_seg = fallback_segments[i].copy()
                    fallback_seg['reason'] = "제품과 관련성이 높은 기본 세그먼트입니다."
                    fallback_seg['confidence_score'] = 60
                    fallback_seg['key_factors'] = ["기본 추천"]
                    recommended_segments.append(fallback_seg)
            
            recommended_segments.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
            return recommended_segments[:3]
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
    
    def _recommend_with_gemini(self, product_name: str, website_url: str, scraped_text: str) -> Dict:
        available_segments_info = self._get_available_segments_info()
        if not available_segments_info:
            st.error("❌ 세그먼트 데이터를 찾을 수 없습니다.")
            return {}
        
        segments_with_desc = [f"- {seg['name']} (설명: {seg['description']})" for seg in available_segments_info]
        segments_list_str = "\n".join(segments_with_desc)
        
        prompt = get_segment_recommendation_prompt(product_name, website_url, scraped_text, segments_list_str)
        
        try:
            with st.spinner("🤖 AI가 제품을 분석하고 최적의 타겟을 추천 중입니다..."):
                response = self.model.generate_content(prompt)
                if not response or not response.text:
                    raise ValueError("Gemini API에서 빈 응답을 받았습니다.")
                raw_response_text = response.text
                st.success("✅ AI 분석이 완료되었습니다!")
        except Exception as e:
            st.error(f"❌ Gemini API 호출 실패: {str(e)}")
            return {}
        
        try:
            cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
            parsed_data = json.loads(cleaned_text)
            if not isinstance(parsed_data, dict):
                raise ValueError("AI 응답이 딕셔너리 형식이 아닙니다.")
            return parsed_data
        except json.JSONDecodeError:
            st.error(f"❌ AI가 유효하지 않은 JSON 형식으로 응답했습니다.")
            return {}
    
    def _get_segments_by_names(self, segment_names: List[str], available_segments: List[Dict]) -> List[Dict]:
        recommended_segments = []
        available_names = {seg['name']: seg for seg in available_segments}
        for name in segment_names:
            if name in available_names:
                recommended_segments.append(available_names[name].copy())
        return recommended_segments
    
    def _get_available_segments_info(self) -> List[Dict]:
        flat_segments = self._flatten_segments(self.segments_data)
        segments_info = []
        for segment in flat_segments:
            segments_info.append({
                'name': segment.get('name', ''),
                'description': segment.get('description', ''),
                'full_path': segment.get('full_path', '')
            })
        return segments_info
    
    def _flatten_segments(self, segments_data) -> List[Dict]:
        flat_segments = []
        if 'categories' not in segments_data or not isinstance(segments_data['categories'], list):
            return []
        for major_cat in segments_data['categories']:
            major_name = major_cat.get('major_category', 'N/A')
            if 'segments' not in major_cat or not isinstance(major_cat['segments'], list):
                continue
            for mid_cat in major_cat['segments']:
                mid_name = mid_cat.get('mid_category', 'N/A')
                path = f"{major_name} > {mid_name}"
                if 'items' not in mid_cat or not isinstance(mid_cat['items'], list):
                    continue
                for item in mid_cat['items']:
                    if 'name' in item and 'description' in item:
                        segment_copy = item.copy()
                        segment_copy['full_path'] = f"{path} > {item['name']}"
                        flat_segments.append(segment_copy)
        return flat_segments
    
    def display_recommendations(self, recommended_segments: List[Dict]):
        """추천 결과 표시 (st.expander 사용)"""
        if not recommended_segments:
            st.warning("❌ 추천할 세그먼트를 찾지 못했습니다.")
            return
        
        for i, segment in enumerate(recommended_segments, 1):
            score = segment.get('confidence_score', 0)
            
            # 1. 제목 (풀패스)
            title = f"**{i}. {segment.get('full_path', segment.get('name', 'N/A'))}**"
            
            # 2. 적합도
            if score >= 60:
                title += f" <span style='color:#d9534f; font-weight:bold;'>(적합도: {score}점)</span>"
                reason_prefix = "💡 AI 추천 사유:"
            else:
                title += " <span style='color:#555;'>(기본 추천)</span>"
                reason_prefix = "ℹ️ 기본 추천 사유:"
                
            # [★수정] 3. 핵심 매칭 요소 (제목에서 제거)

            with st.expander(title, expanded=True):
                if segment.get('description'):
                    st.caption(f"{segment['description']}")
                
                # [★수정] 핵심 매칭 요소를 별도 라인으로 추가
                if segment.get('key_factors'):
                    key_factors_str = ', '.join(segment['key_factors'])
                    # '기본 추천'일 때는 핵심 요소 숨김
                    if score >= 60: 
                        st.markdown(f"<span style='color: #004a9e;'>**🔑 핵심 매칭 요소:** {key_factors_str}</span>", unsafe_allow_html=True)

                if segment.get('reason'):
                    if score >= 60:
                        st.success(f"**{reason_prefix}** {segment['reason']}")
                    else:
                        st.info(f"**{reason_prefix}** {segment['reason']}")