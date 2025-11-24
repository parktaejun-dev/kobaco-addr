import pandas as pd
from datetime import datetime
import os
import io
from jinja2 import Environment, FileSystemLoader, select_autoescape
import base64

def get_font_base_64(font_path):
    """로컬 폰트 파일을 Base64로 인코딩합니다."""
    try:
        with open(font_path, "rb") as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        print(f"Font loading error: {e}")
        return None

def get_image_base_64(image_path):
    """로컬 이미지 파일을 Base64로 인코딩합니다."""
    try:
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        print(f"Image loading error: {e}")
        return None

def get_josa(name, josa_type='object'):
    """
    한국어 이름 뒤에 올바른 조사를 반환합니다.

    Args:
        name: 이름 문자열
        josa_type: 'object' (을/를), 'subject' (이/가), 'topic' (은/는)

    Returns:
        올바른 조사 문자열
    """
    if not name:
        return ''

    last_char = name[-1]

    # 한글인지 확인
    if '가' <= last_char <= '힣':
        # 받침 확인: (유니코드 - 0xAC00) % 28
        # 0이면 받침 없음, 아니면 받침 있음
        code = ord(last_char) - 0xAC00
        has_jongseong = (code % 28) != 0
    else:
        # 한글이 아닌 경우 (영어, 숫자 등) - 받침 있는 것으로 간주
        has_jongseong = True

    if josa_type == 'object':
        return '을' if has_jongseong else '를'
    elif josa_type == 'subject':
        return '이' if has_jongseong else '가'
    elif josa_type == 'topic':
        return '은' if has_jongseong else '는'
    else:
        return ''

