import json
import logging
import os
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models.fields.files import ImageFieldFile
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
    CreateAPIView,
    UpdateAPIView,
    DestroyAPIView,
)
from rest_framework.response import Response
from rest_framework.views import APIView
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from cryptography.fernet import InvalidToken

from chat.models import Chat, Contact, CustomUser, Message
from chat.user_search import search_users
from .serializers import ChatSerializer, decrypter

frontend_logger = logging.getLogger("frontend")


class ExtendedEncoder(DjangoJSONEncoder):
    def default(self, o):
        if isinstance(o, ImageFieldFile):
            return str(o)
        else:
            return super().default(o)


class FrontendLogView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        level = request.data.get("level", "info").lower()
        message = request.data.get("message", "")
        context = request.data.get("context", {})

        extra = {"context": context}
        if level == "debug":
            frontend_logger.debug(message, extra=extra)
        elif level == "warning" or level == "warn":
            frontend_logger.warning(message, extra=extra)
        elif level == "error":
            frontend_logger.error(message, extra=extra)
        else:
            frontend_logger.info(message, extra=extra)

        return Response({"status": "ok"}, status=status.HTTP_201_CREATED)

def get_user_contact(username):
    user = get_object_or_404(CustomUser, username=username)
    contact, _ = Contact.objects.get_or_create(user=user, defaults={})
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

class UserSearchView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        q = request.query_params.get('q') or ''
        if isinstance(q, list):
            q = q[0] if q else ''
        q = str(q).strip()
        try:
            limit = min(int(request.query_params.get('limit', 20)), 50)
        except (TypeError, ValueError):
            limit = 20
        if not q:
            return Response([], status=status.HTTP_200_OK)
        results = search_users(q, limit=limit)
        return Response(results, status=status.HTTP_200_OK)


class MediaDownloadView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        file_param = request.query_params.get('file')
        if not file_param or '..' in file_param:
            return Response({'detail': 'Invalid file parameter'}, status=status.HTTP_400_BAD_REQUEST)
        media_root = os.path.abspath(settings.MEDIA_ROOT)
        full_path = os.path.abspath(os.path.join(media_root, file_param))
        if not full_path.startswith(media_root) or not os.path.isfile(full_path):
            return Response({'detail': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(
            open(full_path, 'rb'),
            as_attachment=True,
            filename=os.path.basename(full_path),
        )


class joinChatView(APIView):
    def post(self, request):
            raw_key = request.data.get("Chatkey") or request.data.get("chatKey")
            if not raw_key:
                return Response(
                    {"detail": "Chatkey is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                id = decrypter(raw_key)
            except InvalidToken:
                return Response(
                    {"detail": "Invalid or expired chat key. Get a new key from the chat admin or re-run the seed command and restart the backend."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            chat = get_object_or_404(Chat, id=id)
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


class MediaDownloadView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        path = request.GET.get("file", "").strip().lstrip("/").replace("\\", "/")
        if not path or ".." in path:
            return Response({"detail": "Invalid file"}, status=status.HTTP_400_BAD_REQUEST)
        root = os.path.abspath(settings.MEDIA_ROOT)
        full_path = os.path.normpath(os.path.join(root, path))
        if not full_path.startswith(root):
            return Response({"detail": "Invalid file"}, status=status.HTTP_400_BAD_REQUEST)
        if not os.path.isfile(full_path):
            return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        filename = os.path.basename(full_path)
        return FileResponse(open(full_path, "rb"), as_attachment=True, filename=filename)