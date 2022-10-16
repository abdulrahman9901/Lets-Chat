from itertools import chain
import json
from multiprocessing import current_process
from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from chat.models import Chat, Contact, Message
from django.contrib.auth import get_user_model
from .views import load_last_messages , get_user_contact ,get_current_chat
from .api.serializers import ChatSerializer
User=get_user_model()

class ChatConsumer(WebsocketConsumer):

    def message_to_json(self,message):
        return {
            'id':message.id,
            'author':message.contact.user.username,
            'content':message.content,
            'timestamp':str(message.created_at),
            'system_message':message.system_message,
            "image" : str(message.image)
        }

    def messages_to_json(self,messages):
        result=[]
        for message in messages:
            result.append(self.message_to_json(message))
        return result

    def new_message(self, data):
        contact = data['from']
        contact_user = get_user_contact(contact)
        current_chat = get_current_chat(data['chatId'])
        message = Message.objects.create(
            contact=contact_user, 
            content=data['message'])
        current_chat.messages.add(message)
        current_chat.save()
        content = {
            'command': 'new_message',
            'message': self.message_to_json(message)
        }
        return self.send_chat_message(content)

    def load_messages(self,data):
        messages=load_last_messages(data['chatId'],data['msgCount'])
        chat = get_current_chat(data['chatId'])
        username = data['username']
        print(chat.admins.all())
        memebers=[]
        admins=[]
        # memebers =admins = [] will inialize both as empty lists but they will be assocaiated after that and if the had
        # differebt values the values will be mreged such as admnis=['admin'] , memeber=['admin', 'ahmed'] then both 
        # admins and memebers will be equal to memebers =admins=['admin', 'ahmed', 'admin']
        for contact in chat.participants.all() :
            memebers.append(contact.user.username)
        for admin in chat.admins.all() :
            print('admin # ',admin.user.username)
            admins.append(admin.user.username)

        print('admins after loop ',admins)

        if username in memebers :
            content={
                'command':'messages',
                'messages':self.messages_to_json(messages),
                'participants' :memebers,
                'admins' :admins,
                'name' : chat.name,
                'chatKey' :ChatSerializer(chat).data['chatKey']
            }
        else :
            content={
                'command':'messages',
                'messages':[],
                'participants' :memebers,
                'admins' :[],
                'name' : chat.name
            }
        print(content)
        self.send_message(content)       


    commands={
        'new_message':new_message,
        'load_messages':load_messages
    }


    def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = 'chat_%s' % self.room_name
        print('channel name ',self.room_name,self.room_group_name)
        # Join room group
        async_to_sync(self.channel_layer.group_add)(
            self.room_group_name,
            self.channel_name
        )

        self.accept()

    def disconnect(self, close_code):
        # Leave room group
        async_to_sync(self.channel_layer.group_discard)(
            self.room_group_name,
            self.channel_name
        )
 

    # Receive message from WebSocket
    def receive(self, text_data):
        data = json.loads(text_data)
        print('at recieve message',data)
        self.commands[data['command']](self,data)

    def send_chat_message(self,message):
        print('at send chat message',message)
        # Send message to room group
        async_to_sync(self.channel_layer.group_send)(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message
            }
        )

    def send_message(self, message):
        # Send message to WebSocket
        self.send(text_data=json.dumps(message))

    # Receive message from room group
    def chat_message(self, event):
        message = event['message']
        print('at chat message',message)
        # Send message to WebSocket
        self.send(text_data=json.dumps(message))