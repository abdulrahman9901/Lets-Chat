from django.db import migrations


def verify_legacy_users(apps, schema_editor):
    CustomUser = apps.get_model('chat', 'CustomUser')
    CustomUser.objects.filter(
        is_email_verified=False,
        email_verification_code_hash__isnull=True,
    ).update(is_email_verified=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0008_customuser_email_verification_code_hash_and_more'),
    ]

    operations = [
        migrations.RunPython(verify_legacy_users, noop_reverse),
    ]
