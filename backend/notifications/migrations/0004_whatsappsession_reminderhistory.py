import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0001_initial'),
        ('appointments', '0001_initial'),
        ('notifications', '0003_notificationlog_provider_message_id_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── WhatsAppSession (one per clinic) ──────────────────────────────────
        migrations.CreateModel(
            name='WhatsAppSession',
            fields=[
                # AuditModel base fields
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='notifications_whatsappsession_created',
                    to=settings.AUTH_USER_MODEL,
                )),
                # Session fields
                ('clinic', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='whatsapp_session',
                    to='clinics.clinic',
                )),
                ('status', models.CharField(
                    db_index=True,
                    default='DISCONNECTED',
                    help_text='INITIALIZING | QR_REQUIRED | CONNECTED | DISCONNECTED | RECONNECTING',
                    max_length=20,
                )),
                ('connected_number', models.CharField(
                    blank=True,
                    help_text='The WhatsApp number currently connected (e.g. 919876543210)',
                    max_length=30,
                    null=True,
                )),
                ('connected_name', models.CharField(
                    blank=True,
                    help_text='WhatsApp display name of the connected account',
                    max_length=255,
                    null=True,
                )),
                ('last_activity', models.DateTimeField(
                    blank=True,
                    help_text='Last time a message was sent or session was active',
                    null=True,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),

        # ── ReminderHistory (per appointment + slot + target) ─────────────────
        migrations.CreateModel(
            name='ReminderHistory',
            fields=[
                # TenantModel → AuditModel base fields
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='notifications_reminderhistory_created',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('clinic', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications_reminderhistory_set',
                    to='clinics.clinic',
                )),
                # ReminderHistory-specific fields
                ('appointment', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reminders',
                    to='appointments.appointment',
                )),
                ('slot', models.CharField(
                    choices=[
                        ('DAY_BEFORE', 'Evening before appointment (7 PM IST)'),
                        ('SAME_DAY', 'Morning of appointment (7 AM IST)'),
                    ],
                    db_index=True,
                    max_length=15,
                )),
                ('target', models.CharField(
                    choices=[
                        ('PATIENT', 'Patient'),
                        ('CLINIC', 'Clinic (Doctor)'),
                    ],
                    db_index=True,
                    max_length=10,
                )),
                ('recipient_number', models.CharField(
                    help_text='Phone number this reminder was/will be sent to',
                    max_length=30,
                )),
                ('message', models.TextField(
                    help_text='Exact message text that was/will be sent',
                )),
                ('status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('SENT', 'Sent'),
                        ('FAILED', 'Failed (will retry)'),
                        ('SKIPPED', 'Skipped (session disconnected)'),
                    ],
                    db_index=True,
                    default='PENDING',
                    max_length=10,
                )),
                ('scheduled_for', models.DateTimeField(
                    db_index=True,
                    help_text='When this reminder should be dispatched (in UTC)',
                )),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('retry_count', models.PositiveSmallIntegerField(default=0)),
                ('error_message', models.TextField(
                    blank=True,
                    help_text='Last error message if send failed',
                    null=True,
                )),
            ],
            options={
                'ordering': ['-scheduled_for'],
            },
        ),

        # ── Constraints & Indexes ─────────────────────────────────────────────
        migrations.AddConstraint(
            model_name='reminderhistory',
            constraint=models.UniqueConstraint(
                fields=['appointment', 'slot', 'target'],
                name='unique_appointment_slot_target',
            ),
        ),
        migrations.AddIndex(
            model_name='reminderhistory',
            index=models.Index(fields=['clinic', 'status'], name='notif_remhist_clinic_status_idx'),
        ),
        migrations.AddIndex(
            model_name='reminderhistory',
            index=models.Index(fields=['scheduled_for', 'status'], name='notif_remhist_scheduled_status_idx'),
        ),
        migrations.AddIndex(
            model_name='reminderhistory',
            index=models.Index(fields=['appointment', 'slot'], name='notif_remhist_appt_slot_idx'),
        ),
    ]
