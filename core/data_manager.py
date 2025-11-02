import streamlit as st
import pandas as pd
import json
import os

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
            st.error(f"데이터 파일을 찾을 수 없습니다: {file_path}")
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
