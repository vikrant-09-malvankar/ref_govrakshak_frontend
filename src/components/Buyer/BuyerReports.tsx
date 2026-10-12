import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Download as DownloadIcon,
  Printer,
  RefreshCw,
  FileText,
  IndianRupee,
  Truck,
  AlertTriangle,
  Package,
  UserX,
  CheckCircle,
  XCircle,
  Building2,
  MapPin,
  Store,
} from 'lucide-react';
import { PurchaseOrder, Asset } from '../../types';
import { ApiService } from '../../services/apiService';
import { getPublicOrderStatus, getStatusColorClass } from '../../utils/orderWorkflow';
import {
  buildOrderMapFromBuyerPurchaseOrders,
  computeGhostAssetRows,
  getPaymentReleaseReadiness,
  getBatchDeliveryCounts,
  getLastBatchDeliveredAt,
  isWarrantyExpiringWithin30Days,
  isWarrantyExpired,
  GHOST_ASSET_LOOKBACK_DAYS,
} from '../../utils/buyerAssetReportUtils';

interface BuyerReportsProps {
  purchaseOrders?: PurchaseOrder[];
  assets?: Asset[];
  onDataChange?: () => void;
}

interface ProcurementStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalValue: number;
  pendingValue: number;
  completedValue: number;
  avgOrderValue: number;
  overdueDeliveries: number;
  onTimeDeliveryRate: number;
  avgDeliveryTime: number;
}

interface AssetStats {
  totalAssets: number;
  activeAssets: number;
  repairAssets: number;
  disposedAssets: number;
  warrantyAssets: number;
  totalValue: number;
  avgValue: number;
  warrantyExpiring: number;
  amcExpiring: number;
}

function isAmcExpiringWithin30Days(asset: Asset): boolean {
  if (!asset.amcExpiry) return false;
  const d = new Date(asset.amcExpiry);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  return d >= today && d <= end;
}

