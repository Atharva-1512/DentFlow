from django.db import models
from django.utils import timezone
from core.models import TenantModel, SoftDeleteModel, TenantSoftDeleteManager

class Visit(TenantModel, SoftDeleteModel):
    """
    A completed consultation log for a patient, with soft-delete support.
    """
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='visits'
    )
    visit_date = models.DateTimeField(default=timezone.now, db_index=True)
    consulting_doctor = models.CharField(max_length=255)
    diagnosis = models.TextField()
    treatment_given = models.TextField()
    prescription_notes = models.TextField(blank=True, default='')
    general_notes = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, default='COMPLETED')

    # Attach TenantSoftDeleteManager explicitly
    objects = TenantSoftDeleteManager()

    class Meta:
        ordering = ['-visit_date']
        indexes = [
            models.Index(fields=['clinic', 'patient']),
            models.Index(fields=['visit_date']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"Visit for {self.patient.full_name} on {self.visit_date.date()}"


class Bill(TenantModel, SoftDeleteModel):
    """
    Billing invoice details for a patient.
    """
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bills'
    )
    patient_name = models.CharField(max_length=255, default='', blank=True)
    patient_age = models.CharField(max_length=50, blank=True, default='')
    patient_gender = models.CharField(max_length=20, blank=True, default='')
    patient_mobile = models.CharField(max_length=50, blank=True, default='')
    bill_number = models.CharField(max_length=50, db_index=True)
    bill_date = models.DateField(default=timezone.now)
    doctor_name = models.CharField(max_length=255)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    outstanding_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(
        max_length=20,
        choices=[
            ('PAID', 'Paid'),
            ('PARTIALLY_PAID', 'Partially Paid'),
            ('UNPAID', 'Unpaid')
        ],
        default='UNPAID'
    )
    clinic_address = models.TextField(blank=True, default='')
    clinic_contact = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = TenantSoftDeleteManager()

    class Meta:
        ordering = ['-bill_date', '-created_at']
        unique_together = ('clinic', 'bill_number')
        indexes = [
            models.Index(fields=['clinic', 'patient']),
            models.Index(fields=['bill_date']),
            models.Index(fields=['is_deleted']),
        ]

    def __str__(self):
        return f"Bill {self.bill_number} for {self.patient_name}"

    def save(self, *args, **kwargs):
        if not self.bill_number:
            # Find the max bill number for this clinic
            last_bill = Bill.objects.filter(clinic=self.clinic).order_by('-created_at').first()
            if last_bill:
                try:
                    last_num = int(last_bill.bill_number.split('-')[-1])
                    next_num = last_num + 1
                except (ValueError, IndexError):
                    next_num = 1
            else:
                next_num = 1
            self.bill_number = f"INV-{next_num:05d}"
            
        self.outstanding_balance = self.grand_total - self.amount_paid
        super().save(*args, **kwargs)


class BillTreatment(models.Model):
    """
    Individual treatment item in a bill.
    """
    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name='treatments'
    )
    treatment_name = models.CharField(max_length=255)
    treatment_date = models.DateField(default=timezone.now)
    quantity = models.PositiveIntegerField(default=1)
    cost = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.treatment_name} on {self.treatment_date} (x{self.quantity})"


class BillPayment(models.Model):
    """
    Payment transaction history for installment tracking.
    """
    bill = models.ForeignKey(
        Bill,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    payment_date = models.DateField(default=timezone.now)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_mode = models.CharField(
        max_length=50,
        choices=[
            ('UPI', 'UPI'),
            ('CASH', 'Cash'),
            ('CARD', 'Card'),
            ('NET_BANKING', 'Net Banking'),
            ('OTHER', 'Other')
        ],
        default='UPI'
    )

    def __str__(self):
        return f"Payment of {self.amount_paid} on {self.payment_date} via {self.payment_mode}"
