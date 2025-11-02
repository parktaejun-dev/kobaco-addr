"""
KOBACO 어드레서블 TV 광고 견적 시스템 - 메인 앱
AI 전략 컨설턴트 기능 강화 버전
"""

import streamlit as st
import pandas as pd
import json
import os
from data_manager import DataManager
from estimate_calculator import EstimateCalculator
from gemini_segment_recommender_v2 import AISegmentRecommender  # v2로 업데이트
import streamlit.components.v1 as components
import base64


# 페이지 설정
st.set_page_config(
    page_title="KOBACO 어드레서블 TV 광고 시스템",
    page_icon="📺",
    layout="wide"
)

# 세션 상태 초기화
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False
if 'admin_mode' not in st.session_state:
    st.session_state.admin_mode = False
if 'recommended_segments' not in st.session_state:
    st.session_state.recommended_segments = []

def main():
    """메인 함수 - 앱 진입점"""
    
    with st.sidebar:
        st.title("📺 KOBACO")
        
        # 관리자 모드 체크
        if st.session_state.authenticated and st.session_state.admin_mode:
            st.success("🔐 관리자 모드")
            page = st.radio("메뉴 선택", 
                           ["고객 페이지", "판매정책 관리", "세그먼트 관리"])
            if st.button("로그아웃"):
                st.session_state.authenticated = False
                st.session_state.admin_mode = False
                st.session_state.recommended_segments = []
                st.rerun()
        else:
            # 일반 사용자 모드
            page = "고객 페이지"
            st.info("고객용 페이지")
            
            # 관리자 로그인 패널
            with st.expander("🔐 관리자 로그인"):
                admin_id = st.text_input("관리자 ID")
                admin_pw = st.text_input("비밀번호", type="password")
                if st.button("관리자 로그인"):
                    try:
                        if (admin_id == st.secrets["admin_id"] and 
                            admin_pw == st.secrets["admin_password"]):
                            st.session_state.authenticated = True
                            st.session_state.admin_mode = True
                            st.rerun()
                        else:
                            st.error("ID 또는 비밀번호가 incorrect.")
                    except KeyError:
                        st.error("Secrets 설정이 필요합니다. (관리자 문의)")
                    except Exception as e:
                        st.error(f"로그인 오류: {e}")

    # 데이터 매니저 초기화
    data_manager = DataManager()
    
    # 페이지 라우팅
    if page == "고객 페이지":
        show_customer_page(data_manager)
    elif page == "판매정책 관리":
        show_sales_policy_page(data_manager)
    elif page == "세그먼트 관리":
        show_segment_management_page(data_manager)


