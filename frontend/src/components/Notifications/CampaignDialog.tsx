import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Send as SendIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as DoneIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toastRef } from '../../context/ToastContext';

interface CampaignDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Preset {
  id: string;
  name: string;
  title: string;
  message: string;
}

interface PresetsResponse {
  total_eligible_patients: number;
  presets: Preset[];
}

export const CampaignDialog: React.FC<CampaignDialogProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const { user, impersonatedClinic } = useAuth();

  const activeClinic = impersonatedClinic || user?.clinic;
  const clinicName = activeClinic?.name || 'DentFlow Clinic';
  const doctorName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Doctor';

  // Form states
  const [selectedPresetId, setSelectedPresetId] = useState<string>('DIWALI');
  const [campaignTitle, setCampaignTitle] = useState<string>('Diwali Festive Wishes');
  const [messageBody, setMessageBody] = useState<string>('');
  const [audience, setAudience] = useState<string>('ALL_PATIENTS');

  // Fetch campaign presets and eligible count
  const { data: presetsData } = useQuery<PresetsResponse>({
    queryKey: ['campaign-presets'],
    queryFn: async () => {
      const res = await api.get('/notifications/campaigns/presets/');
      return res.data;
    },
    enabled: open,
  });

  // When presets load, set default to Diwali
  useEffect(() => {
    if (presetsData?.presets && presetsData.presets.length > 0) {
      const defaultPreset = presetsData.presets.find(p => p.id === selectedPresetId) || presetsData.presets[0];
      setCampaignTitle(defaultPreset.title);
      setMessageBody(defaultPreset.message);
    }
  }, [presetsData]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
    setCampaignTitle(preset.title);
    setMessageBody(preset.message);
  };

  // Insert variable into message body at cursor or end
  const handleInsertVariable = (variable: string) => {
    setMessageBody(prev => `${prev} ${variable}`);
  };

  // Broadcast Mutation
  const broadcastMutation = useMutation({
    mutationFn: async (payload: { title: string; message: string; audience: string; template_type: string }) => {
      const res = await api.post('/notifications/campaigns/broadcast/', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toastRef.show(data.detail || 'Campaign broadcast dispatched successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      onClose();
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Failed to dispatch campaign broadcast.';
      toastRef.show(errorMsg, 'error');
    },
  });

  const handleSendBroadcast = () => {
    if (!messageBody.trim()) {
      toastRef.show('Message body cannot be empty.', 'error');
      return;
    }
    broadcastMutation.mutate({
      title: campaignTitle,
      message: messageBody,
      audience,
      template_type: selectedPresetId,
    });
  };

  // Interpolated preview text for patient "Rahul Sharma"
  const getInterpolatedPreview = () => {
    return messageBody
      .replace(/\{\{patient_name\}\}/g, 'Rahul Sharma')
      .replace(/\{\{clinic_name\}\}/g, clinicName)
      .replace(/\{\{doctor_name\}\}/g, doctorName)
      .replace(/\{\{doctor\}\}/g, doctorName)
      .replace(/\{\{clinic_address\}\}/g, activeClinic?.address || '102 Horizon Towers, Pune');
  };

  const totalPatients = presetsData?.total_eligible_patients ?? 0;

  return (
    <Dialog open={open} onClose={broadcastMutation.isPending ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            <CampaignIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'Outfit' }}>
              WhatsApp Festival & Patient Broadcast
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Dispatched from Centralized DentFlow WhatsApp Gateway
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<WhatsAppIcon sx={{ fontSize: '18px !important', color: '#25D366 !important' }} />}
          label="Gateway Option 4"
          variant="outlined"
          color="success"
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        {broadcastMutation.isPending ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CircularProgress size={54} thickness={4} sx={{ mb: 2, color: '#25D366' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, fontFamily: 'Outfit' }}>
              Dispatching Campaign Broadcast...
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Sending personalized messages with anti-ban rate limiting to protect the connected WhatsApp number.
            </Typography>
            <Box sx={{ maxWidth: 400, mx: 'auto' }}>
              <LinearProgress color="success" sx={{ height: 8, borderRadius: 4 }} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Festival Preset Buttons */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                CHOOSE FESTIVE GREETING / CAMPAIGN PRESET:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {presetsData?.presets.map((preset) => (
                  <Chip
                    key={preset.id}
                    label={preset.name}
                    clickable
                    color={selectedPresetId === preset.id ? 'primary' : 'default'}
                    variant={selectedPresetId === preset.id ? 'filled' : 'outlined'}
                    onClick={() => handleSelectPreset(preset)}
                    sx={{
                      fontWeight: 600,
                      py: 1,
                      px: 0.5,
                      borderRadius: 2,
                    }}
                  />
                ))}
              </Box>
            </Box>

            {/* Campaign Title & Audience Row */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                label="Campaign Title"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g. Diwali Wishes 2026"
              />
              <FormControl component="fieldset" size="small" sx={{ minWidth: 260 }}>
                <FormLabel component="legend" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  AUDIENCE RECIPIENTS:
                </FormLabel>
                <RadioGroup
                  row
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <FormControlLabel
                    value="ALL_PATIENTS"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>All Patients ({totalPatients})</Typography>}
                  />
                  <FormControlLabel
                    value="ACTIVE_PATIENTS"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2" sx={{ fontWeight: 500 }}>Recent (6 Mos)</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            {/* Message Body Editor */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  MESSAGE TEMPLATE:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center', mr: 0.5 }}>
                    Insert tag:
                  </Typography>
                  {['{{patient_name}}', '{{clinic_name}}', '{{doctor_name}}'].map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      onClick={() => handleInsertVariable(tag)}
                      sx={{ fontSize: '0.7rem', height: 22, cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
              <TextField
                multiline
                rows={5}
                fullWidth
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Write your greeting or message..."
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  bgcolor: '#FAFAFA',
                }}
              />
            </Box>

            {/* Live WhatsApp Preview */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary' }}>
                LIVE PATIENT PREVIEW (WHAT THE PATIENT RECEIVES):
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#ECE5DD', // WhatsApp chat background color
                  borderRadius: 2,
                  backgroundImage: 'radial-gradient(#d3c6b5 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              >
                {/* Chat Bubble */}
                <Box
                  sx={{
                    bgcolor: '#FFFFFF',
                    borderRadius: '7.5px 7.5px 7.5px 0px',
                    p: 1.5,
                    maxWidth: { xs: '100%', sm: '85%' },
                    boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
                    position: 'relative',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: '#075E54', fontWeight: 700, display: 'block', mb: 0.5 }}
                  >
                    {clinicName} (DentFlow Verified)
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      color: '#111B21',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                  >
                    {getInterpolatedPreview()}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#667781', fontSize: '0.7rem' }}>
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                    <DoneIcon sx={{ fontSize: 14, color: '#53BDEB' }} />
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Anti-Ban & Rate-Limit Notice */}
            <Alert
              severity="info"
              icon={<SecurityIcon fontSize="inherit" />}
              sx={{ py: 0.5, fontSize: '0.8rem', bgcolor: '#F0F9FF', border: '1px solid #BAE6FD' }}
            >
              <strong>Anti-Spam Throttling:</strong> Broadcasts are delivered with a 2-second interval between recipients to keep your WhatsApp SIM safe and prevent carrier or WhatsApp account suspension.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={broadcastMutation.isPending} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<SendIcon />}
          onClick={handleSendBroadcast}
          disabled={broadcastMutation.isPending || totalPatients === 0 || !messageBody.trim()}
          sx={{
            px: 3,
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '0.95rem',
            bgcolor: '#25D366',
            '&:hover': { bgcolor: '#128C7E' },
          }}
        >
          Send to {totalPatients} Patients
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignDialog;
