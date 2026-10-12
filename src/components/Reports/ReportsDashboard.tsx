/**
 * ReportsDashboard — modernized with shared UI system.
 * All business logic preserved. Presentation upgraded:
 * raw <table> → DataTable, custom cards → StatCard, raw buttons → Button.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import {
  BarChart3, Download, Calendar, IndianRupee, AlertTriangle,
  RefreshCw, Store, ClipboardList, ArrowUpRight, Package, UserX,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { Asset } from '../../types';
import { ApiService } from '../../services/apiService';
import { useTranslation } from 'react-i18next';
import { themedAlert } from '../../utils/themedDialogs';
import { useAuth } from '../../contexts/AuthContext';
import {
  computeGhostAssetRows,
  GHOST_ASSET_LOOKBACK_DAYS,
  buildOrderMapFromSellerOrders,
} from '../../utils/buyerAssetReportUtils';
import { formatIndianShort, formatIndianFull } from '../../utils/currency';
import { DataTable } from '../ui/DataTable';
import { StatCard, SectionCard } from '../ui/Card';
import { StatusBadge, Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { TableSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

// ─── Local helpers (identical to original) ────────────────────────────────────
type JsonRecord = Record<string, unknown>;

function parseJsonField<T extends JsonRecord>(v: unknown): T {
  if (!v) return {} as T;
  if (typeof v === 'string') { try { return JSON.parse(v) as T; } catch { return {} as T; } }
  if (typeof v === 'object') return v as T;
  return {} as T;
}
function getOrderStatus(so: JsonRecord): string { return String(so.status ?? ''); }
function getSellerLabel(so: JsonRecord): string { return String(so.sellerName ?? so.seller_name ?? 'Unknown seller'); }
function isBuyerConfirmationPending(so: JsonRecord): boolean {
  if (getOrderStatus(so) !== 'Delivered') return false;
  const d = parseJsonField<{ buyerConfirmed?: boolean }>(so.deliveryInformation ?? so.delivery_information);
  return d.buyerConfirmed !== true;
}
function getNumericOrderTotal(so: JsonRecord): number {
  const n = Number(so.totalAmount ?? so.total_amount ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function getNumericValue(value: unknown): number {
  const p = Number(value);
  return Number.isFinite(p) ? p : 0;
}

// ─── Chart palette (mirrors design tokens exactly) ────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Active:           '#16a34a', // success-600
  Deployed:         '#2563eb', // primary-600
  'Under Repair':   '#ca8a04', // warning-600
  'Expired Warranty':'#6366f1',// indigo
  Disposed:         '#dc2626', // danger-600
};
const SELLER_PALETTE = ['#3b82f6','#16a34a','#ca8a04','#6366f1','#94a3b8','#f97316','#0ea5e9'];

// Custom tooltip shared across charts
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-card bg-white border border-surface-border shadow-card-md px-3 py-2 text-xs">
      {label && <p className="font-medium text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill ?? p.color }} className="leading-5">
          {p.name}: <span className="font-semibold text-gray-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const ReportsDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [selectedPeriod,     setSelectedPeriod]     = useState('month');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [assets,             setAssets]             = useState<Asset[]>([]);
  const [sellerOrders,       setSellerOrders]       = useState<JsonRecord[]>([]);
  const [escalations,        setEscalations]        = useState<JsonRecord[]>([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAssets(await ApiService.getAllAssets() as Asset[]);
      if (user?.role === 'Super Admin') {
        const ordersData = await ApiService.getAllSellerOrders();
        setSellerOrders(Array.isArray(ordersData) ? (ordersData as JsonRecord[]) : []);
        try { setEscalations(await ApiService.getAllEscalations() as JsonRecord[]); }
        catch { setEscalations([]); }
      }
    } catch (err) {
      setError(ApiService.handleError(err));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { if (!authLoading) void loadData(); }, [authLoading, loadData]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const assetStats = useMemo(() => {
    const total       = assets.length;
    const active      = assets.filter(a => a.status === 'Active').length;
    const deployed    = assets.filter(a => a.status === 'Deployed').length;
    const underRepair = assets.filter(a => a.status === 'Under Repair').length;
    const expiredWarranty = assets.filter(a =>
      a.status === 'Under Repair' && a.warrantyExpiry && new Date(a.warrantyExpiry) < new Date()
    ).length;
    const disposed    = assets.filter(a => a.status === 'Disposed').length;
    const totalValue  = assets.reduce((s, a) => s + getNumericValue(a.value), 0);
    return { total, active, deployed, underRepair, expiredWarranty, disposed, totalValue };
  }, [assets]);

  const sellerStats = useMemo(() => {
    const label = (a: Asset) => (a.supplier && String(a.supplier).trim()) || 'Unassigned';
    const sellers = [...new Set(assets.map(label))];
    return sellers.map(s => ({
      name:  s,
      count: assets.filter(a => label(a) === s).length,
      value: assets.filter(a => label(a) === s).reduce((sum, a) => sum + getNumericValue(a.value), 0),
    }));
  }, [assets]);

  const categoryStats = useMemo(() => {
    const cats = [...new Set(assets.map(a => a.category))];
    return cats.map(c => ({
      name:  c,
      count: assets.filter(a => a.category === c).length,
      value: assets.filter(a => a.category === c).reduce((s, a) => s + getNumericValue(a.value), 0),
    }));
  }, [assets]);

  const warrantyAlerts = useMemo(() => {
    const today = new Date();
    const limit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return assets.filter(a => {
      if (!a.warrantyExpiry) return false;
      const d = new Date(a.warrantyExpiry);
      return d <= limit && d >= today;
    });
  }, [assets]);

  const amcAlerts = useMemo(() => {
    const today = new Date();
    const limit = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return assets.filter(a => {
      if (!a.amcExpiry) return false;
      const d = new Date(a.amcExpiry);
      return d <= limit && d >= today;
    });
  }, [assets]);

  const buyerAssetBuckets = useMemo(() => {
    const map = new Map<string, { key: string; display: string; count: number; value: number }>();
    for (const a of assets) {
      const name    = (a.buyerName && String(a.buyerName).trim()) || '';
      const id      = a.buyerId != null && String(a.buyerId).trim() !== '' ? String(a.buyerId).trim() : '';
      const key     = id ? `buyer:${id}` : name ? `name:${name.toLowerCase()}` : 'unassigned';
      const display = name || (id ? `Buyer ID ${id}` : 'Unassigned');
      const prev    = map.get(key) ?? { key, display, count: 0, value: 0 };
      prev.count += 1;
      prev.value += getNumericValue(a.value);
      if (name) prev.display = name;
      map.set(key, prev);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [assets]);

  const sellerPerformanceRows = useMemo(() => {
    const m = new Map<string, { seller: string; orders: number; completed: number; pipeline: number; value: number; awaitingBuyer: number }>();
    for (const so of sellerOrders) {
      const seller = getSellerLabel(so);
      const row    = m.get(seller) ?? { seller, orders: 0, completed: 0, pipeline: 0, value: 0, awaitingBuyer: 0 };
      row.orders  += 1;
      const st = getOrderStatus(so);
      if (st === 'Completed') row.completed += 1;
      if (!['Completed','Rejected','Cancelled'].includes(st)) row.pipeline += 1;
      row.value       += getNumericOrderTotal(so);
      if (isBuyerConfirmationPending(so)) row.awaitingBuyer += 1;
      m.set(seller, row);
    }
    return [...m.values()].sort((a, b) => b.orders - a.orders);
  }, [sellerOrders]);

  const pendingBuyerRows = useMemo(() =>
    sellerOrders
      .filter(isBuyerConfirmationPending)
      .map(so => ({
        id:     String(so.id ?? ''),
        gem:    String(so.gemContractNumber ?? so.gem_contract_number ?? '—'),
        buyer:  String(so.buyerName ?? so.buyer_name ?? so.gemBuyerDepartmentName ?? so.gem_buyer_department_name ?? '—'),
        seller: getSellerLabel(so),
        total:  getNumericOrderTotal(so),
      })),
  [sellerOrders]);

  const escalationStats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const e of escalations) {
      const s = String(e.status ?? 'Unknown');
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    const active = escalations.filter(e =>
      ['Open','In Progress','Pending','Assigned'].includes(String(e.status ?? ''))
    ).length;
    return { byStatus, active, total: escalations.length };
  }, [escalations]);

  const orderByIdForGhost = useMemo(
    () => buildOrderMapFromSellerOrders(sellerOrders as Array<JsonRecord & { id?: unknown }>),
    [sellerOrders],
  );
  const ghostAssetsRows = useMemo(
    () => computeGhostAssetRows(assets, orderByIdForGhost),
    [assets, orderByIdForGhost],
  );

  const maxBuyerCount = buyerAssetBuckets.length
    ? Math.max(...buyerAssetBuckets.map(b => b.count), 1) : 1;

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportReport = async (type: string) => {
    try {
      let data: any[][] = [];
      let filename = '';
      switch (type) {
        case 'asset-status':
          data = [['Status','Count'],['Active',assetStats.active],['Deployed',assetStats.deployed],
            ['Under Repair',assetStats.underRepair],['Expired Warranty',assetStats.expiredWarranty],
            ['Disposed',assetStats.disposed],['Total',assetStats.total]];
          filename = `asset-status-${new Date().toISOString().split('T')[0]}.csv`; break;
        case 'seller':
          data = [['Seller','Count','Total Value'],
            ...sellerStats.map(r => [r.name, r.count, formatIndianFull(r.value)])];
          filename = `seller-assets-${new Date().toISOString().split('T')[0]}.csv`; break;
        case 'category':
          data = [['Category','Count','Total Value','Average Value','Percentage'],
            ...categoryStats.map(c => [c.name, c.count, formatIndianFull(c.value),
              formatIndianFull(c.count > 0 ? c.value / c.count : 0),
              `${((c.count / assetStats.total) * 100).toFixed(1)}%`])];
          filename = `category-analysis-${new Date().toISOString().split('T')[0]}.csv`; break;
        case 'buyer-assets':
          if (!isSuperAdmin) break;
          data = [['Buyer','Asset count','Total book value','Share of assets %'],
            ...buyerAssetBuckets.map(b => [b.display, b.count, formatIndianFull(b.value),
              assetStats.total ? `${((b.count / assetStats.total) * 100).toFixed(1)}%` : '0%'])];
          filename = `asset-distribution-by-buyer-${new Date().toISOString().split('T')[0]}.csv`; break;
        case 'seller-performance':
          if (!isSuperAdmin) break;
          data = [['Seller','Orders','Completed','In pipeline','Order value (INR)','Awaiting buyer confirmation'],
            ...sellerPerformanceRows.map(r => [r.seller, r.orders, r.completed, r.pipeline, r.value, r.awaitingBuyer])];
          filename = `seller-performance-${new Date().toISOString().split('T')[0]}.csv`; break;
        case 'unallocated-assets':
          data = [['Asset','Serial','Category','Seller order ID','Reference date','Date basis','Days since reference'],
            ...ghostAssetsRows.map(({ asset: a, deliveryAt, sourceLabel }) => {
              const sid = (a as any).sellerOrderId ?? (a as any).seller_order_id;
              const days = Math.floor((Date.now() - deliveryAt.getTime()) / (24 * 60 * 60 * 1000));
              return [a.name, a.serialNumber, a.category, sid != null ? String(sid) : '',
                deliveryAt.toISOString().split('T')[0], sourceLabel, days];
            })];
          filename = `unallocated-assets-${new Date().toISOString().split('T')[0]}.csv`; break;
        default:
          data = [['Report Type','Metric','Value'],
            ['Assets','Total Assets',assetStats.total],['Assets','Active',assetStats.active],
            ['Assets','Deployed',assetStats.deployed],['Assets','Under Repair',assetStats.underRepair],
            ['Assets','Disposed',assetStats.disposed],['Assets','Total Value',formatIndianFull(assetStats.totalValue)],
            ['Assets',`Unallocated (≥${GHOST_ASSET_LOOKBACK_DAYS} days)`,ghostAssetsRows.length],
            ['Alerts','Warranty Alerts',warrantyAlerts.length],['Alerts','AMC Alerts',amcAlerts.length]];
          if (isSuperAdmin) {
            data.push(
              ['Orders','Pending buyer confirmation',pendingBuyerRows.length],
              ['Escalations','Total',escalationStats.total],
              ['Escalations','Active',escalationStats.active],
            );
          }
          filename = `reports-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
      }
      const csvContent = data.map(row => row.map(cell => {
        const s = String(cell ?? '');
        return (s.includes(',') || s.includes('\n') || s.includes('"')) ? `"${s.replace(/"/g,'""')}"` : s;
      }).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
      a.download = filename;
      a.click();
    } catch {
      await themedAlert(t('Failed to export report. Please try again.'), t('Export Failed'));
    }
  };

  // ── Column defs ────────────────────────────────────────────────────────────
  type GhostRow = typeof ghostAssetsRows[0];
  const ghostColumns: ColumnDef<GhostRow, any>[] = useMemo(() => [
    { id: 'name',     header: 'Asset',    accessorFn: r => r.asset.name,         cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>()}</span> },
    { id: 'serial',   header: 'Serial',   accessorFn: r => r.asset.serialNumber, cell: ({ getValue }) => <span className="text-sm text-gray-600">{getValue<string>()}</span> },
    { id: 'category', header: 'Category', accessorFn: r => r.asset.category },
    {
      id: 'sellerId', header: 'Seller order',
      accessorFn: r => { const sid = (r.asset as any).sellerOrderId ?? (r.asset as any).seller_order_id; return sid != null ? String(sid) : '—'; },
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-600">{getValue<string>()}</span>,
    },
    {
      id: 'refDate', header: 'Reference date',
      accessorFn: r => r.deliveryAt.getTime(),
      cell: ({ row }) => <span className="text-sm">{row.original.deliveryAt.toLocaleDateString('en-IN')}</span>,
    },
    { id: 'basis', header: 'Basis', accessorFn: r => r.sourceLabel },
    {
      id: 'daysOpen', header: 'Days open',
      accessorFn: r => Math.floor((Date.now() - r.deliveryAt.getTime()) / (24 * 60 * 60 * 1000)),
      cell: ({ getValue }) => {
        const n = getValue<number>();
        return <span className={`text-sm font-medium ${n > 60 ? 'text-danger-600' : 'text-warning-600'}`}>{n}</span>;
      },
    },
  ], []);

  type CatRow = { name: string; count: number; value: number };
  const categoryColumns: ColumnDef<CatRow, any>[] = useMemo(() => [
    { accessorKey: 'name',  header: t('Category'), cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>()}</span> },
    { accessorKey: 'count', header: t('Count') },
    { id: 'totalValue', header: t('Total Value'), accessorFn: r => r.value, cell: ({ getValue }) => <span className="text-sm">{formatIndianFull(getValue<number>())}</span> },
    { id: 'avgValue', header: t('Avg Value'), accessorFn: r => r.count > 0 ? r.value / r.count : 0, cell: ({ getValue }) => <span className="text-sm">{formatIndianFull(getValue<number>())}</span> },
    { id: 'pct', header: t('Share'), accessorFn: r => assetStats.total ? (r.count / assetStats.total * 100) : 0, cell: ({ getValue }) => <span className="text-sm">{getValue<number>().toFixed(1)}%</span> },
  ], [t, assetStats.total]);

  type SellerPerfRow = typeof sellerPerformanceRows[0];
  const sellerPerfColumns: ColumnDef<SellerPerfRow, any>[] = useMemo(() => [
    { accessorKey: 'seller',       header: 'Seller',   cell: ({ getValue }) => <span className="font-medium text-sm">{getValue<string>()}</span> },
    { accessorKey: 'orders',       header: 'Orders' },
    { accessorKey: 'completed',    header: 'Done',     cell: ({ getValue }) => <span className="text-sm text-success-600 font-medium">{getValue<number>()}</span> },
    { accessorKey: 'pipeline',     header: 'Pipeline', cell: ({ getValue }) => <span className="text-sm text-warning-600 font-medium">{getValue<number>()}</span> },
    { accessorKey: 'value',        header: 'Value',    cell: ({ getValue }) => <span className="text-sm whitespace-nowrap">{formatIndianFull(getValue<number>())}</span> },
    { accessorKey: 'awaitingBuyer',header: 'Await buyer', cell: ({ getValue }) => { const n = getValue<number>(); return n > 0 ? <Badge size="sm" variant="warning">{n}</Badge> : <span className="text-gray-400 text-sm">0</span>; } },
  ], []);

  type PendingRow = typeof pendingBuyerRows[0];
  const pendingBuyerColumns: ColumnDef<PendingRow, any>[] = useMemo(() => [
    { accessorKey: 'gem',    header: 'GeM / Contract', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span> },
    { accessorKey: 'buyer',  header: 'Buyer' },
    { accessorKey: 'seller', header: 'Seller' },
    { accessorKey: 'total',  header: 'Value', cell: ({ getValue }) => <span className="text-sm font-medium whitespace-nowrap">{formatIndianFull(getValue<number>())}</span> },
  ], []);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-card shadow-card border border-surface-border animate-pulse" />)}
        </div>
        <div className="bg-white rounded-card shadow-card border border-surface-border p-6">
          <TableSkeleton rows={5} cols={5} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-danger-600">
        <AlertTriangle className="w-16 h-16 mb-4" />
        <p className="text-base mb-4">{error}</p>
        <Button variant="danger" iconLeft={<RefreshCw className="w-4 h-4" />} onClick={() => void loadData()}>
          {t('Retry')}
        </Button>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      <PageHeader
        title={t('Reports Dashboard')}
        subtitle={isSuperAdmin
          ? 'System-wide orders, buyer confirmations, escalations, and asset distribution.'
          : t('Asset status, warranty alerts, and category analysis.')}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="border border-surface-border rounded-btn px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="week">{t('This Week')}</option>
              <option value="month">{t('This Month')}</option>
              <option value="quarter">{t('This Quarter')}</option>
              <option value="year">{t('This Year')}</option>
            </select>
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="border border-surface-border rounded-btn px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">{t('All Departments')}</option>
              <option value="IT">{t('IT')}</option>
              <option value="HR">{t('HR')}</option>
              <option value="Finance">{t('Finance')}</option>
              <option value="Operations">{t('Operations')}</option>
            </select>
            <Button variant="ghost" size="sm" iconLeft={<RefreshCw className="w-4 h-4" />} onClick={() => void loadData()}>
              {t('Refresh')}
            </Button>
            <Button variant="ghost" size="sm" iconLeft={<Download className="w-4 h-4" />} onClick={() => void exportReport('all')}>
              {t('Export All')}
            </Button>
          </div>
        }
      />

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title={t('Total Assets')} value={assetStats.total} icon={BarChart3} iconBg="bg-primary-100" iconColor="text-primary-600" change="+12%" changeType="positive" />
        <StatCard title={t('Total Value')} value={formatIndianShort(assetStats.totalValue)} icon={IndianRupee} iconBg="bg-success-100" iconColor="text-success-600" change="+8%" changeType="positive" />
        <StatCard title="Unallocated Assets" value={ghostAssetsRows.length} description={`No end user ≥${GHOST_ASSET_LOOKBACK_DAYS} days after delivery`} icon={UserX} iconBg="bg-gray-100" iconColor="text-gray-600" />
      </div>

      {/* Super Admin operational cards */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Buyer Confirmation Pending" value={pendingBuyerRows.length} description="Delivered orders awaiting buyer sign-off" icon={ClipboardList} iconBg="bg-warning-100" iconColor="text-warning-600" />
          <StatCard title="Active Escalations" value={escalationStats.active} description="Open, in progress, pending or assigned" icon={AlertTriangle} iconBg="bg-danger-100" iconColor="text-danger-600" />
          <StatCard title="Seller Orders (Total)" value={sellerOrders.length} description="Across all registered sellers" icon={Store} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
          <StatCard title="Buyers with Assets" value={buyerAssetBuckets.length} description="Distinct buyers by name or ID" icon={Package} iconBg="bg-teal-100" iconColor="text-teal-600" />
        </div>
      )}

      {/* Unallocated assets */}
      <SectionCard
        title="Unallocated Assets"
        subtitle={`Assets with no end user ≥${GHOST_ASSET_LOOKBACK_DAYS} days after delivery (batch OTP basis when available).`}
        action={<Button size="sm" variant="ghost" iconLeft={<Download className="w-4 h-4" />} onClick={() => void exportReport('unallocated-assets')}>Export CSV</Button>}
      >
        <DataTable
          data={ghostAssetsRows}
          columns={ghostColumns}
          enableSorting
          enablePagination
          defaultPageSize={10}
          getRowId={r => r.asset.id}
          emptyTitle="No unallocated assets"
          emptyDescription="All assets have been assigned to end users within the lookback window."
        />
      </SectionCard>

      {/* Super Admin — seller performance + escalations */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SectionCard
            title="Seller Performance"
            action={<Button size="sm" variant="ghost" iconLeft={<Download className="w-4 h-4" />} onClick={() => void exportReport('seller-performance')}>Export</Button>}
          >
            {sellerPerformanceRows.length > 0 && (
              <div className="mb-6 border-b border-surface-border pb-6">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sellerPerformanceRows.slice(0, 8)} margin={{ top: 4, right: 16, left: 0, bottom: 48 }}>
                    <XAxis dataKey="seller" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                    <Bar dataKey="completed" name="Completed" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="pipeline"  name="In Pipeline" stackId="a" fill="#ca8a04" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <DataTable data={sellerPerformanceRows} columns={sellerPerfColumns} enableSorting enablePagination defaultPageSize={8} getRowId={r => r.seller} emptyTitle="No seller orders" emptyDescription="No seller orders in the system yet." />
          </SectionCard>

          <SectionCard title="Escalations" subtitle={`${escalationStats.total} total`}>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(escalationStats.byStatus).map(([status, count]) => (
                <Badge key={status} size="sm">{status}: {count}</Badge>
              ))}
              {escalationStats.total === 0 && <p className="text-sm text-gray-500">No escalation records.</p>}
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-hide">
              {escalations.slice(0, 12).map(e => (
                <div key={String(e.id)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-surface-border bg-surface-subtle px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{String(e.title ?? '—')}</p>
                    <p className="text-xs text-gray-500 truncate">{String(e.purchaseOrderNumber ?? e.purchaseOrderId ?? '')}{e.vendorName ? ` · ${String(e.vendorName)}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge size="sm">{String(e.priority ?? '—')}</Badge>
                    <StatusBadge status={String(e.status ?? '—')} size="sm" />
                  </div>
                </div>
              ))}
              {escalations.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No escalation records.</p>}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Super Admin — pending buyer confirmations */}
      {isSuperAdmin && (
        <SectionCard
          title="Orders — Buyer Confirmation Pending"
          subtitle="Delivered seller orders where the buyer has not yet confirmed receipt."
          action={
            <Link to="/superadmin/orders" className="inline-flex items-center gap-1 rounded-btn bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
              Order management <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <DataTable data={pendingBuyerRows} columns={pendingBuyerColumns} enableSorting enablePagination defaultPageSize={8} getRowId={r => r.id} emptyTitle="All clear" emptyDescription="No orders are waiting for buyer confirmation." />
        </SectionCard>
      )}

      {/* Super Admin — asset distribution by buyer */}
      {isSuperAdmin && (
        <SectionCard
          title="Asset Distribution Across Buyers"
          subtitle="Count and book value by buyer name (or buyer ID)."
          action={<Button size="sm" variant="ghost" iconLeft={<Download className="w-4 h-4" />} onClick={() => void exportReport('buyer-assets')}>Export CSV</Button>}
        >
          {buyerAssetBuckets.length === 0 ? (
            <EmptyState icon={<Package className="w-8 h-8" />} title="No assets" />
          ) : (
            <div className="space-y-3">
              {buyerAssetBuckets.map(b => {
                const pct  = assetStats.total ? Math.round((b.count / assetStats.total) * 1000) / 10 : 0;
                const barW = Math.max(4, (b.count / maxBuyerCount) * 100);
                return (
                  <div key={b.key}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm mb-1">
                      <span className="font-medium text-gray-900 truncate max-w-[60%]">{b.display}</span>
                      <span className="text-gray-500 text-xs whitespace-nowrap">{b.count} assets ({pct}%) · {formatIndianShort(b.value)}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-indigo-500 transition-all duration-500" style={{ width: `${barW}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* Status distribution + seller distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Donut: Asset Status ─────────────────────────────────── */}
        <SectionCard title={t('Asset Status Distribution')} action={<Button size="sm" variant="ghost" iconLeft={<Download className="w-4 h-4" />} onClick={() => void exportReport('asset-status')}>Export</Button>}>
          {assetStats.total === 0 ? (
            <p className="text-sm text-gray-500">{t('No assets')}</p>
          ) : (() => {
            const slices = [
              { name: t('Active'),           value: assetStats.active },
              { name: t('Deployed'),          value: assetStats.deployed },
              { name: t('Under Repair'),      value: assetStats.underRepair },
              { name: t('Expired Warranty'),  value: assetStats.expiredWarranty },
              { name: t('Disposed'),          value: assetStats.disposed },
            ].filter(s => s.value > 0);
            return (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-48 shrink-0" style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={slices} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={2} dataKey="value">
                        {slices.map(s => (
                          <Cell key={s.name} fill={STATUS_COLORS[s.name] ?? STATUS_COLORS[s.name.replace(t('Active'),'Active').replace(t('Deployed'),'Deployed')] ?? '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 flex-1 w-full">
                  {slices.map(s => {
                    const pct = ((s.value / assetStats.total) * 100).toFixed(1);
                    const color = STATUS_COLORS[s.name] ?? '#94a3b8';
                    return (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-gray-600 truncate">{s.name}</span>
                        </div>
                        <span className="font-medium text-gray-900 shrink-0">{s.value} <span className="text-gray-400 font-normal">({pct}%)</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </SectionCard>

        {/* ── Horizontal bar: Assets by Seller ────────────────────── */}
        <SectionCard title={t('Assets by Seller')} action={<Button size="sm" variant="ghost" iconLeft={<Download className="w-4 h-4" />} onClick={() => void exportReport('seller')}>Export</Button>}>
          {sellerStats.length === 0 ? (
            <p className="text-sm text-gray-500">{t('No data')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(140, Math.min(sellerStats.length * 38, 280))}>
              <BarChart data={sellerStats} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" name={t('Assets')} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {sellerStats.map((_, i) => (
                    <Cell key={i} fill={SELLER_PALETTE[i % SELLER_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={<span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning-500" />{t('Warranty Expiry Alerts')}</span>} subtitle={`${warrantyAlerts.length} ${t('alerts')} (within 30 days)`}>
          {warrantyAlerts.length === 0 ? <p className="text-sm text-gray-500">{t('No warranty alerts')}</p> : (
            <div className="space-y-2">
              {warrantyAlerts.slice(0, 5).map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-3 bg-warning-100/60 rounded-lg border border-warning-600/20">
                  <div><p className="text-sm font-medium text-gray-900">{asset.name}</p><p className="text-xs text-gray-500">{t('Expires')}: {asset.warrantyExpiry}</p></div>
                  <Badge size="sm" variant="warning">{t('Expiring Soon')}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-danger-500" />{t('AMC Expiry Alerts')}</span>} subtitle={`${amcAlerts.length} ${t('alerts')} (within 30 days)`}>
          {amcAlerts.length === 0 ? <p className="text-sm text-gray-500">{t('No AMC alerts')}</p> : (
            <div className="space-y-2">
              {amcAlerts.slice(0, 5).map(asset => (
                <div key={asset.id} className="flex items-center justify-between p-3 bg-danger-100/60 rounded-lg border border-danger-600/20">
                  <div><p className="text-sm font-medium text-gray-900">{asset.name}</p><p className="text-xs text-gray-500">{t('Expires')}: {asset.amcExpiry}</p></div>
                  <Badge size="sm" variant="danger">{t('Expiring Soon')}</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Category analysis */}
      <SectionCard title={t('Asset Category Analysis')} action={<Button size="sm" variant="primary" iconLeft={<Download className="w-4 h-4" />} onClick={() => void exportReport('category')}>{t('Export Report')}</Button>}>
        {categoryStats.length > 0 && (
          <div className="mb-6 border-b border-surface-border pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryStats.slice(0, 12)} margin={{ top: 4, right: 16, left: 0, bottom: 48 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="count" name={t('Assets')} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <DataTable data={categoryStats} columns={categoryColumns} enableSorting enablePagination defaultPageSize={10} getRowId={r => r.name} emptyTitle={t('No categories found')} />
      </SectionCard>

    </div>
  );
};

export default ReportsDashboard;
