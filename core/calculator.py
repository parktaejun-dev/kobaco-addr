import pandas as pd
from datetime import datetime
import os
import io
from jinja2 import Environment, FileSystemLoader, select_autoescape
import base64

class EstimateCalculator:
    def __init__(self, data_manager):
        self.data_manager = data_manager
        self.channels_df = self.data_manager.load_channels()
        self.bonuses_df = self.data_manager.load_bonuses()
        self.surcharges_df = self.data_manager.load_surcharges()

        if self.channels_df is None or self.bonuses_df is None or self.surcharges_df is None:
            raise ValueError("데이터 로드 실패. data/ 디렉토리의 파일을 확인하세요.")

    def calculate_estimate(self, selected_channels, channel_budgets, duration, 
                           region_targeting, region_selections, 
                           audience_targeting, ad_duration, custom_targeting,
                           is_new_advertiser):
        
        results = {'details': [], 'summary': {}}
        total_budget_won = 0 
        total_guaranteed_impressions = 0
        
        if self.channels_df is None:
            return {"error": "채널 데이터를 로드할 수 없습니다."}
        
        is_non_targeting = not audience_targeting and not region_targeting

        for channel_name in selected_channels:
            budget_mw = channel_budgets.get(channel_name, 0)
            if budget_mw == 0:
                continue

            budget_won = budget_mw * 10000
            total_budget_won += budget_won
            
            channel_info = self.channels_df[self.channels_df['channel_name'] == channel_name]
            if channel_info.empty:
                continue
                
            try:
                base_cpv_15s = channel_info.iloc[0]['base_cpv']
                if pd.isna(base_cpv_15s) or base_cpv_15s == 0:
                    continue

                if ad_duration == 30:
                    base_cpv = base_cpv_15s * 2.0
                else:
                    base_cpv = base_cpv_15s
                    
            except KeyError as e:
                return {"error": f"설정 오류 (KeyError): 'data/channels.csv'에서 'base_cpv' 열을 찾지 못했습니다."}

            total_bonus_rate = 0.0
            
            if self.bonuses_df is not None:
                
                # --- 기본 보너스 ---
                basic_bonus = self.bonuses_df[
                    (self.bonuses_df['bonus_type'] == 'basic') &
                    (self.bonuses_df['channel_name'] == channel_name)
                ]
                if not basic_bonus.empty:
                    total_bonus_rate += basic_bonus['rate'].sum()

                # --- 기간 보너스 ---
                duration_bonus = self.bonuses_df[
                    (self.bonuses_df['bonus_type'] == 'duration') &
                    (self.bonuses_df['channel_name'] == channel_name) &
                    (self.bonuses_df['min_value'] <= duration)
                ]
                if not duration_bonus.empty:
                    total_bonus_rate += duration_bonus['rate'].max()

                # --- 볼륨 보너스 ---
                volume_bonus = self.bonuses_df[
                    (self.bonuses_df['bonus_type'] == 'volume') &
                    (self.bonuses_df['channel_name'] == channel_name) &
                    (self.bonuses_df['min_value'] <= budget_won) 
                ]
                if not volume_bonus.empty:
                    total_bonus_rate += volume_bonus['rate'].max()
                
                # --- 프로모션 보너스 (신규 광고주) ---
                if is_new_advertiser:
                    promo_bonus = self.bonuses_df[
                        (self.bonuses_df['bonus_type'] == 'promotion') &
                        (self.bonuses_df['condition_type'] == 'new_advertiser') &
                        (self.bonuses_df['channel_name'] == channel_name)
                    ]
                    if not promo_bonus.empty:
                        total_bonus_rate += promo_bonus['rate'].sum()

                # --- 논타겟팅 보너스 ---
                if is_non_targeting:
                    non_targeting_bonus = self.bonuses_df[
                        (self.bonuses_df['channel_name'] == channel_name) &
                        (self.bonuses_df['condition_type'] == 'non_targeting')
                    ]
                    if not non_targeting_bonus.empty:
                        total_bonus_rate += non_targeting_bonus['rate'].sum()
            
            total_surcharge_rate = 0.0
            
            if self.surcharges_df is not None:
                if region_targeting and region_selections.get(channel_name) != '선택안함':
                    region_name = region_selections.get(channel_name)
                    region_surcharge = self.surcharges_df[
                        (self.surcharges_df['surcharge_type'] == 'region') &
                        (self.surcharges_df['channel_name'] == channel_name) &
                        (self.surcharges_df['condition_value'] == region_name)
                    ]
                    if not region_surcharge.empty:
                        total_surcharge_rate += region_surcharge.iloc[0]['rate'] * 100.0
                
                if custom_targeting:
                    custom_surcharge = self.surcharges_df[
                        (self.surcharges_df['surcharge_type'] == 'custom') &
                        (self.surcharges_df['channel_name'] == channel_name)
                    ]
                    if not custom_surcharge.empty:
                        total_surcharge_rate += custom_surcharge.iloc[0]['rate'] * 100.0

            
            surcharge_multiplier = (1 + (total_surcharge_rate / 100))
            applied_cpv = base_cpv * surcharge_multiplier
            
            bonus_multiplier = (1 + total_bonus_rate)
            
            initial_impressions = 0
            if applied_cpv > 0:
                 initial_impressions = budget_won / applied_cpv
            
            guaranteed_impressions = initial_impressions * bonus_multiplier

            final_cpv = 0
            if guaranteed_impressions > 0:
                final_cpv = budget_won / guaranteed_impressions 
            
            total_guaranteed_impressions += guaranteed_impressions

            results['details'].append({
                "channel": channel_name,
                "budget": budget_won,
                "base_cpv": base_cpv,
                "total_bonus_rate": total_bonus_rate * 100,
                "total_surcharge_rate": total_surcharge_rate,
                "guaranteed_impressions": round(guaranteed_impressions),
                "final_cpv": final_cpv
            })

        average_cpv = 0
        if total_guaranteed_impressions > 0:
            average_cpv = total_budget_won / total_guaranteed_impressions

        summary = {
            "total_budget": total_budget_won,
            "total_impressions": round(total_guaranteed_impressions),
            "average_cpv": average_cpv,
            "ad_duration": ad_duration,
            "duration_months": duration
        }

        results['summary'] = summary
        return results