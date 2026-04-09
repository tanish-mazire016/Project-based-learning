"""
Root URL configuration for the fraud detection pipeline.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('pipeline.urls')),
]
