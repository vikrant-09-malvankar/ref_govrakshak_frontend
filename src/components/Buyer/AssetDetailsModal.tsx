import React, { useMemo } from 'react';
import {
  X,
  Package,
  MapPin,
  Building2,
  CreditCard,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  Truck,
  UserCircle,
} from 'lucide-react';
import { Asset, PurchaseOrder } from '../../types';
import { formatVerificationGpsLine, getVerificationLocationLabel } from '../../utils/verificationMetadataDisplay';

interface AssetDetailsModalProps {
  asset: Asset;
  purchaseOrders?: PurchaseOrder[];
  onClose: () => void;
}

type DeliveryBatch = {
  batchNumber?: string;
  custodianName?: string;
  inventoryManagerName?: string;
  contactNumber?: string;
  custodianPhone?: string;
  custodianEmail?: string;
  location?: string;
  productName?: string;
  quantity?: number;
  status?: string;
  deliveredAt?: string;
  units?: Array<{
    uifid?: string;
    serial_number?: string | null;
    registeredAt?: string | null;
    status?: string;
  }>;
};

function parseDeliveryBatches(po: PurchaseOrder | Record<string, unknown>): DeliveryBatch[] {
  const raw =
    (po as any).deliveryInformation ??
    (po as any).delivery_information ??
    (po as any).deliveryInfo;
  if (raw == null) return [];
  const info = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : raw;
  const batches = info?.batches;
  return Array.isArray(batches) ? batches : [];
}

function findDeliveryContext(asset: Asset, orders: PurchaseOrder[]) {
  const uifid = String(asset.asset_uid || asset.assetUid || '').trim();
  const serial = String(asset.serialNumber || '').trim();

  for (const po of orders) {
    const batches = parseDeliveryBatches(po);
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const units = Array.isArray(batch.units) ? batch.units : [];
      for (const unit of units) {
        const uUifid = String(unit?.uifid || '').trim();
        const uSerial = String(unit?.serial_number || '').trim();
        if ((uifid && uUifid === uifid) || (serial && uSerial && uSerial === serial)) {
          return { purchaseOrder: po, batch, batchIndex, unit };
        }
      }
    }
  }

  const sid = String(asset.sellerOrderId ?? '').trim();
  if (sid) {
    const po = orders.find((o) => String(o.id) === sid);
    if (po) return { purchaseOrder: po, batch: null as DeliveryBatch | null, batchIndex: -1, unit: null };
  }

  const gem = String(asset.gemContractNumber || asset.gem_contract_number || '').trim();
  if (gem) {
    const po = orders.find((o) => String(o.gemContractNumber || '').trim() === gem);
    if (po) return { purchaseOrder: po, batch: null, batchIndex: -1, unit: null };
  }

  return null;
}

function warrantyYearsFromPo(asset: Asset, po: PurchaseOrder | null | undefined): number {
  if (!po?.items?.length) return 0;
  const name = (asset.name || '').trim().toLowerCase();
  const cat = (asset.category || '').trim().toLowerCase();
  for (const it of po.items) {
    const an = (it.assetName || '').trim().toLowerCase();
    const catIt = (it.category || '').trim().toLowerCase();
    const specs = it.specifications as { warrantyPeriod?: number } | undefined;
    const wp = specs?.warrantyPeriod ?? (it as { warrantyPeriod?: number }).warrantyPeriod;
    if (wp != null && Number(wp) > 0) {
      if (!name || an === name || name.includes(an) || an.includes(name) || (cat && catIt && cat === catIt)) {
        return Number(wp);
      }
    }
  }
  const first = po.items[0] as { specifications?: { warrantyPeriod?: number }; warrantyPeriod?: number };
  const wp0 = first?.specifications?.warrantyPeriod ?? first?.warrantyPeriod;
  return wp0 != null && Number(wp0) > 0 ? Number(wp0) : 0;
}

function resolveWarrantyDate(
  asset: Asset,
  ctx: ReturnType<typeof findDeliveryContext>,
  purchaseOrders: PurchaseOrder[]
): Date | null {
  if (asset.warrantyExpiry) {
    const d = new Date(asset.warrantyExpiry);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const baseStr =
    ctx?.unit?.registeredAt ||
    asset.allocationDate ||
    asset.purchaseDate ||
    asset.actualDeliveryDate ||
    undefined;
  if (!baseStr) return null;
  const base = new Date(baseStr);
  if (Number.isNaN(base.getTime())) return null;
  let years = warrantyYearsFromPo(asset, ctx?.purchaseOrder ?? null);
  if (!years && purchaseOrders.length) {
    years = warrantyYearsFromPo(asset, purchaseOrders[0]);
  }
  if (!years) return null;
  const end = new Date(base.getTime());
  end.setFullYear(end.getFullYear() + years);
  return end;
}

/** Buyer portal — asset lifecycle badges (indigo / emerald aligned with dashboard accents). */
function assetStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Active':
      return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-200/80 dark:ring-emerald-700/60';
    case 'Deployed':
      return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-300 ring-1 ring-indigo-200/80 dark:ring-indigo-700/60';
    case 'Under Repair':
      return 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300 ring-1 ring-amber-200/80 dark:ring-amber-700/60';
    case 'Disposed':
      return 'bg-rose-50 dark:bg-rose-900/30 text-rose-900 dark:text-rose-300 ring-1 ring-rose-200/80 dark:ring-rose-700/60';
    default:
      return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 ring-1 ring-slate-200/80 dark:ring-slate-600/60';
  }
}

