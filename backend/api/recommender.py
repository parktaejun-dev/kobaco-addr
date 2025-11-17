# backend/api/recommender.py
import google.generativeai as genai
import os
from typing import List, Dict
import json
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
from .prompts import (
    get_segment_recommendation_prompt,
    get_segment_filtering_prompt,
    get_expansion_and_understanding_prompt
)
import pandas as pd
import time
import re
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# --- Mock Data for Testing ---
MOCK_RECOMMENDATIONS = [
    {'name': 'MBC', 'reason': 'Mocked: 높은 도달률을 가진 주요 채널입니다.', 'confidence_score': 95, 'full_path': 'TV > 지상파 > MBC'},
    {'name': 'EBS', 'reason': 'Mocked: 교육 및 가족 타겟에 효과적입니다.', 'confidence_score': 88, 'full_path': 'TV > 지상파 > EBS'},
    {'name': 'PP', 'reason': 'Mocked: 특정 관심사를 가진 타겟에 집중할 수 있습니다.', 'confidence_score': 85, 'full_path': 'TV > PP'},
]
MOCK_UNDERSTANDING = "Mocked: 프리미엄 강아지 사료는 건강을 생각하는 반려인들을 위한 제품입니다."
MOCK_KEYWORDS = ["강아지 사료", "프리미엄 펫푸드", "유기농 사료"]
# --- End of Mock Data ---