def generate_html_report(result, advertiser_name, product_name, recommended_segments, ai_strategy_comment=""):
    summary = result['summary']
    details = result['details']
    
    nanum_gothic_bold_path = "NanumGothicBold.ttf"
    nanum_gothic_path = "NanumGothic.ttf"
    logo_path = "kobaco_logo.png"
    
    nanum_bold_b64 = get_font_base_64(nanum_gothic_bold_path)
    nanum_regular_b64 = get_font_base_64(nanum_gothic_path)
    logo_b64 = get_image_base_64(logo_path)

    total_budget_won = summary['total_budget']
    final_total_impressions = summary['total_impressions']

    # 채널별 기본 노출수를 합산하여 전체 기본 노출수 계산
    total_base_impressions = 0.0
    for detail in details:
        if detail.get('base_cpv', 0) > 0:
            base_impressions = detail['budget'] / detail['base_cpv']
            total_base_impressions += base_impressions

    # 전체 평균 기본 CPV 계산
    base_cpv_total = total_budget_won / total_base_impressions if total_base_impressions > 0 else 0

    # 전체 보너스율 계산
    total_bonus_rate_percent = 0.0
    if total_base_impressions > 0:
        total_bonus_rate_percent = ((final_total_impressions / total_base_impressions) - 1) * 100

    summary_details = {
        'base_cpv_total': f"{base_cpv_total:.1f}",
        'total_bonus_rate_percent': f"{total_bonus_rate_percent:.1f}%"
    }

    # 광고주명 뒤에 올바른 조사 계산
    josa = get_josa(advertiser_name, 'object')

    html_template = """
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{{ advertiser_name }}{{ josa }} 위한 KOBACO AI 광고 최적화 플랜</title>
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
                background-color: #ffffff; 
                word-wrap: break-word;
            }
            .container {
                padding: 40px;
                background-color: #ffffff;
                border: 1px solid #ddd;
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
            .header h1 .advertiser-name {
                color: #d9534f;
                font-weight: 700;
            }
            .header .logo {
                max-height: 40px; 
                width: auto;
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
            .table-wrapper {
                width: 100%;
                overflow-x: auto;
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
                white-space: nowrap;
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
            .segment-item p.segment-title-row {
                 margin: 5px 0 0 0;
            }
            .segment-item p.segment-detail-row {
                 margin: 5px 0 0 20px;
            }
            
            .segment-item p .key-factors-text {
                color: #004a9e;
                font-weight: 700;
            }
            
            .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 12px;
                color: #888;
                border-top: 1px solid #eee;
                padding-top: 20px;
            }
            .footer .contact-info {
                margin-top: 15px;
                font-size: 13px;
                color: #555;
                line-height: 1.7;
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
            
            .ai-section {
                background-color: #f0f6ff;
                border: 1px solid #cce0ff;
                padding: 25px;
                margin-top: 15px;
                border-radius: 5px;
                height: auto;
                min-height: auto;
                overflow: visible;
            }
            .ai-section h2 {
                margin-top: 0;
                padding-bottom: 10px;
            }
            .ai-section p {
                font-size: 15px;
                line-height: 1.6;
                color: #333;
                white-space: pre-wrap;
                margin: 0;
            }
            
            @media (max-width: 600px) {
                body {
                    padding: 15px;
                }
                .container {
                    padding: 20px;
                }
                .header h1 {
                    font-size: 22px;
                }
                .header .logo {
                    max-height: 30px;
                }
                .summary {
                    grid-template-columns: 1fr;
                    gap: 10px;
                }
                .summary-item {
                    padding: 15px;
                }
                .summary-item p {
                    font-size: 20px;
                }
                .results-table {
                    font-size: 12px;
                }
                .results-table th, .results-table td {
                    padding: 6px 4px;
                }
                .info-table th, .info-table td {
                    padding: 8px;
                    font-size: 12px;
                }
                h2 {
                    font-size: 18px;
                }
                .segment-item strong {
                    display: block;
                    margin-left: 0;
                    margin-top: 5px;
                }
            }
            
            @media print {
                @page {
                    size: A4;
                    margin: 0.4cm;
                }
                body {
                    margin: 0;
                    padding: 0;
                    max-width: 100%;
                    background-color: #ffffff !important;
                    font-size: 9pt;
                }

                .container {
                    border: none;
                    box-shadow: none;
                    padding: 0;
                    display: block;
                    min-height: 0;
                }
                .main-content {
                    flex-grow: 0;
                }

                .header {
                    margin-bottom: 4px;
                }
                .header h1 {
                    font-size: 18px;
                }
                .header h1 .advertiser-name {
                    color: #d9534f !important;
                    -webkit-print-color-adjust: exact;
                    color-adjust: exact;
                }
                .header .logo {
                    max-height: 25px;
                }
                h2 {
                    font-size: 14px;
                    margin-top: 4px;
                    margin-bottom: 3px;
                    padding-bottom: 2px;
                    border-bottom-width: 1px;
                }
                .info-table, .summary, .results-table, .segment-list, .ai-section {
                    margin-top: 3px;
                    margin-bottom: 3px;
                }
                .info-table th, .info-table td {
                    padding: 3px;
                    font-size: 8.5pt;
                }
                .summary {
                    gap: 5px;
                    margin-bottom: 3px;
                }
                .summary-item {
                    padding: 5px;
                }
                .summary-item h3 {
                    font-size: 10px;
                    margin-bottom: 2px;
                }
                .summary-item p {
                    font-size: 14px;
                }
                .results-table th, .results-table td {
                    padding: 3px;
                    font-size: 8.5pt;
                }
                .segment-list {
                    padding: 5px;
                }
                .segment-item {
                    padding-bottom: 3px;
                    margin-bottom: 3px;
                }
                .segment-item strong {
                    font-size: 9pt;
                }
                .segment-item p .key-factors-text {
                    color: #004a9e;
                    font-weight: 700;
                }
                .segment-item p {
                    font-size: 8.5pt;
                    margin: 2px 0 0 0;
                }
                .segment-item p.segment-detail-row {
                    margin: 2px 0 0 15px;
                }

                .ai-section {
                    padding: 6px;
                    height: auto;
                    min-height: auto;
                }
                .ai-section p {
                    font-size: 8.5pt;
                    line-height: 1.3;
                    margin: 0;
                }

                .footer {
                    margin-top: 6px;
                    padding-top: 4px;
                    font-size: 7.5pt;
                    flex-shrink: 0;
                }
                .footer .contact-info {
                    margin-top: 3px;
                    font-size: 8pt;
                    line-height: 1.2;
                }

                .print-button {
                    display: none;
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
                .ai-section {
                    background-color: #f0f6ff !important;
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

        <div class="container">
            <div class="main-content">
                <div class="header">
                    <h1><span class="advertiser-name">{{ advertiser_name }}</span>{{ josa }} 위한 AI 광고 최적화 플랜</h1>
                    <img src="data:image/png;base64,{{ logo_b64 }}" class="logo" alt="KOBACO Logo">
                </div>
                
                <table class="info-table">
                    <tr>
                        <th>광고주명</th>
                        <td>{{ advertiser_name }}</td>
                        <th>제품명</th>
                        <td>{{ product_name }}</td>
                    </tr>
                    <tr>
                        <th>총 월 예산</th>
                        <td>{{ "{:,.0f}원".format(summary.total_budget) }}</td>
                        <th>집행 기간</th>
                        <td>{{ summary.duration_months }}개월</td>
                    </tr>
                    <tr>
                        <th>분석일</th>
                        <td>{{ today }}</td>
                        <th>광고 초수</th>
                        <td>{{ summary.ad_duration }}초</td>
                    </tr>
                </table>

                <h2>📊 종합 성과 요약 (월 기준)</h2>
                <div class="summary">
                    <div class="summary-item">
                        <h3>총 월 예산</h3>
                        <p>{{ "{:,.0f}원".format(summary.total_budget) }}</p>
                    </div>
                    <div class="summary-item">
                        <h3>총 월 노출수</h3>
                        <p>{{ "{:,.0f}회".format(summary.total_impressions) }}</p>
                    </div>
                    <div class="summary-item">
                        <h3>평균 CPV</h3>
                        <p>{{ "{:.1f}원".format(summary.average_cpv) }}</p>
                    </div>
                </div>

                <h2>📈 채널별 상세 내역 (월 기준)</h2>
                <div class="table-wrapper">
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
                </div>
                
                {% if recommended_segments %}
                <h2>🎯 AI 타겟 분석 상세</h2>
                <div class="segment-list">
                    {% for segment in recommended_segments %}
                    
                    <div class="segment-item">
                        <p class="segment-title-row">
                            <strong>{{ loop.index }}. {{ segment.full_path | default(segment.name, true) }}</strong>
                            
                            {% if segment.confidence_score is defined %}
                            <span style="display: inline-block; font-size: 1.1em; font-weight: 700; color: #d9534f; margin-left: 10px;">
                                [ 🎯 적합도: {{ "%.0f"|format(segment.confidence_score) }}점 ]
                            </span>
                            {% endif %}
                        </p>
                        
                        {% if segment.key_factors %}
                        <p class="segment-detail-row">
                            <strong>🔑 핵심 매칭 요소:</strong> <span class="key-factors-text">{{ segment.key_factors|join(', ') }}</span>
                        </p>
                        {% endif %}
                        
                        <p class="segment-detail-row">
                            <strong>💡 추천 이유:</strong> {{ segment.reason | default('N/A') }}
                        </deta>
                    </div>
                    
                    {% endfor %}
                </div>
                {% endif %}

                {% if ai_strategy_comment %}
                <h2>💬 AI 종합의견</h2>
                <div class="ai-section">
                    <p>{{ ai_strategy_comment }}</p>
                </div>
                {% endif %}
            </div>
            <div class="footer">
                <div class="contact-info">
                    <strong>[제안서 문의] KOBACO 전략마케팅국 크로스세일즈팀</strong><br>
                    박태준 차장 (02-731-7297, tj1000@kobaco.co.kr) | 이효정 과장 (02-731-7296, hlee0405@kobaco.co.kr)
                </div>
            </div>
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
        ai_strategy_comment=ai_strategy_comment,
        josa=josa,
        nanum_bold_b64=nanum_bold_b64,
        nanum_regular_b64=nanum_regular_b64,
        logo_b64=logo_b64
    )