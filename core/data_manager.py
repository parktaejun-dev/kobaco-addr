import streamlit as st
import pandas as pd
import json
import os
from datetime import datetime # [★추가]

class DataManager:
    def __init__(self, data_dir='data'):
        self.data_dir = data_dir
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)

    def get_file_path(self, file_type, format='csv'):
        return os.path.join(self.data_dir, f"{file_type}.{format}")

    def load_data(self, file_type, dtype=None):
        file_path = self.get_file_path(file_type, format='csv')
        if not os.path.exists(file_path):
            # [★수정] 관리자 페이지 로드 시 에러 대신 None 반환
            # st.error(f"데이터 파일을 찾을 수 없습니다: {file_path}")
            return None
        try:
            return pd.read_csv(file_path, dtype=dtype, encoding='utf-8-sig')
        except Exception as e:
            st.error(f"데이터 로딩 중 오류 발생 ({file_path}): {e}")
            return None

    def save_data(self, file_type, df):
        file_path = self.get_file_path(file_type, format='csv')
        try:
            df.to_csv(file_path, index=False, encoding='utf-8-sig')
        except Exception as e:
            st.error(f"데이터 저장 중 오류 발생 ({file_path}): {e}")

    # --- [★신규] 아래 2개 함수 추가 ---

    def log_input_history(self, history_data: dict):
        """
        [★신규] 사용자 입력 히스토리(비식별화)를 CSV 파일에 한 줄 추가(append)합니다.
        history_data: 저장할 입력값이 담긴 딕셔너리
        """
        file_path = self.get_file_path('input_history', format='csv')
        
        log_entry = {'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        log_entry.update(history_data)

        new_log_df = pd.DataFrame([log_entry])

        try:
            if not os.path.exists(file_path):
                new_log_df.to_csv(file_path, index=False, encoding='utf-8-sig')
            else:
                new_log_df.to_csv(file_path, mode='a', header=False, index=False, encoding='utf-8-sig')
        except Exception as e:
            st.error(f"❌ 히스토리 저장 실패: {e}")

    def log_visit(self):
        """
        [★신규] 신규 방문(세션) 로그를 CSV 파일에 한 줄 추가(append)합니다.
        """
        file_path = self.get_file_path('visit_log', format='csv')
        
        log_entry = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        }
        new_log_df = pd.DataFrame([log_entry])

        try:
            if not os.path.exists(file_path):
                new_log_df.to_csv(file_path, index=False, encoding='utf-8-sig')
            else:
                new_log_df.to_csv(file_path, mode='a', header=False, index=False, encoding='utf-8-sig')
        except Exception as e:
            print(f"Error logging visit: {e}") 

    # --- [★여기까지 추가] ---

    def load_channels(self):
        return self.load_data('channels', dtype={'base_cpv': 'float'})

    def load_bonuses(self):
        return self.load_data('bonuses', dtype={
            'min_value': 'float',
            'rate': 'float'
        })

    def load_surcharges(self):
        return self.load_data('surcharges', dtype={'rate': 'float'})

    def load_segments(self):
        file_path = self.get_file_path('segments', format='json')
        if not os.path.exists(file_path):
            st.error(f"세그먼트 파일을 찾을 수 없습니다: {file_path}")
            return {}
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            st.error(f"세그먼트 파일 로딩 중 오류 발생 ({file_path}): {e}")
            return {}

    def save_segments(self, data):
        file_path = self.get_file_path('segments', format='json')
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            st.error(f"세그먼트 파일 저장 중 오류 발생 ({file_path}): {e}")