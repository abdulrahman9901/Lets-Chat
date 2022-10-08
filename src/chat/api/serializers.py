from email import message
from importlib.resources import contents
from urllib import request
from chat.models import Contact
from rest_framework import serializers
from rest_framework.fields import CurrentUserDefault
from chat.models import Chat ,Message

from django.db import transaction

from dj_rest_auth.registration.serializers import RegisterSerializer

from chat.views import get_user_contact

from chat.models import GENDER_SELECTION

from asgiref.sync import async_to_sync

from channels.layers import get_channel_layer

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
                    'system_message':message.system_message    
                    }
                }       
                })

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

        message = Message.objects.create(contact=get_user_contact(admins[0]),content='{} created the chat .'.format(admins[0]),system_message=True)
        chat.messages.add(message)

        chat.save()
        return chat

        
    def update(self, instance, validated_data):

        # https://stackoverflow.com/questions/30203652/how-to-get-request-user-in-django-rest-framework-serializer
        request = self.context.get("request")
        print("request",request.data.get('username'))
        print(validated_data['participants'],instance.participants.all())

        print(validated_data['admins'],instance.admins.all())

        # https://channels.readthedocs.io/en/stable/topics/channel_layers.html
        # https://django.fun/en/qa/421495/
        # https://django.fun/en/qa/420074/
        # https://stackoverflow.com/a/48631111

        channel_layer = get_channel_layer()
        print('chat_{}'.format(instance.id))
        async_to_sync(channel_layer.group_send)('chat_{}'.format(instance.id),{
             
                'type': 'chat_message',
                'message':{
                'command': 'chatsUpdate'     
                }       
            })
        message = None
        participants = validated_data['participants']
        admins = validated_data['admins']
        currentUser = request.data.get('username')
        contacts=[]
        new_admins = []
        for username in participants:
                contacts.append(get_user_contact(username))

        for admin in admins:
                new_admins.append(get_user_contact(admin))

        # leave case 
        if len(contacts) < len(instance.participants.all()):
            new = list(set(instance.participants.all()) - set(contacts))
            print(new[0])     
            message = Message.objects.create(contact=new[0],content='{} left the chat .'.format(new[0].user.username),system_message=True)
            instance.messages.add(message)
            send_socket_message(instance,message)
            instance.participants.remove(new[0])
            if new[0] in instance.admins.all():
                instance.admins.remove(new[0])  
            
        # add memeber and/or assign memeber to be an admin 

        else:
            for contact in contacts :
                if contact not in instance.participants.all():
                    instance.participants.add(contact)
                    message = Message.objects.create(contact=get_user_contact(currentUser),content='{} added {} to the chat .'.format(currentUser,contact.user.username),system_message=True)
                    instance.messages.add(message)
                    send_socket_message(instance,message)


            for admin in new_admins :
                if admin not in instance.admins.all():
                    instance.admins.add(admin)
                    message = Message.objects.create(contact=get_user_contact(currentUser),content='{} made {} an admin in the chat .'.format(currentUser,admin.user.username),system_message=True)
                    instance.messages.add(message)
                    send_socket_message(instance,message)


        return instance

#  from chat.models import Chat  
#  from chat.api.serializers import ChatSerializer
#  chat = Chat.objects.get(id=1) 
#  s = ChatSerializer(chat)
#  s