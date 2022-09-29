# # serializers.py in the users Django app
# from django.db import transaction
# from rest_framework import serializers
# from dj_rest_auth.registration.serializers import RegisterSerializer

# from chat.models import GENDER_SELECTION


# class CustomRegisterSerializer(RegisterSerializer):
#     gender = serializers.ChoiceField(choices=GENDER_SELECTION)
#     phone_number = serializers.CharField(max_length=30)

#     # Define transaction.atomic to rollback the save operation in case of error
#     @transaction.atomic
#     def save(self, request):
#         user = super().save(request)
#         user.gender = self.data.get('gender')
#         user.phone_number = self.data.get('phone_number')
#         user.save()
#         return user