import logging
import hashlib
import mimetypes
import os
from urllib.parse import urljoin
import requests
from django.conf import settings
from rest_framework.authtoken.models import Token
from django.core.serializers.json import DjangoJSONEncoder
from django.core.files.storage import default_storage
from django.db.models.fields.files import ImageFieldFile
from django.http import FileResponse, HttpResponse
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
from cryptography.fernet import InvalidToken
from django.utils import timezone

from chat.models import Chat, Message, Contact, CustomUser
from chat.user_search import search_users
from .serializers import ChatSerializer, ChatListSerializer
from chat.services.invite_keys import decrypter
from chat.services.contacts import get_user_contact
from chat.services.chat_broadcast import broadcast_chats_update, broadcast_new_message

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

class ChatListView(ListAPIView):
    serializer_class = ChatListSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        queryset = (
            Chat.objects.all()
            .prefetch_related(
                'participants',
                'participants__user',
                'admins',
                'admins__user',
            )
        )
        username = self.request.query_params.get('username',None)
        if username is not None:
            contact = get_user_contact(username)
            queryset = (
                contact.chats.all()
                .prefetch_related(
                    'participants',
                    'participants__user',
                    'admins',
                    'admins__user',
                )
            )
        return queryset

class ChatDetailView(RetrieveAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatSerializer
    permission_classes = (permissions.AllowAny,)

class ChatCreateView(CreateAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatListSerializer
    permission_classes = (permissions.IsAuthenticated,)

class ChatUpdateView(UpdateAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatListSerializer
    permission_classes = (permissions.IsAuthenticated,)

class ChatDeleteView(DestroyAPIView):
    queryset = Chat.objects.all()
    serializer_class = ChatListSerializer
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


class VerifyEmailOTPView(APIView):
    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request):
        username = request.data.get('username')
        otp_raw = request.data.get('otp')
        otp = str(otp_raw).strip() if otp_raw is not None else ''

        if not username or not otp:
            return Response(
                {'detail': 'username and otp are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not otp.isdigit() or len(otp) < 4:
            return Response(
                {'detail': 'Invalid otp format'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_object_or_404(CustomUser, username=username)
        if user.is_email_verified:
            return Response({'detail': 'Already verified'}, status=status.HTTP_200_OK)

        now = timezone.now()
        if not user.email_verification_expires_at or user.email_verification_expires_at < now:
            return Response({'detail': 'OTP expired'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.email_verification_code_hash:
            return Response({'detail': 'OTP not found'}, status=status.HTTP_400_BAD_REQUEST)

        expected_hash = hashlib.sha256(f'{otp}:{settings.SECRET_KEY}'.encode('utf-8')).hexdigest()
        if expected_hash != user.email_verification_code_hash:
            return Response({'detail': 'Invalid otp'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_email_verified = True
        user.email_verification_code_hash = None
        user.email_verification_expires_at = None
        user.is_active = True
        user.save(
            update_fields=[
                'is_email_verified',
                'email_verification_code_hash',
                'email_verification_expires_at',
                'is_active',
            ],
        )

        return Response({'detail': 'Verified'}, status=status.HTTP_200_OK)


class MediaDownloadView(APIView):
    permission_classes = (permissions.AllowAny,)

    @staticmethod
    def _processed_object_key(file_param: str, width: int, height: int) -> str:
        digest = hashlib.sha256(f'{file_param}:{width}x{height}'.encode('utf-8')).hexdigest()
        return f'processed/{digest}.webp'

    @staticmethod
    def _resolve_authenticated_user(request):
        if getattr(request.user, 'is_authenticated', False):
            return request.user
        token_key = request.query_params.get('token')
        if not token_key:
            return None
        token_obj = Token.objects.filter(key=token_key).select_related('user').first()
        if not token_obj:
            return None
        return token_obj.user

    @staticmethod
    def _can_user_download_file(user, file_param: str) -> bool:
        # Avoid an extra Contact lookup; participants are linked via Contact -> user.
        return Message.objects.filter(image=file_param, chat__participants__user=user).exists()

    def get(self, request):
        file_param = request.query_params.get('file')
        if not file_param or '..' in file_param or file_param.startswith('/') or '\\' in file_param:
            return Response({'detail': 'Invalid file parameter'}, status=status.HTTP_400_BAD_REQUEST)

        width_raw = request.query_params.get('width')
        height_raw = request.query_params.get('height')
        download = request.query_params.get('download', '0').lower() in ('1', 'true', 'yes')

        if width_raw is not None or height_raw is not None:
            if not width_raw or not height_raw:
                return Response({'detail': 'width and height are both required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                width = int(width_raw)
                height = int(height_raw)
            except (TypeError, ValueError):
                return Response({'detail': 'Invalid width/height'}, status=status.HTTP_400_BAD_REQUEST)
            if width < 1 or height < 1:
                return Response({'detail': 'Invalid width/height'}, status=status.HTTP_400_BAD_REQUEST)

            default_backend = settings.STORAGES.get('default', {}).get('BACKEND', '')
            if default_backend != 'storages.backends.s3boto3.S3Boto3Storage':
                try:
                    file_obj = default_storage.open(file_param, mode='rb')
                except Exception:
                    return Response({'detail': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
                guessed_type, _ = mimetypes.guess_type(file_param)
                content_type = guessed_type or 'application/octet-stream'
                response = FileResponse(file_obj, as_attachment=download, filename=os.path.basename(file_param))
                response['Content-Type'] = content_type
                return response

            processed_key = self._processed_object_key(file_param, width, height)
            try:
                processed_file_obj = default_storage.open(processed_key, mode='rb')
                processed_response = FileResponse(
                    processed_file_obj,
                    as_attachment=download,
                    filename=os.path.basename(file_param),
                )
                processed_response['Content-Type'] = 'image/webp'
                processed_response['Cache-Control'] = 'public, max-age=31536000, immutable'
                if download:
                    processed_response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_param)}"'
                return processed_response
            except Exception:
                pass

            processing_base = getattr(settings, 'IMAGE_PROCESSING_API_BASE_URL', '').strip()
            if not processing_base:
                return Response({'detail': 'Image processing service is not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            url = urljoin(processing_base.rstrip('/') + '/', 'api/images')
            resp = requests.get(
                url,
                params={'key': file_param, 'width': width, 'height': height},
                timeout=60,
            )
            if resp.status_code != 200:
                return Response({'detail': 'Failed to process image'}, status=status.HTTP_404_NOT_FOUND)

            content_type = resp.headers.get('content-type', 'image/jpeg')
            http_resp = HttpResponse(resp.content, content_type=content_type)
            if download:
                http_resp['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_param)}"'
            return http_resp

        if not download and settings.STORAGES.get('default', {}).get('BACKEND', '') == 'storages.backends.s3boto3.S3Boto3Storage':
            return Response(
                {'detail': 'Inline original serving is disabled; use processed image endpoints'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = self._resolve_authenticated_user(request)
        if not user:
            return Response({'detail': 'Authentication credentials were not provided'}, status=status.HTTP_401_UNAUTHORIZED)
        if not self._can_user_download_file(user, file_param):
            return Response({'detail': 'You do not have access to this file'}, status=status.HTTP_403_FORBIDDEN)

        try:
            file_obj = default_storage.open(file_param, mode='rb')
        except Exception:
            return Response({'detail': 'File not found'}, status=status.HTTP_404_NOT_FOUND)

        guessed_type, _ = mimetypes.guess_type(file_param)
        content_type = guessed_type or 'application/octet-stream'
        response = FileResponse(file_obj, as_attachment=download, filename=os.path.basename(file_param))
        response['Content-Type'] = content_type
        return response


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
            if not chat.participants.filter(id=username.id).exists():
                chat.participants.add(username)
                message = Message.objects.create(
                    contact=username,
                    content='{} joined this chat.'.format(username.user.username),
                    system_message=True,
                )
                chat.messages.add(message)
                chat.save()
                broadcast_new_message(chat, message)
            schat = ChatListSerializer(chat)
            broadcast_chats_update(chat)
            return Response({"status": "success", "data": schat.data}, status=status.HTTP_200_OK)

class uploadimageView(APIView):
    def post(self, request):
        chat = get_object_or_404(Chat,id=request.data["chatid"])
        username = get_user_contact(request.data['username'])
        image_items = [(k, v) for k, v in request.data.items() if 'image' in k]
        images = [v for _, v in image_items]
        if images:
            to_create = [
                Message(contact=username, content=None, image=image, system_message=False)
                for image in images
            ]
            created = Message.objects.bulk_create(to_create)
            chat.messages.add(*created)
            chat.save()
            for message in created:
                broadcast_new_message(chat, message)
       
        return Response({"status": "success", "data": "image"}, status=status.HTTP_200_OK)