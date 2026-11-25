from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("alerts_api", "0004_alter_staffaccount_password_hash_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="case",
            name="tracking_code",
            field=models.CharField(blank=True, db_index=True, default="", max_length=20),
        ),
    ]
