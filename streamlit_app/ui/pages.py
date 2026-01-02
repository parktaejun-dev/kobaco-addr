# ui/pages.py (수정 완료된 전체 코드)
import streamlit as st
import pandas as pd
import json
import os
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

# [★수정] TypeError 해결: 'disabled' 인자 추가
def render_product_info_section(disabled: bool = False):
    """제품 정보 입력 섹션"""
    advertiser_name = st.text_input("광고주*", placeholder="예: (주)OO전자", key="advertiser_name", disabled=disabled)
    product_name = st.text_input("제품명*", placeholder="예: 로봇청소기(URL 사용 실패시 제품명으로 검색합니다.)", key="product_name", disabled=disabled)
    website_url = st.text_input("제품 URL*", placeholder="https.example.com 상품설명 등이 포함된 URL, 정확성이 향상됩니다.", key="website_url", disabled=disabled)
    return advertiser_name, product_name, website_url

# [★수정] TypeError 해결: 'disabled' 인자 추가 및 "신규 광고주" 체크박스 추가
def render_ad_settings_section(data_manager, disabled: bool = False):
    """광고 설정 섹션"""
    st.header("🎯 타기팅 & 광고 조건 설정")
    st.caption("타깃이 명확할수록 광고 효율이 높아집니다.")
    ad_col1, ad_col2 = st.columns(2)
    
    with ad_col1:
        duration_options = {"15초": 15, "30초": 30}
        selected_duration = st.selectbox("광고 초수", list(duration_options.keys()), index=0, disabled=disabled)
        ad_duration = duration_options[selected_duration]
    
    with ad_col2:
        st.write(" ") 
        
        chk_col1, chk_col2, chk_col3 = st.columns(3) 
        with chk_col1:
            audience_targeting = st.toggle("오디언스 타기팅", value=True, disabled=disabled)
        with chk_col2:
            region_targeting = st.toggle("지역 타기팅", disabled=disabled)
        with chk_col3:
            is_new_advertiser = st.toggle("신규 광고주", value=False, disabled=disabled)
    
    region_selections = {}
    if region_targeting:
        st.subheader("📍 지역 타겟팅 설정")
        surcharges_data = data_manager.load_surcharges()
        
        channels_data = data_manager.load_channels()
        if channels_data is not None:
            available_channels = channels_data['channel_name'].tolist()
            region_selections = create_region_selectors(available_channels, surcharges_data, disabled=disabled)
    
    return ad_duration, audience_targeting, region_targeting, region_selections, is_new_advertiser

# [★수정] TypeError 해결: 'disabled' 인자 추가
def render_budget_section(data_manager, disabled: bool = False):
    """예산 설정 섹션"""
    st.header("💰 예산 배분 계획")
    st.caption("월 예산을 입력해주세요. 채널별로 예상 노출량과 최종 단가를 자동 계산합니다.")
    total_budget = st.number_input(
        "월 예산 (만원)*",
        min_value=100,
        max_value=50000,
        value=5000,
        step=100,
        key="total_budget",
        disabled=disabled
    )
    
    channels_data = data_manager.load_channels()
    if channels_data is not None:
        available_channels = channels_data['channel_name'].tolist()
        default_allocations = {'MBC': 0.3, 'EBS': 0.2, 'PP': 0.5}
        
        st.subheader("📊 채널별 예산 배분")
        channel_budgets = create_budget_inputs(available_channels, total_budget, default_allocations, disabled=disabled)
        
        is_valid, allocated_total = validate_budget_allocation(channel_budgets, total_budget)
        if not is_valid:
            st.warning(f"⚠️ 배분된 총액({allocated_total}만원)이 총 예산({total_budget}만원)과 다릅니다.")
        
        duration = st.slider("📅 광고 기간 (개월)", 1, 12, 3, key="duration", disabled=disabled)
        
        return total_budget, channel_budgets, duration, available_channels, is_valid
    
    return None, None, None, None, False

def render_results_section(result, calculator):
    """결과 표시 섹션"""
    st.header("📊 AI 전략 분석 결과")
    create_metric_cards(result['summary'])
    st.subheader("📈 채널별 상세 내역")
    create_results_table(result)

def render_sales_policy_page(data_manager):
    """판매정책 관리 페이지 (✨ [수정] 통계 탭 제거)"""
    st.title("🔧 판매정책 관리")
    
    tab1, tab2, tab3 = st.tabs([
        "채널 관리", 
        "보너스 정책", 
        "할증 정책"
    ])
    
    with tab1:
        st.subheader("채널 기본 요금 관리")
        channels_data = data_manager.load_channels()
        if channels_data is not None:
            edited_channels = st.data_editor(channels_data, num_rows="dynamic", width='stretch')
            if st.button("💾 채널 데이터 저장"):
                data_manager.save_data('channels', edited_channels)
                st.success("✅ 채널 데이터가 저장되었습니다.")
    
    with tab2:
        st.subheader("보너스 정책 관리")
        bonuses_data = data_manager.load_bonuses()
        if bonuses_data is not None:
            edited_bonuses = st.data_editor(bonuses_data, num_rows="dynamic", width='stretch')
            if st.button("💾 보너스 데이터 저장"):
                data_manager.save_data('bonuses', edited_bonuses)
                st.success("✅ 보너스 데이터가 저장되었습니다.")
    
    with tab3:
        st.subheader("할증 정책 관리")
        surcharges_data = data_manager.load_surcharges()
        if surcharges_data is not None:
            edited_surcharges = st.data_editor(surcharges_data, num_rows="dynamic", width='stretch')
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

