import streamlit as st
import google.generativeai as genai
import os
from typing import List, Dict, Optional
import json
from dotenv import load_dotenv
import requests 
from bs4 import BeautifulSoup 
from ai.prompts import create_gemini_prompt, create_strategy_prompt

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
            self.model = genai.GenerativeModel('gemini-1.5-flash-latest') 
            self.gemini_available = True
        except Exception as e:
            st.error(f"❌ Gemini API 설정 오류: {str(e)}")
            self.gemini_available = False
    
    def recommend_segments(self, product_name: str, website_url: str) -> List[Dict]:
        
        if not product_name.strip() and not website_url.strip():
            st.error("❌ '제품명' 또는 '제품 URL'을 입력해주세요.")
            return []
            
        if not self.gemini_available or not self.model:
            st.error("❌ Gemini AI를 사용할 수 없습니다.")
            return []
            
        st.info(f"🔍 '{product_name or website_url}'에 대한 AI 타겟 분석을 시작합니다...")
        
        scraped_text = ""
        if website_url:
            with st.spinner(f"{website_url} 웹페이지 분석 중..."):
                scraped_text = self._fetch_url_content(website_url)
                if not scraped_text:
                    st.warning("ℹ️ 웹사이트 내용 분석에 실패했습니다. 제품명으로만 분석합니다.")
        
        segments_from_ai = []
        try:
            ai_response = self._recommend_with_gemini(product_name, website_url, scraped_text) 

            if ai_response:
                product_understanding = ai_response.get("product_understanding")
                if product_understanding:
                    st.info(f"**💡 AI가 이해한 제품:** {product_understanding}")
                
                segments_from_ai = ai_response.get("recommended_segments", [])

        except Exception as e:
            print(f"AI 추천 실패 (폴백 실행): {e}") 
            segments_from_ai = []
        
        try:
            segment_names = [s.get("name") for s in segments_from_ai if s.get("name")]
            details_map = {
                s.get("name"): {
                    "reason": s.get("reason", "N/A"),
                    "confidence_score": s.get("confidence_score", 0),
                    "key_factors": s.get("key_factors", []) 
                }
                for s in segments_from_ai if s.get("name")
            }
            
            available_segments_info = self._get_available_segments_info()
            recommended_segments = self._get_segments_by_names(segment_names, available_segments_info)
            
            for seg in recommended_segments:
                details = details_map.get(seg['name'], {})
                seg['reason'] = details.get('reason', "추천 이유를 생성하지 못했습니다.")
                seg['confidence_score'] = details.get('confidence_score', 0)
                seg['key_factors'] = details.get('key_factors', [])
            
            num_to_pad = 3 - len(recommended_segments)
            if num_to_pad > 0:
                existing_names = [seg['name'] for seg in recommended_segments]
                
                if not available_segments_info:
                     available_segments_info = self._get_available_segments_info()
                     
                fallback_segments = [seg for seg in available_segments_info if seg['name'] not in existing_names]
                
                for i in range(min(num_to_pad, len(fallback_segments))):
                    fallback_seg = fallback_segments[i].copy() 
                    fallback_seg['reason'] = "AI 추천을 보완하는 기본 세그먼트입니다."
                    fallback_seg['confidence_score'] = 0 
                    fallback_seg['key_factors'] = []
                    recommended_segments.append(fallback_seg)
            
            recommended_segments.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
            
            return recommended_segments[:3] 

        except Exception as e:
            st.error(f"❌ 세그먼트 처리 중 치명적 오류: {e}")
            return []
            
    def _fetch_url_content(self, url: str) -> str:
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
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

        except requests.RequestException as e:
            print(f"URL 읽기 실패: {e}")
            return ""
        except Exception as e:
            print(f"URL 파싱 실패: {e}")
            return ""

    def _recommend_with_gemini(self, product_name: str, website_url: str, scraped_text: str) -> Dict:
        available_segments_info = self._get_available_segments_info()
        
        if not available_segments_info:
            raise ValueError("파싱할 세그먼트 데이터를 찾을 수 없습니다.")

        prompt = create_gemini_prompt(product_name, website_url, scraped_text, available_segments_info)
        
        raw_response_text = ""
        try:
            with st.spinner("AI가 제품을 분석하고 최적의 타겟을 추천 중입니다..."):
                response = self.model.generate_content(prompt)
                if not response or not response.text:
                    raise ValueError("Gemini API에서 빈 응답을 받았습니다.")
                
                raw_response_text = response.text
                st.success("✅ AI 타겟 분석이 완료되었습니다!")
        except Exception as e:
            raise ValueError(f"Gemini API 호출 실패: {str(e)}")

        try:
            cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
            parsed_data = json.loads(cleaned_text)
            
            if not isinstance(parsed_data, dict) or "product_understanding" not in parsed_data or "recommended_segments" not in parsed_data:
                 raise ValueError("AI 응답이 요청한 JSON 형식이 아닙니다.")
            
            recommended_segments = parsed_data.get("recommended_segments", [])
            
            for i, seg in enumerate(recommended_segments):
                if "name" not in seg or "reason" not in seg or "confidence_score" not in seg:
                    raise ValueError(f"AI 응답의 {i+1}번째 세그먼트에 name, reason 또는 confidence_score가 누락되었습니다.")
                if not isinstance(seg["confidence_score"], int):
                    raise ValueError(f"AI 응답의 {i+1}번째 세그먼트 confidence_score가 숫자가 아닙니다.")

            return parsed_data
            
        except Exception as e:
            raise ValueError(f"AI 응답 파싱 중 오류: {str(e)} (원본: {raw_response_text})")

    
    def _get_segments_by_names(self, segment_names: List[str], available_segments: List[Dict]) -> List[Dict]:
        recommended_segments = []
        available_names = {seg['name']: seg for seg in available_segments}
        
        for name in segment_names:
            if name in available_names:
                if available_names[name] not in recommended_segments:
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

    # [★수정] '핵심 매칭 요소'를 제목 옆 한 줄로 표시
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
            if score > 0:
                title += f" <span style='color:#d9534f; font-weight:bold;'>(적합도: {score}점)</span>"
                reason_prefix = "💡 AI 추천 사유:"
            else:
                title += " <span style='color:#555;'>(기본 추천)</span>"
                reason_prefix = "ℹ️ 기본 추천 사유:"
                
            # 3. 핵심 매칭 요소 (제목 옆 한 줄로)
            if segment.get('key_factors'):
                 key_factors_str = ', '.join(segment['key_factors'])
                 title += f" <span style='font-size: 0.9em; color: #004a9e; font-weight:bold;'>(🔑 핵심 매칭: {key_factors_str})</span>"

            # st.expander는 markdown을 지원
            with st.expander(title, expanded=True):
                if segment.get('description'):
                    st.caption(f"{segment['description']}")
                
                if segment.get('reason'):
                    if score > 0:
                        st.success(f"**{reason_prefix}** {segment['reason']}")
                    else:
                        st.info(f"**{reason_prefix}** {segment['reason']}")