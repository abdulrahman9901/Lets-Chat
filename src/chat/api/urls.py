from django.urls import path
from .views import (
    ChatListView,
    ChatCreateView,
    ChatUpdateView,
    ChatDeleteView,
    ChatDetailView,
    joinChatView,
    uploadimageView,
    FrontendLogView,
)

app_name = 'chat'

urlpatterns = [
    path('', ChatListView.as_view()),
    path('create/', ChatCreateView.as_view()),
    path('<int:pk>/update/', ChatUpdateView.as_view()),
    path('<int:pk>/delete/', ChatDeleteView.as_view()),
    path('<int:pk>/', ChatDetailView.as_view()),
    path('join/', joinChatView.as_view()),
    path('upload/', uploadimageView.as_view()),
    path('logs/frontend/', FrontendLogView.as_view()),
]