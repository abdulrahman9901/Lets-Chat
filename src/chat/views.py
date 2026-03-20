# chat/views.py
from django.shortcuts import render
from django.shortcuts import get_object_or_404
from .models import Chat
def index(request):
    return render(request, 'chat/index.html')

# @login_required 
# def room(request, room_name):
#     return render(request, 'chat/room.html', {
#         'room_name_json': mark_safe(json.dumps(room_name)),
#         'username': mark_safe(json.dumps(request.user.username)),
#     })

# https://stackoverflow.com/questions/13423022/django-str-object-has-no-attribute-user
def load_last_messages(chatId,msgCount=10):
    chat = get_object_or_404(Chat,id=chatId)
    return chat.messages.order_by('-created_at').all()[:msgCount]

def get_current_chat(chatId):
    return get_object_or_404(
        Chat.objects.prefetch_related('participants__user', 'admins__user'),
        id=chatId,
    )