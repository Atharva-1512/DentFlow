from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response

from core.views import TenantViewSetMixin
from core.permissions import TenantIsolationPermission, SubscriptionAccessPermission
from patients.models import Patient
from patients.serializers import PatientSerializer
from appointments.models import Appointment
from appointments.serializers import AppointmentSerializer
from .models import Visit, Bill
from .serializers import (
    VisitSerializer, UnifiedPatientInputSerializer,
    UnifiedVisitInputSerializer, UnifiedAppointmentInputSerializer,
    BillSerializer
)

class VisitViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """
    Standard Visit ViewSet for normal CRUD.
    Tenant isolation is managed automatically by TenantViewSetMixin.
    """
    queryset = Visit.objects.all()
    serializer_class = VisitSerializer


class UnifiedVisitAPIView(APIView):
    """
    POST /api/visits/unified/
    Runs atomic transaction mapping across Patient, Visit, and (optional) Appointment.
    """
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]

    def post(self, request):
        patient_data = request.data.get('patient', {})
        visit_data = request.data.get('visit', {})
        appt_data = request.data.get('next_appointment', None)

        # 1. Run Input Validation Serializers
        patient_serializer = UnifiedPatientInputSerializer(data=patient_data)
        visit_serializer = UnifiedVisitInputSerializer(data=visit_data)
        
        patient_serializer.is_valid(raise_exception=True)
        visit_serializer.is_valid(raise_exception=True)

        appt_serializer = None
        if appt_data:
            appt_serializer = UnifiedAppointmentInputSerializer(data=appt_data)
            appt_serializer.is_valid(raise_exception=True)

        # 2. Resolve Patient if ID is provided
        patient = None
        patient_id = patient_serializer.validated_data.get('id')
        if patient_id:
            try:
                patient = Patient.objects.get(id=patient_id, clinic=request.clinic)
            except Patient.DoesNotExist:
                return Response(
                    {"detail": f"Patient with ID {patient_id} not found in this clinic context."},
                    status=status.HTTP_404_NOT_FOUND
                )

        # 3. Open Atomic DB Transaction for writes
        try:
            with transaction.atomic():
                clinic = request.clinic
                user = request.user
                
                # A. Create Patient if not resolved
                if not patient:
                    patient = Patient.objects.create(
                        clinic=clinic,
                        created_by=user,
                        full_name=patient_serializer.validated_data['full_name'],
                        age=patient_serializer.validated_data['age'],
                        gender=patient_serializer.validated_data['gender'],
                        mobile_number=patient_serializer.validated_data['mobile_number'],
                        address=patient_serializer.validated_data.get('address', ''),
                        consulting_doctor_name=patient_serializer.validated_data.get('consulting_doctor_name', ''),
                        chief_complaint=patient_serializer.validated_data.get('chief_complaint', ''),
                        notes=patient_serializer.validated_data.get('notes', '')
                    )

                # B. Create Visit record
                visit = Visit.objects.create(
                    clinic=clinic,
                    patient=patient,
                    created_by=user,
                    visit_date=visit_serializer.validated_data.get('visit_date', timezone.now()),
                    consulting_doctor=visit_serializer.validated_data['consulting_doctor'],
                    diagnosis=visit_serializer.validated_data['diagnosis'],
                    treatment_given=visit_serializer.validated_data['treatment_given'],
                    prescription_notes=visit_serializer.validated_data.get('prescription_notes', ''),
                    general_notes=visit_serializer.validated_data.get('general_notes', '')
                )

                # C. Create Appointment record (optional)
                appointment = None
                if appt_serializer:
                    appointment = Appointment.objects.create(
                        clinic=clinic,
                        patient=patient,
                        created_by=user,
                        appointment_date=appt_serializer.validated_data['appointment_date'],
                        appointment_time=appt_serializer.validated_data['appointment_time'],
                        consulting_doctor=appt_serializer.validated_data['consulting_doctor'],
                        appointment_type=appt_serializer.validated_data.get('appointment_type', 'CONSULTATION'),
                        appointment_reason=appt_serializer.validated_data.get('appointment_reason', '')
                    )
        except Exception as e:
            return Response(
                {"detail": f"Failed to complete unified transaction: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Build unified success payload response outside transaction scope
        return Response({
            "patient": PatientSerializer(patient).data,
            "visit": VisitSerializer(visit).data,
            "next_appointment": AppointmentSerializer(appointment).data if appointment else None
        }, status=status.HTTP_201_CREATED)


class BillViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """
    Standard Bill ViewSet.
    Tenant isolation is managed automatically by TenantViewSetMixin.
    """
    queryset = Bill.objects.all()
    serializer_class = BillSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by specific patient UUID
        patient_id = self.request.query_params.get('patient', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
            
        # Search query matching
        search_query = self.request.query_params.get('search', None)
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(patient_name__icontains=search_query) |
                Q(patient_mobile__icontains=search_query) |
                Q(bill_number__icontains=search_query)
            )
        return queryset
