import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ApiService } from '../../services/apiService';
import { AlertCircle, CheckCircle, Clock, Package, RefreshCw, Shield } from 'lucide-react';
import { formatVerificationGpsLine, getVerificationGeotagCoords, getVerificationLocationLabel } from '../../utils/verificationMetadataDisplay';

export type CustodianVerificationMetadata = {
  geotag?: { latitude?: number; longitude?: number; accuracy?: number | null };
  locationLabel?: string | null;
  clientTimestamp?: string | null;
  submittedAt?: string | null;
  userAgent?: string | null;
} | null;

export type CustodianUnitAsset = {
  id: number;
  status: string | null;
  acknowledgmentStatus: string | null;
  verificationStatus: string | null;
  verifiedAt?: string | null;
  verificationMetadata?: Record<string, unknown> | null;
} | null;

export interface CustodianAssetRow {
  orderId: number;
  gemContractNumber: string;
  orderStatus: string;
  batchIndex: number;
  batchNumber: string;
  batchStatus: string;
  batchDeliveredAt: string | null;
  productName: string;
  location: string;
  uifid: string;
  unitJsonStatus: string;
  serialNumber: string | null;
  registeredAt: string | null;
  pipeline: 'pending_otp' | 'awaiting_serial' | 'registered';
  asset: CustodianUnitAsset;
}

function pipelineFor(batchStatus: string, serial: string | null | undefined): CustodianAssetRow['pipeline'] {
  const delivered = String(batchStatus).toLowerCase() === 'delivered';
  if (!delivered) return 'pending_otp';
  if (!serial || !String(serial).trim()) return 'awaiting_serial';
  return 'registered';
}

function pipelineLabel(p: CustodianAssetRow['pipeline']) {
  switch (p) {
    case 'pending_otp':
      return 'Awaiting delivery OTP';
    case 'awaiting_serial':
      return 'Ready — serial not registered';
    case 'registered':
      return 'Serial registered';
    default:
      return p;
  }
}

function formatStageDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

/** Keeps table rows a uniform height when verification metadata includes long addresses. */
const VerificationLocationCell: React.FC<{
  ver: string;
  verComplete: boolean;
  verifiedAt: string | null | undefined;
  meta: Record<string, unknown> | null | undefined;
}> = ({ ver, verComplete, verifiedAt, meta }) => {
  const coords = formatVerificationGpsLine(meta ?? undefined);
  const addressLine = getVerificationLocationLabel(meta ?? undefined);
  const mapCoords = getVerificationGeotagCoords(meta ?? undefined);

  return (
    <div className="min-w-0 max-w-[220px]">
      <div className="inline-flex items-center gap-1">
        <CheckCircle className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
            verComplete ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
          }`}
        >
          {ver}
        </span>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Completed at</div>
      <div className="text-xs font-medium text-gray-900 dark:text-white leading-tight">
        {verComplete ? formatStageDate(verifiedAt) : '—'}
      </div>
      {verComplete && (addressLine || coords) && (
        <div className="mt-1 pt-1 border-t border-gray-100 dark:border-slate-700 space-y-0.5">
          {addressLine ? (
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 leading-snug" title={addressLine}>
              <span className="font-medium text-gray-500 dark:text-gray-400">Loc: </span>
              {addressLine}
            </p>
          ) : null}
          {coords ? (
            <p className="text-xs font-mono text-gray-700 dark:text-gray-300 line-clamp-1 break-all leading-snug" title={coords}>
              <span className="font-sans font-medium text-gray-500 dark:text-gray-400">GPS: </span>
              {coords}
            </p>
          ) : null}
          {mapCoords ? (
            <a
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-block"
              href={`https://www.openstreetmap.org/?mlat=${mapCoords.lat}&mlon=${mapCoords.lng}#map=16/${mapCoords.lat}/${mapCoords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on map
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
};

