from chat.models import Contact
from rest_framework import serializers

from chat.models import Chat

from django.db import transaction

from dj_rest_auth.registration.serializers import RegisterSerializer

from chat.views import get_user_contact

from chat.models import GENDER_SELECTION

class CustomRegisterSerializer(RegisterSerializer):
    gender = serializers.ChoiceField(choices=GENDER_SELECTION)
    phone_number = serializers.CharField(max_length=30)

    # Define transaction.atomic to rollback the save operation in case of error
    @transaction.atomic
    def save(self, request):
        user = super().save(request)
        user.gender = self.data.get('gender')
        user.phone_number = self.data.get('phone_number')
        contact = Contact()
        contact.user = user
        user.save()
        contact.save()
        return user

class ContactSerializer(serializers.StringRelatedField):
    def to_internal_value(self, value):
        print(value)
        return value

class ChatSerializer(serializers.ModelSerializer):
    participants = ContactSerializer(many=True)

    class Meta:
        model = Chat
        fields = ('id','name','messages', 'participants')
        read_only = ('id')

    def create(self, validated_data):
        print(validated_data)
        participants = validated_data.pop('participants')
        name = validated_data.pop('name')
        chat = Chat()
        chat.name = name
        chat.save()
        for username in participants:
            contact = get_user_contact(username)
            chat.participants.add(contact)
        chat.save()
        return chat

#  from chat.models import Chat  
#  from chat.api.serializers import ChatSerializer
#  chat = Chat.objects.get(id=1) 
#  s = ChatSerializer(chat)
#  s