import imp
from .views import *
from django.urls import path

app_name = 'chat'

urlpatterns = [
    path('',ChatListView.as_view()),
    path('create/',ChatCreateView.as_view()),
    path('<int:pk>/update/',ChatUpdateView.as_view()),
    path('<int:pk>/delete/',ChatDeleteView.as_view()),
    path('<int:pk>/',ChatDetailView.as_view()),
    path('join/',joinChatView.as_view()),
    path('upload/',uploadimageView.as_view())
]