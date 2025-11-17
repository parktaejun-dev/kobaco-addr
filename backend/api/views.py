from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .recommender import AISegmentRecommender
from .services import EstimateCalculator

class RecommendSegmentsView(APIView):
    """
    API endpoint to get AI-based segment recommendations.
    """
    def post(self, request, *args, **kwargs):
        product_name = request.data.get('product_name')
        website_url = request.data.get('website_url')

        if not product_name and not website_url:
            return Response(
                {"error": "제품명 또는 웹사이트 URL을 제공해야 합니다."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recommender = AISegmentRecommender()
            recommendations, understanding, keywords = recommender.recommend_segments(product_name, website_url)
            return Response({
                "recommendations": recommendations,
                "product_understanding": understanding,
                "expanded_keywords": keywords
            })
        except Exception as e:
            return Response(
                {"error": f"추천 생성 중 오류 발생: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CalculateEstimateView(APIView):
    """
    API endpoint to calculate the advertisement estimate.
    """
    def post(self, request, *args, **kwargs):
        # Extract data from request
        selected_channels = request.data.get('selected_channels', [])
        channel_budgets = request.data.get('channel_budgets', {})
        duration = request.data.get('duration', 1)
        region_targeting = request.data.get('region_targeting', False)
        region_selections = request.data.get('region_selections', {})
        audience_targeting = request.data.get('audience_targeting', False)
        ad_duration = request.data.get('ad_duration', 15)
        custom_targeting = request.data.get('custom_targeting', False)
        is_new_advertiser = request.data.get('is_new_advertiser', False)

        try:
            calculator = EstimateCalculator()
            result = calculator.calculate_estimate(
                selected_channels, channel_budgets, duration,
                region_targeting, region_selections, audience_targeting,
                ad_duration, custom_targeting, is_new_advertiser
            )
            return Response(result)
        except Exception as e:
            return Response(
                {"error": f"견적 계산 중 오류 발생: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
