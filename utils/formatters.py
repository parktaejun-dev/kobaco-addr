def format_currency(amount):
    """금액을 쉼표가 포함된 문자열로 포맷"""
    return f"{amount:,.0f}"

def format_percentage(value):
    """백분율을 소수점 1자리로 포맷"""
    return f"{value:.1f}%"

def format_cpv(cpv):
    """CPV를 소수점 1자리로 포맷"""
    return f"{cpv:.1f}"

def get_score_emoji(score):
    """점수에 따른 이모지 반환"""
    if score >= 90:
        return "🎯"
    elif score >= 80:
        return "✅"
    elif score >= 70:
        return "👍"
    else:
        return "ℹ️"
