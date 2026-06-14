from django.db import models
from django.utils.text import slugify
from core.models import AuditModel

class Clinic(AuditModel):
    """
    Clinic represents the main Tenant model in the SaaS platform.
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    is_active = models.BooleanField(default=True)
    notification_whatsapp_number = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        help_text="Clinic's destination mobile number for summaries."
    )
    address = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            # Generate a base slug from the name
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            # Ensure slug is unique
            while Clinic.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
