# chat/views.py
from django.shortcuts import render
from django.utils.safestring import mark_safe
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
import json
from .models import Chat ,CustomUser ,Contact
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

def get_user_contact(username):
    user = get_object_or_404(CustomUser,username=username)
    contact = get_object_or_404(Contact,user=user)
    return contact
    
def get_current_chat(chatId):
    return get_object_or_404(Chat,id=chatId)