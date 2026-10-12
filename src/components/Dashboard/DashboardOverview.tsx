/**
 * DashboardOverview — modernized with shared UI system.
 * Uses PageHeader, StatCard, SectionCard for consistent layout.
 * Replaces duplicate formatIndianCurrency with shared formatIndianShort.
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  Activity,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Clock,
  IndianRupee,
  ShoppingCart,
} from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { Asset, Complaint, Alert, PurchaseOrder } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { StatCard, SectionCard } from '../ui/Card';
import { StatCardSkeleton } from '../ui/Skeleton';
import { formatIndianShort } from '../../utils/currency';

const ACTIVE_PO_STATUSES = [
  'Draft', 'Pending Approval', 'Approved', 'Sent to Supplier',
  'Order Confirmed', 'In Production', 'Ready for Delivery', 'In Transit',
];

const DashboardOverview: React.FC = () => {
  const { t } = useTranslation();
  const [assets,         setAssets]         = useState<Asset[]>([]);
  const [complaints,     setComplaints]      = useState<Complaint[]>([]);
  const [alerts,         setAlerts]          = useState<Alert[]>([]);
  const [purchaseOrders, setPurchaseOrders]  = useState<PurchaseOrder[]>([]);
  const [loading,        setLoading]         = useState(true);
  const [error,          setError]           = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [assetsData, complaintsData, purchaseOrdersData] = await Promise.all([
          ApiService.getAllAssets(),
          ApiService.getAllComplaints(),
          ApiService.getAllPurchaseOrders(),
        ]);

        const typedAssets = assetsData as Asset[];
        setAssets(typedAssets);
        setComplaints(complaintsData as Complaint[]);
        setPurchaseOrders(purchaseOrdersData as PurchaseOrder[]);

        // Generate alerts from assets data (warranty/AMC expiring, under repair)
        const today = new Date();
        const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const alertsFromAssets: Alert[] = [];

        typedAssets.forEach((asset) => {
          if (asset.warrantyExpiry) {
            const expiryDate = new Date(asset.warrantyExpiry);
            if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
              alertsFromAssets.push({
                id: `warranty-${asset.id}`,
                assetId: asset.id,
                message: `Warranty for ${asset.name} is expiring soon`,
                severity: 'warning',
                date: expiryDate.toLocaleDateString(),
              });
            }
          }
          if (asset.amcExpiry) {
            const expiryDate = new Date(asset.amcExpiry);
            if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
              alertsFromAssets.push({
                id: `amc-${asset.id}`,
                assetId: asset.id,
                message: `AMC for ${asset.name} is expiring soon`,
                severity: 'warning',
                date: expiryDate.toLocaleDateString(),
              });
            }
          }
          if (asset.status === 'Under Repair') {
            alertsFromAssets.push({
              id: `repair-${asset.id}`,
              assetId: asset.id,
              message: `${asset.name} is under repair`,
              severity: 'error',
              date: today.toLocaleDateString(),
            });
          }
        });

        setAlerts(alertsFromAssets);
      } catch (err) {
        setError('Failed to fetch dashboard data');
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalValue = assets.reduce((sum, asset) => sum + (asset.value ?? 0), 0);

  return (
    <div className="space-y-6">

      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        icon={<Activity className="w-5 h-5 text-primary-600" />}
      />

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title={t('dashboard.totalAssets')}
            value={assets.length}
            icon={<Package className="w-5 h-5 text-primary-600" />}
            iconBg="bg-primary-100"
            trend={{ value: 12, direction: 'up', label: 'from last month' }}
          />
          <StatCard
            title={t('dashboard.activeAssets')}
            value={assets.filter(a => a.status === 'Active').length}
            icon={<Activity className="w-5 h-5 text-success-600" />}
            iconBg="bg-success-100"
            trend={{ value: 5, direction: 'up', label: 'from last month' }}
          />
          <StatCard
            title={t('dashboard.underRepair')}
            value={assets.filter(a => a.status === 'Under Repair').length}
            icon={<Wrench className="w-5 h-5 text-warning-600" />}
            iconBg="bg-warning-100"
            trend={{ value: 2, direction: 'down', label: 'from last month' }}
          />
          <StatCard
            title={t('dashboard.openComplaints')}
            value={complaints.filter(c => c.status === 'Open').length}
            icon={<AlertTriangle className="w-5 h-5 text-danger-600" />}
            iconBg="bg-danger-100"
            trend={{ value: 8, direction: 'up', label: 'from last month' }}
          />
          <StatCard
            title={t('dashboard.activePurchaseOrders')}
            value={purchaseOrders.filter(po => ACTIVE_PO_STATUSES.includes(po.status)).length}
            icon={<ShoppingCart className="w-5 h-5 text-info-600" />}
            iconBg="bg-info-100"
            trend={{ value: 15, direction: 'up', label: 'from last month' }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-danger-100 border border-danger-600/20 rounded-card text-danger-600 text-sm">
          {error}
        </div>
      )}

      {/* Recent Alerts */}
      <SectionCard
        title={t('dashboard.recentAlerts')}
        subtitle="Warranty, AMC, and repair status alerts"
      >
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No active alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-surface-subtle dark:bg-slate-700/40 rounded-card"
              >
                <div className={[
                  'w-2 h-2 rounded-full mt-2 shrink-0',
                  alert.severity === 'warning' ? 'bg-warning-500' :
                  alert.severity === 'error'   ? 'bg-danger-500' : 'bg-info-500',
                ].join(' ')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.message}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {alert.date}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">Asset: {alert.assetId}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Financial Summary */}
      <SectionCard
        title={`${t('dashboard.totalValue')} Summary`}
        subtitle="Portfolio value breakdown"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-primary-50 dark:bg-primary-900/20 rounded-card">
            <IndianRupee className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatIndianShort(totalValue)}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">{t('dashboard.totalValue')}</p>
          </div>
          <div className="text-center p-4 bg-success-50 dark:bg-success-900/20 rounded-card">
            <TrendingUp className="w-8 h-8 text-success-600 dark:text-success-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatIndianShort(totalValue * 0.85)}</p>
            <p className="text-sm text-gray-600 dark:text-slate-400">Active Assets Value</p>
          </div>
          <div className="text-center p-4 bg-warning-50 dark:bg-warning-900/20 rounded-card">
            <Wrench className="w-8 h-8 text-warning-600 dark:text-warning-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatIndianShort(totalValue * 0.15)}</p>
            <p className="text-sm text-gray-600">Under Maintenance</p>
          </div>
        </div>
      </SectionCard>

    </div>
  );
};

export default DashboardOverview;
