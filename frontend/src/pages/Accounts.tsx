import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  AccountBalanceWallet as AccountsIcon,
  TrendingUp as RevenueIcon,
  PendingActions as PendingIcon,
  ReceiptLong as BillIcon,
  Add as AddIcon,
  People as PeopleIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
} from '@mui/icons-material';

import { useBills } from '../hooks/useApi';
import type { Bill } from '../types';

interface PatientCollectionRecord {
  id: string;
  patientId?: string;
  patientName: string;
  patientMobile: string;
  billNumber: string;
  paymentDate: string;
  amountCollected: number;
  paymentMode: string;
  doctorName?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const CustomTabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index} id={`accounts-tabpanel-${index}`}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const Accounts: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab State (0: Patient Collections, 1: Daily Revenue Summary, 2: Generated Bills Ledger)
  const [activeTab, setActiveTab] = useState(0);

  // Period Filter State (CURRENT_MONTH, LAST_MONTH, ALL_TIME)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('CURRENT_MONTH');

  // Fetch all bills for financial accounting analysis
  const { data: billsData, isLoading } = useBills('', 0);
  const allBills: Bill[] = billsData?.results || [];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Filter bills by selected period
  const filteredBills = allBills.filter((bill) => {
    if (selectedPeriod === 'ALL_TIME') return true;
    const bDate = new Date(bill.bill_date);
    if (isNaN(bDate.getTime())) return true;
    if (selectedPeriod === 'CURRENT_MONTH') {
      return bDate.getFullYear() === currentYear && bDate.getMonth() === currentMonth;
    }
    if (selectedPeriod === 'LAST_MONTH') {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      return bDate.getFullYear() === lastMonthDate.getFullYear() && bDate.getMonth() === lastMonthDate.getMonth();
    }
    return true;
  });

  // Financial Metrics
  const totalBilledPeriod = filteredBills.reduce((sum, b) => sum + Number(b.grand_total || 0), 0);
  const totalReceivedPeriod = filteredBills.reduce((sum, b) => sum + Number(b.amount_paid || 0), 0);
  const totalPendingPeriod = totalBilledPeriod - totalReceivedPeriod;

  // 1. Build Patient Collections List ("from which patient the amount has been collected")
  const patientCollectionsList: PatientCollectionRecord[] = [];

  filteredBills.forEach((bill) => {
    const pId = bill.patient || (bill as any).patient_id;
    if (bill.payments && bill.payments.length > 0) {
      bill.payments.forEach((p, idx) => {
        patientCollectionsList.push({
          id: `${bill.id}-p-${idx}`,
          patientId: pId,
          patientName: bill.patient_name || '—',
          patientMobile: bill.patient_mobile || '—',
          billNumber: bill.bill_number || '',
          paymentDate: p.payment_date || bill.bill_date,
          amountCollected: Number(p.amount_paid || 0),
          paymentMode: p.payment_mode || 'UPI',
          doctorName: bill.doctor_name,
        });
      });
    } else if (Number(bill.amount_paid || 0) > 0) {
      patientCollectionsList.push({
        id: `${bill.id}-initial`,
        patientId: pId,
        patientName: bill.patient_name || '—',
        patientMobile: bill.patient_mobile || '—',
        billNumber: bill.bill_number || '',
        paymentDate: bill.bill_date,
        amountCollected: Number(bill.amount_paid),
        paymentMode: 'UPI',
        doctorName: bill.doctor_name,
      });
    }
  });

  patientCollectionsList.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  // 2. Group collections by patient to display Total Collected Per Patient
  const patientSummaryMap: {
    [patientName: string]: {
      patientId?: string;
      patientName: string;
      patientMobile: string;
      totalCollected: number;
      paymentsCount: number;
      lastPaymentDate: string;
    };
  } = {};

  patientCollectionsList.forEach((item) => {
    const key = item.patientName;
    if (!patientSummaryMap[key]) {
      patientSummaryMap[key] = {
        patientId: item.patientId,
        patientName: item.patientName,
        patientMobile: item.patientMobile,
        totalCollected: 0,
        paymentsCount: 0,
        lastPaymentDate: item.paymentDate,
      };
    }
    patientSummaryMap[key].totalCollected += item.amountCollected;
    patientSummaryMap[key].paymentsCount += 1;
    if (item.paymentDate > patientSummaryMap[key].lastPaymentDate) {
      patientSummaryMap[key].lastPaymentDate = item.paymentDate;
    }
  });

  const patientSummaryList = Object.values(patientSummaryMap).sort((a, b) => b.totalCollected - a.totalCollected);

  // 3. Daily earnings map: group payments & bills by exact date (YYYY-MM-DD)
  const dailySummaryMap: {
    [date: string]: {
      date: string;
      billsCount: number;
      billedAmount: number;
      amountEarned: number;
      pendingBalance: number;
    };
  } = {};

  filteredBills.forEach((bill) => {
    const bDateStr = bill.bill_date ? bill.bill_date.substring(0, 10) : 'Unknown';

    if (!dailySummaryMap[bDateStr]) {
      dailySummaryMap[bDateStr] = {
        date: bDateStr,
        billsCount: 0,
        billedAmount: 0,
        amountEarned: 0,
        pendingBalance: 0,
      };
    }
    dailySummaryMap[bDateStr].billsCount += 1;
    dailySummaryMap[bDateStr].billedAmount += Number(bill.grand_total || 0);

    if (bill.payments && bill.payments.length > 0) {
      bill.payments.forEach((p) => {
        const pDateStr = p.payment_date ? p.payment_date.substring(0, 10) : bDateStr;
        if (!dailySummaryMap[pDateStr]) {
          dailySummaryMap[pDateStr] = {
            date: pDateStr,
            billsCount: 0,
            billedAmount: 0,
            amountEarned: 0,
            pendingBalance: 0,
          };
        }
        dailySummaryMap[pDateStr].amountEarned += Number(p.amount_paid || 0);
      });
    } else {
      dailySummaryMap[bDateStr].amountEarned += Number(bill.amount_paid || 0);
    }
  });

  const dailySummaryList = Object.values(dailySummaryMap)
    .map((d) => ({
      ...d,
      pendingBalance: Math.max(0, d.billedAmount - d.amountEarned),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            startIcon={<BackIcon />}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Dashboard
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontFamily: 'Outfit', fontWeight: 700 }}>
              Accounts & Ledger
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track collected payments per patient, daily revenue summaries, monthly earned totals, and pending balances.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Period Filter</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period Filter"
              onChange={(e) => setSelectedPeriod(e.target.value)}
              sx={{ fontWeight: 600 }}
            >
              <MenuItem value="CURRENT_MONTH">This Month ({now.toLocaleString('default', { month: 'short' })})</MenuItem>
              <MenuItem value="LAST_MONTH">Last Month</MenuItem>
              <MenuItem value="ALL_TIME">All Time</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/quick-bill')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Create Quick Bill
          </Button>
        </Box>
      </Box>

      {/* Accounts Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'success.main', bgcolor: 'rgba(76, 175, 80, 0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Amount Collected
                </Typography>
                <RevenueIcon color="success" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                ₹{totalReceivedPeriod.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                From {patientSummaryList.length} patient(s) in period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'primary.main', bgcolor: 'rgba(25, 118, 210, 0.04)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Total Billed Amount
                </Typography>
                <BillIcon color="primary" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                ₹{totalBilledPeriod.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {filteredBills.length} invoice(s) generated
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, borderColor: totalPendingPeriod > 0 ? 'error.main' : 'grey.300', bgcolor: totalPendingPeriod > 0 ? 'rgba(211, 47, 47, 0.04)' : 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Pending Balance Due
                </Typography>
                <PendingIcon color={totalPendingPeriod > 0 ? 'error' : 'action'} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: totalPendingPeriod > 0 ? 'error.main' : 'text.primary' }}>
                ₹{totalPendingPeriod.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Outstanding due from patients
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'rgba(156, 39, 176, 0.04)', borderColor: 'secondary.main' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Collection Rate
                </Typography>
                <AccountsIcon color="secondary" />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                {totalBilledPeriod > 0 ? `${Math.round((totalReceivedPeriod / totalBilledPeriod) * 100)}%` : '100%'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Payment collection efficiency
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<PeopleIcon />} iconPosition="start" label={`Patient Collections (${patientCollectionsList.length} Payments)`} />
          <Tab icon={<CalendarIcon />} iconPosition="start" label={`Daily Revenue Summary (${dailySummaryList.length} Days)`} />
          <Tab icon={<BillIcon />} iconPosition="start" label={`Generated Bills Ledger (${filteredBills.length})`} />
        </Tabs>
      </Box>

      {/* TAB 0: PATIENT COLLECTIONS ("From Which Patient Amount Was Collected") */}
      <CustomTabPanel value={activeTab} index={0}>
        {/* Section 1: Patient Collections Summary */}
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2, mb: 4 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Total Collections Collected Per Patient
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Summary of total amounts earned and collected from each individual patient.
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={40} />
            </Box>
          ) : patientSummaryList.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No payment collections recorded for this period.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mobile Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Payments Recorded</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Latest Payment Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }} align="right">Total Amount Collected (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patientSummaryList.map((p) => (
                    <TableRow key={p.patientName} hover>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {p.patientName}
                      </TableCell>
                      <TableCell>{p.patientMobile}</TableCell>
                      <TableCell align="center">
                        <Chip label={`${p.paymentsCount} Payment(s)`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell>{new Date(p.lastPaymentDate).toLocaleDateString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                        ₹{p.totalCollected.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="center">
                        {p.patientId ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/patients/${p.patientId}`)}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                          >
                            View Patient
                          </Button>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Section 2: Detailed Collections Transaction Log */}
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Detailed Patient Collections Log
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chronological log of exact amounts collected, patient details, payment dates, and payment modes.
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={40} />
            </Box>
          ) : patientCollectionsList.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No collection records found for the selected period.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Collection Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Mobile Number</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }} align="right">Amount Collected</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Payment Mode</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Doctor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {patientCollectionsList.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {new Date(item.paymentDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {item.patientName}
                      </TableCell>
                      <TableCell>{item.patientMobile}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                        ₹{item.amountCollected.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.paymentMode}
                          size="small"
                          color="success"
                          variant="outlined"
                          icon={<PaymentIcon fontSize="small" />}
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{item.billNumber}</TableCell>
                      <TableCell>{item.doctorName || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </CustomTabPanel>

      {/* TAB 1: DAILY REVENUE SUMMARY */}
      <CustomTabPanel value={activeTab} index={1}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Daily Revenue & Earned Amount Breakdown
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Summary of total amount earned on each specific day.
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={50} />
            </Box>
          ) : dailySummaryList.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No revenue or billing records found for the selected period.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Invoices Generated</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Daily Billed Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'success.main' }} align="right">Amount Earned / Received</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Daily Pending Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailySummaryList.map((row) => (
                    <TableRow key={row.date} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${row.billsCount} Bill(s)`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ₹{row.billedAmount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                        ₹{row.amountEarned.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: row.pendingBalance > 0 ? 'error.main' : 'text.secondary' }}>
                        ₹{row.pendingBalance.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </CustomTabPanel>

      {/* TAB 2: GENERATED BILLS LEDGER */}
      <CustomTabPanel value={activeTab} index={2}>
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Generated Bills & Account Records ({filteredBills.length})
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/billing')}>
              Manage All Invoices & PDFs
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={40} />
            </Box>
          ) : filteredBills.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No bills found for the selected period.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Patient Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Bill Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Billed Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Amount Received</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Pending Balance</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredBills.map((bill) => {
                    const pending = Number(bill.grand_total) - Number(bill.amount_paid);
                    return (
                      <TableRow key={bill.id} hover>
                        <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {bill.bill_number}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{bill.patient_name || '—'}</TableCell>
                        <TableCell>{bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : '—'}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          ₹{Number(bill.grand_total).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
                          ₹{Number(bill.amount_paid).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: pending > 0 ? 'error.main' : 'text.secondary' }}>
                          ₹{pending.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={bill.status}
                            size="small"
                            color={bill.status === 'PAID' ? 'success' : bill.status === 'PARTIALLY_PAID' ? 'warning' : 'error'}
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </CustomTabPanel>
    </Box>
  );
};

export default Accounts;
