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

    def calculate_estimate(self, selected_channels, channel_budgets, duration, 
                           region_targeting, region_selections, 
                           audience_targeting, ad_duration, custom_targeting):
        
        results = []
        total_budget = 0
        total_guaranteed_impressions = 0
        
        if self.channels_df is None:
            return {"error": "채널 데이터를 로드할 수 없습니다."}

        for channel in selected_channels:
            budget_won = channel_budgets[channel] * 10000
            if budget_won == 0:
                continue

            channel_info = self.channels_df[self.channels_df['channel_name'] == channel]
            if channel_info.empty:
                continue
                
            base_cpv = channel_info.iloc[0]['base_cpv']
            if pd.isna(base_cpv) or base_cpv == 0:
                continue

            base_impressions = budget_won / base_cpv
            total_bonus_rate = 0.0
            
            if self.bonuses_df is not None:
                
                basic_bonus = self.bonuses_df[
                    (self.bonuses_df['bonus_type'] == 'basic') &
                    (self.bonuses_df['channel_name'] == channel)
                ]
                if not basic_bonus.empty:
                    total_bonus_rate += basic_bonus['rate'].sum()

                duration_bonus = self.bonuses_df[
                    (self.bonuses_df['bonus_type'] == 'duration') &
                    (self.bonuses_df['channel_name'] == channel) &
                    (self.bonuses_df['min_value'] <= duration)
                ]
                if not duration_bonus.empty:
                    total_bonus_rate += duration_bonus['rate'].max()

                volume_bonus = self.bonuses_df[
                    (self.bonuses_df['bonus_type'] == 'volume') &
                    (self.bonuses_df['channel_name'] == channel) &
                    (self.bonuses_df['min_value'] <= budget_won)
                ]
                if not volume_bonus.empty:
                    total_bonus_rate += volume_bonus['rate'].max()
                
                promo_bonus = self.bonuses_df[
                    (self.bonuses_df['bonus_type'] == 'promotion') &
                    (self.bonuses_df['channel_name'] == channel)
                ]
                if not promo_bonus.empty:
                    total_bonus_rate += promo_bonus['rate'].sum()
            
            total_surcharge_rate = 0.0
            
            if ad_duration == 15:
                total_surcharge_rate += -30.0 
            
            if audience_targeting:
                total_surcharge_rate += 30.0
            
            if custom_targeting:
                total_surcharge_rate += 20.0
            
            if region_targeting and region_selections.get(channel) != '선택안함':
                region_name = region_selections.get(channel)
                if self.surcharges_df is not None:
                    region_surcharge = self.surcharges_df[
                        (self.surcharges_df['surcharge_type'] == 'region') &
                        (self.surcharges_df['condition_value'] == region_name)
                    ]
                    if not region_surcharge.empty:
                        total_surcharge_rate += region_surcharge.iloc[0]['rate']

            net_rate_modifier = (1 + total_bonus_rate) / (1 + (total_surcharge_rate / 100))
            guaranteed_impressions = base_impressions * net_rate_modifier
            
            final_cpv = 0
            if guaranteed_impressions > 0:
                final_cpv = budget_won / guaranteed_impressions

            results.append({
                "channel": channel,
                "budget": budget_won,
                "base_cpv": base_cpv,
                "total_bonus_rate": total_bonus_rate * 100,
                "total_surcharge_rate": total_surcharge_rate,
                "guaranteed_impressions": round(guaranteed_impressions),
                "final_cpv": final_cpv
            })
            
            total_budget += budget_won
            total_guaranteed_impressions += guaranteed_impressions

        average_cpv = 0
        if total_guaranteed_impressions > 0:
            average_cpv = total_budget / total_guaranteed_impressions

        summary = {
            "total_budget": total_budget,
            "total_impressions": round(total_guaranteed_impressions),
            "average_cpv": average_cpv,
            "ad_duration": ad_duration
        }

        return {"summary": summary, "details": results}

    def get_font_base64(self, font_path):
        try:
            with open(font_path, "rb") as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except Exception as e:
            print(f"Font loading error: {e}")
            return None

    def generate_html_report(self, result, advertiser_name, product_name, recommended_segments):
        summary = result['summary']
        details = result['details']
        
        nanum_gothic_bold_path = "NanumGothicBold.ttf"
        nanum_gothic_path = "NanumGothic.ttf"
        
        nanum_bold_b64 = self.get_font_base64(nanum_gothic_bold_path)
        nanum_regular_b64 = self.get_font_base64(nanum_gothic_path)

        total_budget_won = summary['total_budget']
        final_total_impressions = summary['total_impressions']
        base_cpv_total = 10.0
        total_base_impressions = 0.0
        total_bonus_rate_percent = 0.0

        if base_cpv_total > 0:
            total_base_impressions = total_budget_won / base_cpv_total
        
        if total_base_impressions > 0:
            total_bonus_rate_percent = ((final_total_impressions / total_base_impressions) - 1) * 100

        summary_details = {
            'base_cpv_total': f"{base_cpv_total:.1f}",
            'total_bonus_rate_percent': f"{total_bonus_rate_percent:.1f}%"
        }

        html_template = """
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <title>KOBACO AI 광고 전략 제안서</title>
            <style>
                @font-face {
                    font-family: 'NanumGothic';
                    font-weight: 700;
                    src: url(data:font/truetype;charset=utf-8;base64,{{ nanum_bold_b64 }}) format('truetype');
                }
                @font-face {
                    font-family: 'NanumGothic';
                    font-weight: 400;
                    src: url(data:font/truetype;charset=utf-8;base64,{{ nanum_regular_b64 }}) format('truetype');
                }
                body {
                    font-family: 'NanumGothic', sans-serif;
                    margin: 0 auto;
                    padding: 30px;
                    max-width: 900px;
                    color: #333;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 3px solid #004a9e;
                    padding-bottom: 10px;
                }
                .header h1 {
                    font-size: 28px;
                    color: #004a9e;
                    margin: 0;
                    font-weight: 700;
                }
                .header .logo {
                    font-size: 24px;
                    font-weight: 700;
                    color: #004a9e;
                }
                .info-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    margin-bottom: 30px;
                    border-top: 2px solid #333;
                }
                .info-table th, .info-table td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                    font-size: 14px;
                }
                .info-table th {
                    background-color: #f9f9f9;
                    width: 150px;
                    font-weight: 700;
                }
                .summary {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .summary-item {
                    background-color: #f9f9f9;
                    border: 1px solid #ddd;
                    padding: 20px;
                    border-radius: 5px;
                    text-align: center;
                }
                .summary-item h3 {
                    margin: 0 0 10px 0;
                    font-size: 16px;
                    color: #555;
                    font-weight: 700;
                }
                .summary-item p {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    color: #004a9e;
                }
                h2 {
                    font-size: 20px;
                    color: #004a9e;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 8px;
                    margin-top: 30px;
                }
                .results-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                .results-table th, .results-table td {
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: center;
                    font-size: 14px;
                }
                .results-table th {
                    background-color: #f0f6ff;
                    font-weight: 700;
                }
                .results-table tr:last-child {
                    background-color: #f9f9f9;
                    font-weight: 700;
                }
                .segment-list {
                    background-color: #fdfdfd;
                    border: 1px solid #eee;
                    padding: 20px;
                    margin-top: 15px;
                }
                .segment-item {
                    border-bottom: 1px dashed #ddd;
                    padding-bottom: 10px;
                    margin-bottom: 10px;
                }
                .segment-item:last-child {
                    border-bottom: none;
                    margin-bottom: 0;
                }
                .segment-item strong {
                    font-size: 15px;
                    color: #333;
                }
                .segment-item p {
                    font-size: 13px;
                    color: #666;
                    margin: 5px 0 0 0;
                }
                .segment-item .score {
                    display: inline-block;
                    background: #004a9e;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    margin-left: 10px;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #888;
                }
                
                .print-button {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 10px 20px;
                    font-size: 16px;
                    font-weight: 700;
                    font-family: 'NanumGothic', sans-serif;
                    background-color: #004a9e;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                }
                
                @media print {
                    .print-button {
                        display: none;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        max-width: 100%;
                    }
                    .summary-item {
                        background-color: #f9f9f9 !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .results-table th {
                         background-color: #f0f6ff !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .results-table tr:last-child {
                        background-color: #f9f9f9 !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .info-table th {
                        background-color: #f9f9f9 !important;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    table, .summary-item, .segment-list {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <button onclick="window.print()" class="print-button">
                🖨️ 인쇄 / PDF로 저장
            </button>

            <div class="header">
                <h1>🤖 AI 광고 전략 제안서</h1>
                <div class="logo">KOBACO</div>
            </div>
            
            <table class="info-table">
                <tr>
                    <th>광고주명</th>
                    <td>{{ advertiser_name }}</td>
                </tr>
                <tr>
                    <th>제품명</th>
                    <td>{{ product_name }}</td>
                </tr>
                <tr>
                    <th>분석일</th>
                    <td>{{ today }}</td>
                </tr>
                <tr>
                    <th>광고 초수</th>
                    <td>{{ summary.ad_duration }}초</td>
                </tr>
            </table>

            <h2>📊 종합 전략 지표</h2>
            <div class="summary">
                <div class="summary-item">
                    <h3>총 광고 예산</h3>
                    <p>{{ "{:,.0f}원".format(summary.total_budget) }}</p>
                </div>
                <div class="summary-item">
                    <h3>총 보장 노출수</h3>
                    <p>{{ "{:,.0f}회".format(summary.total_impressions) }}</p>
                </div>
                <div class="summary-item">
                    <h3>평균 CPV</h3>
                    <p>{{ "{:.1f}원".format(summary.average_cpv) }}</p>
                </div>
            </div>

            <h2>📈 채널별 상세 내역</h2>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>채널</th>
                        <th>예산(원)</th>
                        <th>기본 CPV</th>
                        <th>보너스율</th>
                        <th>할증율</th>
                        <th>최종 CPV</th>
                        <th>보장 노출수</th>
                    </tr>
                </thead>
                <tbody>
                    {% for detail in details %}
                    <tr>
                        <td>{{ detail.channel }}</td>
                        <td>{{ "{:,.0f}".format(detail.budget) }}</td>
                        <td>{{ "{:.1f}".format(detail.base_cpv) }}</td>
                        <td>{{ "{:.1f}%".format(detail.total_bonus_rate) }}</td>
                        <td>{{ "{:.1f}%".format(detail.total_surcharge_rate) }}</td>
                        <td>{{ "{:.1f}".format(detail.final_cpv) }}</td>
                        <td>{{ "{:,.0f}".format(detail.guaranteed_impressions) }}</td>
                    </tr>
                    {% endfor %}
                    <tr>
                        <td>종합</td>
                        <td>{{ "{:,.0f}".format(summary.total_budget) }}</td>
                        <td>{{ summary_details.base_cpv_total }}</td>
                        <td>{{ summary_details.total_bonus_rate_percent }}</td>
                        <td>-</td>
                        <td>{{ "{:.1f}".format(summary.average_cpv) }}</td>
                        <td>{{ "{:,.0f}".format(summary.total_impressions) }}</td>
                    </tr>
                </tbody>
            </table>
            
            {% if recommended_segments %}
            <h2>🎯 AI 추천 타겟 세그먼트</h2>
            <div class="segment-list">
                {% for segment in recommended_segments %}
                <div class="segment-item">
                    <strong>{{ segment.name }}</strong>
                    {% if segment.confidence_score %}
                    <span class="score">적합도: {{ segment.confidence_score }}점</span>
                    {% endif %}
                    <p><strong>💡 추천 이유:</strong> {{ segment.reason }}</p>
                    {% if segment.key_factors %}
                    <p><strong>🔑 핵심 매칭 요소:</strong> {{ segment.key_factors|join(', ') }}</p>
                    {% endif %}
                </div>
                {% endfor %}
            </div>
            {% endif %}

            <div class="footer">
                <p>본 제안서는 KOBACO AI 전략 분석 시스템에 의해 생성되었습니다.<br>
                   실제 집행 시 약간의 오차가 발생할 수 있습니다.</p>
            </div>
            
        </body>
        </html>
        """

        env = Environment(loader=FileSystemLoader('.'), autoescape=select_autoescape(['html']))
        template = env.from_string(html_template)
        
        return template.render(
            advertiser_name=advertiser_name,
            product_name=product_name,
            today=datetime.now().strftime('%Y-%m-%d'),
            summary=summary,
            details=details,
            summary_details=summary_details,
            recommended_segments=recommended_segments,
            nanum_bold_b64=nanum_bold_b64,
            nanum_regular_b64=nanum_regular_b64
        )
