import streamlit as st
import pandas as pd
import json
from ui.components import create_metric_cards, create_results_table, create_budget_inputs, create_region_selectors
from utils.validators import validate_budget_allocation, validate_required_fields

def render_admin_login():
    """관리자 로그인 UI"""
    with st.expander("🔐 관리자 로그인"):
        admin_id = st.text_input("관리자 ID")
        admin_pw = st.text_input("비밀번호", type="password")
        if st.button("관리자 로그인"):
            try:
                if (admin_id == st.secrets["admin_id"] and admin_pw == st.secrets["admin_password"]):
                    st.session_state.authenticated = True
                    st.session_state.admin_mode = True
                    st.rerun()
                else:
                    st.error("ID 또는 비밀번호가 incorrect.")
            except KeyError:
                st.error("Secrets 설정이 필요합니다.")
            except Exception as e:
                st.error(f"로그인 오류: {e}")

def render_product_info_section():
    """제품 정보 입력 섹션"""
    # [★문구 수정]
    st.header("📋 광고 캠페인 기본 정보")
    st.caption("광고 제품명과 URL 주소를 입력해주시면, AI가 적합한 타깃을 추천해 드립니다.")
    advertiser_name = st.text_input("광고주*", placeholder="예: (주)OO전자", key="advertiser_name")
    product_name = st.text_input("제품명*", placeholder="예: 로봇청소기(URL 사용 실패시 제품명으로 검색합니다.)", key="product_name")
    website_url = st.text_input("제품 URL*", placeholder="https://example.com 상품설명 등이 포함된 URL, 정확성이 향상됩니다.", key="website_url")
    return advertiser_name, product_name, website_url

def render_ad_settings_section(data_manager):
    """광고 설정 섹션"""
    # [★문구 수정]
    st.header("🎯 타기팅 & 광고 조건 설정")
    st.caption("타깃이 명확할수록 광고 효율이 높아집니다.")
    ad_col1, ad_col2 = st.columns(2)
    
    with ad_col1:
        duration_options = {"15초": 15, "30초": 30}
        selected_duration = st.selectbox("광고 초수", list(duration_options.keys()), index=0)
        ad_duration = duration_options[selected_duration]
    
    with ad_col2:
        # [★수정] '커스텀 타기팅' 제거하고, 두 체크박스를 나란히 배치하기 위해 내부 컬럼 생성
        chk_col1, chk_col2 = st.columns(2)
        with chk_col1:
            audience_targeting = st.checkbox("오디언스 타기팅", value=True)
        with chk_col2:
            region_targeting = st.checkbox("지역 타기팅")
    
    region_selections = {}
    if region_targeting:
        st.subheader("📍 지역 타겟팅 설정")
        surcharges_data = data_manager.load_surcharges()
        
        channels_data = data_manager.load_channels()
        if channels_data is not None:
            available_channels = channels_data['channel_name'].tolist()
            region_selections = create_region_selectors(available_channels, surcharges_data)
    
    # [★수정] custom_targeting 변수 반환 값에서 제거
    return ad_duration, audience_targeting, region_targeting, region_selections

def render_budget_section(data_manager):
    """예산 설정 섹션"""
    # [★문구 수정]
    st.header("💰 예산 배분 계획")
    st.caption("월 예산을 입력해주세요. 채널별로 예상 노출량과 최종 단가를 자동 계산합니다.")
    total_budget = st.number_input(
        "월 예산 (만원)*",
        min_value=100,
        max_value=50000,
        value=5000,
        step=100,
        key="total_budget"
    )
    
    channels_data = data_manager.load_channels()
    if channels_data is not None:
        available_channels = channels_data['channel_name'].tolist()
        default_allocations = {'MBC': 0.3, 'EBS': 0.2, 'PP': 0.5}
        
        st.subheader("📊 채널별 예산 배분")
        channel_budgets = create_budget_inputs(available_channels, total_budget, default_allocations)
        
        is_valid, allocated_total = validate_budget_allocation(channel_budgets, total_budget)
        if not is_valid:
            st.warning(f"⚠️ 배분된 총액({allocated_total}만원)이 총 예산({total_budget}만원)과 다릅니다.")
        
        duration = st.slider("📅 광고 기간 (개월)", 1, 12, 3, key="duration")
        
        return total_budget, channel_budgets, duration, available_channels, is_valid
    
    return None, None, None, None, False

def render_results_section(result, calculator, advertiser_name, product_name, recommended_segments):
    """결과 표시 섹션"""
    st.header("📊 AI 전략 분석 결과")
    create_metric_cards(result['summary'])
    st.subheader("📈 채널별 상세 내역")
    create_results_table(result)

def render_sales_policy_page(data_manager):
    """판매정책 관리 페이지"""
    st.title("🔧 판매정책 관리")
    tab1, tab2, tab3 = st.tabs(["채널 관리", "보너스 정책", "할증 정책"])
    
    with tab1:
        st.subheader("채널 기본 요금 관리")
        channels_data = data_manager.load_channels()
        if channels_data is not None:
            edited_channels = st.data_editor(channels_data, num_rows="dynamic", use_container_width=True)
            if st.button("💾 채널 데이터 저장"):
                data_manager.save_data('channels', edited_channels)
                st.success("✅ 채널 데이터가 저장되었습니다.")
    
    with tab2:
        st.subheader("보너스 정책 관리")
        bonuses_data = data_manager.load_bonuses()
        if bonuses_data is not None:
            edited_bonuses = st.data_editor(bonuses_data, num_rows="dynamic", use_container_width=True)
            if st.button("💾 보너스 데이터 저장"):
                data_manager.save_data('bonuses', edited_bonuses)
                st.success("✅ 보너스 데이터가 저장되었습니다.")
    
    with tab3:
        st.subheader("할증 정책 관리")
        surcharges_data = data_manager.load_surcharges()
        if surcharges_data is not None:
            edited_surcharges = st.data_editor(surcharges_data, num_rows="dynamic", use_container_width=True)
            if st.button("💾 할증 데이터 저장"):
                data_manager.save_data('surcharges', edited_surcharges)
                st.success("✅ 할증 데이터가 저장되었습니다.")

def render_segment_management_page(data_manager):
    """세그먼트 관리 페이지"""
    st.title("🎯 세그먼트 관리")
    segments_data = data_manager.load_segments()
    
    if segments_data:
        st.subheader("세그먼트 데이터 편집")
        edited_json = st.text_area(
            "세그먼트 데이터 (JSON 형식)",
            value=json.dumps(segments_data, ensure_ascii=False, indent=2),
            height=500
        )
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("💾 세그먼트 데이터 저장", type="primary"):
                try:
                    parsed_data = json.loads(edited_json)
                    data_manager.save_segments(parsed_data)
                    st.success("✅ 세그먼트 데이터가 저장되었습니다!")
                except json.JSONDecodeError as e:
                    st.error(f"❌ JSON 형식 오류: {e}")
        with col2:
            if st.button("🔄 데이터 새로고침"):
                st.rerun()