def show_customer_page(data_manager):
    """고객용 페이지 - AI 전략 분석 및 견적"""
    
    st.title("📺 KOBACO 어드레서블 TV 광고 견적 시스템")
    
    # 2열 레이아웃
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 섹션 1: 광고주/제품 정보
        st.header("📋 광고주/제품 정보")
        advertiser_name = st.text_input("광고주명*", placeholder="예: (주)OO전자", key="advertiser_name")
        product_name = st.text_input("제품명*", placeholder="예: 신형 로봇청소기", key="product_name")
        website_url = st.text_input("제품 URL", placeholder="https://example.com", key="website_url")
        
        # AI 세그먼트 추천 버튼
        if product_name:
            if st.button("🤖 AI 타겟 분석 요청", type="primary", use_container_width=True):
                st.session_state.recommended_segments = []  # 초기화
                recommender = AISegmentRecommender(data_manager)
                st.session_state.recommended_segments = recommender.recommend_segments(
                    product_name, website_url
                )
        
        # AI 추천 결과 표시 (개선된 UI)
        if st.session_state.recommended_segments:
            st.header("🎯 AI 타겟 분석 결과")
            recommender = AISegmentRecommender(data_manager)
            recommender.display_recommendations(st.session_state.recommended_segments)
        
        # 섹션 2: 광고 설정
        st.header("⚙️ 광고 설정")
        ad_col1, ad_col2 = st.columns(2)
        
        with ad_col1:
            # 광고 초수 선택
            duration_options = {"15초": 15, "30초": 30}
            selected_duration = st.selectbox("광고 초수", list(duration_options.keys()))
            ad_duration = duration_options[selected_duration]
            
        with ad_col2:
            # 타겟팅 옵션
            audience_targeting = st.checkbox("어드레서블 타겟팅 사용", value=True)
            
            if audience_targeting:
                custom_targeting = st.checkbox("커스텀 타겟팅 사용 (추가 할증)", value=False)
            else:
                custom_targeting = False
            
            region_targeting = st.checkbox("지역 타겟팅 사용")
        
        # 지역 타겟팅 설정
        region_selections = {}
        if region_targeting:
            st.subheader("📍 지역 타겟팅 설정")
            surcharges_data = data_manager.load_surcharges()
            if surcharges_data is not None:
                region_options = ["선택안함"] + surcharges_data[
                    surcharges_data['surcharge_type'] == 'region'
                ]['condition_value'].unique().tolist()
            else:
                region_options = ["선택안함", "서울/경기/인천", "시/군/구(일반)", "시/군/구(청약집중지역)", "서울특별시/도/광역시"]
            
            channels_data = data_manager.load_channels()
            if channels_data is not None:
                available_channels = channels_data['channel_name'].tolist()
                region_cols = st.columns(len(available_channels))
                for i, channel in enumerate(available_channels):
                    with region_cols[i]:
                        region_selections[channel] = st.selectbox(
                            f"{channel} 지역",
                            region_options,
                            key=f"region_{channel}"
                        )
        
        # 섹션 3: 예산 설정
        st.header("💰 예산 설정")
        total_budget = st.number_input(
            "총 월 예산 (만원)*",
            min_value=100,
            max_value=50000,
            value=5000,
            step=100,
            key="total_budget"
        )
        
        channels_data = data_manager.load_channels()
        if channels_data is not None:
            available_channels = channels_data['channel_name'].tolist()
            
            # 기본 예산 배분 비율
            default_allocations = {
                'MBC': 0.3,
                'EBS': 0.2,
                'PP': 0.5
            }
            
            st.subheader("📊 채널별 예산 배분")
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
            
            # 예산 검증
            allocated_total = sum(channel_budgets.values())
            if allocated_total != total_budget:
                st.warning(f"⚠️ 배분된 총액({allocated_total}만원)이 총 예산({total_budget}만원)과 다릅니다.")
            
            # 광고 기간 선택
            duration = st.slider("📅 광고 기간 (개월)", 1, 12, 3, key="duration")
            
            # 견적 계산 버튼
            if st.button("🧮 AI 최적화 플랜 생성", type="primary", use_container_width=True):
                if not st.session_state.advertiser_name or not st.session_state.product_name:
                    st.error("❌ 광고주명과 제품명을 모두 입력해주세요.")
                elif allocated_total != total_budget:
                    st.error("❌ 총 예산과 채널별 배분액이 일치하지 않습니다. 배분액을 조정해주세요.")
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
                    
    
    # 우측 사이드바 - 바로가기 및 문의
    with col2:
        st.header("🔗 바로가기")
        
        st.link_button("🤖 챗봇에게 물어보기 (NotebookLM)", 
                      "https://notebooklm.google.com/notebook/ab573898-2bb6-4034-8694-bc1c08d480c7", 
                      use_container_width=True)
        
        st.link_button("📥 최신 판매 안내자료 다운로드", 
                      "https://your-google-drive-link-here.com",
                      use_container_width=True)
        
        st.header("📬 문의하기")
        st.link_button("KOBACO 크로스세일즈팀 박태준 차장 (tj1000@kobaco.co.kr)", 
                      "mailto:tj1000@kobaco.co.kr", 
                      use_container_width=True)
        
    # 견적 결과 표시
    if 'estimate_result' in st.session_state:
        show_estimate_results(
            st.session_state.estimate_result, 
            EstimateCalculator(data_manager), 
            st.session_state.advertiser_name,
            st.session_state.product_name,
            st.session_state.recommended_segments
        )


