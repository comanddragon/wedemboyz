from django.urls import path

from apps.users.api.views.customer import CustomerDetailView, CustomerListView

urlpatterns = [
    path("customers/", CustomerListView.as_view(), name="customer-list"),
    path("customers/<int:pk>/", CustomerDetailView.as_view(), name="customer-detail"),
]
