from django.contrib import admin

# Register your models here.
from .models import Chat, Contact, CustomUser, Message

admin.site.register(Message)
admin.site.register(Chat)
admin.site.register(Contact)
admin.site.register(CustomUser)