class AISegmentRecommender:
    def __init__(self):
        self.segments_data = self._load_segments_from_file()
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.model = None
        self.gemini_available = False
        self._initialize_gemini()

    def _load_segments_from_file(self):
        try:
            # Correct path relative to the project root
            with open('data/segments.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error(f"❌ 세그먼트 파일 로딩 실패: {e}")
            return None

    def _initialize_gemini(self):
        if not self.api_key:
            logger.warning("⚠️ Gemini API 키가 설정되지 않았습니다. Mock 데이터를 사용하여 테스트 모드로 실행합니다.")
            self.gemini_available = False
            return
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('models/gemini-flash-latest')
            self.gemini_available = True
            logger.info(f"✅ AI 모델 로드 성공: {self.model.model_name}")
        except Exception as e:
            logger.error(f"❌ Gemini API 설정 오류: {str(e)}")
            self.gemini_available = False

    def recommend_segments(self, product_name: str, website_url: str, num_recommendations: int = 3) -> (List[Dict], str, List[str]):
        if not self.gemini_available:
            time.sleep(2)
            return MOCK_RECOMMENDATIONS, MOCK_UNDERSTANDING, MOCK_KEYWORDS

        product_understanding = ""
        expanded_keywords = []

        if not product_name.strip() and not website_url.strip():
            raise ValueError("❌ '제품명' 또는 '제품 URL'을 입력해주세요.")

        scraped_text = ""
        if website_url:
            scraped_text = self._fetch_url_content(website_url)
            if not scraped_text:
                logger.warning("⚠️ 웹사이트 내용을 자동으로 읽어오는 데 실패했습니다.")

        try:
            all_segments_info = self._get_available_segments_info()
            if not all_segments_info:
                raise FileNotFoundError("❌ 세그먼트 데이터를 로드하지 못했습니다.")

            expansion_json = self._get_expansion_and_understanding(
                product_name, website_url, scraped_text
            )
            product_understanding = expansion_json.get("product_understanding", "")
            expanded_keywords = expansion_json.get("expanded_keywords", [])

            if not product_understanding:
                product_understanding = f"제품명: {product_name} (AI 자동 분석 실패)"

            if product_name and product_name not in expanded_keywords:
                expanded_keywords.insert(0, product_name)

            priority_segments, remaining_segments = self._get_priority_segments(
                expanded_keywords, all_segments_info
            )

            num_b_class_needed = max(0, num_recommendations - len(priority_segments))
            b_class_candidates = []

            if remaining_segments and (num_b_class_needed > 0 or not priority_segments):
                candidate_names = self._filter_with_gemini(
                    product_understanding, remaining_segments, num_to_filter=20
                )
                b_class_candidates = self._get_segments_by_names(candidate_names, remaining_segments)

            final_candidate_list = priority_segments + b_class_candidates
            if not final_candidate_list:
                final_candidate_list = all_segments_info[:20]

            all_recommendations = []
            if final_candidate_list:
                time.sleep(1)
                ai_response = self._recommend_with_gemini(
                    product_understanding, final_candidate_list, max(num_recommendations, 5)
                )
                if ai_response and ai_response.get("recommended_segments"):
                    all_recommendations = self._enrich_and_sort_segments(
                        ai_response.get("recommended_segments"), final_candidate_list
                    )

            final_recommendations = []
            seen_names = set()

            for seg in all_recommendations:
                if seg['name'] not in seen_names:
                    final_recommendations.append(seg)
                    seen_names.add(seg['name'])

            num_to_pad = num_recommendations - len(final_recommendations)
            if num_to_pad > 0:
                existing_names = {seg['name'] for seg in final_recommendations}
                fallback_segments = [seg for seg in all_segments_info if seg['name'] not in existing_names]

                for i in range(min(num_to_pad, len(fallback_segments))):
                    fallback_seg = fallback_segments[i].copy()
                    fallback_seg['reason'] = "제품과 관련성이 높은 기본 세그먼트입니다."
                    fallback_seg['confidence_score'] = 60
                    fallback_seg['key_factors'] = ["기본 추천"]
                    final_recommendations.append(fallback_seg)

            return final_recommendations[:num_recommendations], product_understanding, expanded_keywords

        except Exception as e:
            logger.error(f"❌ 세그먼트 추천 중 오류: {str(e)}")
            raise

    def _generate_with_retry(self, prompt: str, max_retries: int = 3) -> str:
        retries = 0
        while retries < max_retries:
            try:
                response = self.model.generate_content(prompt)
                if not response or not response.text:
                    raise ValueError("Gemini API에서 빈 응답을 받았습니다.")
                return response.text
            except Exception as e:
                if "429 Resource exhausted" in str(e) and retries < max_retries - 1:
                    retries += 1
                    wait_time = 2 ** retries
                    logger.warning(f"⚠️ API 할당량(429) 초과. {wait_time}초 후 재시도... ({retries}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    raise e
        raise Exception("API 할당량 초과. 모든 재시도 실패.")

    def _fetch_url_content(self, url: str) -> str:
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            return ' '.join(p.get_text() for p in soup.find_all('p'))[:1500]
        except Exception as e:
            logger.error(f"URL content fetch error for {url}: {e}")
            return ""

    def _get_expansion_and_understanding(self, product_name: str, website_url: str, scraped_text: str) -> Dict:
        prompt = get_expansion_and_understanding_prompt(product_name, website_url, scraped_text)
        raw_response_text = self._generate_with_retry(prompt)
        cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
        return json.loads(cleaned_text)

    def _filter_with_gemini(self, product_understanding: str, remaining_segments: List[Dict], num_to_filter: int) -> List[str]:
        if not remaining_segments or num_to_filter <= 0: return []
        segments_list_str = "\n".join([f"- {s.get('name', 'N/A')}" for s in remaining_segments])
        prompt = get_segment_filtering_prompt(product_understanding, segments_list_str, num_to_filter)
        raw_response_text = self._generate_with_retry(prompt)
        cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
        parsed_data = json.loads(cleaned_text)
        return parsed_data.get("candidate_segments", [])

    def _recommend_with_gemini(self, product_understanding: str, candidate_segments_info: List[Dict], num_to_recommend: int) -> Dict:
        if not candidate_segments_info: return {}
        segments_list_str = "\n".join([f"- {s.get('name', 'N/A')}" for s in candidate_segments_info])
        prompt = get_segment_recommendation_prompt(product_understanding, segments_list_str, num_to_recommend)
        raw_response_text = self._generate_with_retry(prompt)
        cleaned_text = raw_response_text.strip().replace("```json\n", "").replace("\n```", "").strip()
        return json.loads(cleaned_text)

    def _enrich_and_sort_segments(self, segments_from_ai: List[Dict], candidate_segments: List[Dict]) -> List[Dict]:
        enriched_info_map = {s.get("name"): s for s in segments_from_ai if s.get("name")}
        all_recommendations = []
        for seg_data in candidate_segments:
            name = seg_data.get('name')
            if name in enriched_info_map:
                seg_copy = seg_data.copy()
                seg_copy.update(enriched_info_map[name])
                all_recommendations.append(seg_copy)
        all_recommendations.sort(key=lambda x: float(x.get('confidence_score', 0)), reverse=True)
        return all_recommendations

    def _get_segments_by_names(self, segment_names: List[str], available_segments: List[Dict]) -> List[Dict]:
        available_names_map = {seg['name']: seg for seg in available_segments}
        return [available_names_map[name].copy() for name in segment_names if name in available_names_map]

    def _get_priority_segments(self, expanded_keywords: List[str], all_segments_info: List[Dict]) -> (List[Dict], List[Dict]):
        if not expanded_keywords: return [], all_segments_info
        priority_segments, remaining_segments = [], []
        priority_names = set()
        lower_keywords = [kw.lower() for kw in expanded_keywords if kw and len(kw) > 1]
        if not lower_keywords: return [], all_segments_info

        for segment in all_segments_info:
            search_text = f"{segment.get('name', '')} {segment.get('description', '')} {segment.get('recommended_advertisers', '')}".lower()
            found = any(keyword in search_text for keyword in lower_keywords)
            if found and segment.get('name') not in priority_names:
                priority_segments.append(segment)
                priority_names.add(segment.get('name'))
            else:
                remaining_segments.append(segment)
        return priority_segments, remaining_segments

    def _get_available_segments_info(self) -> List[Dict]:
        if not self.segments_data or 'data' not in self.segments_data: return []
        segments_info = []
        for segment in self.segments_data['data']:
            if not isinstance(segment, dict): continue
            cat1, cat2, cat3, name = segment.get('대분류'), segment.get('중분류'), segment.get('소분류'), segment.get('name', 'N/A')
            full_path = f"{cat1} > {cat2} > {name}"
            if cat3 and pd.notna(cat3) and str(cat3).lower() != 'null':
                full_path = f"{cat1} > {cat2} > {cat3} > {name}"
            seg_copy = segment.copy()
            seg_copy['full_path'] = full_path
            segments_info.append(seg_copy)
        return segments_info
