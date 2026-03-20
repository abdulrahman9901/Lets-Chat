from django.db import models
#from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractUser

# Create your models here.

# https://stackoverflow.com/questions/26914022/auth-user-model-refers-to-model-that-has-not-been-installed
# https://dev.to/siumhossain/solved-valueerror-the-field-adminlogentryuser-was-declared-with-a-lazy-reference-5fm1
# User=get_user_model()


GENDER_SELECTION = [
    ('M', 'Male'),
    ('F', 'female'),
    ('NS', 'other'),
]

class CustomUser(AbstractUser):
    # We don't need to define the email attribute because is inherited from AbstractUser
    gender = models.CharField(max_length=20, choices=GENDER_SELECTION)
    phone_number = models.CharField(max_length=30)
    is_email_verified = models.BooleanField(default=False)
    email_verification_code_hash = models.CharField(max_length=128, null=True, blank=True)
    email_verification_expires_at = models.DateTimeField(null=True, blank=True)

class Contact(models.Model):
    user=models.ForeignKey(CustomUser,on_delete=models.CASCADE,related_name="friends")
    friends = models.ManyToManyField('self',blank=True)

    def __str__(self):
        return self.user.username

class Message(models.Model):
    contact=models.ForeignKey(Contact,on_delete=models.CASCADE,related_name="auther_messages")
    content=models.TextField(null=True,max_length=200)
    created_at=models.DateTimeField(auto_now_add=True)
    system_message = models.BooleanField(default=False)
    image = models.ImageField(upload_to='uploads/',null=True)
    def __str__(self):
        return self.contact.user.username

class Chat(models.Model):
    name = models.CharField(max_length=20,null=True)
    admins = models.ManyToManyField(Contact,related_name='chat_admins')
    participants = models.ManyToManyField(Contact,related_name='chats')
    messages = models.ManyToManyField(Message,blank=True)

    def __str__(self):
        return "{}".format(self.pk)

