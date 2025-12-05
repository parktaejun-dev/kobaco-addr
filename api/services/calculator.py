from typing import List, Dict, Optional
from sqlmodel import Session, select
from api.models import Channel, Bonus, Surcharge

class EstimateCalculator:
    def __init__(self, session: Session):
        self.session = session
        self.channels = self.session.exec(select(Channel)).all()
        self.bonuses = self.session.exec(select(Bonus)).all()
        self.surcharges = self.session.exec(select(Surcharge)).all()

    def calculate_estimate(self,
                           selected_channels: List[str],
                           channel_budgets: Dict[str, float],
                           duration: int,
                           region_targeting: bool,
                           region_selections: Dict[str, str],
                           audience_targeting: bool,
                           ad_duration: int,
                           custom_targeting: bool,
                           is_new_advertiser: bool):

        results = {'details': [], 'summary': {}}
        total_budget_won = 0
        total_guaranteed_impressions = 0

        is_non_targeting = not audience_targeting and not region_targeting

        # Create lookup dicts for faster access
        channels_map = {c.channel_name: c for c in self.channels}

        # Organize bonuses by channel and type
        bonuses_map = {} # {channel_name: [Bonus, ...]}
        for b in self.bonuses:
            if b.channel_name not in bonuses_map:
                bonuses_map[b.channel_name] = []
            bonuses_map[b.channel_name].append(b)

        # Organize surcharges by channel and type
        surcharges_map = {}
        for s in self.surcharges:
            if s.channel_name not in surcharges_map:
                surcharges_map[s.channel_name] = []
            surcharges_map[s.channel_name].append(s)

        for channel_name in selected_channels:
            budget_mw = channel_budgets.get(channel_name, 0)
            if budget_mw == 0:
                continue

            budget_won = budget_mw * 10000
            total_budget_won += budget_won

            channel_info = channels_map.get(channel_name)
            if not channel_info:
                continue

            base_cpv_15s = channel_info.base_cpv
            if base_cpv_15s == 0:
                continue

            if ad_duration == 30:
                base_cpv = base_cpv_15s * 2.0
            else:
                base_cpv = base_cpv_15s

            total_bonus_rate = 0.0
            channel_bonuses = bonuses_map.get(channel_name, [])

            # --- Basic Bonus ---
            basic_bonus_rate = sum(b.rate for b in channel_bonuses if b.bonus_type == 'basic')
            total_bonus_rate += basic_bonus_rate

            # --- Duration Bonus ---
            duration_bonuses = [b.rate for b in channel_bonuses
                                if b.bonus_type == 'duration' and b.min_value <= duration]
            if duration_bonuses:
                total_bonus_rate += max(duration_bonuses)

            # --- Volume Bonus ---
            volume_bonuses = [b.rate for b in channel_bonuses
                              if b.bonus_type == 'volume' and b.min_value <= budget_won]
            if volume_bonuses:
                total_bonus_rate += max(volume_bonuses)

            # --- Promotion Bonus (New Advertiser) ---
            if is_new_advertiser:
                promo_bonus_rate = sum(b.rate for b in channel_bonuses
                                       if b.bonus_type == 'promotion' and b.condition_type == 'new_advertiser')
                total_bonus_rate += promo_bonus_rate

            # --- Non-targeting Bonus ---
            if is_non_targeting:
                non_targeting_bonus_rate = sum(b.rate for b in channel_bonuses
                                               if b.condition_type == 'non_targeting')
                total_bonus_rate += non_targeting_bonus_rate

            total_surcharge_rate = 0.0
            channel_surcharges = surcharges_map.get(channel_name, [])

            if region_targeting and region_selections.get(channel_name) != '선택안함':
                region_name = region_selections.get(channel_name)
                region_surcharges = [s for s in channel_surcharges
                                     if s.surcharge_type == 'region' and s.condition_value == region_name]
                if region_surcharges:
                     # Taking the first match as per original logic implicit behavior or assuming unique
                    total_surcharge_rate += region_surcharges[0].rate * 100.0

            if custom_targeting:
                custom_surcharges = [s for s in channel_surcharges if s.surcharge_type == 'custom']
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
