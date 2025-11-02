"""
AI 세그먼트 추천 모듈 v2
- 적합도 스코어 (Confidence Score) 추가
- 핵심 매칭 요소 (Key Factors) 추가
- 대안 세그먼트 (Alternative Segments) 제안
- 투명성 강화를 위한 상세 분석 정보 제공
"""

import streamlit as st
import google.generativeai as genai
import os
from typing import List, Dict, Optional
import json
from dotenv import load_dotenv
import requests 
from bs4 import BeautifulSoup 

# 환경 변수 로드
load_dotenv()


class AISegmentRecommender:
    """AI 기반 세그먼트 추천 시스템"""
    
    def __init__(self, data_manager):
        """
        초기화 함수
        Args:
            data_manager: 데이터 관리 객체
        """
        self.data_manager = data_manager
        self.segments_data = data_manager.load_segments()
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.model = None
        self.gemini_available = False
        
        self._initialize_gemini()
    
    def _initialize_gemini(self):
        """Gemini API 초기화 및 사용 가능 여부 확인"""
        if not self.api_key:
            st.error("❌ Gemini API 키가 설정되지 않았습니다. .env 파일에 GEMINI_API_KEY를 설정해주세요.")
            return
            
        try:
            # Gemini API 설정
            genai.configure(api_key=self.api_key)
            try:
                # 최신 모델 사용 시도
                self.model = genai.GenerativeModel('gemini-2.0-flash')
            except:
                # 대체 모델 사용
                self.model = genai.GenerativeModel('gemini-pro')
                
            self.gemini_available = True
        except Exception as e:
            st.error(f"❌ Gemini API 설정 오류: {str(e)}")
            self.gemini_available = False
    
    def recommend_segments(self, product_name: str, website_url: str) -> List[Dict]:
        """
        세그먼트 추천 메인 함수
        
        Args:
            product_name: 제품명
            website_url: 제품 웹사이트 URL (선택)
            
        Returns:
            추천 세그먼트 리스트 (최대 3개)
            각 세그먼트는 다음 정보를 포함:
            - name: 세그먼트 이름
            - description: 세그먼트 설명
            - full_path: 세그먼트 전체 경로
            - reason: AI 추천 이유
            - confidence_score: 적합도 점수 (0-100)
            - key_factors: 핵심 매칭 요소 리스트
        """
        
        # 입력 검증
        if not product_name.strip():
            st.error("❌ 제품명을 입력해주세요.")
            return []
            
        if not self.gemini_available or not self.model:
            st.error("❌ Gemini AI를 사용할 수 없습니다.")
            return []
            
        st.info(f"🔍 '{product_name}'에 대한 AI 분석을 시작합니다...")
        
        # 웹사이트 스크래핑 (선택적)
        scraped_text = ""
        if website_url:
            with st.spinner(f"🌐 {website_url} 웹페이지 분석 중..."):
                scraped_text = self._fetch_url_content(website_url)
                if not scraped_text:
                    st.warning("⚠️ 웹사이트 내용을 자동으로 읽어오는 데 실패했습니다. 제품명으로만 분석합니다.")
        
        try:
            # AI 분석 실행
            ai_response = self._recommend_with_gemini(product_name, website_url, scraped_text) 

            if not ai_response:
                return []

            # 제품 이해도 표시
            product_understanding = ai_response.get("product_understanding")
            if product_understanding:
                st.info(f"**💡 AI가 이해한 제품:** {product_understanding}")
            else:
                st.warning("⚠️ AI가 제품 요약 정보를 생성하지 못했습니다.")

            # 추천 세그먼트 파싱
            segments_from_ai = ai_response.get("recommended_segments", [])
            if not segments_from_ai:
                st.warning("⚠️ AI가 추천 세그먼트를 생성하지 못했습니다.")
                return []

            # 세그먼트 이름과 추가 정보 추출
            segment_names = [s.get("name") for s in segments_from_ai if s.get("name")]
            
            # 추가 정보 매핑 (이유, 점수, 핵심 요소)
            enriched_info_map = {
                s.get("name"): {
                    "reason": s.get("reason", "추천 이유를 생성하지 못했습니다."),
                    "confidence_score": s.get("confidence_score", 50),
                    "key_factors": s.get("key_factors", [])
                }
                for s in segments_from_ai if s.get("name")
            }
            
            # 사용 가능한 세그먼트 정보 가져오기
            available_segments_info = self._get_available_segments_info()
            recommended_segments = self._get_segments_by_names(segment_names, available_segments_info)
            
            # 추가 정보 결합
            for seg in recommended_segments:
                seg_name = seg['name']
                if seg_name in enriched_info_map:
                    seg['reason'] = enriched_info_map[seg_name]['reason']
                    seg['confidence_score'] = enriched_info_map[seg_name]['confidence_score']
                    seg['key_factors'] = enriched_info_map[seg_name]['key_factors']
                else:
                    seg['reason'] = "추천 이유를 생성하지 못했습니다."
                    seg['confidence_score'] = 50
                    seg['key_factors'] = []
            
            # 3개 미만일 경우 기본 세그먼트로 채우기
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
            
            # 적합도 점수 순으로 정렬
            recommended_segments.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
            
            return recommended_segments[:3]

        except Exception as e:
            st.error(f"❌ 세그먼트 추천 중 오류: {str(e)}")
            return []
            
    def _fetch_url_content(self, url: str) -> str:
        """
        웹사이트 URL에서 텍스트를 추출합니다.
        
        Args:
            url: 분석할 웹사이트 URL
            
        Returns:
            추출된 텍스트 (최대 1500자)
        """
        try:
            # User-Agent 헤더 설정 (봇 차단 방지)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
            response = requests.get(url, headers=headers, timeout=5) 
            response.raise_for_status() 
            
            # HTML 파싱
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 메타 태그 우선 확인
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if meta_desc and meta_desc.get('content'):
                return meta_desc.get('content').strip()

            # 메인 콘텐츠 영역 탐색
            for tag in soup.find_all(['main', 'article']):
                text = tag.get_text(separator=' ', strip=True)
                if len(text) > 100:
                    return text[:1500] 
            
            # 전체 본문 텍스트 추출
            body_text = soup.body.get_text(separator=' ', strip=True)
            return body_text[:1500]

        except requests.RequestException as e:
            print(f"URL 읽기 실패: {e}")
            return ""
        except Exception as e:
            print(f"URL 파싱 실패: {e}")
            return ""

    def _recommend_with_gemini(self, product_name: str, website_url: str, scraped_text: str) -> Dict:
        """
        Gemini API를 사용한 세그먼트 추천 (강화된 버전)
        
        Args:
            product_name: 제품명
            website_url: 웹사이트 URL
            scraped_text: 스크래핑된 텍스트
            
        Returns:
            AI 응답 딕셔너리 (제품 이해도, 추천 세그먼트, 대안 세그먼트)
        """
        available_segments_info = self._get_available_segments_info()
        
        if not available_segments_info:
            st.error("❌ 파싱할 세그먼트 데이터를 찾을 수 없습니다. segments.json 파일의 형식을 확인하세요.")
            return {}

        # 강화된 프롬프트 생성
        prompt = self._create_enhanced_prompt(product_name, website_url, scraped_text, available_segments_info)
        
        raw_response_text = ""
        try:
            # AI 분석 진행 메시지
            with st.spinner("🤖 AI가 제품을 분석하고 최적의 타겟을 추천 중입니다..."):
                response = self.model.generate_content(prompt)
                if not response or not response.text:
                    raise ValueError("Gemini API에서 빈 응답을 받았습니다.")
                
                raw_response_text = response.text
                st.success("✅ AI 분석이 완료되었습니다!")
        except Exception as e:
            st.error(f"❌ Gemini API 호출 실패: {str(e)}")
            return {}

        # JSON 파싱
        try:
            # JSON 마크다운 제거
            cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
            parsed_data = json.loads(cleaned_text)
            
            # 응답 구조 검증
            if not isinstance(parsed_data, dict):
                raise ValueError("AI 응답이 딕셔너리 형식이 아닙니다.")
            
            required_keys = ["product_understanding", "recommended_segments"]
            if not all(key in parsed_data for key in required_keys):
                raise ValueError(f"AI 응답에 필수 키가 누락되었습니다: {required_keys}")
            
            return parsed_data
            
        except json.JSONDecodeError:
            st.error(f"❌ AI가 유효하지 않은 JSON 형식으로 응답했습니다.")
            with st.expander("🔍 원본 응답 보기 (디버깅용)"):
                st.code(raw_response_text)
            return {}
        except Exception as e:
            st.error(f"❌ AI 응답 파싱 중 오류: {str(e)}")
            return {}

    
    def _get_segments_by_names(self, segment_names: List[str], available_segments: List[Dict]) -> List[Dict]:
        """
        세그먼트 이름으로 실제 세그먼트 데이터 조회
        
        Args:
            segment_names: 찾을 세그먼트 이름 리스트
            available_segments: 사용 가능한 전체 세그먼트 리스트
            
        Returns:
            찾은 세그먼트 리스트
        """
        recommended_segments = []
        available_names = {seg['name']: seg for seg in available_segments}
        
        for name in segment_names:
            if name in available_names:
                recommended_segments.append(available_names[name].copy())
        
        return recommended_segments
    
    def _get_available_segments_info(self) -> List[Dict]:
        """
        사용 가능한 세그먼트 정보 수집 (소분류만 추출)
        
        Returns:
            세그먼트 정보 리스트
            각 세그먼트는 name, description, full_path 포함
        """
        flat_segments = self._flatten_segments(self.segments_data)
        
        segments_info = []
        for segment in flat_segments:
            segments_info.append({
                'name': segment.get('name', ''),
                'description': segment.get('description', ''),
                'full_path': segment.get('full_path', '')
            })
        
        return segments_info
    
    def _create_enhanced_prompt(self, product_name: str, website_url: str, 
                               scraped_text: str, available_segments: List[Dict]) -> str:
        """
        강화된 Gemini API 프롬프트 생성
        - 적합도 점수 (confidence_score) 추가
        - 핵심 매칭 요소 (key_factors) 추가
        - 대안 세그먼트 (alternative_segments) 추가
        
        Args:
            product_name: 제품명
            website_url: 웹사이트 URL
            scraped_text: 스크래핑된 텍스트
            available_segments: 사용 가능한 세그먼트 리스트
            
        Returns:
            프롬프트 문자열
        """
        
        # 세그먼트 정보 문자열 생성
        segments_with_desc = [
            f"- {seg['name']} (설명: {seg['description']})" 
            for seg in available_segments
        ]
        segments_list_str = "\n".join(segments_with_desc)
        
        prompt = f"""
당신은 **광고 전략 전문가이자 타겟 오디언스 분석가**입니다.

당신의 임무는 3가지입니다:

1️⃣ **제품 분석**: 주어진 "제품 정보"와 "웹사이트 참고 내용"을 바탕으로 제품을 1-2줄의 친절한 설명으로 요약합니다.
   - 웹사이트 참고 내용이 있다면 제품명보다 웹사이트 내용을 최우선으로 참고하세요.

2️⃣ **타겟 추천**: "제공된 세그먼트 목록"에서 제품과 가장 관련성이 높은 세그먼트 **정확히 3개**를 선택합니다.
   - 각 세그먼트마다 다음 정보를 제공하세요:
     * **추천 이유** (reason): 왜 이 세그먼트가 적합한지 1-2줄로 설명
     * **적합도 점수** (confidence_score): 0-100점 척도로 평가 (높을수록 확신)
     * **핵심 매칭 요소** (key_factors): 제품과 세그먼트를 연결하는 핵심 키워드 2-4개

3️⃣ **대안 제시**: 추천 3개 외에 고려할 만한 대안 세그먼트 1-2개를 제시합니다. (선택사항)

---

**[제품 정보]**
* 제품명: {product_name}
* 웹사이트: {website_url or "없음"}

**[웹사이트 참고 내용]**
{scraped_text or "없음"}

**[제공된 세그먼트 목록]** (이 목록에서만 선택해야 함):
{segments_list_str}

---

**[중요한 규칙]**
✅ 세그먼트는 **반드시 위 목록에 있는 이름**만 사용하세요.
✅ 추천 세그먼트는 **정확히 3개**여야 합니다. (2개 이하나 4개 이상은 절대 안 됨)
✅ 적합도 점수는 **신중하게 평가**하세요:
   - 90-100점: 거의 완벽하게 매칭
   - 80-89점: 매우 적합
   - 70-79점: 적합
   - 60-69점: 어느 정도 관련성 있음
✅ 핵심 매칭 요소는 **구체적이고 명확**하게 작성하세요.
✅ 다른 텍스트 없이 **오직 JSON 형식으로만** 응답하세요.

---

**[응답 형식 (JSON)]**
{{
  "product_understanding": "AI가 웹사이트를 기반으로 친절하게 요약한 제품 설명...",
  "recommended_segments": [
    {{
      "name": "세그먼트1 이름",
      "reason": "이 세그먼트를 추천하는 상세한 이유...",
      "confidence_score": 95,
      "key_factors": ["키워드1", "키워드2", "키워드3"]
    }},
    {{
      "name": "세그먼트2 이름",
      "reason": "이 세그먼트를 추천하는 상세한 이유...",
      "confidence_score": 88,
      "key_factors": ["키워드1", "키워드2"]
    }},
    {{
      "name": "세그먼트3 이름",
      "reason": "이 세그먼트를 추천하는 상세한 이유...",
      "confidence_score": 82,
      "key_factors": ["키워드1", "키워드2", "키워드3"]
    }}
  ],
  "alternative_segments": [
    {{
      "name": "대안 세그먼트1 이름",
      "reason": "대안으로 고려할 만한 이유...",
      "confidence_score": 75
    }}
  ]
}}
        """
        
        return prompt.strip()
    
    def _flatten_segments(self, segments_data) -> List[Dict]:
        """
        새 segments.json 구조를 파싱하여 소분류 세그먼트만 추출합니다.
        
        Args:
            segments_data: segments.json 데이터
            
        Returns:
            평탄화된 세그먼트 리스트
        """
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
        """
        추천 결과 표시 (강화된 UI)
        - 적합도 점수 프로그레스 바
        - 핵심 매칭 요소 배지
        - 추천 이유 강조
        
        Args:
            recommended_segments: 추천 세그먼트 리스트
        """
        if not recommended_segments:
            st.warning("❌ 추천할 세그먼트를 찾지 못했습니다.")
            return
        
        for i, segment in enumerate(recommended_segments, 1):
            # 적합도 점수 가져오기
            confidence_score = segment.get('confidence_score', 50)
            
            # 점수에 따른 이모지 선택
            if confidence_score >= 90:
                emoji = "🎯"
                score_color = "green"
            elif confidence_score >= 80:
                emoji = "✅"
                score_color = "blue"
            elif confidence_score >= 70:
                emoji = "👍"
                score_color = "orange"
            else:
                emoji = "ℹ️"
                score_color = "gray"
            
            # 세그먼트 카드 생성
            with st.container(border=True):
                # 제목 (세그먼트 경로 + 점수)
                st.markdown(f"### {emoji} {i}. {segment['full_path']}")
                
                # 적합도 점수 프로그레스 바
                st.progress(confidence_score / 100, text=f"**적합도: {confidence_score}점**")
                
                # 세그먼트 설명
                if segment.get('description'):
                    st.caption(f"📋 {segment['description']}")
                
                # 구분선
                st.divider()
                
                # AI 추천 이유 (강조)
                if segment.get('reason'):
                    st.success(f"**💡 AI 추천 이유**\n\n{segment['reason']}")
                
                # 핵심 매칭 요소 배지
                if segment.get('key_factors'):
                    st.markdown("**🔑 핵심 매칭 요소**")
                    cols = st.columns(len(segment['key_factors']))
                    for idx, factor in enumerate(segment['key_factors']):
                        with cols[idx]:
                            st.markdown(f"`{factor}`")
                
                # 마지막 세그먼트가 아니면 여백 추가
                if i < len(recommended_segments):
                    st.markdown("")
