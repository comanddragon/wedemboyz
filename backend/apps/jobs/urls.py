from django.urls import path

from .views import RunJobsView

urlpatterns = [
    path("run", RunJobsView.as_view(), name="run-jobs"),
]