const BuyerReports: React.FC<BuyerReportsProps> = ({ purchaseOrders = [], assets = [], onDataChange }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatIndianCurrency = (amount: number): string => {
    if (isNaN(amount) || amount === 0) return '₹0';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(2)} K`;
    return `₹${amount.toFixed(2)}`;
  };

  const [procurementStats, setProcurementStats] = useState<ProcurementStats | null>(null);
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null);
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([]);
  const [deliveryAnalytics, setDeliveryAnalytics] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any[]>([]);

  const departmentsFromData = useMemo(() => {
    const fromAssets = assets.map((a) => a.department).filter(Boolean) as string[];
    const fromPo = purchaseOrders.map((p) => p.department).filter(Boolean) as string[];
    return [...new Set([...fromAssets, ...fromPo])].sort();
  }, [assets, purchaseOrders]);

  const vendorsFromData = useMemo(() => {
    const fromAssets = assets.map((a) => a.supplier).filter(Boolean) as string[];
    const fromPo = purchaseOrders.map((p) => p.supplier).filter(Boolean) as string[];
    return [...new Set([...fromAssets, ...fromPo])].sort();
  }, [assets, purchaseOrders]);

  const locationsFromData = useMemo(() => {
    return [...new Set(assets.map((a) => a.location).filter(Boolean) as string[])].sort();
  }, [assets]);

  const categoriesFromData = useMemo(() => {
    return [...new Set(assets.map((a) => a.category).filter(Boolean) as string[])].sort();
  }, [assets]);

  const assetsFiltered = useMemo(() => {
    return assets.filter((a) => {
      if (selectedDepartment !== 'all' && a.department !== selectedDepartment) return false;
      if (selectedVendor !== 'all' && a.supplier !== selectedVendor) return false;
      if (selectedLocation !== 'all' && a.location !== selectedLocation) return false;
      if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
      return true;
    });
  }, [assets, selectedDepartment, selectedVendor, selectedLocation, selectedCategory]);

  const gemContractsForLocationFilter = useMemo(() => {
    if (selectedLocation === 'all') return null as Set<string> | null;
    const s = new Set<string>();
    for (const a of assets) {
      if (a.location !== selectedLocation) continue;
      const g = a.gemContractNumber || (a as { gem_contract_number?: string }).gem_contract_number;
      if (g) s.add(String(g));
    }
    return s;
  }, [assets, selectedLocation]);

  const purchaseOrdersFiltered = useMemo(() => {
    return purchaseOrders.filter((po) => {
      if (selectedDepartment !== 'all' && po.department !== selectedDepartment) return false;
      if (selectedVendor !== 'all' && po.supplier !== selectedVendor) return false;
      if (selectedCategory !== 'all') {
        const names = po.items?.map((i) => i.assetName) ?? [];
        if (!names.some((n) => n === selectedCategory)) return false;
      }
      if (gemContractsForLocationFilter && gemContractsForLocationFilter.size > 0) {
        const gem = po.gemContractNumber;
        if (!gem || !gemContractsForLocationFilter.has(String(gem))) return false;
      }
      return true;
    });
  }, [purchaseOrders, selectedDepartment, selectedVendor, selectedCategory, gemContractsForLocationFilter]);

  const orderById = useMemo(() => buildOrderMapFromBuyerPurchaseOrders(purchaseOrders), [purchaseOrders]);

  const ghostRows = useMemo(
    () => computeGhostAssetRows(assetsFiltered, orderById),
    [assetsFiltered, orderById]
  );

  const ghostRowsAllAssets = useMemo(
    () => computeGhostAssetRows(assets, orderById),
    [assets, orderById]
  );

  const computeAssetMetricCounts = (list: Asset[], ghostCount: number) => {
    const total = list.length;
    const active = list.filter((a) => a.status === 'Active').length;
    const repair = list.filter((a) => a.status === 'Under Repair').length;
    const disposed = list.filter((a) => a.status === 'Disposed').length;
    const warrantyExpiring = list.filter((a) => isWarrantyExpiringWithin30Days(a)).length;
    const warrantyExpired = list.filter((a) => isWarrantyExpired(a)).length;
    const amcExpiring = list.filter((a) => isAmcExpiringWithin30Days(a)).length;
    const totalValue = list.reduce((s, a) => s + (Number(a.value) || 0), 0);
    return {
      total,
      active,
      repair,
      disposed,
      warrantyExpiring,
      warrantyExpired,
      amcExpiring,
      ghost: ghostCount,
      totalValue,
    };
  };

  const buyerAssetMetrics = useMemo(
    () => computeAssetMetricCounts(assetsFiltered, ghostRows.length),
    [assetsFiltered, ghostRows]
  );

  const buyerAssetMetricsAll = useMemo(
    () => computeAssetMetricCounts(assets, ghostRowsAllAssets.length),
    [assets, ghostRowsAllAssets]
  );

  const [showAssetStatsWithAllData, setShowAssetStatsWithAllData] = useState(false);

  const anyAssetFilterActive =
    selectedDepartment !== 'all' ||
    selectedVendor !== 'all' ||
    selectedLocation !== 'all' ||
    selectedCategory !== 'all';

  const displayAssetMetrics = showAssetStatsWithAllData ? buyerAssetMetricsAll : buyerAssetMetrics;
  const altAssetMetrics = showAssetStatsWithAllData ? buyerAssetMetrics : buyerAssetMetricsAll;
  const altAssetMetricsLabel = showAssetStatsWithAllData ? 'Filtered' : 'All data';
  const showAltAssetCounts = anyAssetFilterActive;

  const warrantyExpiringAssets = useMemo(
    () => assetsFiltered.filter((a) => isWarrantyExpiringWithin30Days(a)),
    [assetsFiltered]
  );
  const warrantyExpiredAssets = useMemo(
    () => assetsFiltered.filter((a) => isWarrantyExpired(a)),
    [assetsFiltered]
  );

  const gemPaymentRows = useMemo(() => {
    return purchaseOrdersFiltered
      .filter((po) => Boolean(po.gemContractNumber && String(po.gemContractNumber).trim()))
      .map((po) => {
        const readiness = getPaymentReleaseReadiness(po);
        const { delivered, total } = getBatchDeliveryCounts(po);
        const lastBatch = getLastBatchDeliveredAt(po);
        return {
          po,
          readiness,
          delivered,
          totalBatches: total,
          lastBatch,
          pub: getPublicOrderStatus(po),
        };
      })
      .sort((a, b) => String(a.po.gemContractNumber).localeCompare(String(b.po.gemContractNumber)));
  }, [purchaseOrdersFiltered]);

  useEffect(() => {
    loadReportsData();
  }, [selectedPeriod, selectedDepartment, selectedVendor, selectedCategory]);

  useEffect(() => {
    if (onDataChange) {
      loadReportsData();
    }
  }, [purchaseOrders, assets]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        period: selectedPeriod,
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        vendor: selectedVendor !== 'all' ? selectedVendor : undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
      };

      const [procurementData, assetData, vendorData, deliveryData, financialData] = await Promise.all([
        ApiService.getProcurementStats(filters),
        ApiService.getAssetStats(filters),
        ApiService.getVendorPerformanceStats(filters),
        ApiService.getDeliveryAnalytics(filters),
        ApiService.getFinancialSummary(filters),
      ]);

      setProcurementStats(procurementData);
      setAssetStats(assetData);
      setVendorPerformance(vendorData);
      setDeliveryAnalytics(deliveryData);
      setFinancialSummary(financialData);
    } catch (err) {
      console.error('Error loading reports data:', err);
      setError('Failed to load reports data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadReportsData();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/60 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300">Error Loading Reports</h3>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Procurement Reports</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Analytics for your scope — filter assets by supplier, department, and location. GeM delivery view supports
              Accounts payment release checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm dark:[color-scheme:dark]"
            >
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="week">This Week</option>
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="month">This Month</option>
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="quarter">This Quarter</option>
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="year">This Year</option>
            </select>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm dark:[color-scheme:dark]"
            >
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All Departments</option>
              {departmentsFromData.map((dept) => (
                <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm dark:[color-scheme:dark]"
            >
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All Suppliers</option>
              {vendorsFromData.map((v) => (
                <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm dark:[color-scheme:dark]"
            >
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All Locations</option>
              {locationsFromData.map((loc) => (
                <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm dark:[color-scheme:dark]"
            >
              <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="all">All Categories</option>
              {categoriesFromData.map((category) => (
                <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {procurementStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{procurementStats.totalOrders}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{procurementStats.activeOrders} active</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{procurementStats.completedOrders}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {procurementStats.totalOrders > 0
                    ? Math.round((procurementStats.completedOrders / procurementStats.totalOrders) * 100)
                    : 0}
                  % completion rate
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <IndianRupee className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatIndianCurrency(procurementStats.totalValue)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatIndianCurrency(procurementStats.avgOrderValue)} avg order</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Truck className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">On-Time Delivery</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{procurementStats.onTimeDeliveryRate}%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{procurementStats.avgDeliveryTime} days avg</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {showAssetStatsWithAllData
              ? 'Asset statistics (all your assets — filters ignored)'
              : 'Asset statistics (your assets — current filters)'}
          </h3>
          {anyAssetFilterActive && (
            <div
              role="group"
              aria-label="Asset statistics scope"
              className="inline-flex rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden shrink-0 print:hidden"
            >
              <button
                type="button"
                onClick={() => setShowAssetStatsWithAllData(false)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  showAssetStatsWithAllData
                    ? 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                    : 'bg-blue-600 text-white'
                }`}
                aria-pressed={!showAssetStatsWithAllData}
              >
                Current filters
              </button>
              <button
                type="button"
                onClick={() => setShowAssetStatsWithAllData(true)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 dark:border-slate-600 ${
                  showAssetStatsWithAllData
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'
                }`}
                aria-pressed={showAssetStatsWithAllData}
              >
                All data
              </button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {showAssetStatsWithAllData
            ? `Counts below cover all assets in your scope, regardless of the filters above. Unallocated assets use the same rule as Super Admin reports (no end-user assignment ≥${GHOST_ASSET_LOOKBACK_DAYS} days after delivery reference).`
            : `Counts below follow supplier, department, location, and category filters. Unallocated assets use the same rule as Super Admin reports (no end-user assignment ≥${GHOST_ASSET_LOOKBACK_DAYS} days after delivery reference).`}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{displayAssetMetrics.total}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total assets</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.total}</p>
            )}
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{displayAssetMetrics.active}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Active</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.active}</p>
            )}
          </div>
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{displayAssetMetrics.warrantyExpiring}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Warranty expiring (30 days)</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.warrantyExpiring}</p>
            )}
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{displayAssetMetrics.warrantyExpired}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Warranty expired</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.warrantyExpired}</p>
            )}
          </div>
          <div className="text-center p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{displayAssetMetrics.amcExpiring}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">AMC expiring (30 days)</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.amcExpiring}</p>
            )}
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{displayAssetMetrics.repair}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Under repair</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.repair}</p>
            )}
          </div>
          <div className="text-center p-4 bg-gray-100 dark:bg-slate-700 rounded-lg">
            <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{displayAssetMetrics.disposed}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Disposed</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.disposed}</p>
            )}
          </div>
          <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{formatIndianCurrency(displayAssetMetrics.totalValue)}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total asset value</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                {altAssetMetricsLabel}: {formatIndianCurrency(altAssetMetrics.totalValue)}
              </p>
            )}
          </div>
          <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-lg col-span-2 md:col-span-1">
            <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1">
              <UserX className="w-6 h-6" />
              {displayAssetMetrics.ghost}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Unallocated assets</p>
            {showAltAssetCounts && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{altAssetMetricsLabel}: {altAssetMetrics.ghost}</p>
            )}
          </div>
        </div>
        {assetStats && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Reference — API aggregate snapshot: total {assetStats.totalAssets} / active {assetStats.activeAssets} / warranty
            flags {assetStats.warrantyExpiring} (may include org-wide scope; primary numbers above are
            {showAssetStatsWithAllData ? ' all your assets' : ' buyer-filtered'}).
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Asset register (filtered)</h3>
        {assetsFiltered.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No assets match the current filters.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Asset</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Serial</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="inline-flex items-center gap-1">
                    <Store className="w-3 h-3" /> Supplier
                  </span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Department
                  </span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location
                  </span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Warranty end</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">GeM contract</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {assetsFiltered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{a.name}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{a.serialNumber || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{a.category || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{a.supplier || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{a.department || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{a.location || '—'}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColorClass(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {a.gemContractNumber || (a as { gem_contract_number?: string }).gem_contract_number || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Warranty expiring (30 days)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{warrantyExpiringAssets.length} asset(s)</p>
          {warrantyExpiringAssets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None in this window.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-amber-50 dark:bg-amber-900/20">
                <tr>
                  <th className="px-2 py-2 text-left text-xs text-gray-600 dark:text-gray-400">Asset</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-600 dark:text-gray-400">Department</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-600 dark:text-gray-400">Location</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-600 dark:text-gray-400">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {warrantyExpiringAssets.map((a) => (
                  <tr key={a.id} className="text-gray-900 dark:text-gray-200">
                    <td className="px-2 py-2">{a.name}</td>
                    <td className="px-2 py-2">{a.department || '—'}</td>
                    <td className="px-2 py-2">{a.location || '—'}</td>
                    <td className="px-2 py-2">{a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 overflow-x-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Warranty expired</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{warrantyExpiredAssets.length} asset(s)</p>
          {warrantyExpiredAssets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">None.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-red-50 dark:bg-red-900/20">
                <tr>
                  <th className="px-2 py-2 text-left text-xs text-gray-600 dark:text-gray-400">Asset</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-600 dark:text-gray-400">Supplier</th>
                  <th className="px-2 py-2 text-left text-xs text-gray-600 dark:text-gray-400">Expired</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {warrantyExpiredAssets.map((a) => (
                  <tr key={a.id} className="text-gray-900 dark:text-gray-200">
                    <td className="px-2 py-2">{a.name}</td>
                    <td className="px-2 py-2">{a.supplier || '—'}</td>
                    <td className="px-2 py-2">{a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <UserX className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          Unallocated assets
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {`No end-user assigned, and delivery reference date is more than ${GHOST_ASSET_LOOKBACK_DAYS} days ago.`}
        </p>
        {ghostRows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No unallocated assets match this rule for the current filters.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
            <thead className="bg-gray-50 dark:bg-slate-700/50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Asset</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {ghostRows.map(({ asset: a, deliveryAt, sourceLabel }) => (
                <tr key={a.id} className="text-gray-900 dark:text-gray-200">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2">{a.supplier || '—'}</td>
                  <td className="px-3 py-2">{a.department || '—'}</td>
                  <td className="px-3 py-2">{a.location || '—'}</td>
                  <td className="px-3 py-2">{deliveryAt.toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{sourceLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 overflow-x-auto print:break-inside-avoid">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          GeM order-wise delivery &amp; payment release (Accounts)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <strong>Green light</strong> when the order is <strong>Completed</strong>, or <strong>Delivered</strong> with{' '}
          <strong>all batches delivered</strong> and <strong>buyer confirmation</strong> recorded. Use this as the definitive
          checklist before releasing vendor payments.
        </p>
        {gemPaymentRows.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No GeM-mapped orders match the current filters.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
            <thead className="bg-emerald-50 dark:bg-emerald-900/20">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">GeM contract</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">PO / Title</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Department</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Supplier</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Value</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Status</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Batches</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Buyer confirmed</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Last batch delivery</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Expected delivery</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Invoice</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Payment status</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Payment release</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {gemPaymentRows.map(({ po, readiness, delivered, totalBatches, lastBatch, pub }) => (
                <tr key={po.id} className={readiness.ready ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}>
                  <td className="px-2 py-2 font-mono text-xs whitespace-nowrap text-gray-900 dark:text-gray-200">{po.gemContractNumber}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium text-gray-900 dark:text-white">{po.poNumber}</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{po.title}</div>
                  </td>
                  <td className="px-2 py-2 text-gray-900 dark:text-gray-200">{po.department || '—'}</td>
                  <td className="px-2 py-2 text-gray-900 dark:text-gray-200">{po.supplier || '—'}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap text-gray-900 dark:text-gray-200">{formatIndianCurrency(po.totalAmount || 0)}</td>
                  <td className="px-2 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColorClass(pub)}`}>{pub}</span>
                  </td>
                  <td className="px-2 py-2 text-gray-900 dark:text-gray-200">
                    {totalBatches > 0 ? (
                      <span>
                        {delivered}/{totalBatches} delivered
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">No batches</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {po.deliveryInformation?.buyerConfirmed ? (
                      <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Yes
                        {po.deliveryInformation.buyerConfirmedAt && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 block">
                            {new Date(po.deliveryInformation.buyerConfirmedAt).toLocaleString()}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> No
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap text-gray-900 dark:text-gray-200">
                    {lastBatch ? new Date(lastBatch).toLocaleString() : '—'}
                  </td>
                  <td className="px-2 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[10rem]">
                    {po.expectedDeliveryStartDate || po.expectedDeliveryEndDate ? (
                      <>
                        {po.expectedDeliveryStartDate
                          ? new Date(po.expectedDeliveryStartDate).toLocaleDateString()
                          : '—'}{' '}
                        –{' '}
                        {po.expectedDeliveryEndDate
                          ? new Date(po.expectedDeliveryEndDate).toLocaleDateString()
                          : '—'}
                      </>
                    ) : (
                      po.expectedDeliveryDate
                        ? new Date(po.expectedDeliveryDate).toLocaleDateString()
                        : '—'
                    )}
                  </td>
                  <td className="px-2 py-2 text-gray-900 dark:text-gray-200">{(po as { invoiceNumber?: string }).invoiceNumber || (po as { invoice_number?: string }).invoice_number || '—'}</td>
                  <td className="px-2 py-2 text-gray-900 dark:text-gray-200">
                    {(po as { paymentStatus?: string }).paymentStatus ||
                      (po as { payment_status?: string }).payment_status ||
                      '—'}
                  </td>
                  <td className="px-2 py-2">
                    {readiness.ready ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircle className="w-4 h-4" />
                        {readiness.label}
                      </span>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 text-xs font-semibold">
                          {readiness.label}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">{readiness.detail}</p>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {vendorPerformance.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supplier performance (orders)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Completion rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">On-time delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total value</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {vendorPerformance.map((vendor, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{vendor.vendor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{vendor.totalOrders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          vendor.completionRate >= 80
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : vendor.completionRate >= 60
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {vendor.completionRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          vendor.onTimeDeliveryRate >= 80
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : vendor.onTimeDeliveryRate >= 60
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {vendor.onTimeDeliveryRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatIndianCurrency(vendor.totalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {financialSummary.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial summary by department</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg order value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Completion rate</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {financialSummary.map((dept, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{dept.department}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{dept.totalOrders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatIndianCurrency(dept.totalSpent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatIndianCurrency(dept.avgOrderValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          dept.completionRate >= 80
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : dept.completionRate >= 60
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {dept.completionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order trends</h3>
        <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-slate-700/50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Trend chart placeholder</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Data points: {deliveryAnalytics.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerReports;