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
from .serializers import ChatSerializer , decrypter
from chat.models import Chat ,Contact ,CustomUser,Message
from channels.layers import get_channel_layer
from django.shortcuts import get_object_or_404
from asgiref.sync import async_to_sync

import json
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.fields.files import ImageFieldFile

class ExtendedEncoder(DjangoJSONEncoder):
    def default(self, o):
        if isinstance(o, ImageFieldFile):
            return str(o)
        else:
            return super().default(o)

def get_user_contact(username):
    user = get_object_or_404(CustomUser,username=username)
    try :
        contact = get_object_or_404(Contact,user=user)
    except:
        contact = Contact()
        contact.user = user
        print(contact)
    return contact
def send_socket_message(instance,message):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)('chat_{}'.format(instance.id),{
                    'type': 'chat_message',
                    'message': {
                    'command': 'new_message',
                    'message':{
                    'id':message.id,
                    'author':message.contact.user.username,
                    'content':message.content,
                    'timestamp':str(message.created_at),
                    'system_message':message.system_message ,
                    "image" : str(message.image)
                    }
                }       
                })

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
            id = decrypter(request.data["Chatkey"])
            print("id at join chat : ",id)
            chat = get_object_or_404(Chat,id=id)
            username = get_user_contact(request.data["username"])
            print(username)
            if username not in chat.participants.all() :
                chat.participants.add(username)
                message = Message.objects.create(contact=username,content='{} has joined the chat .'.format(username.user.username),system_message=True)
                chat.messages.add(message)
                chat.save()
                send_socket_message(chat,message)
            schat = ChatSerializer(chat)
            print(schat.data)
            channel_layer = get_channel_layer()
            print('chat_{}'.format(chat.id))
            async_to_sync(channel_layer.group_send)('chat_{}'.format(chat.id),{
             
                'type': 'chat_message',
                'message':{
                'command': 'chatsUpdate'     
                }       
            })
            return Response({"status": "success", "data": schat.data}, status=status.HTTP_200_OK)

class uploadimageView(APIView):
    def post(self, request):
        print(type(request.data['image_0']))   
        print(request.data)
        print(len(request.data['image_0']))
        chat = get_object_or_404(Chat,id=request.data["chatid"])
        username = get_user_contact(request.data['username'])

        for item in request.data :
            if "image" in item :
                print('item : ',request.data[item])
                message = Message.objects.create(contact=username,content=None,image=request.data[item],system_message=False)
                chat.messages.add(message)
                chat.save()  
                send_socket_message(chat,message)
       
        return Response({"status": "success", "data": "image"}, status=status.HTTP_200_OK)