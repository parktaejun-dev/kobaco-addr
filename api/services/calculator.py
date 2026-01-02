from typing import List, Dict, Optional, Any
from sqlmodel import Session, select
from api.models import Channel, Bonus, Surcharge

class EstimateCalculator:
    def __init__(self, session: Session):
        self.session = session
        self.channels = self.session.exec(select(Channel)).all()
        self.bonuses = self.session.exec(select(Bonus)).all()
        self.surcharges = self.session.exec(select(Surcharge)).all()

        if not self.channels:
            print("Warning: Channel data is empty in DB.")

    def calculate_estimate(self,
                           selected_channels: List[str],
                           channel_budgets: Dict[str, float],
                           duration: int,
                           region_targeting: bool,
                           region_selections: Dict[str, str],
                           audience_targeting: bool,
                           ad_duration: int,
                           custom_targeting: bool,
                           is_new_advertiser: bool) -> Dict[str, Any]:

        results = {'details': [], 'summary': {}}
        total_budget_won = 0
        total_guaranteed_impressions = 0

        if not self.channels:
            return {"error": "Channel data not available."}

        is_non_targeting = not audience_targeting and not region_targeting

        for channel_name in selected_channels:
            budget_mw = channel_budgets.get(channel_name, 0)
            if budget_mw == 0:
                continue

            budget_won = budget_mw * 10000
            total_budget_won += budget_won

            # Find channel info from loaded list
            channel_info = next((c for c in self.channels if c.channel_name == channel_name), None)

            if not channel_info:
                continue

            base_cpv_15s = channel_info.base_cpv
            if not base_cpv_15s or base_cpv_15s == 0:
                continue

            if ad_duration == 30:
                base_cpv = base_cpv_15s * 2.0
            else:
                base_cpv = base_cpv_15s

            total_bonus_rate = 0.0

            # --- Basic Bonus ---
            basic_bonuses = [b for b in self.bonuses if b.bonus_type == 'basic' and b.channel_name == channel_name]
            if basic_bonuses:
                total_bonus_rate += sum(b.rate for b in basic_bonuses)

            # --- Duration Bonus ---
            duration_bonuses = [
                b for b in self.bonuses
                if b.bonus_type == 'duration' and b.channel_name == channel_name and b.min_value <= duration
            ]
            if duration_bonuses:
                total_bonus_rate += max(b.rate for b in duration_bonuses)

            # --- Volume Bonus ---
            volume_bonuses = [
                b for b in self.bonuses
                if b.bonus_type == 'volume' and b.channel_name == channel_name and b.min_value <= budget_won
            ]
            if volume_bonuses:
                total_bonus_rate += max(b.rate for b in volume_bonuses)

            # --- Promotion Bonus (New Advertiser) ---
            if is_new_advertiser:
                promo_bonuses = [
                    b for b in self.bonuses
                    if b.bonus_type == 'promotion' and b.condition_type == 'new_advertiser' and b.channel_name == channel_name
                ]
                if promo_bonuses:
                    total_bonus_rate += sum(b.rate for b in promo_bonuses)

            # --- Non-Targeting Bonus ---
            if is_non_targeting:
                non_targeting_bonuses = [
                    b for b in self.bonuses
                    if b.channel_name == channel_name and b.condition_type == 'non_targeting'
                ]
                if non_targeting_bonuses:
                    total_bonus_rate += sum(b.rate for b in non_targeting_bonuses)

            total_surcharge_rate = 0.0

            if region_targeting and region_selections.get(channel_name) != '선택안함':
                region_name = region_selections.get(channel_name)
                region_surcharges = [
                    s for s in self.surcharges
                    if s.surcharge_type == 'region' and s.channel_name == channel_name and s.condition_value == region_name
                ]
                if region_surcharges:
                    total_surcharge_rate += region_surcharges[0].rate * 100.0

            if custom_targeting:
                custom_surcharges = [
                    s for s in self.surcharges
                    if s.surcharge_type == 'custom' and s.channel_name == channel_name
                ]
                if custom_surcharges:
                    total_surcharge_rate += custom_surcharges[0].rate * 100.0


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
