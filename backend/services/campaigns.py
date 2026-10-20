from datetime import timedelta
from django.utils import timezone
from apps.discounts.models import DiscountCampaign


def active_campaign_for(user):
    profile = getattr(user, "profile", None)
    if not profile or not profile.marketing_opt_in:
        return None
    now = timezone.now()
    campaigns = DiscountCampaign.objects.filter(is_active=True, start_date__lte=now, end_date__gte=now).order_by("-start_date")
    for campaign in campaigns:
        if campaign.target_segment == DiscountCampaign.Segment.ALL:
            return campaign
        if campaign.target_segment == DiscountCampaign.Segment.NEW_CUSTOMERS and not user.orders.exists():
            return campaign
        if campaign.target_segment == DiscountCampaign.Segment.LOYALTY_GOLD and getattr(getattr(user, "loyalty_account", None), "tier", None) == "GOLD":
            return campaign
        if campaign.target_segment == DiscountCampaign.Segment.LAPSED:
            last_order = user.orders.order_by("-created_at").first()
            if last_order and last_order.created_at <= now - timedelta(days=90):
                return campaign
    return None
