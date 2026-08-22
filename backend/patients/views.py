from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import TenantIsolationPermission, SubscriptionAccessPermission
from .serializers import PatientSerializer

class PatientViewSet(viewsets.ViewSet):
    """
    Patient ViewSet supporting CRUD, global queries, and timeline actions via MongoDB.
    """
    permission_classes = [TenantIsolationPermission, SubscriptionAccessPermission]

    def list(self, request):
        search_query = request.query_params.get('search', None)
        page = int(request.query_params.get('page', 1))
        
        from core.mongodb import get_patients
        data = get_patients(request.user.id, search_query=search_query, page=page)
        return Response(data)

    def retrieve(self, request, pk=None):
        from core.mongodb import get_patient_by_id
        patient = get_patient_by_id(request.user.id, str(pk))
        if not patient:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = PatientSerializer(patient)
        return Response(serializer.data)

    def create(self, request):
        serializer = PatientSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from core.mongodb import create_patient
        patient = create_patient(request.user.id, serializer.validated_data)
        return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = PatientSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        from core.mongodb import update_patient
        patient = update_patient(request.user.id, str(pk), serializer.validated_data)
        if not patient:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PatientSerializer(patient).data)

    def destroy(self, request, pk=None):
        from core.mongodb import delete_patient
        success = delete_patient(request.user.id, str(pk))
        if not success:
            return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        GET /api/patients/<id>/timeline/
        Returns chronological listings of both completed visits and scheduled appointments from MongoDB.
        """
        from core.mongodb import get_patient_timeline
        timeline_data = get_patient_timeline(request.user.id, str(pk))
        return Response(timeline_data)
