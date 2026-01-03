import google.generativeai as genai
import os
from typing import List, Dict, Set, Any
import json
import requests
from bs4 import BeautifulSoup
from api.ai.prompts import (
    get_segment_recommendation_prompt,
    get_segment_filtering_prompt,
    get_expansion_and_understanding_prompt,
    get_summary_comment_prompt
)
from sqlmodel import Session, select
from api.models import Segment, SystemSettings
import time
import re
from openai import OpenAI

class AISegmentRecommender:
    def __init__(self, session: Session):
        self.session = session
        self.segments = self.session.exec(select(Segment)).all()
        self.settings = {s.key: s.value for s in self.session.exec(select(SystemSettings)).all()}

        self.active_model = self.settings.get('active_model', 'gemini')
        self.gemini_key = self.settings.get('gemini_api_key') or os.getenv('GEMINI_API_KEY')
        self.deepseek_key = self.settings.get('deepseek_api_key') or os.getenv('DEEPSEEK_API_KEY')

        self.model = None
        self.gemini_available = False
        self.deepseek_available = False

        self._initialize_ai()

    def _initialize_ai(self):
        if self.active_model == 'deepseek':
            if self.deepseek_key:
                try:
                    self.openai_client = OpenAI(
                        api_key=self.deepseek_key,
                        base_url="https://api.deepseek.com"
                    )
                    self.deepseek_available = True
                except Exception as e:
                    print(f"DeepSeek Init Error: {e}")

        # Fallback or Primary Gemini
        if self.gemini_key:
            try:
                genai.configure(api_key=self.gemini_key)
                try:
                    self.model = genai.GenerativeModel('models/gemini-flash-latest')
                except:
                    self.model = genai.GenerativeModel('models/gemini-pro-latest')
                self.gemini_available = True
            except Exception as e:
                print(f"Gemini API initialization error: {e}")
                self.gemini_available = False

    def _generate_with_retry(self, prompt: str, max_retries: int = 3) -> str:
        # 1. DeepSeek attempt if active and available
        if self.active_model == 'deepseek' and self.deepseek_available:
            try:
                response = self.openai_client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant for TV ad targeting. Respond in JSON format where applicable."},
                        {"role": "user", "content": prompt}
                    ],
                    stream=False
                )
                return response.choices[0].message.content
            except Exception as e:
                print(f"DeepSeek Error: {e}, falling back to Gemini if available.")

        # 2. Gemini fallback or primary
        if self.gemini_available and self.model:
            retries = 0
            while retries < max_retries:
                try:
                    response = self.model.generate_content(prompt)
                    if not response or not response.text:
                        raise ValueError("Empty response from Gemini")
                    return response.text
                except Exception as e:
                    if "429" in str(e) and retries < max_retries - 1:
                        retries += 1
                        time.sleep(2 ** retries)
                    else:
                        raise e
            raise Exception("Gemini API Quota Exceeded")

        raise Exception("No AI model available.")

    def recommend_segments(self, product_name: str, website_url: str, num_recommendations: int = 3) -> Dict[str, Any]:
        product_understanding = ""
        expanded_keywords = []

        if not self.gemini_available and not self.deepseek_available:
            return {"error": "AI unavailable", "product_understanding": "", "expanded_keywords": [], "recommendations": []}

        # 0. URL Scraping
        scraped_text = ""
        if website_url:
            scraped_text = self._fetch_url_content(website_url)

        try:
            # 1. Load Segments
            all_segments_info = self._get_available_segments_info()
            if not all_segments_info:
                 return {"error": "No segment data", "product_understanding": "", "expanded_keywords": [], "recommendations": []}

            # 2. Product Understanding & Expansion
            try:
                expansion_json = self._get_expansion_and_understanding(
                    product_name, website_url, scraped_text
                )
                product_understanding = expansion_json.get("product_understanding", "")
                expanded_keywords = expansion_json.get("expanded_keywords", [])
            except Exception as e:
                print(f"Expansion failed: {e}")

            if not product_understanding:
                product_understanding = f"제품명: {product_name} (AI 자동 분석 실패)"

            if product_name and product_name not in expanded_keywords:
                expanded_keywords.insert(0, product_name)

            # 3. Priority Segments
            priority_segments, remaining_segments = self._get_priority_segments(
                expanded_keywords, all_segments_info
            )

            # 4. Filtering (B-Class)
            num_b_class_needed = max(0, num_recommendations - len(priority_segments))
            b_class_candidates = []

            if remaining_segments and (num_b_class_needed > 0 or not priority_segments):
                candidate_names = self._filter_with_gemini(
                    product_understanding,
                    remaining_segments,
                    num_to_filter=20
                )
                b_class_candidates = self._get_segments_by_names(candidate_names, remaining_segments)

            # 5. Final Reordering
            final_candidate_list = priority_segments + b_class_candidates
            if not final_candidate_list:
                final_candidate_list = all_segments_info[:20]

            all_recommendations = []
            if final_candidate_list:
                time.sleep(1)
                ai_response = self._recommend_with_gemini(
                    product_understanding,
                    final_candidate_list,
                    num_to_recommend=max(num_recommendations, 5)
                )
                if ai_response and ai_response.get("recommended_segments"):
                    all_recommendations = self._enrich_and_sort_segments(
                        ai_response.get("recommended_segments"), final_candidate_list
                    )

            # 6. Fallback
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
                    fallback_seg['reason'] = "기본 추천 세그먼트입니다."
                    fallback_seg['confidence_score'] = 60
                    fallback_seg['key_factors'] = ["기본 추천"]
                    final_recommendations.append(fallback_seg)

            return {
                "recommendations": final_recommendations[:num_recommendations],
                "product_understanding": product_understanding,
                "expanded_keywords": expanded_keywords
            }

        except Exception as e:
            print(f"Recommendation error: {e}")
            return {"error": str(e), "product_understanding": product_understanding, "expanded_keywords": expanded_keywords, "recommendations": []}

    def _fetch_url_content(self, url: str) -> str:
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                meta_desc = soup.find('meta', attrs={'name': 'description'})
                if meta_desc and meta_desc.get('content'):
                    return meta_desc.get('content').strip()
                body_text = soup.body.get_text(separator=' ', strip=True)
                return body_text[:1500]
            return ""
        except:
            return ""

    def _get_expansion_and_understanding(self, product_name, website_url, scraped_text):
        prompt = get_expansion_and_understanding_prompt(product_name, website_url, scraped_text)
        try:
            raw = self._generate_with_retry(prompt)
            # Cleanup markdown json
            cleaned = re.sub(r'^```json\s*', '', raw.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
            return json.loads(cleaned)
        except:
            return {}

    def _filter_with_gemini(self, product_understanding, remaining_segments, num_to_filter):
        if not remaining_segments: return []
        segments_str = "\n".join([f"- {s['name']} (설명: {s.get('description','')})" for s in remaining_segments])
        prompt = get_segment_filtering_prompt(product_understanding, segments_str, num_to_filter)
        try:
            raw = self._generate_with_retry(prompt)
            cleaned = re.sub(r'^```json\s*', '', raw.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
            data = json.loads(cleaned)
            return [str(n) for n in data.get("candidate_segments", [])]
        except:
            return []

    def _recommend_with_gemini(self, product_understanding, candidate_segments, num_to_recommend):
        if not candidate_segments: return {}
        segments_str = ""
        for s in candidate_segments:
            segments_str += f"- {s['name']} ({s.get('description','')})"
            if s.get('recommended_advertisers'):
                segments_str += f", 추천 광고주: {s.get('recommended_advertisers')}"
            segments_str += "\n"

        prompt = get_segment_recommendation_prompt(product_understanding, segments_str, num_to_recommend)
        try:
            raw = self._generate_with_retry(prompt)
            cleaned = re.sub(r'^```json\s*', '', raw.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r'\s*```$', '', cleaned, flags=re.MULTILINE)
            return json.loads(cleaned)
        except:
            return {}

    def _enrich_and_sort_segments(self, segments_from_ai, candidate_segments):
        enriched_map = {s.get("name"): s for s in segments_from_ai if s.get("name")}
        all_recs = []
        for s in candidate_segments:
            name = s.get('name')
            if name in enriched_map:
                s_copy = s.copy()
                info = enriched_map[name]
                s_copy['reason'] = info.get('reason', 'N/A')
                s_copy['confidence_score'] = float(info.get('confidence_score', 50))
                s_copy['key_factors'] = info.get('key_factors', [])
                all_recs.append(s_copy)
        all_recs.sort(key=lambda x: x.get('confidence_score', 0), reverse=True)
        return all_recs

    def _get_segments_by_names(self, names, available_segments):
        available_map = {s['name']: s for s in available_segments}
        return [available_map[name] for name in names if name in available_map]

    def _get_priority_segments(self, expanded_keywords, all_segments):
        if not expanded_keywords: return [], all_segments
        priority = []
        remaining = []
        priority_names = set()
        lower_keywords = [k.lower() for k in expanded_keywords if len(k) > 1]

        for s in all_segments:
            text = (str(s.get('name')) + str(s.get('description')) + str(s.get('recommended_advertisers'))).lower()
            if any(k in text for k in lower_keywords):
                if s['name'] not in priority_names:
                    priority.append(s)
                    priority_names.add(s['name'])
            else:
                remaining.append(s)
        return priority, remaining

    def _get_available_segments_info(self) -> List[Dict]:
        info = []
        for s in self.segments:
            # Reconstruct dictionary from SQLModel
            # Note: We need to handle the fact that we might have lost full path structure details if not stored.
            # But the logic just needs name/desc/keywords mostly.
            # We can reconstruct path from category fields.
            full_path = f"{s.category_large} > {s.category_middle} > {s.name}"
            info.append({
                "name": s.name,
                "description": s.description,
                "keywords": s.keywords,
                "full_path": full_path,
                "recommended_advertisers": s.keywords # using keywords as proxy for advertisers if not separate
            })
        return info

    def generate_summary_comment(self, product_name, advertiser_name, recommended_segments, total_budget, total_impressions):
        if not self.gemini_available and not self.deepseek_available: return ""
        try:
            prompt = get_summary_comment_prompt(product_name, advertiser_name, recommended_segments, total_budget, total_impressions)
            raw = self._generate_with_retry(prompt)
            return raw.strip()
        except:
            return ""
