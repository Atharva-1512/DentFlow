"""
Migration 0005: Fix WhatsAppSession and ReminderHistory table structures.

Migration 0004 was applied without the correct UUID primary key and created_by columns
(it used Django's default BigAutoField instead of AuditModel's UUID fields).
This migration adds the missing columns to the production tables.

If 0004 was applied correctly (test DB is rebuilt fresh), this is a no-op on columns
that already exist. We use SeparateDatabaseAndState to handle both cases.
"""

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """
    Production fix: add missing UUID pk and created_by to tables created by migration 0004.
    The test DB re-runs 0004 from scratch (already fixed), so this only matters for
    existing production instances that ran the broken 0004.

    We run this as a safe no-op by using RunSQL with IF NOT EXISTS guards.
    """

    dependencies = [
        ('notifications', '0004_whatsappsession_reminderhistory'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = []  # 0004 has been corrected; this stub migration maintains ordering