function formatDateLabel(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({ asset, purchaseOrders = [], onClose }) => {
  const ctx = useMemo(
    () => (purchaseOrders.length ? findDeliveryContext(asset, purchaseOrders) : null),
    [asset, purchaseOrders]
  );

  const gemOrderDisplay = useMemo(() => {
    const fromPo = ctx?.purchaseOrder?.poNumber || ctx?.purchaseOrder?.gemContractNumber;
    const g = asset.gemContractNumber || asset.gem_contract_number;
    return (fromPo && String(fromPo).trim()) || (g && String(g).trim()) || 'N/A';
  }, [ctx, asset]);

  const warrantyDate = useMemo(
    () => resolveWarrantyDate(asset, ctx, purchaseOrders),
    [asset, ctx, purchaseOrders]
  );
  const amcDate = asset.amcExpiry ? new Date(asset.amcExpiry) : null;
  const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;
  const now = new Date();

  const warrantyDaysLeft = warrantyDate ? Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const amcDaysLeft = amcDate ? Math.ceil((amcDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const uifidDisplay = String(asset.asset_uid || asset.assetUid || '').trim() || 'N/A';

  const batch = ctx?.batch;
  const custodianName = batch?.custodianName || batch?.inventoryManagerName || '';
  const custodianPhone = batch?.custodianPhone || batch?.contactNumber || '';
  const custodianEmail = batch?.custodianEmail || '';
  const batchLocation = batch?.location || '';
  const batchNo = batch?.batchNumber ? String(batch.batchNumber) : '';
  const deliveredAt = batch?.deliveredAt;
  const deployedAt = ctx?.unit?.registeredAt || asset.allocationDate || asset.actualDeliveryDate;
  const verifiedAt = asset.verifiedAt;
  const meta = (asset.verificationMetadata as Record<string, unknown>) || null;
  const verificationCoords = formatVerificationGpsLine(meta);
  const verificationAddress = getVerificationLocationLabel(meta);
  const verificationLocationLine = [
    batchLocation && `Site: ${batchLocation}`,
    verificationAddress && `Address: ${verificationAddress}`,
    verificationCoords && `GPS: ${verificationCoords}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const showCustodian = Boolean(
    batch &&
      (custodianName || custodianPhone || custodianEmail || batchNo || batchLocation)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Asset Details</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg ring-1 ring-gray-100 dark:ring-slate-600/60">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Basic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Asset Name</label>
                  <p className="text-gray-900 dark:text-white font-medium">{asset.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">UIFID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">{uifidDisplay}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Serial Number</label>
                  <p className="text-gray-900 dark:text-white">{asset.serialNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
                  <p className="text-gray-900 dark:text-white">{asset.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${assetStatusBadgeClass(asset.status)}`}
                    >
                      {asset.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Value</label>
                  <p className="text-gray-900 dark:text-white">₹{Number(asset.value || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg ring-1 ring-gray-100 dark:ring-slate-600/60">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Location & Department
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Department</label>
                  <p className="text-gray-900 dark:text-white">{asset.department}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Location</label>
                  <p className="text-gray-900 dark:text-white">{asset.location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">GeM Contract Number</label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm">
                    {asset.gem_contract_number || asset.gemContractNumber || 'N/A'}
                  </p>
                </div>
                {asset.lastMovement && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Movement</label>
                    <p className="text-gray-900 dark:text-white">{asset.lastMovement}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg mb-8 ring-1 ring-gray-100 dark:ring-slate-600/60">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Procurement Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Supplier</label>
                <p className="text-gray-900 dark:text-white">{asset.supplier}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Purchase Date</label>
                <p className="text-gray-900 dark:text-white">{purchaseDate ? purchaseDate.toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">GeM Order ID</label>
                <p className="text-gray-900 dark:text-white font-mono text-sm">{gemOrderDisplay}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Batch</label>
                <p className="text-gray-900 dark:text-white">{batchNo || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivered Date</label>
                <p className="text-gray-900 dark:text-white">{formatDateLabel(deliveredAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Deployed Date</label>
                <p className="text-gray-900 dark:text-white">{formatDateLabel(deployedAt)}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Verified Date</label>
                <p className="text-gray-900 dark:text-white">{formatDateLabel(verifiedAt)}</p>
                {verificationLocationLine ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{verificationLocationLine}</p>
                ) : null}
              </div>
              {asset.expectedDeliveryDate && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Expected Delivery</label>
                  <p className="text-gray-900 dark:text-white">{new Date(asset.expectedDeliveryDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            {asset.procurementNotes && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Procurement Notes</label>
                <p className="text-gray-900 dark:text-white mt-1">{asset.procurementNotes}</p>
              </div>
            )}
          </div>

          {showCustodian && (
            <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg mb-8 ring-1 ring-gray-100 dark:ring-slate-600/60">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Custodian Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {batchNo ? (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Batch</label>
                    <p className="text-gray-900 dark:text-white">{batchNo}</p>
                  </div>
                ) : null}
                {custodianName ? (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Custodian / Inventory Manager</label>
                    <p className="text-gray-900 dark:text-white">{custodianName}</p>
                  </div>
                ) : null}
                {custodianPhone ? (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contact Number</label>
                    <p className="text-gray-900 dark:text-white">{custodianPhone}</p>
                  </div>
                ) : null}
                {custodianEmail ? (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                    <p className="text-gray-900 dark:text-white">{custodianEmail}</p>
                  </div>
                ) : null}
                {batchLocation ? (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Location</label>
                    <p className="text-gray-900 dark:text-white">{batchLocation}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg ring-1 ring-gray-100 dark:ring-slate-600/60">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Warranty Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Warranty Expiry</label>
                  <p className="text-gray-900 dark:text-white">
                    {warrantyDate ? warrantyDate.toLocaleDateString() : 'N/A'}
                    {!asset.warrantyExpiry && warrantyDate && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(from order warranty)</span>
                    )}
                  </p>
                </div>
                {warrantyDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Remaining</label>
                    <div className="flex items-center gap-2">
                      {warrantyDaysLeft > 30 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : warrantyDaysLeft > 0 ? (
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span
                        className={
                          warrantyDaysLeft > 30
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : warrantyDaysLeft > 0
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-700 dark:text-rose-400'
                        }
                      >
                        {warrantyDaysLeft > 0 ? `${warrantyDaysLeft} days` : 'Expired'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg ring-1 ring-gray-100 dark:ring-slate-600/60">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                AMC Information
              </h3>
              {asset.amcExpiry ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">AMC Expiry</label>
                    <p className="text-gray-900 dark:text-white">{amcDate ? amcDate.toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Remaining</label>
                    <div className="flex items-center gap-2">
                      {amcDaysLeft > 30 ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : amcDaysLeft > 0 ? (
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span
                        className={
                          amcDaysLeft > 30 ? 'text-emerald-700 dark:text-emerald-400' : amcDaysLeft > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'
                        }
                      >
                        {amcDaysLeft > 0 ? `${amcDaysLeft} days` : 'Expired'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-sm font-medium">No AMC</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This asset does not have AMC coverage</p>
                </div>
              )}
            </div>
          </div>

          {asset.expectedDeliveryDate && (
            <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg mb-8 ring-1 ring-gray-100 dark:ring-slate-600/60">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Delivery Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Expected Delivery</label>
                  <p className="text-gray-900 dark:text-white">{new Date(asset.expectedDeliveryDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Actual Delivery</label>
                  <p className="text-gray-900 dark:text-white">
                    {asset.actualDeliveryDate ? new Date(asset.actualDeliveryDate).toLocaleDateString() : 'Pending'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivery Status</label>
                  <p className="text-gray-900 dark:text-white">{asset.deliveryStatus || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {(asset.buyerName || asset.endUserName) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {asset.buyerName && (
                <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg ring-1 ring-gray-100 dark:ring-slate-600/60">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Buyer Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Buyer Name</label>
                      <p className="text-gray-900 dark:text-white">{asset.buyerName}</p>
                    </div>
                    {asset.buyerDepartment && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Buyer Department</label>
                        <p className="text-gray-900 dark:text-white">{asset.buyerDepartment}</p>
                      </div>
                    )}
                    {asset.allocationDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Allocation Date</label>
                        <p className="text-gray-900 dark:text-white">{new Date(asset.allocationDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {asset.endUserName && (
                <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-lg ring-1 ring-gray-100 dark:ring-slate-600/60">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    End User Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">End User Name</label>
                      <p className="text-gray-900 dark:text-white">{asset.endUserName}</p>
                    </div>
                    {asset.endUserDesignation && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Designation</label>
                        <p className="text-gray-900 dark:text-white">{asset.endUserDesignation}</p>
                      </div>
                    )}
                    {asset.endUserEmail && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                        <p className="text-gray-900 dark:text-white">{asset.endUserEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetDetailsModal;