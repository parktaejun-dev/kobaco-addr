import google.generativeai as genai
import os
from dotenv import load_dotenv

# .env 파일에서 API 키 로드
load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')

if not api_key:
    print("❌ .env 파일에 GEMINI_API_KEY가 없습니다.")
else:
    try:
        genai.configure(api_key=api_key)
        
        print("✅ API 키로 접근 가능한 모델 목록:")
        
        # 사용 가능한 모든 모델을 나열합니다.
        for model in genai.list_models():
            # 'generateContent' (채팅/응답)을 지원하는 모델만 필터링
            if 'generateContent' in model.supported_generation_methods:
                print(f"- {model.name}")
                
    except Exception as e:
        print(f"❌ API 연결 또는 모델 목록 조회 실패: {e}")