def render_stats_page(data_manager):
    """
    ( ✨ [수정] data_manager.load_data() 사용 및 '광고주명' 통계 제거 )
    방문 통계와 입력 이력 통계를 보여주는 관리자 페이지를 렌더링합니다.
    """
    st.title("📊 통계 분석")
    st.info("고객용 페이지의 방문 기록과 AI 분석 요청 이력을 확인합니다.")

    # --- 1. 데이터 리셋 기능 ---
    with st.expander("⚠️ 통계 데이터 리셋하기 (주의)"):
        st.warning("이 버튼을 누르면 모든 방문 기록(visit_log.csv)과 AI 추천 입력 이력(input_history.csv)이 영구적으로 삭제됩니다. (내용만 초기화됩니다.)")
        
        if st.button("모든 통계 데이터 리셋 실행", type="primary"):
            try:
                # input_history.csv 리셋 (헤더만 남김)
                input_path = os.path.join(data_manager.data_dir, data_manager.file_paths['input_history'])
                with open(input_path, 'r', encoding='utf-8') as f:
                    input_header = f.readline().strip() 
                with open(input_path, 'w', encoding='utf-8') as f:
                    f.write(input_header + '\n') 
                
                # visit_log.csv 리셋 (헤더만 남김)
                visit_path = os.path.join(data_manager.data_dir, data_manager.file_paths['visit_log'])
                with open(visit_path, 'r', encoding='utf-8') as f:
                    visit_header = f.readline().strip() 
                with open(visit_path, 'w', encoding='utf-8') as f:
                    f.write(visit_header + '\n') 

                st.success("통계 데이터가 성공적으로 리셋되었습니다. 페이지를 새로고침합니다.")
                st.cache_data.clear() # 판다스 캐시 비우기
                st.rerun() 

            except Exception as e:
                st.error(f"데이터 리셋 중 오류 발생: {e}")

    st.divider()

    # --- 2. 데이터 로드 (오류 해결) ---
    try:
        input_df = data_manager.load_data('input_history')
        visit_df = data_manager.load_data('visit_log')
        
    except FileNotFoundError:
        st.error("데이터 파일을 찾을 수 없습니다. (data/input_history.csv or data/visit_log.csv)")
        return
    except Exception as e:
        st.error(f"데이터 로딩 오류: {e}")
        return

    # --- 3. 방문자 통계 (시각화 + Raw Data) ---
    st.header("👥 방문자 통계 (visit_log.csv)")
    if visit_df is not None:
        st.metric("총 방문 횟수 (페이지 로드)", len(visit_df))
        if not visit_df.empty:
            try:
                # [시각화]
                visit_df['timestamp'] = pd.to_datetime(visit_df['timestamp'])
                st.subheader("일별 방문 트렌드")
                daily_visits = visit_df.set_index('timestamp').resample('D').size()
                st.bar_chart(daily_visits)
                
                # [Raw Data]
                with st.expander("전체 방문 기록 데이터 보기"):
                    st.dataframe(visit_df)
                    
            except Exception as e:
                st.warning(f"방문로그 시간 분석 중 오류: {e}")
        else:
            st.info("방문 기록이 없습니다.")
    else:
        st.info("방문 기록이 없습니다.")


    # --- 4. 입력 이력 통계 (시각화 + Raw Data) ---
    st.header("📝 입력 이력 통계 (input_history.csv)")
    if input_df is not None:
        st.metric("총 AI 분석 요청 건수", len(input_df))
        if not input_df.empty: 
            
            # [시각화]
            st.subheader("요청 예산(total_budget) 분포")
            try:
                budget_df = pd.to_numeric(input_df['total_budget'], errors='coerce').dropna()
                if not budget_df.empty:
                    st.bar_chart(budget_df.value_counts())
                else:
                    st.info("기록된 예산 데이터가 없습니다.")
            except Exception as e:
                st.error(f"예산 분포 차트 생성 중 오류: {e}")
            
            # [Raw Data]
            with st.expander("전체 입력 이력 데이터 보기 (비식별화)"):
                st.dataframe(input_df) 
        else:
            st.info("AI 분석 요청 이력이 없습니다.")
    else:
        st.info("AI 분석 요청 이력이 없습니다.")