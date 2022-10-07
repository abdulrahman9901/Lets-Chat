from rest_framework import permissions
from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
    CreateAPIView,
    UpdateAPIView,
    DestroyAPIView
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import ChatSerializer
from chat.models import Chat ,Contact ,CustomUser,Message

from django.shortcuts import get_object_or_404

def get_user_contact(username):
    user = get_object_or_404(CustomUser,username=username)
    try :
        contact = get_object_or_404(Contact,user=user)
    except:
        contact = Contact()
        contact.user = user
        print(contact)
    return contact

class ChatListView(ListAPIView):
    serializer_class = ChatSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        queryset = Chat.objects.all()
        username = self.request.query_params.get('username',None)
        if username is not None:
            contact = get_user_contact(username)
            queryset = contact.chats.all()
        return queryset

class ChatDetailView(RetrieveAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatSerializer
    permission_classes = (permissions.AllowAny,)

class ChatCreateView(CreateAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatSerializer
    permission_classes = (permissions.IsAuthenticated,)

class ChatUpdateView(UpdateAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatSerializer
    permission_classes = (permissions.IsAuthenticated,)

class ChatDeleteView(DestroyAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatSerializer
    permission_classes = (permissions.IsAuthenticated,)

class joinChatView(APIView):
    def post(self, request):
            chat = get_object_or_404(Chat,id=request.data["id"])
            username = get_user_contact(request.data["username"])
            print(username)
            if username not in chat.participants.all() :
                chat.participants.add(username)
                message = Message.objects.create(contact=username,content='{} has joined the chat .'.format(username.user.username),system_message=True)
                chat.messages.add(message)
                chat.save()
            schat = ChatSerializer(chat)
            print(schat.data)
            return Response({"status": "success", "data": schat.data}, status=status.HTTP_200_OK)