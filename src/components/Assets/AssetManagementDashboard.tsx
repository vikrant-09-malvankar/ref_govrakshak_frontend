/**
 * AssetManagementDashboard — modernized with shared UI system.
 * Replaces ~1,241 lines of manual sort/filter/pagination/selection
 * with DataTable (TanStack Table v8), StatCard, StatusBadge, and Button.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus, Download, RefreshCw, Grid, List, AlertTriangle,
  Eye, Edit, Trash2, MapPin, IndianRupee, Monitor, Printer,
  Server, Smartphone, Laptop, Package, User, Truck, CheckCircle,
  Filter, X,
} from 'lucide-react';
import { Asset } from '../../types';
import { ApiService } from '../../services/apiService';
import { themedAlert, themedConfirm } from '../../utils/themedDialogs';
import { formatIndianShort } from '../../utils/currency';
import { DataTable, BulkAction, createSelectColumn } from '../ui/DataTable';
import { StatCard, SectionCard } from '../ui/Card';
import { StatusBadge, Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import AssetForm from './AssetForm';
import AssetDetails from './AssetDetails';
import AssetAssignmentModal from './AssetAssignmentModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AssetFilter {
  category:         string;
  status:           string;
  department:       string;
  location:         string;
  supplier:         string;
  endUser:          string;
  assignmentStatus: string;
}

interface AssetStats {
  total:            number;
  active:           number;
  deployed:         number;
  underRepair:      number;
  disposed:         number;
  totalValue:       number;
  avgValue:         number;
  warrantyExpiring: number;
  amcExpiring:      number;
}

// ─── Helpers (outside component — no state deps) ──────────────────────────────
function parseAssetValue(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function getCategoryIcon(category: string) {
  switch (category?.toLowerCase()) {
    case 'computer':
    case 'desktop':  return <Monitor   className="w-4 h-4 text-gray-500" />;
    case 'laptop':   return <Laptop    className="w-4 h-4 text-gray-500" />;
    case 'printer':  return <Printer   className="w-4 h-4 text-gray-500" />;
    case 'server':   return <Server    className="w-4 h-4 text-gray-500" />;
    case 'smartphone':
    case 'mobile':   return <Smartphone className="w-4 h-4 text-gray-500" />;
    default:         return <Package   className="w-4 h-4 text-gray-500" />;
  }
}

const EMPTY_FILTER: AssetFilter = {
  category: '', status: '', department: '',
  location: '', supplier: '', endUser: '', assignmentStatus: '',
};

// ─── Component ────────────────────────────────────────────────────────────────
const AssetManagementDashboard: React.FC = () => {
  const { t } = useTranslation();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [assets,      setAssets]      = useState<Asset[]>([]);
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [viewMode,             setViewMode]            = useState<'grid' | 'list'>('list');
  const [searchTerm,           setSearchTerm]          = useState('');
  const [showFilters,          setShowFilters]         = useState(false);
  const [showAssetForm,        setShowAssetForm]       = useState(false);
  const [showAssetDetails,     setShowAssetDetails]    = useState(false);
  const [showAssignmentModal,  setShowAssignmentModal] = useState(false);
  const [selectedAsset,        setSelectedAsset]       = useState<Asset | null>(null);
  const [csvInputKey,          setCsvInputKey]         = useState(0);
  const [filters,              setFilters]             = useState<AssetFilter>(EMPTY_FILTER);

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => { loadAssets(); }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const [assetsData, ordersData] = await Promise.all([
        ApiService.getAllAssets(),
        ApiService.getAllSellerOrders(),
      ]);
      setAssets(assetsData as Asset[]);
      setSellerOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      setError(ApiService.handleError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const assetStats: AssetStats = useMemo(() => {
    const total       = assets.length;
    const active      = assets.filter(a => a.status === 'Active').length;
    const deployed    = assets.filter(a => a.status === 'Deployed').length;
    const underRepair = assets.filter(a => a.status === 'Under Repair').length;
    const disposed    = assets.filter(a => a.status === 'Disposed').length;
    const totalValue  = assets.reduce((s, a) => s + parseAssetValue(a.value), 0);
    const avgValue    = total > 0 ? totalValue / total : 0;
    const now = new Date();
    const threeMo = new Date(now.setMonth(now.getMonth() + 3));
    const warrantyExpiring = assets.filter(a => a.warrantyExpiry && new Date(a.warrantyExpiry) <= threeMo).length;
    const amcExpiring      = assets.filter(a => a.amcExpiry      && new Date(a.amcExpiry)      <= threeMo).length;
    return { total, active, deployed, underRepair, disposed, totalValue, avgValue, warrantyExpiring, amcExpiring };
  }, [assets]);

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    let data = [...assets];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      data = data.filter(a =>
        [a.name, a.serialNumber, a.category, a.department, a.location, a.supplier, a.endUserName, a.endUserEmail, a.endUserDesignation]
          .some(v => v?.toLowerCase().includes(q))
      );
    }
    if (filters.category)         data = data.filter(a => a.category === filters.category);
    if (filters.status)           data = data.filter(a => a.status === filters.status);
    if (filters.department)       data = data.filter(a => a.department === filters.department);
    if (filters.location)         data = data.filter(a => a.location === filters.location);
    if (filters.supplier)         data = data.filter(a => a.supplier === filters.supplier);
    if (filters.endUser)          data = data.filter(a => a.endUserName === filters.endUser);
    if (filters.assignmentStatus === 'assigned')   data = data.filter(a =>  a.endUserName);
    if (filters.assignmentStatus === 'unassigned') data = data.filter(a => !a.endUserName);

    return data;
  }, [assets, searchTerm, filters]);

  // ── Unique filter options ────────────────────────────────────────────────
  const uniqueCategories  = useMemo(() => [...new Set(assets.map(a => a.category).filter(Boolean))],  [assets]);
  const uniqueDepartments = useMemo(() => [...new Set(assets.map(a => a.department).filter(Boolean))], [assets]);
  const uniqueLocations   = useMemo(() => [...new Set(assets.map(a => a.location).filter(Boolean))],   [assets]);
  const uniqueSuppliers   = useMemo(() => [...new Set(assets.map(a => a.supplier).filter(Boolean))],   [assets]);
  const uniqueEndUsers    = useMemo(() => [...new Set(assets.map(a => a.endUserName).filter(Boolean))], [assets]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openView     = useCallback((asset: Asset) => { setSelectedAsset(asset); setShowAssetDetails(true); },    []);
  const openEdit     = useCallback((asset: Asset) => { setSelectedAsset(asset); setShowAssetForm(true); },       []);
  const openAssign   = useCallback((asset: Asset) => { setSelectedAsset(asset); setShowAssignmentModal(true); }, []);

  const handleAssetSubmit = async (assetData: Asset) => {
    try {
      if (selectedAsset) {
        await ApiService.updateAsset(selectedAsset.id, assetData);
      } else {
        await ApiService.createAsset(assetData);
      }
      await loadAssets();
      setShowAssetForm(false);
      setSelectedAsset(null);
    } catch (err) {
      setError(ApiService.handleError(err));
    }
  };

  const handleAssignmentUpdate = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
  };

  const handleAssetDelete = async (assetId: string) => {
    const confirmed = await themedConfirm(t('Are you sure you want to delete this asset?'), t('Delete Asset'));
    if (!confirmed) return;
    try {
      await ApiService.deleteAsset(assetId);
      await loadAssets();
    } catch (err) {
      setError(ApiService.handleError(err));
    }
  };

  const handleBulkDelete = async (selected: Asset[]) => {
    const confirmed = await themedConfirm(
      t('Are you sure you want to delete {{count}} selected assets?', { count: selected.length }),
      t('Delete Assets'),
    );
    if (!confirmed) return;
    try {
      await Promise.all(selected.map(a => ApiService.deleteAsset(a.id)));
      await loadAssets();
    } catch (err) {
      setError(ApiService.handleError(err));
    }
  };

  // ── DataTable columns ────────────────────────────────────────────────────
  const columns: ColumnDef<Asset, any>[] = useMemo(() => [
    createSelectColumn<Asset>(),
    {
      id: 'asset_uid',
      header: t('Asset ID'),
      accessorFn: row => (row as any).asset_uid || (row as any).assetUid || row.id || '-',
      size: 110,
    },
    {
      accessorKey: 'name',
      header: t('Asset'),
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex items-center gap-2.5">
            <span className="shrink-0">{getCategoryIcon(a.category)}</span>
            <div>
              <div className="text-sm font-medium text-gray-900">{a.name}</div>
              <div className="text-xs text-gray-500">{a.serialNumber}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'gem_contract',
      header: t('GeM Contract'),
      accessorFn: row => (row as any).gem_contract_number || '-',
      size: 140,
    },
    {
      accessorKey: 'category',
      header: t('Category'),
      cell: ({ getValue }) => (
        <Badge size="sm">{getValue<string>()}</Badge>
      ),
    },
    {
      accessorKey: 'department',
      header: t('Department'),
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-700">{getValue<string>() || '—'}</span>
      ),
    },
    {
      accessorKey: 'endUserName',
      header: t('Assigned To'),
      cell: ({ row }) => {
        const { endUserName, endUserDesignation, endUserEmail } = row.original;
        if (!endUserName) return <span className="text-xs text-gray-400 italic">{t('Unassigned')}</span>;
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{endUserName}</div>
            {endUserDesignation && <div className="text-xs text-gray-500">{endUserDesignation}</div>}
            {endUserEmail      && <div className="text-xs text-gray-400">{endUserEmail}</div>}
          </div>
        );
      },
    },
    {
      accessorKey: 'location',
      header: t('Location'),
      cell: ({ getValue }) => {
        const loc = getValue<string>();
        if (!loc) return <span className="text-xs text-gray-400 italic">{t('Not specified')}</span>;
        return (
          <div className="flex items-center gap-1 text-sm text-gray-700">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            {loc}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('Status'),
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: 'value',
      header: t('Value'),
      cell: ({ row }) => (
        <span className="text-sm font-medium text-gray-900">
          {formatIndianShort(parseAssetValue(row.original.value))}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      size: 120,
      cell: ({ row }) => {
        const asset = row.original;
        return (
          <div className="flex items-center gap-0.5">
            <button
              onClick={e => { e.stopPropagation(); openView(asset); }}
              className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors"
              title={t('View Details')}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); openAssign(asset); }}
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
              title={t('Assign / Reassign')}
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); openEdit(asset); }}
              className="p-1.5 text-gray-400 hover:text-success-600 rounded transition-colors"
              title={t('Edit')}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleAssetDelete(asset.id); }}
              className="p-1.5 text-gray-400 hover:text-danger-600 rounded transition-colors"
              title={t('Delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t, openView, openEdit, openAssign]);

  // ── Bulk actions ─────────────────────────────────────────────────────────
  const bulkActions: BulkAction<Asset>[] = useMemo(() => [
    {
      label:   t('Delete Selected'),
      icon:    <Trash2 className="w-4 h-4" />,
      variant: 'danger',
      action:  handleBulkDelete,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [t]);

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="p-4 bg-danger-100 border border-danger-600/20 rounded-card">
        <p className="text-danger-600 font-medium">{t('Error loading assets')}: {error}</p>
        <Button size="sm" variant="danger" className="mt-2" onClick={loadAssets}>
          {t('Retry')}
        </Button>
      </div>
    );
  }

  const showValueWarning = assets.length > 0 && assetStats.totalValue === 0;
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Warning banner */}
      {showValueWarning && (
        <div className="flex items-center gap-3 bg-warning-100 border border-warning-600/30 rounded-card p-4">
          <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-800">{t('Asset Value Warning')}</p>
            <p className="text-xs text-warning-800/80">
              {t('Total asset value appears to be ₹0 despite having assets. This may indicate missing value data.')}
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <PageHeader
        title={t('Asset Management')}
        subtitle={t('Comprehensive asset tracking and management system')}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border border-surface-border rounded-btn p-0.5 bg-white">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
                aria-label={t('List view')}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-primary-100 text-primary-600' : 'text-gray-500 hover:bg-gray-100'}`}
                aria-label={t('Grid view')}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(v => !v)}
              className={showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}
            >
              {t('Filters')}
              {activeFiltersCount > 0 && (
                <span className="ml-1.5 bg-primary-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <Button variant="ghost" size="sm" iconLeft={<RefreshCw className="w-4 h-4" />} onClick={loadAssets}>
              {t('Refresh')}
            </Button>

            {/* CSV Import */}
            <input
              key={csvInputKey}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              id="asset-csv-import"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setLoading(true);
                  const res: any = await ApiService.bulkUploadAssets(file);
                  await loadAssets();
                  await themedAlert(
                    `${t('Bulk upload completed')}: ${res?.created ?? 0} ${t('records')}`,
                    t('Import Complete'),
                  );
                } catch (err) {
                  setError(ApiService.handleError(err));
                } finally {
                  setLoading(false);
                  setCsvInputKey(prev => prev + 1);
                }
              }}
            />
            <label
              htmlFor="asset-csv-import"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-surface-border rounded-btn bg-white hover:bg-surface-subtle cursor-pointer transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('Import CSV')}
            </label>

            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus className="w-4 h-4" />}
              onClick={() => { setSelectedAsset(null); setShowAssetForm(true); }}
            >
              {t('Add Asset')}
            </Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title={t('Total Assets')}
          value={assetStats.total}
          icon={Package}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
        />
        <StatCard
          title={t('Active')}
          value={assetStats.active}
          icon={CheckCircle}
          iconBg="bg-success-100"
          iconColor="text-success-600"
        />
        <StatCard
          title={t('Deployed')}
          value={assetStats.deployed}
          description={t('Custodian serial registered')}
          icon={Truck}
          iconBg="bg-info-100"
          iconColor="text-info-600"
        />
        <StatCard
          title={t('Total Value')}
          value={formatIndianShort(assetStats.totalValue)}
          description={`${t('Avg')}: ${formatIndianShort(assetStats.avgValue)}`}
          icon={IndianRupee}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
        />
        <StatCard
          title={t('Needs Attention')}
          value={assetStats.underRepair + assetStats.warrantyExpiring + assetStats.amcExpiring}
          icon={AlertTriangle}
          iconBg="bg-warning-100"
          iconColor="text-warning-600"
        />
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <SectionCard
          title={t('Filters')}
          action={
            <button
              onClick={() => setFilters(EMPTY_FILTER)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('Clear all')}
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className="field-label">{t('Category')}</label>
              <select
                value={filters.category}
                onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
                className="w-full border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Categories')}</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Status */}
            <div>
              <label className="field-label">{t('Status')}</label>
              <select
                value={filters.status}
                onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                className="w-full border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Statuses')}</option>
                <option value="Active">{t('Active')}</option>
                <option value="Deployed">{t('Deployed')}</option>
                <option value="Under Repair">{t('Under Repair')}</option>
                <option value="Disposed">{t('Disposed')}</option>
              </select>
            </div>
            {/* Department */}
            <div>
              <label className="field-label">{t('Department')}</label>
              <select
                value={filters.department}
                onChange={e => setFilters(p => ({ ...p, department: e.target.value }))}
                className="w-full border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Departments')}</option>
                {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* Location */}
            <div>
              <label className="field-label">{t('Location')}</label>
              <select
                value={filters.location}
                onChange={e => setFilters(p => ({ ...p, location: e.target.value }))}
                className="w-full border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Locations')}</option>
                {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {/* Assigned To */}
            <div>
              <label className="field-label">{t('Assigned To')}</label>
              <select
                value={filters.endUser}
                onChange={e => setFilters(p => ({ ...p, endUser: e.target.value }))}
                className="w-full border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All End Users')}</option>
                {uniqueEndUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {/* Assignment Status */}
            <div>
              <label className="field-label">{t('Assignment Status')}</label>
              <select
                value={filters.assignmentStatus}
                onChange={e => setFilters(p => ({ ...p, assignmentStatus: e.target.value }))}
                className="w-full border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Assets')}</option>
                <option value="assigned">{t('Assigned')}</option>
                <option value="unassigned">{t('Unassigned')}</option>
              </select>
            </div>
            {/* Supplier */}
            <div>
              <label className="field-label">{t('Supplier / Seller')}</label>
              <select
                value={filters.supplier}
                onChange={e => setFilters(p => ({ ...p, supplier: e.target.value }))}
                className="w-full border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Suppliers')}</option>
                {uniqueSuppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </SectionCard>
      )}

      {/* List view — DataTable */}
      {viewMode === 'list' && (
        <SectionCard>
          <DataTable<Asset>
            data={filteredAssets}
            columns={columns}
            loading={loading}
            enableSorting
            enablePagination
            enableRowSelection
            enableColumnVisibility
            enableExport
            defaultPageSize={20}
            pageSizeOptions={[10, 20, 50, 100]}
            getRowId={row => row.id}
            bulkActions={bulkActions}
            onRowClick={openView}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t('Search by name, serial, category, department…')}
            exportFilename="assets"
            emptyTitle={t('No assets found')}
            emptyDescription={activeFiltersCount > 0
              ? t('Try adjusting your filters or search query.')
              : t('Get started by adding your first asset.')}
            emptyAction={activeFiltersCount > 0
              ? { label: t('Clear filters'), onClick: () => setFilters(EMPTY_FILTER) }
              : { label: t('Add Asset'), onClick: () => setShowAssetForm(true), icon: <Plus className="w-4 h-4" /> }}
          />
        </SectionCard>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <SectionCard
          title={t('Assets')}
          subtitle={`${filteredAssets.length} ${t('assets')}`}
        >
          {/* Search for grid view */}
          <div className="relative mb-4">
            <input
              type="search"
              placeholder={t('Search assets…')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full max-w-sm pl-9 pr-4 py-2 text-sm border border-surface-border rounded-btn focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Filter className="w-3.5 h-3.5" />
            </span>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              {t('No assets match your current filters.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className="border border-surface-border rounded-card p-4 bg-white hover:shadow-card-md transition-shadow cursor-pointer"
                  onClick={() => openView(asset)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(asset.category)}
                      <StatusBadge status={asset.status} size="sm" />
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm mb-0.5 line-clamp-2">{asset.name}</h3>
                  <p className="text-xs text-gray-500 mb-1">{asset.category}</p>
                  <p className="text-xs text-gray-400 mb-3">{asset.serialNumber}</p>

                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{asset.department}</span>
                      <span className="font-medium">{formatIndianShort(parseAssetValue(asset.value))}</span>
                    </div>
                    {asset.endUserName && (
                      <div><span className="font-medium">{t('To')}:</span> {asset.endUserName}</div>
                    )}
                    {asset.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />{asset.location}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1" onClick={e => e.stopPropagation()}>
                    <Button size="xs" variant="ghost" onClick={() => openAssign(asset)}>
                      <User className="w-3 h-3" />
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => openEdit(asset)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => handleAssetDelete(asset.id)}>
                      <Trash2 className="w-3 h-3 text-danger-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showAssetForm && (
        <AssetForm
          _asset={selectedAsset}
          onClose={() => { setShowAssetForm(false); setSelectedAsset(null); }}
          onSubmit={handleAssetSubmit}
          sellerOrders={sellerOrders}
        />
      )}

      {showAssetDetails && selectedAsset && (
        <AssetDetails
          asset={selectedAsset}
          onClose={() => { setShowAssetDetails(false); setSelectedAsset(null); }}
        />
      )}

      {showAssignmentModal && selectedAsset && (
        <AssetAssignmentModal
          asset={selectedAsset}
          onClose={() => { setShowAssignmentModal(false); setSelectedAsset(null); }}
          onAssignmentUpdate={handleAssignmentUpdate}
        />
      )}
    </div>
  );
};

export default AssetManagementDashboard;
