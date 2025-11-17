from .models import Channel, Bonus, Surcharge
from django.db.models import Max

class EstimateCalculator:
    def calculate_estimate(self, selected_channels, channel_budgets, duration,
                           region_targeting, region_selections,
                           audience_targeting, ad_duration, custom_targeting,
                           is_new_advertiser):
        results = {'details': [], 'summary': {}}
        total_budget_won = 0
        total_guaranteed_impressions = 0

        is_non_targeting = not audience_targeting and not region_targeting

        for channel_name in selected_channels:
            budget_mw = channel_budgets.get(channel_name, 0)
            if budget_mw == 0:
                continue

            budget_won = budget_mw * 10000
            total_budget_won += budget_won

            try:
                channel_info = Channel.objects.get(name=channel_name)
            except Channel.DoesNotExist:
                continue

            base_cpv_15s = channel_info.base_cpv
            if base_cpv_15s == 0:
                continue

            base_cpv = base_cpv_15s * 2.0 if ad_duration == 30 else base_cpv_15s

            # --- Bonus Calculation ---
            total_bonus_rate = 0.0

            # Basic Bonus
            basic_bonus = Bonus.objects.filter(channel=channel_info, bonus_type='basic').first()
            if basic_bonus:
                total_bonus_rate += basic_bonus.rate

            # Duration Bonus
            duration_bonus = Bonus.objects.filter(
                channel=channel_info, bonus_type='duration', min_value__lte=duration
            ).aggregate(max_rate=Max('rate'))
            if duration_bonus['max_rate']:
                total_bonus_rate += duration_bonus['max_rate']

            # Volume Bonus
            volume_bonus = Bonus.objects.filter(
                channel=channel_info, bonus_type='volume', min_value__lte=budget_won
            ).aggregate(max_rate=Max('rate'))
            if volume_bonus['max_rate']:
                total_bonus_rate += volume_bonus['max_rate']

            # New Advertiser Promotion Bonus
            if is_new_advertiser:
                promo_bonus = Bonus.objects.filter(
                    channel=channel_info, bonus_type='promotion', condition_type='new_advertiser'
                ).first()
                if promo_bonus:
                    total_bonus_rate += promo_bonus.rate

            # Non-targeting Bonus
            if is_non_targeting:
                non_targeting_bonus = Bonus.objects.filter(
                    channel=channel_info, condition_type='non_targeting'
                ).first()
                if non_targeting_bonus:
                    total_bonus_rate += non_targeting_bonus.rate

            # --- Surcharge Calculation ---
            total_surcharge_rate = 0.0

            # Region Surcharge
            if region_targeting and region_selections.get(channel_name) != '선택안함':
                region_name = region_selections.get(channel_name)
                region_surcharge = Surcharge.objects.filter(
                    channel=channel_info, surcharge_type='region', condition_value=region_name
                ).first()
                if region_surcharge:
                    total_surcharge_rate += region_surcharge.rate * 100.0

            # Custom Targeting Surcharge
            if custom_targeting:
                custom_surcharge = Surcharge.objects.filter(
                    channel=channel_info, surcharge_type='custom'
                ).first()
                if custom_surcharge:
                    total_surcharge_rate += custom_surcharge.rate * 100.0

            # --- Final Calculation ---
            surcharge_multiplier = (1 + (total_surcharge_rate / 100))
            applied_cpv = base_cpv * surcharge_multiplier

            bonus_multiplier = (1 + total_bonus_rate)

            initial_impressions = budget_won / applied_cpv if applied_cpv > 0 else 0
            guaranteed_impressions = initial_impressions * bonus_multiplier

            final_cpv = budget_won / guaranteed_impressions if guaranteed_impressions > 0 else 0

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

        average_cpv = total_budget_won / total_guaranteed_impressions if total_guaranteed_impressions > 0 else 0

        results['summary'] = {
            "total_budget": total_budget_won,
            "total_impressions": round(total_guaranteed_impressions),
            "average_cpv": average_cpv,
            "ad_duration": ad_duration,
            "duration_months": duration
        }
        return results
