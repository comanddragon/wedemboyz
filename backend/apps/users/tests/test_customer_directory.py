import pytest

from apps.orders.models import Order
from apps.users.models import LoyaltyAccount, UserProfile

pytestmark = pytest.mark.django_db


def unwrap(response):
    payload = response.json()
    return payload.get("data", payload)


def test_directory_shows_remaining_order_debt_and_earned_points(api_client, create_user):
    owner = create_user(is_staff=True, is_superuser=True)
    customer = create_user(phone_number="237699010204")
    empty = create_user(phone_number="237699010205")
    for total, paid, status in [(2000, 500, "DELIVERED"), (800, 0, "PENDING"), (900, 1000, "DELIVERED"), (700, 0, "CANCELLED")]:
        order = Order.objects.create(user=customer, total_amount=total, status=status)
        # Payment signals recompute collections on creation; set the stored snapshot.
        Order.objects.filter(pk=order.pk).update(amount_paid=paid)
    LoyaltyAccount.objects.filter(user=customer).update(lifetime_points_earned=120, points_balance=40)
    api_client.force_authenticate(owner)
    data = unwrap(api_client.get(f"/api/v1/users/customers/{customer.pk}/"))
    assert int(data["outstanding_balance"]) == 2300
    assert data["loyalty_points_earned"] == 120
    rows = unwrap(api_client.get("/api/v1/users/customers/?has_credit=true"))["results"]
    assert [row["id"] for row in rows] == [customer.pk]
    rows = unwrap(api_client.get("/api/v1/users/customers/?has_credit=false"))["results"]
    assert [row["id"] for row in rows] == [empty.pk]
    assert int(rows[0]["outstanding_balance"]) == 0


def test_customer_city_defaults_to_yaounde_and_can_be_corrected(api_client, create_user):
    owner = create_user(is_staff=True, is_superuser=True)
    customer = create_user(phone_number="237699010204")
    assert UserProfile.objects.get(user=customer).city == "Yaoundé"
    UserProfile.objects.filter(user=customer).update(city="Bamenda")
    api_client.force_authenticate(owner)
    response = api_client.patch(f"/api/v1/users/customers/{customer.pk}/", {"city": "Yaoundé"}, format="json")
    assert response.status_code == 200
    assert unwrap(response)["city"] == "Yaoundé"
