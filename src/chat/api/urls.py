import imp
from .views import *
from django.urls import path

app_name = 'chat'

urlpatterns = [
    path('',ChatListView.as_view()),
    path('create/',ChatCreateView.as_view()),
    path('<pk>/update',ChatUpdateView.as_view()),
    path('<pk>/delete',ChatDeleteView.as_view()),
    path('<pk>',ChatDetailView.as_view())
]