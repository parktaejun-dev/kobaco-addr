# app.py (수정 완료된 전체 코드)
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
    render_segment_management_page,
    render_stats_page  # 통계 페이지 임포트
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
        page_title="KOBA-TA (Target Advisor)",
        page_icon="🚀",
        layout="wide"
    )

    with st.spinner("🚀 KOBA-TA (Target Advisor)를 준비 중입니다..."):
        data_manager = initialize_data() 

    if 'consent_given' not in st.session_state:
        st.session_state.consent_given = False
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'admin_mode' not in st.session_state:
        st.session_state.admin_mode = False
    if 'recommended_segments' not in st.session_state:
        st.session_state.recommended_segments = []
    if 'product_understanding' not in st.session_state:
        st.session_state.product_understanding = ""
    if 'expanded_keywords' not in st.session_state:
        st.session_state.expanded_keywords = []

    if st.session_state.consent_given and 'visit_logged' not in st.session_state:
        try:
            data_manager.log_visit()
            st.session_state.visit_logged = True
        except Exception as e:
            print(f"Visit log failed: {e}")


    if st.session_state.authenticated and st.session_state.admin_mode:
        with st.sidebar:
            st.title("📺 KOBACO (Admin)")
            st.success("🔐 관리자 모드")
            
            page = st.radio("메뉴 선택", 
                            ["✨ 고객용 페이지", 
                             "판매정책 관리", 
                             "세그먼트 관리", 
                             "📊 통계 분석"]) # 통계 메뉴
            
            if st.button("로그아웃"):
                st.session_state.authenticated = False
                st.session_state.admin_mode = False
                st.session_state.recommended_segments = []
                st.session_state.product_understanding = ""
                st.session_state.expanded_keywords = []
                st.session_state.consent_given = False 
                st.rerun()
    else:
        page = "✨ 고객용 페이지"


    if page == "✨ 고객용 페이지":
        st.title("KOBATA(Target Advisor) AI🚀")
        
        with st.expander("ℹ️ KOBATA 시스템 개요 및 통계 수집 동의 (필수)", expanded=not st.session_state.consent_given):
            st.info("""
            **KOBATA(Target Advisor)란?**
            KOBACO의 **Addressable TV 광고 집행**을 위한 AI 기반 타겟 분석 및 견적 시뮬레이션 시스템입니다.
            
            **서비스 개선을 위한 통계 수집 안내**
            더 나은 서비스 제공을 위해 **비식별화된** 통계 데이터를 수집하며, 통계적 목적으로만 활용됩니다.
            
            - **수집 항목:** 1. 방문 일시 (IP 제외), 2. AI가 분석/비식별화한 제품 요약 및 연관 키워드
            - **수집 목적:** 서비스 개선 및 AI 모델 성능 향상을 위한 통계 분석
            """)
            st.checkbox("위 내용에 모두 동의합니다.", key='consent_given')
        
        is_disabled = not st.session_state.consent_given
        
        col1, col2 = st.columns([2, 1])
        
        with col1:
            with st.container(border=True):
                st.header("📋 광고 캠페인 기본 정보")
                st.caption("광고 제품명과 URL 주소를 입력해주시면, AI가 적합한 타깃을 추천해 드립니다.")
                advertiser_name, product_name, website_url = render_product_info_section(disabled=is_disabled)
            
            num_recommendations = st.slider(
                "🎯 AI 추천 세그먼트 개수 설정(5개 기본값 추천)", 
                min_value=1, 
                max_value=10, 
                value=5,  
                step=1, 
                key="num_recommendations",
                disabled=is_disabled
            )
            
            if st.button("🤖 AI 타겟 분석 요청", type="primary", width='stretch', disabled=is_disabled):
                st.session_state.recommended_segments = []
                st.session_state.product_understanding = ""
                st.session_state.expanded_keywords = []
                
                recommender = AISegmentRecommender(data_manager)
                
                recs, understanding, keywords = recommender.recommend_segments(
                    product_name, 
                    website_url,
                    num_recommendations
                )
                
                st.session_state.recommended_segments = recs
                st.session_state.product_understanding = understanding
                st.session_state.expanded_keywords = keywords
            
            if st.session_state.recommended_segments:
                st.header("🎯 AI 타겟 분석 결과")
                recommender = AISegmentRecommender(data_manager)
                recommender.display_recommendations(st.session_state.recommended_segments)

            with st.container(border=True):
                ad_duration, audience_targeting, region_targeting, region_selections, is_new_advertiser = render_ad_settings_section(data_manager, disabled=is_disabled)
            
            with st.container(border=True):
                total_budget, channel_budgets, duration, available_channels, is_valid_budget = render_budget_section(data_manager, disabled=is_disabled)

            if st.button("🧮 AI 최적화 플랜 생성하기", type="primary", width='stretch', disabled=is_disabled):
                is_valid_fields, error_message = validate_required_fields(advertiser_name, product_name)
                
                if not is_valid_fields:
                    st.error(error_message)
                elif not is_valid_budget:
                    st.error("❌ 총 예산과 채널별 배분액이 일치하지 않습니다.")
                else:
                    if st.session_state.consent_given: 
                        try:
                            understanding = st.session_state.get('product_understanding', '')
                            keywords = st.session_state.get('expanded_keywords', [])
                            
                            # ✨ [수정] 'advertiser_name'을 저장하지 않습니다.
                            history_data = {
                                'product_understanding': understanding,
                                'expanded_keywords': ", ".join(keywords), 
                                'total_budget': total_budget,
                                'duration': duration,
                                'ad_duration': ad_duration,
                                'audience_targeting': audience_targeting,
                                'region_targeting': region_targeting,
                                'is_new_advertiser': is_new_advertiser 
                            }
                            for ch, budget in channel_budgets.items():
                                history_data[f'{ch}_budget'] = budget
                            
                            data_manager.log_input_history(history_data)
                            
                        except Exception as e:
                            print(f"⚠️ 사용자 입력 히스토리 저장 실패: {e}")

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
                            custom_targeting=False,
                            is_new_advertiser=is_new_advertiser 
                        )
                        
                        if isinstance(estimate_result, dict) and "error" not in estimate_result:
                            estimate_result['advertiser_name'] = advertiser_name
                            estimate_result['product_name'] = product_name 
                            estimate_result['recommended_segments'] = st.session_state.recommended_segments
                        
                        st.session_state.estimate_result = estimate_result
            
            if 'estimate_result' in st.session_state:
                result = st.session_state.estimate_result
                if isinstance(result, dict) and "error" in result:
                    st.error(f"❌ 계산 오류: {result['error']}")
                else:
                    render_results_section(
                        result, 
                        EstimateCalculator(data_manager)
                    )
                    
                    render_report_button(result)
        
        with col2:
            render_sidebar_links()
            
            if not st.session_state.admin_mode:
                st.divider()
                render_admin_login()
        
    elif page == "판매정책 관리":
        render_sales_policy_page(data_manager)
        
    elif page == "세그먼트 관리":
        render_segment_management_page(data_manager)

    elif page == "📊 통계 분석":
        render_stats_page(data_manager)


if __name__ == "__main__":
    main()