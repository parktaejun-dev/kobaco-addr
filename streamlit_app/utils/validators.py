def validate_budget_allocation(channel_budgets, total_budget):
    """예산 배분이 총 예산과 일치하는지 검증"""
    allocated_total = sum(channel_budgets.values())
    return allocated_total == total_budget, allocated_total

def validate_required_fields(advertiser_name, product_name):
    """필수 입력 필드 검증"""
    if not advertiser_name or not product_name:
        return False, "광고주명과 제품명을 모두 입력해주세요."
    return True, ""

def validate_url(url):
    """URL 형식 검증 (간단한 검증)"""
    if not url:
        return True
    return url.startswith('http://') or url.startswith('https://')
