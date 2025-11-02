import streamlit as st
import time
from core.data_manager import DataManager
from core.calculator import EstimateCalculator
from ai.recommender import AISegmentRecommender
from ui.pages import (
    render_admin_login,
    render_product_info_section,
    render_ad_settings_section,
    render_budget_section,
    render_results_section,
    render_sales_policy_page,
    render_segment_management_page
)
from ui.components import render_sidebar_links, render_report_button
from utils.validators import validate_budget_allocation, validate_required_fields

@st.cache_resource
def initialize_data():
    """
    앱 부팅 시(또는 슬립에서 깨어날 때) 한 번만 실행되어
    필수 데이터를 로드하고 캐시합니다.
    """
    data_manager = DataManager()
    return data_manager

def main():
    st.set_page_config(
        page_title="KOBACO 어드레서블 TV : AI 도우미",
        page_icon="🎯",
        layout="wide"
    )

    with st.spinner("🚀 AI 광고 전략 컨설턴트를 준비 중입니다..."):
        data_manager = initialize_data() 

    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'admin_mode' not in st.session_state:
        st.session_state.admin_mode = False
    if 'recommended_segments' not in st.session_state:
        st.session_state.recommended_segments = []

    if st.session_state.authenticated and st.session_state.admin_mode:
        with st.sidebar:
            st.title("📺 KOBACO (Admin)")
            st.success("🔐 관리자 모드")
            page = st.radio("메뉴 선택", ["✨ 고객 전용 페이지", "판매정책 관리", "세그먼트 관리"])
            if st.button("로그아웃"):
                st.session_state.authenticated = False
                st.session_state.admin_mode = False
                st.session_state.recommended_segments = []
                st.rerun()
    else:
        page = "✨ 고객 전용 페이지"


    if page == "✨ 고객 전용 페이지":
        st.title("🎯 KOBACO 어드레서블 TV : AI 도우미")
        col1, col2 = st.columns([2, 1])
        
        with col1:
            advertiser_name, product_name, website_url = render_product_info_section()
            
            # [★수정] 'if product_name:' 조건을 제거하여 버튼이 항상 보이도록 수정
            if st.button("🎯 AI 타깃 분석을 실행합니다.", type="primary", width='stretch'):
                st.session_state.recommended_segments = []
                recommender = AISegmentRecommender(data_manager)
                # recommender.recommend_segments가 product_name이 비었을 때 st.error를 띄울 것임
                st.session_state.recommended_segments = recommender.recommend_segments(product_name, website_url)
            
            if st.session_state.recommended_segments:
                st.header("🎯 AI 타깃 분석 결과")
                recommender = AISegmentRecommender(data_manager)
                recommender.display_recommendations(st.session_state.recommended_segments)

            ad_duration, audience_targeting, custom_targeting, region_targeting, region_selections = render_ad_settings_section(data_manager)
            
            total_budget, channel_budgets, duration, available_channels, is_valid_budget = render_budget_section(data_manager)

            if st.button("🚀 최적 광고 집행안 만들기", type="primary", width='stretch'):
                is_valid_fields, error_message = validate_required_fields(advertiser_name, product_name)
                
                if not is_valid_fields:
                    st.error(error_message)
                elif not is_valid_budget:
                    st.error("❌ 총 예산과 채널별 배분액이 일치하지 않습니다.")
                else:
                    calculator = EstimateCalculator(data_manager)
                    with st.spinner("🤖 AI가 최적의 광고 전략을 분석 중입니다..."):
                        estimate_result = calculator.calculate_estimate(
                            selected_channels=available_channels,
                            channel_budgets=channel_budgets,
                            duration=duration,
                            region_targeting=region_targeting,
                            region_selections=region_selections,
                            audience_targeting=audience_targeting,
                            ad_duration=ad_duration,
                            custom_targeting=custom_targeting
                        )
                        st.session_state.estimate_result = estimate_result
        
        with col2:
            render_sidebar_links()
            
            if not st.session_state.admin_mode:
                st.divider()
                render_admin_login()
        
        if 'estimate_result' in st.session_state:
            result = st.session_state.estimate_result
            if isinstance(result, dict) and "error" in result:
                st.error(f"❌ 계산 오류: {result['error']}")
            else:
                render_results_section(
                    result, 
                    EstimateCalculator(data_manager), 
                    st.session_state.advertiser_name,
                    st.session_state.product_name,
                    st.session_state.recommended_segments
                )
                
                render_report_button(
                    result,
                    st.session_state.advertiser_name,
                    st.session_state.product_name,
                    st.session_state.recommended_segments
                )

    elif page == "판매정책 관리":
        render_sales_policy_page(data_manager)
    elif page == "세그먼트 관리":
        render_segment_management_page(data_manager)

if __name__ == "__main__":
    main()