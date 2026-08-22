from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response

from core.permissions import TenantIsolationPermission, SubscriptionAccessPermission
from .serializers import (
    VisitSerializer, UnifiedPatientInputSerializer,
    UnifiedVisitInputSerializer, UnifiedAppointmentInputSerializer,
    BillSerializer
)

class VisitViewSet(viewsets.ViewSet):
    """
    Standard Visit ViewSet for CRUD operations via MongoDB.
    """
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]

    def list(self, request):
        page = int(request.query_params.get('page', 1))
        from core.mongodb import get_visits
        data = get_visits(request.user.id, page=page)
        return Response(data)


class UnifiedVisitAPIView(APIView):
    """
    POST /api/visits/unified/
    Runs atomic write operations mapping across Patient, Visit, and (optional) Appointment in MongoDB.
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

        try:
            from core.mongodb import create_unified_visit
            res = create_unified_visit(
                user_id=request.user.id,
                patient_data=patient_serializer.validated_data,
                visit_data=visit_serializer.validated_data,
                appointment_data=appt_serializer.validated_data if appt_serializer else None
            )
            
            from patients.serializers import PatientSerializer
            from appointments.serializers import AppointmentSerializer
            
            return Response({
                "patient": PatientSerializer(res["patient"]).data,
                "visit": VisitSerializer(res["visit"]).data,
                "next_appointment": AppointmentSerializer(res["next_appointment"]).data if res["next_appointment"] else None
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"detail": f"Failed to complete unified transaction: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class BillViewSet(viewsets.ViewSet):
    """
    Standard Bill ViewSet backed by MongoDB.
    """
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]

    def list(self, request):
        patient_id = request.query_params.get('patient', None)
        search_query = request.query_params.get('search', None)
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 1000))
        
        from core.mongodb import get_bills
        data = get_bills(request.user.id, patient_id=patient_id, search_query=search_query, page=page, page_size=page_size)
        return Response(data)

    def retrieve(self, request, pk=None):
        from core.mongodb import get_bill_by_id
        bill = get_bill_by_id(request.user.id, str(pk))
        if not bill:
            return Response({"detail": "Bill not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BillSerializer(bill).data)

    def create(self, request):
        serializer = BillSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from core.mongodb import create_bill
        bill = create_bill(request.user.id, serializer.validated_data)
        return Response(BillSerializer(bill).data, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        serializer = BillSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        from core.mongodb import update_bill
        bill = update_bill(request.user.id, str(pk), serializer.validated_data)
        if not bill:
            return Response({"detail": "Bill not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BillSerializer(bill).data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    @action(detail=False, methods=['get'])
    def collections(self, request):
        from core.mongodb import get_total_collections
        total_collected = get_total_collections(request.user.id)
        return Response({"total_collections": float(total_collected)})


class LabWorkViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        from core.mongodb import get_lab_works
        items = get_lab_works(request.user.id)
        return Response(items)

    def create(self, request):
        from core.mongodb import create_lab_work
        item = create_lab_work(request.user.id, request.data)
        if not item:
            return Response({"detail": "Failed to create lab work order."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(item, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        from core.mongodb import update_lab_work
        item = update_lab_work(request.user.id, str(pk), request.data)
        if not item:
            return Response({"detail": "Lab work order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(item)

    def partial_update(self, request, pk=None):
        from core.mongodb import update_lab_work
        item = update_lab_work(request.user.id, str(pk), request.data)
        if not item:
            return Response({"detail": "Lab work order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(item)

    def destroy(self, request, pk=None):
        from core.mongodb import delete_lab_work
        success = delete_lab_work(request.user.id, str(pk))
        if not success:
            return Response({"detail": "Lab work order not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"detail": "Lab work order deleted."}, status=status.HTTP_204_NO_CONTENT)

