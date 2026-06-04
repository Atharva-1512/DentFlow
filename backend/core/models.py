import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class UUIDModel(models.Model):
    """
    An abstract base class model that provides UUID primary keys.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class AuditModel(UUIDModel):
    """
    An abstract base class model that provides self-updating
    'created_at' and 'updated_at' fields, and 'created_by' tracking.
    """
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created"
    )

    class Meta:
        abstract = True


class TenantQuerySet(models.QuerySet):
    """
    QuerySet that handles tenant scoping filter.
    """
    def for_clinic(self, clinic):
        if clinic is None:
            return self.all()
        return self.filter(clinic=clinic)


class TenantManager(models.Manager):
    """
    Default manager for tenant-scoped models.
    """
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_clinic(self, clinic):
        return self.get_queryset().for_clinic(clinic)


class SoftDeleteQuerySet(TenantQuerySet):
    """
    QuerySet supporting both soft-delete filtration and tenant scoping.
    """
    def delete(self):
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(is_deleted=False)

    def dead(self):
        return self.filter(is_deleted=True)


class TenantSoftDeleteManager(TenantManager):
    """
    Custom manager that automatically excludes soft-deleted records from default queries.
    """
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).alive()

    def all_with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    """
    An abstract base class model that provides soft-delete tracking fields.
    """
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])


class TenantModel(AuditModel):
    """
    An abstract base class model that forces ownership by a Clinic.
    Used for strict tenant-level database isolation.
    """
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set"
    )

    objects = TenantManager()

    class Meta:
        abstract = True