type SortKey = 'gem' | 'product' | 'batch' | 'uifid';

const CustodianAssetsPage: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<CustodianAssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [gemFilter, setGemFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('all');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('gem');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getCustodianDeliveries();
      const orders = Array.isArray(data?.orders) ? data.orders : [];
      const flat: CustodianAssetRow[] = [];
      for (const o of orders as any[]) {
        const orderId = Number(o.id);
        const gemContractNumber = String(o.gemContractNumber || '');
        const orderStatus = String(o.status || '');
        const batches = Array.isArray(o.batches) ? o.batches : [];
        for (const b of batches) {
          const batchIndex = Number(b.index);
          const batchNumber = String(b.batchNumber || '');
          const batchStatus = String(b.status || 'Pending');
          const batchDeliveredAt =
            b?.deliveredAt != null && String(b.deliveredAt).trim() ? String(b.deliveredAt) : null;
          const productName = String(b.productName || '');
          const location = String(b.location || '');
          const units = Array.isArray(b.units) ? b.units : [];
          for (const u of units) {
            const uifid = String(u?.uifid || '');
            if (!uifid) continue;
            const serialNumber = u?.serial_number != null ? String(u.serial_number) : null;
            const registeredAt =
              u?.registeredAt != null && String(u.registeredAt).trim() ? String(u.registeredAt) : null;
            flat.push({
              orderId,
              gemContractNumber,
              orderStatus,
              batchIndex,
              batchNumber,
              batchStatus,
              batchDeliveredAt,
              productName,
              location,
              uifid,
              unitJsonStatus: String(u?.status || 'Allocated'),
              serialNumber,
              registeredAt,
              pipeline: pipelineFor(batchStatus, serialNumber),
              asset: (u?.asset as CustodianUnitAsset) ?? null,
            });
          }
        }
      }
      setRows(flat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const gemOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.gemContractNumber) s.add(r.gemContractNumber);
    });
    return Array.from(s).sort();
  }, [rows]);

  const orderStatusOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.orderStatus) s.add(r.orderStatus);
    });
    return Array.from(s).sort();
  }, [rows]);

  const productOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.productName) s.add(r.productName);
    });
    return Array.from(s).sort();
  }, [rows]);

  const locationOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      if (r.location && r.location.trim()) s.add(r.location.trim());
    });
    return Array.from(s).sort();
  }, [rows]);

  const stats = useMemo(() => {
    let pendingOtp = 0;
    let awaitingSerial = 0;
    let registered = 0;
    for (const r of rows) {
      if (r.pipeline === 'pending_otp') pendingOtp += 1;
      else if (r.pipeline === 'awaiting_serial') awaitingSerial += 1;
      else registered += 1;
    }
    return { total: rows.length, pendingOtp, awaitingSerial, registered };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (gemFilter !== 'all' && r.gemContractNumber !== gemFilter) return false;
      if (orderStatusFilter !== 'all' && r.orderStatus !== orderStatusFilter) return false;
      if (productFilter !== 'all' && r.productName !== productFilter) return false;
      if (locationFilter !== 'all' && r.location.trim() !== locationFilter) return false;
      if (pipelineFilter !== 'all' && r.pipeline !== pipelineFilter) return false;
      if (batchStatusFilter === 'delivered' && String(r.batchStatus).toLowerCase() !== 'delivered') return false;
      if (batchStatusFilter === 'not_delivered' && String(r.batchStatus).toLowerCase() === 'delivered') return false;
      if (!q) return true;
      const locLine = formatVerificationGpsLine(r.asset?.verificationMetadata ?? undefined);
      const addrLine = getVerificationLocationLabel(r.asset?.verificationMetadata ?? undefined);
      return [
        r.gemContractNumber,
        r.orderStatus,
        r.batchNumber,
        r.batchStatus,
        r.productName,
        r.location,
        r.uifid,
        r.serialNumber || '',
        r.asset?.status || '',
        r.asset?.acknowledgmentStatus || '',
        r.asset?.verificationStatus || '',
        formatStageDate(r.batchDeliveredAt),
        formatStageDate(r.registeredAt),
        formatStageDate(r.asset?.verifiedAt),
        locLine || '',
        addrLine || '',
      ].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, gemFilter, orderStatusFilter, productFilter, locationFilter, pipelineFilter, batchStatusFilter]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'product':
          cmp = a.productName.localeCompare(b.productName, undefined, { sensitivity: 'base' });
          break;
        case 'gem':
          cmp = a.gemContractNumber.localeCompare(b.gemContractNumber, undefined, { sensitivity: 'base' });
          break;
        case 'batch':
          cmp = a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'uifid':
          cmp = a.uifid.localeCompare(b.uifid);
          break;
        default:
          cmp = 0;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearch('');
    setGemFilter('all');
    setOrderStatusFilter('all');
    setBatchStatusFilter('all');
    setPipelineFilter('all');
    setProductFilter('all');
    setLocationFilter('all');
  };

  const sortIndicator = (key: SortKey) =>
    sortBy === key ? <span className="text-blue-600 dark:text-blue-400">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span> : null;

  const selectClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Asset Status</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome{user?.name ? `, ${user.name}` : ''}. View unit progress, stage timestamps, and end-user verification
            details. Register serials under{' '}
            <Link to="/custodian/deliveries" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
              My Deliveries
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {loading ? 'Refreshing...' : 'Refresh Assets'}
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="search"
            className="md:col-span-2 lg:col-span-4 px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Search UIFID, serial, GeM order, dates, coordinates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={gemFilter} onChange={(e) => setGemFilter(e.target.value)} className={selectClass}>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All GeM orders</option>
            {gemOptions.map((g) => (
              <option key={g} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value={g}>
                {g}
              </option>
            ))}
          </select>
          <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className={selectClass}>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All order statuses</option>
            {orderStatusOptions.map((s) => (
              <option key={s} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={batchStatusFilter} onChange={(e) => setBatchStatusFilter(e.target.value)} className={selectClass}>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All batch delivery states</option>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="delivered">Delivered only</option>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="not_delivered">Not delivered</option>
          </select>
          <select value={pipelineFilter} onChange={(e) => setPipelineFilter(e.target.value)} className={selectClass}>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All unit progress</option>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="pending_otp">Awaiting delivery OTP</option>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="awaiting_serial">Ready — serial not registered</option>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="registered">Serial registered</option>
          </select>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className={selectClass}>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All products</option>
            {productOptions.map((p) => (
              <option key={p} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className={selectClass}>
            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All locations</option>
            {locationOptions.map((loc) => (
              <option key={loc} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total units</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 opacity-90" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Awaiting OTP</p>
              <p className="text-2xl font-bold">{stats.pendingOtp}</p>
            </div>
            <Clock className="w-8 h-8 opacity-90" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Ready — no serial</p>
              <p className="text-2xl font-bold">{stats.awaitingSerial}</p>
            </div>
            <AlertCircle className="w-8 h-8 opacity-90" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Serial registered</p>
              <p className="text-2xl font-bold">{stats.registered}</p>
            </div>
            <CheckCircle className="w-8 h-8 opacity-90" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50"
                onClick={() => toggleSort('gem')}
              >
                GeM order{sortIndicator('gem')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Order status</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50"
                onClick={() => toggleSort('batch')}
              >
                Batch{sortIndicator('batch')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Batch status</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50"
                onClick={() => toggleSort('product')}
              >
                Product{sortIndicator('product')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Location</th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50"
                onClick={() => toggleSort('uifid')}
              >
                UIFID{sortIndicator('uifid')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Serial</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unit progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase min-w-[140px]">
                Delivered (OTP)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase min-w-[140px]">
                Serial registered
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase min-w-[140px]">
                Acknowledgment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase min-w-[200px]">
                Verification &amp; location
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800/50 divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
                    <div className="text-lg font-medium text-gray-900 dark:text-white">Loading assets...</div>
                    <div className="text-gray-500 dark:text-gray-400">Please wait while we fetch your asset data.</div>
                  </div>
                </td>
              </tr>
            ) : sortedFiltered.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center">
                    <Package size={48} className="mb-4 text-gray-400 dark:text-gray-500" />
                    <div className="text-lg font-medium text-gray-900 dark:text-white">{rows.length === 0 ? 'No units assigned yet' : 'No assets found'}</div>
                    <div className="text-gray-500 dark:text-gray-400">
                      {rows.length === 0
                        ? 'When deliveries are assigned to you, they will appear here.'
                        : 'Try adjusting your filters or search.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              sortedFiltered.map((r) => {
                const ack = r.asset?.acknowledgmentStatus ?? '—';
                const ackComplete = String(ack).toLowerCase() === 'completed';
                const ver = r.asset?.verificationStatus ?? '—';
                const verComplete = String(ver).toLowerCase() === 'completed';
                const verifiedAt = r.asset?.verifiedAt;
                const meta = r.asset?.verificationMetadata;
                return (
                  <tr key={`${r.orderId}-${r.batchIndex}-${r.uifid}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 align-middle">
                    <td className="px-6 py-3 align-middle max-w-[11rem]">
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-white truncate"
                        title={r.gemContractNumber || undefined}
                      >
                        {r.gemContractNumber || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-3 align-middle whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{r.orderStatus}</td>
                    <td className="px-6 py-3 align-middle whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">{r.batchNumber}</td>
                    <td className="px-6 py-3 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          String(r.batchStatus).toLowerCase() === 'delivered'
                            ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'
                        }`}
                      >
                        {r.batchStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-middle text-sm text-gray-900 dark:text-white max-w-[180px]">
                      <span className="line-clamp-2 leading-snug" title={r.productName}>
                        {r.productName}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-middle text-sm text-gray-900 dark:text-white max-w-[140px]">
                      <span className="line-clamp-2 leading-snug" title={r.location || undefined}>
                        {r.location || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-middle font-mono text-xs text-gray-900 dark:text-white whitespace-nowrap">{r.uifid}</td>
                    <td className="px-6 py-3 align-middle font-mono text-xs text-gray-800 dark:text-gray-200 whitespace-nowrap">{r.serialNumber || '—'}</td>
                    <td className="px-6 py-3 align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          r.pipeline === 'registered'
                            ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                            : r.pipeline === 'awaiting_serial'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                              : 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-gray-300'
                        }`}
                      >
                        {pipelineLabel(r.pipeline)}
                      </span>
                    </td>
                    <td className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">
                      <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                        {String(r.batchStatus).toLowerCase() === 'delivered' ? 'Completed' : 'Pending'}
                      </div>
                      <div className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{formatStageDate(r.batchDeliveredAt)}</div>
                    </td>
                    <td className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">
                      <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{r.serialNumber ? 'Completed' : '—'}</div>
                      <div className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{formatStageDate(r.registeredAt)}</div>
                    </td>
                    <td className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200">
                      <div className="inline-flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            ackComplete ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300'
                          }`}
                        >
                          {ack}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">Completed at</div>
                      <div className="text-xs font-medium text-gray-900 dark:text-white leading-tight">
                        {ackComplete ? formatStageDate(verifiedAt) : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-3 align-middle text-sm text-gray-800 dark:text-gray-200 min-w-[200px]">
                      <VerificationLocationCell
                        ver={ver}
                        verComplete={verComplete}
                        verifiedAt={verifiedAt}
                        meta={meta}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && sortedFiltered.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Showing {sortedFiltered.length} of {rows.length} unit{rows.length === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
};

export default CustodianAssetsPage;
