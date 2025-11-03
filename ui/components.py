import streamlit as st
import pandas as pd
import streamlit.components.v1 as components
import base64

def create_metric_cards(summary):
    """요약 지표 카드를 생성합니다."""
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("총 월 예산", f"{summary['total_budget']:,.0f}원")
    with col2:
        st.metric("총 월 노출수", f"{summary['total_impressions']:,.0f}회")
    with col3:
        st.metric("평균 CPV", f"{summary['average_cpv']:.1f}원")
    with col4:
        st.metric("광고 초수", f"{summary['ad_duration']}초")

def create_results_table(result):
    """채널별 상세 내역 테이블을 생성합니다."""
    details_data = []
    summary = result['summary']
    
    for detail in result['details']:
        details_data.append({
            '채널': detail['channel'],
            '예산(원)': f"{detail['budget']:,.0f}",
            '기본 CPV': f"{detail['base_cpv']:.1f}",
            '보너스율': f"{detail['total_bonus_rate']:.1f}%",
            '할증율': f"{detail['total_surcharge_rate']:.1f}%",
            '노출수': f"{detail['guaranteed_impressions']:,.0f}",
            '최종 CPV': f"{detail['final_cpv']:.1f}"
        })
    
    if details_data:
        total_budget_won = summary['total_budget']
        final_total_impressions = summary['total_impressions']
        base_cpv_total = 10.0 
        total_base_impressions = total_budget_won / base_cpv_total if base_cpv_total > 0 else 0
        total_bonus_rate_percent = ((final_total_impressions / total_base_impressions) - 1) * 100 if total_base_impressions > 0 else 0

        details_data.append({
            '채널': '종합',
            '예산(원)': f"{summary['total_budget']:,.0f}",
            '기본 CPV': f"{base_cpv_total:.1f}",
            '보너스율': f"{total_bonus_rate_percent:.1f}%",
            '할증율': "-", 
            '노출수': f"{summary['total_impressions']:,.0f}",
            '최종 CPV': f"{summary['average_cpv']:.1f}"
        })

        st.dataframe(
            pd.DataFrame(details_data), 
            use_container_width=True,
            column_config={
                "채널": st.column_config.TextColumn(width="small"),
                "예산(원)": st.column_config.TextColumn(width="medium"),
                "기본 CPV": st.column_config.TextColumn(),
                "보너스율": st.column_config.TextColumn(width="small"),
                "할증율": st.column_config.TextColumn(width="small"),
                "노출수": st.column_config.TextColumn(width="medium"),
                "최종 CPV": st.column_config.TextColumn(),
            }
        )

def create_region_selectors(available_channels, surcharges_data):
    """채널별 지역 타겟팅 선택기 생성"""
    region_selections = {}
    region_cols = st.columns(len(available_channels))
    for i, channel in enumerate(available_channels):
        
        if surcharges_data is not None:
            channel_regions = surcharges_data[
                (surcharges_data['surcharge_type'] == 'region') &
                (surcharges_data['channel_name'] == channel)
            ]
            region_options = ["선택안함"] + channel_regions['condition_value'].unique().tolist()
        else:
            region_options = ["선택안함"]
            
        with region_cols[i]:
            region_selections[channel] = st.selectbox(
                f"{channel} 지역",
                region_options,
                key=f"region_{channel}"
            )
    return region_selections

def create_budget_inputs(available_channels, total_budget, default_allocations):
    """채널별 예산 입력 필드 생성"""
    channel_budgets = {}
    budget_cols = st.columns(len(available_channels))
    for i, channel in enumerate(available_channels):
        with budget_cols[i]:
            default_budget = int(total_budget * default_allocations.get(channel, 0.3))
            channel_budget = st.number_input(
                f"{channel} 예산 (만원)",
                min_value=0,
                max_value=total_budget,
                value=default_budget,
                step=100,
                key=f"channel_budget_{channel}"
            )
            channel_budgets[channel] = channel_budget
    return channel_budgets

def render_sidebar_links():
    """사이드바 링크 렌더링"""
    st.header("🔗 바로가기")
    # [★문구 수정]
    st.link_button("🤖 AI에게 질문하기 (NotebookLM)", 
                  "https://notebooklm.google.com/notebook/ab573898-2bb6-4034-8694-bc1c08d480c7", 
                  width='stretch')
    st.link_button("📄 Addressable 소개자료 다운로드", 
                  "https://drive.google.com/file/d/1iyZCKQSYvrxazfxaz4F5Eh2ejjfWbZUw/view?usp=sharing",
                  width='stretch')
    st.header("📬 이메일 문의")
    st.link_button(
    "📧 담당자 박태준 차장 | tj1000@kobaco.co.kr",
    "mailto:tj1000@kobaco.co.kr", width='stretch')

def render_report_button(result, advertiser_name, product_name, recommended_segments):
    """HTML 리포트 생성 버튼 렌더링"""
    # [★수정] width='stretch'
    if st.button("📄 AI 광고 전략 제안서 생성하기", type="primary", width='stretch'):
        try:
            from reports.html_generator import generate_html_report
            html_content = generate_html_report(
                result, 
                advertiser_name, 
                product_name, 
                recommended_segments,
                ai_strategy_comment=""
            )
            
            b64_html = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
            
            components.html(
                f"""
                <script>
                (function() {{
                    const newWindow = window.open("", "_blank");
                    if (newWindow) {{
                        newWindow.document.write(decodeURIComponent(escape(window.atob("{b64_html}"))));
                        newWindow.document.close();
                    }} else {{
                        alert("팝업이 차단되었습니다. 팝업을 허용해주세요.");
                    }}
                }})();
                </script>
                """,
                height=0,
                width=0,
            )
        except ImportError as ie:
            st.error(f"❌ 리포트 생성 실패 (ImportError): {ie}. 'reports/html_generator.py' 파일에 'generate_html_report' 함수가 있는지 확인하세요.")
        except Exception as e:
            st.error(f"❌ 전략 제안서 생성 오류: {e}")