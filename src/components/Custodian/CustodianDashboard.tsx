/**
 * CustodianDashboard — modernized with shared UI system.
 * Uses PageHeader, SectionCard, Button for consistent layout.
 * All serial registration, bulk CSV upload, and search logic preserved.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiService } from '../../services/apiService';
import {
  CheckCircle, Clock, Package, RefreshCw, Upload, AlertCircle, Search,
} from 'lucide-react';
import CustodianAssetsPage from './CustodianAssetsPage';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { SectionCard } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BatchUnit {
  uifid: string;
  serial_number: string | null;
  status?: string;
  asset?: {
    id: number;
    status: string | null;
    acknowledgmentStatus: string | null;
    verificationStatus: string | null;
  } | null;
}

interface BatchView {
  index: number;
  batchNumber: string;
  productName: string;
  location: string;
  status: string;
  quantity: number;
  units: BatchUnit[];
}

interface OrderView {
  id: number;
  gemContractNumber: string;
  status: string;
  batches: BatchView[];
}

// ── Component ─────────────────────────────────────────────────────────────────

const CustodianDashboard: React.FC = () => {
  const location  = useLocation();
  const { user }  = useAuth();

  // Route to sub-page
  if (location.pathname === '/custodian/assets') {
    return <CustodianAssetsPage />;
  }

  const [orders, setOrders]               = useState<OrderView[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [info, setInfo]                   = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [serialDrafts, setSerialDrafts]   = useState<Record<string, string>>({});
  const [savingKey, setSavingKey]         = useState<string | null>(null);
  const [csvUploadingKey, setCsvUploadingKey] = useState<string | null>(null);
  const [otpDrafts, setOtpDrafts]         = useState<Record<string, string>>({});
  const [otpBusyKey, setOtpBusyKey]       = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Data ───────────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getCustodianDeliveries();
      setOrders(Array.isArray(data?.orders) ? (data.orders as OrderView[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders
      .map(o => ({
        ...o,
        batches: o.batches.filter(b =>
          [o.gemContractNumber, b.batchNumber, b.productName, b.location].some(v =>
            String(v || '').toLowerCase().includes(q)
          )
        ),
      }))
      .filter(o => o.batches.length > 0);
  }, [orders, search]);

  // ── Serial registration helpers ────────────────────────────────────────────

  const keyFor = (orderId: number, batchIndex: number, uifid: string) =>
    `${orderId}:${batchIndex}:${uifid}`;

  const handleSerialChange = (orderId: number, batchIndex: number, uifid: string, value: string) => {
    setSerialDrafts(prev => ({ ...prev, [keyFor(orderId, batchIndex, uifid)]: value }));
  };

  const submitSerial = async (orderId: number, batchIndex: number, uifid: string) => {
    const key    = keyFor(orderId, batchIndex, uifid);
    const serial = (serialDrafts[key] || '').trim();
    if (!serial) { setError('Enter a serial number first'); return; }
    setSavingKey(key);
    setError(null);
    setInfo(null);
    try {
      await ApiService.registerCustodianSerial(orderId, batchIndex, uifid, serial);
      setInfo(`Registered serial for UIFID ${uifid}.`);
      setSerialDrafts(prev => { const n = { ...prev }; delete n[key]; return n; });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register serial');
    } finally {
      setSavingKey(null);
    }
  };

  const handleCsvUpload = async (orderId: number, batchIndex: number, file: File) => {
    const key = `${orderId}:${batchIndex}`;
    setCsvUploadingKey(key);
    setError(null);
    setInfo(null);
    try {
      const result: any = await ApiService.uploadCustodianSerialsCsv(orderId, batchIndex, file);
      const ok     = Number(result?.ok || 0);
      const failed = Number(result?.failed || 0);
      setInfo(`Bulk upload complete: ${ok} registered, ${failed} failed.`);
      if (failed > 0 && Array.isArray(result?.results)) {
        const firstFails = result.results
          .filter((r: any) => !r.success).slice(0, 3)
          .map((r: any) => `${r.uifid}: ${r.error}`).join(' | ');
        setError(`Some rows failed: ${firstFails}${result.results.filter((r: any) => !r.success).length > 3 ? ' …' : ''}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setCsvUploadingKey(null);
    }
  };

  const otpKey = (orderId: number, batchIndex: number) => `${orderId}:${batchIndex}`;

  const handleGenerateOtp = async (orderId: number, batchIndex: number) => {
    const key = otpKey(orderId, batchIndex);
    setOtpBusyKey(key);
    setError(null);
    setInfo(null);
    try {
      const result: any = await ApiService.sendSellerBatchOtp(String(orderId), batchIndex);
      if (result?.success === false) {
        setError(result?.error || 'Failed to generate OTP');
      } else {
        setInfo(`OTP sent for batch ${batchIndex + 1}. Check SMS/email, then enter it below to verify.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate OTP');
    } finally {
      setOtpBusyKey(null);
    }
  };

  const handleVerifyOtp = async (orderId: number, batchIndex: number) => {
    const key = otpKey(orderId, batchIndex);
    const otp = (otpDrafts[key] || '').trim();
    if (!otp) { setError('Enter the OTP for this batch'); return; }
    setOtpBusyKey(key);
    setError(null);
    setInfo(null);
    try {
      const result: any = await ApiService.verifySellerBatchOtp(String(orderId), batchIndex, otp);
      if (result?.success === false) {
        setError(result?.error || 'Invalid OTP');
      } else {
        setInfo(`Batch ${batchIndex + 1} verified successfully.`);
        setOtpDrafts(prev => { const n = { ...prev }; delete n[key]; return n; });
        await load();
      }
    } catch (err) {
      setError(ApiService.handleError(err) || (err instanceof Error ? err.message : 'Failed to verify OTP'));
    } finally {
      setOtpBusyKey(null);
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Custodian Dashboard"
        subtitle={`Welcome${user?.name ? `, ${user.name}` : ''}. Generate/verify delivery OTP per batch, then register asset serials.`}
        icon={<Package className="w-5 h-5 text-primary-600" />}
        actions={
          <Button variant="ghost" size="sm" iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {/* Search */}
      <div className="bg-white rounded-card border border-surface-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-surface-border rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Search by GeM order, batch, product, or location"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Feedback */}
      {info && (
        <div className="flex items-center gap-2 p-3 rounded-card bg-success-50 border border-success-200 text-success-700 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {info}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-card bg-danger-50 border border-danger-200 text-danger-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          <span>Loading deliveries…</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-card border border-surface-border">
          <EmptyState
            icon={<Package className="w-10 h-10 text-gray-300" />}
            title="No deliveries assigned"
            description={search ? 'No deliveries match your search.' : 'No deliveries have been assigned to you yet.'}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => (
            <SectionCard
              key={order.id}
              title={`GeM Order: ${order.gemContractNumber}`}
              subtitle={`Status: ${order.status} · ${order.batches.length} batch(es)`}
            >
              <div className="divide-y divide-surface-border -mx-6">
                {order.batches.map(batch => {
                  const isDelivered = String(batch.status).toLowerCase() === 'delivered';
                  const csvKey      = `${order.id}:${batch.index}`;
                  const registered  = batch.units.filter(u => u.serial_number).length;
                  const total       = batch.units.length;

                  return (
                    <div key={batch.index} className="px-6 py-4 space-y-4">
                      {/* Batch header */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-500 shrink-0" />
                            Batch {batch.batchNumber} — {batch.productName}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Location: {batch.location || '—'} · Registered: {registered}/{total}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={[
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium gap-1',
                            isDelivered ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800',
                          ].join(' ')}>
                            {isDelivered
                              ? <><CheckCircle className="h-3 w-3" /> Delivered</>
                              : <><Clock className="h-3 w-3" /> Awaiting OTP verify</>}
                          </span>
                          {/* Hidden file input */}
                          <input
                            ref={el => { fileInputRefs.current[csvKey] = el; }}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                void handleCsvUpload(order.id, batch.index, file);
                                if (fileInputRefs.current[csvKey]) fileInputRefs.current[csvKey]!.value = '';
                              }
                            }}
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            iconLeft={<Upload className="h-3.5 w-3.5" />}
                            disabled={!isDelivered || csvUploadingKey === csvKey}
                            onClick={() => fileInputRefs.current[csvKey]?.click()}
                          >
                            {csvUploadingKey === csvKey ? 'Uploading…' : 'Bulk CSV (uifid, serial_number)'}
                          </Button>
                        </div>
                      </div>

                      {!isDelivered && (
                        <div className="rounded-card border border-surface-border bg-surface-muted/40 p-3 space-y-2">
                          <p className="text-sm font-medium text-gray-800">Batch OTP verification</p>
                          <p className="text-xs text-gray-500">
                            Generate an OTP (sent to your registered phone/email), then enter it to confirm receipt of this batch.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={otpBusyKey === otpKey(order.id, batch.index)}
                              onClick={() => void handleGenerateOtp(order.id, batch.index)}
                            >
                              {otpBusyKey === otpKey(order.id, batch.index) ? 'Sending…' : 'Generate / Resend OTP'}
                            </Button>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="Enter OTP"
                              value={otpDrafts[otpKey(order.id, batch.index)] || ''}
                              onChange={e => setOtpDrafts(prev => ({
                                ...prev,
                                [otpKey(order.id, batch.index)]: e.target.value,
                              }))}
                              className="px-3 py-1.5 text-sm border border-surface-border rounded-btn w-36 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={otpBusyKey === otpKey(order.id, batch.index)}
                              onClick={() => void handleVerifyOtp(order.id, batch.index)}
                            >
                              Verify OTP
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Units table */}
                      <div className="overflow-x-auto rounded-card border border-surface-border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-surface-subtle">
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                              <th className="px-3 py-2">UIFID</th>
                              <th className="px-3 py-2">Serial Number</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border bg-white">
                            {batch.units.map(unit => {
                              const rowKey = keyFor(order.id, batch.index, unit.uifid);
                              const draft  = serialDrafts[rowKey] ?? '';
                              const done   = Boolean(unit.serial_number);
                              return (
                                <tr key={unit.uifid} className="hover:bg-surface-subtle transition-colors">
                                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{unit.uifid}</td>
                                  <td className="px-3 py-2">
                                    {done ? (
                                      <span className="text-success-700 font-medium text-xs">{unit.serial_number}</span>
                                    ) : (
                                      <input
                                        className="w-full border border-surface-border rounded-card px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                        value={draft}
                                        disabled={!isDelivered || savingKey === rowKey}
                                        onChange={e => handleSerialChange(order.id, batch.index, unit.uifid, e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) void submitSerial(order.id, batch.index, unit.uifid); }}
                                        placeholder="Enter serial number"
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={[
                                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                      done ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-600',
                                    ].join(' ')}>
                                      {done ? 'Registered' : (isDelivered ? 'Ready' : 'Pending OTP')}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {!done && (
                                      <Button
                                        variant="primary"
                                        size="sm"
                                        disabled={!isDelivered || !draft.trim() || savingKey === rowKey}
                                        onClick={() => void submitSerial(order.id, batch.index, unit.uifid)}
                                      >
                                        {savingKey === rowKey ? 'Saving…' : 'Register'}
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

    </div>
  );
};

export default CustodianDashboard;