def show_estimate_results(result, calculator, advertiser_name, product_name, recommended_segments):
    """견적 결과 표시 함수"""
    
    st.header("📊 AI 전략 분석 결과")
    
    summary = result['summary']
    
    # 주요 지표 카드
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("총 예산", f"{summary['total_budget']:,.0f}원")
    with col2:
        st.metric("총 노출수", f"{summary['total_impressions']:,.0f}회")
    with col3:
        st.metric("평균 CPV", f"{summary['average_cpv']:.1f}원")
    with col4:
        st.metric("광고 초수", f"{summary['ad_duration']}초")
    
    # 채널별 상세 내역
    st.subheader("📈 채널별 상세 내역")
    details_data = []
    
    # 데이터 포맷팅 (문자열로 변환하여 쉼표 표시)
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
    
    # 종합 행 추가
    if details_data:
        total_budget_won = summary['total_budget']
        final_total_impressions = summary['total_impressions']
        
        base_cpv_total = 10.0 
        total_base_impressions = 0.0
        total_bonus_rate_percent = 0.0
        
        if base_cpv_total > 0:
            total_base_impressions = total_budget_won / base_cpv_total
        
        if total_base_impressions > 0:
            total_bonus_rate_percent = ((final_total_impressions / total_base_impressions) - 1) * 100

        details_data.append({
            '채널': '종합',
            '예산(원)': f"{summary['total_budget']:,.0f}",
            '기본 CPV': f"{base_cpv_total:.1f}",
            '보너스율': f"{total_bonus_rate_percent:.1f}%",
            '할증율': "-", 
            '노출수': f"{summary['total_impressions']:,.0f}",
            '최종 CPV': f"{summary['average_cpv']:.1f}"
        })

    # 데이터프레임 표시
    if details_data:
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
    
    # 전략 제안서 생성 버튼
    if st.button("📄 AI 광고 전략 제안서 생성", use_container_width=True):
        try:
            html_content = calculator.generate_html_report(
                result, 
                advertiser_name, 
                product_name, 
                recommended_segments
            )
            
            # Base64 인코딩
            b64_html = base64.b64encode(html_content.encode('utf-8')).decode('utf-8')
            
            # 새 창에서 열기
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
        except Exception as e:
            st.error(f"❌ 전략 제안서 생성 오류: {e}")


def show_sales_policy_page(data_manager):
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


def show_segment_management_page(data_manager):
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
        
        st.subheader("세그먼트 구조 미리보기")
        display_segment_tree(segments_data)


def display_segment_tree(segments_data, level=0):
    """세그먼트 트리 구조 표시"""
    
    if isinstance(segments_data, dict) and 'categories' in segments_data:
        st.caption(f"Version: {segments_data.get('version', 'N/A')}, Total Count: {segments_data.get('total_count', 'N/A')}")
        for major_cat in segments_data['categories']:
            major_name = major_cat.get('major_category', 'N/A')
            st.write(f"{'  ' * level}📁 **{major_name}**")
            
            if 'segments' in major_cat and isinstance(major_cat['segments'], list):
                for mid_cat in major_cat['segments']:
                    mid_name = mid_cat.get('mid_category', 'N/A')
                    st.write(f"{'  ' * (level + 1)}📂 **{mid_name}**")
                    
                    if 'items' in mid_cat and isinstance(mid_cat['items'], list):
                        for item in mid_cat['items']:
                            item_name = item.get('name', 'N/A')
                            item_desc = item.get('description', '')
                            st.write(f"{'  ' * (level + 2)}🎯 **{item_name}**")
                            st.caption(f"{'  ' * (level + 2)}📝 {item_desc}")
    else:
        st.warning("⚠️ 인식할 수 없는 JSON 구조입니다. 'categories' 키를 포함하는지 확인하세요.")


if __name__ == "__main__":
    main()
