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
    admins = ContactSerializer(many=True)
    
    allowed_methods = ['get', 'post', 'put', 'delete', 'options','update']
    
    class Meta:
        model = Chat
        fields = ('id','name','messages', 'participants','admins')
        read_only = ('id')

    def create(self, validated_data):
        print(validated_data)
        participants = validated_data.pop('participants')
        admins = validated_data.pop('admins')
        name = validated_data.pop('name')
        chat = Chat()
        chat.name = name
        print('first element ',admins[0])
        chat.save()
        for username in participants:
            contact = get_user_contact(username)
            chat.participants.add(contact)
        chat.admins.add(get_user_contact(admins[0]))
        chat.save()
        return chat
    
    def update(self, instance, validated_data):
        print(validated_data['participants'],instance.participants.all())
        participants = validated_data['participants']
        contacts=[]
        for username in participants:
                contacts.append(get_user_contact(username))
        if len(contacts) < len(instance.participants.all()):
            new = list(set(instance.participants.all()) - set(contacts))
            print(new[0])     
            instance.participants.remove(new[0]) 
        else:
            for contact in contacts :
                if contact not in instance.participants.all():
                    instance.participants.add(contact)

        return instance

#  from chat.models import Chat  
#  from chat.api.serializers import ChatSerializer
#  chat = Chat.objects.get(id=1) 
#  s = ChatSerializer(chat)
#  s