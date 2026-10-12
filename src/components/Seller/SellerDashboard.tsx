/**
 * SellerDashboard — modernized with shared UI system.
 * Uses PageHeader, StatCard, SectionCard, DataTable, Modal for consistent layout.
 * Replaces duplicate formatIndianCurrency with formatIndianShort.
 * Preserves all business logic: order normalization, mapSellerOrderToPO, OTP flow,
 * delivery management, asset creation, view-mode / URL sync.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  Clock,
  IndianRupee,
  Plus,
  Upload,
  Eye,
  Activity,
  CheckCircle,
  Package,
  FileText,
  Store,
  QrCode,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { ApiService } from '../../services/apiService';
import AddOrderForm from './AddOrderForm';
import DeliveryProofForm from './DeliveryProofForm';
import { Asset } from '../../types';
import {
  getDeliveryManagementOrderStatus,
  getPublicOrderStatus,
} from '../../utils/orderWorkflow';
import AssetDetails from '../Assets/AssetDetails';
import AssetForm from '../Assets/AssetForm';
import QrPdfDownloadModal from './QrPdfDownloadModal';
import { PageHeader } from '../ui/PageHeader';
import { StatCard, SectionCard } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StatusBadge, Badge } from '../ui/Badge';
import { DataTable } from '../ui/DataTable';
import { StatCardSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { formatIndianShort } from '../../utils/currency';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

type ViewMode = 'overview' | 'orders' | 'delivery' | 'reports' | 'profile';

/* ── Pure helpers (outside component to avoid re-creation) ─────────────── */

function getViewModeFromPath(path: string): ViewMode {
  if (path === '/seller/orders') return 'orders';
  if (path === '/seller/delivery') return 'delivery';
  if (path === '/seller/reports') return 'reports';
  if (path === '/seller/profile') return 'profile';
  return 'overview';
}

/** Normalize raw seller order (handles snake_case ↔ camelCase). */
function normalizeSellerOrder(so: any) {
  const items = Array.isArray(so.items)
    ? so.items.filter(Boolean).map((it: any) => ({
      id: it.id,
      productName: it.productName ?? it.product_name,
      brand: it.brand,
      modelNumber: it.modelNumber ?? it.model_number,
      categoryType: it.categoryType ?? it.category_type,
      quantity: it.quantity,
      unitPrice: it.unitPrice ?? it.unit_price ?? 0,
      gst: it.gst ?? it.gst_amount ?? 0,
      totalPrice: it.totalPrice ?? it.total_price ?? 0,
      gstin: it.gstin,
      warrantyPeriod: it.warrantyPeriod ?? it.warranty_period ?? 0,
      amcResponsibility: it.amcResponsibility ?? it.amc_responsibility ?? 'OEM',
      installationRequired: Boolean(it.installationRequired ?? it.installation_required),
    }))
    : [];

  return {
    id: so.id,
    sellerId: so.sellerId ?? so.seller_id,
    buyerId: so.buyerId ?? so.buyer_id,
    isMappedToBuyer: so.isMappedToBuyer ?? so.is_mapped_to_buyer,
    gemContractNumber: so.gemContractNumber ?? so.gem_contract_number,
    gemOrderCategory: so.gemOrderCategory ?? so.gem_order_category,
    gemBuyerDepartmentName: so.gemBuyerDepartmentName ?? so.gem_buyer_department_name,
    buyerContact: so.buyerContact ?? so.buyer_contact,
    projectManager: so.projectManager ?? so.project_manager ?? so.deliveryPerson ?? so.delivery_person,
    deliveryPerson: so.projectManager ?? so.project_manager ?? so.deliveryPerson ?? so.delivery_person,
    expectedDeliveryWindow: so.expectedDeliveryWindow ?? so.expected_delivery_window,
    items,
    oemAuthorizationLetter: so.oemAuthorizationLetter ?? so.oem_authorization_letter,
    gemOrderFile: so.gemOrderFile ?? so.gem_order_file,
    workOrderFile: so.workOrderFile ?? so.work_order_file,
    purchaseOrderFile: so.purchaseOrderFile ?? so.purchase_order_file,
    deliveryInformation: so.deliveryInformation ?? so.delivery_information,
    createdAt: so.createdAt ?? so.created_at,
    updatedAt: so.updatedAt ?? so.updated_at ?? (so.createdAt ?? so.created_at),
    status: so.status || 'Pending Approval',
    approvedBy: so.approvedBy ?? so.approved_by,
    approvedAt: so.approvedAt ?? so.approved_at,
    rejectionReason: so.rejectionReason ?? so.rejection_reason,
    notes: so.notes,
  };
}

/** Map a seller order to a PurchaseOrder-like shape for DeliveryProofForm. */
function mapSellerOrderToPO(so: any): any {
  const anySo: any = so || {};
  const gemContractNumber = anySo.gemContractNumber ?? anySo.gem_contract_number;
  const gemOrderCategory = anySo.gemOrderCategory ?? anySo.gem_order_category;
  const gemBuyerDepartmentName = anySo.gemBuyerDepartmentName ?? anySo.gem_buyer_department_name;
  const buyerContact = anySo.buyerContact ?? anySo.buyer_contact;
  const expectedDeliveryWindow = anySo.expectedDeliveryWindow ?? anySo.expected_delivery_window;
  const createdAt = anySo.createdAt ?? anySo.created_at ?? new Date().toISOString();
  const updatedAt = anySo.updatedAt ?? anySo.updated_at ?? createdAt;
  const totalAmount = anySo.totalAmount ?? anySo.total_amount ?? 0;
  const sellerName = anySo.sellerName ?? anySo.seller_name ?? 'Seller';

  return {
    id: `SO-${anySo.id}`,
    sellerOrderId: anySo.id,
    buyerId: anySo.buyerId ?? anySo.buyer_id,
    poNumber: gemContractNumber || `SO-${anySo.id}`,
    title: gemOrderCategory || 'Seller Order',
    description: anySo.notes || '',
    department: gemBuyerDepartmentName || '-',
    requestedBy: buyerContact?.officerName || sellerName || 'Seller',
    requestedDate: createdAt,
    supplier: sellerName,
    supplierContact: buyerContact?.email || '',
    totalAmount,
    currency: 'INR',
    status: anySo.status || 'Pending Approval',
    approvedBy: anySo.approvedBy ?? anySo.approved_by,
    approved_by: anySo.approved_by ?? anySo.approvedBy,
    expectedDeliveryDate: expectedDeliveryWindow?.endDate || expectedDeliveryWindow?.startDate || '',
    items: (anySo.items || []).filter(Boolean).map((it: any, idx: number) => ({
      id: `${anySo.id}-${idx + 1}`,
      assetName: it.productName ?? '',
      description: `${it.brand || ''} ${it.modelNumber || ''}`.trim(),
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice ?? it.unit_price ?? 0),
      totalPrice: Number(it.totalPrice ?? it.total_price ?? 0),
      specifications: it.categoryType ?? it.category_type,
      category: it.categoryType ?? it.category_type ?? 'General',
      deliveryStatus: 'Not Started',
    })),
    createdAt,
    updatedAt,
    oemAuthorizationLetter: anySo.oemAuthorizationLetter,
    gemOrderFile: anySo.gemOrderFile,
    workOrderFile: anySo.workOrderFile,
    purchaseOrderFile: anySo.purchaseOrderFile,
    gemContractNumber,
    gemBuyerDepartmentName,
    gemOrderCategory,
    buyerContact,
    projectManager: anySo.projectManager,
    deliveryPerson: anySo.deliveryPerson,
    expectedDeliveryWindow,
    approvedAt: anySo.approvedAt,
    rejectionReason: anySo.rejectionReason,
    notes: anySo.notes,
    attachments: anySo.attachments,
  };
}

function generateAssetUID(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const dayOfYear = Math.floor(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000
  );
  const ddd = String(dayOfYear).padStart(3, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const base = `${yy}${ddd}${HH}${mm}${ss}`.slice(0, 11);
  const rand = Math.floor(Math.random() * 10);
  return `${base}${rand}`;
}

/* ── Delivery helpers ──────────────────────────────────────────────────── */
const getDeliveryInfo = (o: any) => o?.deliveryInformation || o?.delivery_information || null;
const isBuyerConfirmed = (o: any) => Boolean(getDeliveryInfo(o)?.buyerConfirmed);
const hasDeliveryInfo = (o: any) => Array.isArray(getDeliveryInfo(o)?.batches) && getDeliveryInfo(o).batches.length > 0;
const allBatchesDelivered = (o: any) => {
  const batches = Array.isArray(getDeliveryInfo(o)?.batches) ? getDeliveryInfo(o).batches : [];
  return batches.length > 0 && batches.every((b: any) => b?.status === 'Delivered');
};
const getDeliveryDisplayStatus = (o: any) => getDeliveryManagementOrderStatus(o);
const getOrderTotal = (o: any): number => {
  const explicit = Number(o.totalAmount ?? o.total_amount ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return (o.items || []).reduce((sum: number, it: any) => {
    const p = Number(it.totalPrice ?? it.total_price ?? 0);
    return sum + (Number.isFinite(p) ? p : 0);
  }, 0);
};

/* ── Main component ────────────────────────────────────────────────────── */
const SellerDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  /* --- data --- */
  const [sellerOrders, setSellerOrders] = useState<any[]>([]);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* --- modals --- */
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showBatchOtpModal, setShowBatchOtpModal] = useState(false);
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showAssetDetails, setShowAssetDetails] = useState(false);
  const [qrModalOrderId, setQrModalOrderId] = useState<string | number | null>(null);
  const [qrModalGem, setQrModalGem] = useState<string>('');

  /* --- selections --- */
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<any>(null);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [batchOtpInputs, setBatchOtpInputs] = useState<Record<number, string>>({});

  /* --- toast-style notifications --- */
  const [notifications, setNotifications] = useState<Notification[]>([]);

  /* ── URL sync ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    setViewMode(getViewModeFromPath(location.pathname));
  }, [location.pathname]);

  /* ── Data loading ─────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      setDataError(null);
      const [ordersRaw, profileRaw] = await Promise.all([
        ApiService.getAllSellerOrders(),
        ApiService.getCurrentSellerProfile(),
      ]);
      setSellerOrders(
        (Array.isArray(ordersRaw) ? ordersRaw : []).map(normalizeSellerOrder)
      );
      setSellerProfile(profileRaw || null);
    } catch (err) {
      setDataError(ApiService.handleError(err));
      console.error('Failed to load seller data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Notifications ────────────────────────────────────────────────────── */
  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleAddOrderSubmit = async (orderData: any) => {
    setLoading(true);
    try {
      const result: any = await ApiService.createSellerOrder({
        ...orderData,
        status: orderData.status || 'Pending Approval',
      });
      if (result?.success) {
        setShowAddOrderForm(false);
        addNotification('success', `Order ${orderData.gemContractNumber} submitted successfully! Pending approval from Super Admin.`);
        await loadData();
      } else {
        addNotification('error', result?.error || 'Failed to create order. Please try again.');
      }
    } catch (error) {
      addNotification('error', ApiService.handleError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverySubmit = async (deliveryData: any) => {
    setLoading(true);
    try {
      if (String(selectedPurchaseOrder?.id || '').startsWith('SO-')) {
        const rawId = String(selectedPurchaseOrder.id).slice(3);
        const result: any = await ApiService.updateSellerDeliveryInformation(rawId, {
          batches: deliveryData.batches || [],
          notes: deliveryData.notes || '',
        });
        if (result?.success) {
          const proof = deliveryData.proofFiles || {};
          const hasProof =
            proof.deliveryReceipt || proof.invoice || proof.warrantyCard ||
            (Array.isArray(proof.photos) && proof.photos.length > 0);
          if (hasProof) {
            try {
              await ApiService.uploadSellerDeliveryProof(rawId, {
                deliveryDate: new Date().toISOString().split('T')[0],
                purchaseOrderNumber: selectedPurchaseOrder.poNumber,
                otpVerified: false,
                notes: deliveryData.notes || '',
                deliveryReceipt: proof.deliveryReceipt,
                invoice: proof.invoice,
                warrantyCard: proof.warrantyCard,
                photos: proof.photos,
              });
            } catch (proofErr) {
              addNotification('error', `Delivery info saved, but proof upload failed: ${ApiService.handleError(proofErr)}`);
              setSellerOrders(prev =>
                prev.map(o => String(o.id) === rawId
                  ? { ...o, status: 'In Progress', updatedAt: new Date().toISOString() }
                  : o
                )
              );
              setShowDeliveryForm(false);
              setSelectedPurchaseOrder(null);
              await loadData();
              return;
            }
          }
          setSellerOrders(prev =>
            prev.map(o => String(o.id) === rawId
              ? { ...o, status: 'In Progress', updatedAt: new Date().toISOString() }
              : o
            )
          );
          addNotification('success', '✅ Delivery information saved. Order is now In Progress — complete batch OTP verification to mark Delivered.');
        } else if (Array.isArray(result?.details) && result.details.length > 0) {
          const msgs = result.details
            .map((e: any) => `${e.productName}: ordered ${e.ordered}, entered ${e.delivered}`)
            .join('; ');
          addNotification('error', `❌ Quantity validation failed: ${msgs}`);
          return;
        } else {
          addNotification('error', result?.error || 'Failed to update delivery information');
          return;
        }
      } else {
        await ApiService.updatePurchaseOrder(selectedPurchaseOrder.id, {
          deliveryStatus: 'Delivered',
          actualDeliveryDate: new Date().toISOString(),
          deliveryNotes: deliveryData.notes || '',
          updatedAt: new Date().toISOString(),
        });
      }
      setShowDeliveryForm(false);
      setSelectedPurchaseOrder(null);
      await loadData();
    } catch (error) {
      addNotification('error', ApiService.handleError(error) || 'Failed to update delivery information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBatchOtp = async (orderId: string, batchIndex: number) => {
    try {
      const result: any = await ApiService.sendSellerBatchOtp(orderId, batchIndex);
      if (result?.success) {
        const channels = (Array.isArray(result?.deliveries) ? result.deliveries : [])
          .filter((d: any) => d?.success).map((d: any) => d.channel).join(' + ');
        addNotification('success', channels
          ? `OTP sent to custodian via ${channels} for batch ${batchIndex + 1}`
          : `OTP sent for batch ${batchIndex + 1}`
        );
      } else {
        addNotification('error', result?.error || 'Failed to send OTP');
      }
    } catch {
      addNotification('error', 'Failed to send OTP');
    }
  };

  const handleVerifyBatchOtp = async (orderId: string, batchIndex: number) => {
    const otp = (batchOtpInputs[batchIndex] || '').trim();
    if (!otp) { addNotification('error', `Enter OTP for batch ${batchIndex + 1}`); return; }
    try {
      const result: any = await ApiService.verifySellerBatchOtp(orderId, batchIndex, otp);
      if (result?.success) {
        const applyBatchUpdate = (prev: any) => {
          if (!prev) return prev;
          const info = getDeliveryInfo(prev) || {};
          const batches = Array.isArray(info?.batches) ? [...info.batches] : [];
          if (batches[batchIndex]) {
            batches[batchIndex] = { ...batches[batchIndex], status: 'Delivered', otpVerified: true, deliveredAt: new Date().toISOString() };
          }
          const allDone = batches.length > 0 && batches.every((b: any) => b?.status === 'Delivered');
          const updatedInfo = { ...info, batches, updatedAt: new Date().toISOString() };
          return { ...prev, status: allDone ? 'Delivered' : 'In Progress', deliveryInformation: updatedInfo, delivery_information: updatedInfo };
        };
        setSelectedDeliveryOrder(applyBatchUpdate);
        setSellerOrders(prev =>
          prev.map((o: any) => String(o.id) === String(orderId) ? applyBatchUpdate(o) : o)
        );
        addNotification('success', `Batch ${batchIndex + 1} marked as delivered`);
        if (result?.order) {
          setSelectedDeliveryOrder((prev: any) => prev ? { ...prev, ...result.order } : result.order);
        }
        await loadData();
        if (result?.allCompleted) {
          addNotification('success', 'All batches completed. Order marked as Completed.');
        }
      } else {
        addNotification('error', result?.error || 'Failed to verify OTP');
      }
    } catch {
      addNotification('error', 'Failed to verify OTP');
    }
  };

  const handleAssetCreateSubmit = async (assetData: Asset) => {
    setLoading(true);
    try {
      const normalize = (v: any) => String(v || '').trim().toLowerCase();
      const providedGem = normalize((assetData as any).gem_contract_number || (assetData as any).gemContractNumber);
      if (!providedGem) {
        addNotification('error', 'GeM Contract Number is required to add an asset');
        return;
      }
      const allowedSet = new Set(
        (sellerOrders || [])
          .filter((o: any) => ['Pending', 'Approved', 'In Progress', 'Delivered', 'Completed'].includes(String(o.status)))
          .map((o: any) => normalize(o.gemContractNumber || o.gem_contract_number))
          .filter(Boolean)
      );
      if (allowedSet.size > 0 && !allowedSet.has(providedGem)) {
        addNotification('error', 'GeM Contract Number must match one of your approved orders');
        return;
      }
      const payload: any = { ...assetData };
      if (!payload.asset_uid) payload.asset_uid = generateAssetUID();
      if (!payload.gem_contract_number && payload.gemContractNumber) {
        payload.gem_contract_number = payload.gemContractNumber;
        delete payload.gemContractNumber;
      }
      payload.gem_contract_number = String(payload.gem_contract_number || '').trim();
      const created: any = await ApiService.createAsset(payload);
      if (created && (created.id || created.asset_uid)) {
        addNotification('success', 'Asset added successfully');
        setShowAssetForm(false);
        await loadData();
      } else {
        addNotification('error', 'Failed to add asset. Please try again.');
      }
    } catch (error) {
      addNotification('error', ApiService.handleError(error));
    } finally {
      setLoading(false);
    }
  };

  const openDeliveryForm = (po: any) => { setSelectedPurchaseOrder(po); setShowDeliveryForm(true); };
  const openOrderDetails = (order: any) => { setSelectedPurchaseOrder(order); setShowOrderDetailsModal(true); };
  const openCompleteOrderModal = (order: any) => {
    setSelectedDeliveryOrder(order);
    setBatchOtpInputs({});
    setShowBatchOtpModal(true);
  };

  /* ── Derived stats ────────────────────────────────────────────────────── */
  const sellerStats = {
    totalOrders: sellerOrders.length,
    activeOrders: sellerOrders.filter(o => !['Completed', 'Rejected', 'Cancelled'].includes(String(o.status))).length,
    completedOrders: sellerOrders.filter(o => o.status === 'Completed').length,
    totalRevenue: sellerOrders
      .filter(o => o.status === 'Completed')
      .reduce((sum, o) => sum + getOrderTotal(o), 0),
  };
  const completionRate = sellerStats.totalOrders > 0
    ? Math.round((sellerStats.completedOrders / sellerStats.totalOrders) * 100)
    : 0;

  /* ── Table column defs ────────────────────────────────────────────────── */
  const ordersColumns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'gemContractNumber',
      header: 'GEM Contract No.',
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900 dark:text-white">{getValue() || '-'}</span>
      ),
    },
    {
      accessorKey: 'gemBuyerDepartmentName',
      header: 'Department',
      cell: ({ getValue }) => <span className="text-gray-600 dark:text-gray-300">{getValue() || '-'}</span>,
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const count = row.original.items?.length || 0;
        return <span className="text-gray-700 dark:text-gray-300">{count} item{count !== 1 ? 's' : ''}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const o = row.original;
        const publicStatus = getPublicOrderStatus(o);
        const label =
          o.status === 'Pending Approval' ? 'Awaiting approval' :
            publicStatus === 'Completed' && !isBuyerConfirmed(o) ? 'Buyer confirmation pending' :
              publicStatus;
        return <StatusBadge status={label} size="sm" />;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => (
        <span className="text-gray-500 dark:text-gray-400">{new Date(getValue()).toLocaleDateString()}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="xs" iconLeft={<Eye className="w-4 h-4" />}
          onClick={() => openOrderDetails(row.original)}>
          View
        </Button>
      ),
    },
  ];

  const deliveryColumns: ColumnDef<any, any>[] = [
    {
      accessorKey: 'gemContractNumber',
      header: 'GEM Contract No.',
      cell: ({ getValue }) => <span className="font-medium text-gray-900 dark:text-white">{getValue() ?? '-'}</span>,
    },
    {
      accessorKey: 'gemBuyerDepartmentName',
      header: 'Department',
      cell: ({ getValue }) => <span className="text-gray-600 dark:text-gray-300">{getValue() ?? '-'}</span>,
    },
    {
      id: 'items',
      header: 'Items',
      cell: ({ row }) => {
        const count = (row.original.items || []).length;
        return <span className="text-gray-700 dark:text-gray-300">{count} item{count !== 1 ? 's' : ''}</span>;
      },
    },
    {
      id: 'deliveryStatus',
      header: 'Delivery Status',
      cell: ({ row }) => <StatusBadge status={getDeliveryDisplayStatus(row.original)} size="sm" />,
    },
    {
      id: 'expectedDelivery',
      header: 'Expected Delivery',
      cell: ({ row }) => {
        const o = row.original;
        const date =
          (o.expectedDeliveryWindow?.endDate ?? o.expected_delivery_window?.endDate) ||
          (o.expectedDeliveryWindow?.startDate ?? o.expected_delivery_window?.startDate) || '-';
        return <span className="text-gray-500 dark:text-gray-400">{date}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const o = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs"
              iconLeft={<Upload className="w-4 h-4 text-success-600" />}
              onClick={() => openDeliveryForm(mapSellerOrderToPO(o))}
              title="Update Delivery Information"
            />
            {hasDeliveryInfo(o) && (
              <Button variant="ghost" size="xs"
                iconLeft={<CheckCircle className="w-4 h-4 text-primary-600" />}
                onClick={() => openCompleteOrderModal(o)}
                title="Complete Order (Batch OTP)"
              />
            )}
            {hasDeliveryInfo(o) && (
              <Button variant="ghost" size="xs"
                iconLeft={<QrCode className="w-4 h-4 text-info-600" />}
                onClick={() => {
                  setQrModalOrderId(o.id);
                  setQrModalGem(o.gemContractNumber ?? o.gem_contract_number ?? '');
                }}
                title="Download QR Codes"
              />
            )}
          </div>
        );
      },
    },
  ];

  /* Status summary rows for reports */
  const sellerOrderStatusRows = ['Pending Approval', 'Approved', 'In Progress', 'Delivered', 'Completed', 'Rejected']
    .map(status => ({
      status,
      count: sellerOrders.filter(o => String(o.status) === status).length,
      value: sellerOrders.filter(o => String(o.status) === status).reduce((s, o) => s + getOrderTotal(o), 0),
    }))
    .filter(r => r.count > 0);

  const deliveryReportRows = sellerOrders
    .filter(o => ['Approved', 'In Progress', 'Pending', 'Delivered', 'Completed'].includes(String(o.status)))
    .map(o => ({
      id: String(o.id),
      contract: String(o.gemContractNumber ?? o.gem_contract_number ?? '-'),
      buyer: String(o.gemBuyerDepartmentName ?? o.gem_buyer_department_name ?? '-'),
      status: getDeliveryDisplayStatus(o),
      batches: Array.isArray(getDeliveryInfo(o)?.batches) ? getDeliveryInfo(o).batches.length : 0,
      readyForOtp: hasDeliveryInfo(o) && !allBatchesDelivered(o),
      buyerConfirmed: isBuyerConfirmed(o),
    }));

  const statusSummaryColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'count', header: 'Orders', cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span> },
    { accessorKey: 'value', header: 'Value', cell: ({ getValue }) => formatIndianShort(getValue()) },
  ];

  const deliveryPipelineColumns: ColumnDef<any, any>[] = [
    { accessorKey: 'contract', header: 'GeM Contract' },
    { accessorKey: 'buyer', header: 'Buyer Department' },
    { accessorKey: 'status', header: 'Delivery Status', cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" /> },
    { accessorKey: 'batches', header: 'Batches', cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span> },
    {
      id: 'workflow',
      header: 'Workflow',
      cell: ({ row }) => {
        const r = row.original;
        if (r.buyerConfirmed) return <Badge variant="success" size="sm">Buyer confirmed</Badge>;
        if (r.readyForOtp) return <Badge variant="info" size="sm">Ready for OTP</Badge>;
        return <Badge variant="default" size="sm">Awaiting delivery info</Badge>;
      },
    },
  ];

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={[
              'flex items-center gap-3 p-4 rounded-card shadow-modal max-w-sm pointer-events-auto text-white text-sm',
              n.type === 'success' ? 'bg-success-600' :
                n.type === 'error' ? 'bg-danger-600' : 'bg-info-600',
            ].join(' ')}
          >
            <span className="flex-1">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Page Header */}
      <PageHeader
        // title={viewMode === 'overview' ? 'Your Dashboard' : 'Order Details'}
        title={
          viewMode === 'overview'
            ? 'Your Dashboard'
            : viewMode === 'reports'
              ? 'Reports'
              : 'Order Details'
        }
        subtitle={`Welcome back, ${user?.name} · ${user?.department}`}
        icon={<Store className="w-5 h-5 text-success-600" />}
        actions={
          viewMode !== 'reports' ? (
            <Button
              variant="success"
              size="sm"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddOrderForm(true)}
            >
              Add New Order
            </Button>
          ) : undefined
        }
      />

      {/* Error banner */}
      {dataError && (
        <div className="p-4 bg-danger-100 border border-danger-600/20 rounded-card text-danger-600 text-sm flex items-center justify-between">
          <span>{dataError}</span>
          <button onClick={loadData} className="ml-2 underline text-xs hover:no-underline">Retry</button>
        </div>
      )}

      {/* ── OVERVIEW VIEW ─────────────────────────────────────────────── */}
      {viewMode === 'overview' && (
        <>
          {/* Stat cards */}
          {dataLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Orders"
                value={sellerStats.totalOrders}
                icon={<ShoppingCart className="w-5 h-5 text-primary-600" />}
                iconBg="bg-primary-100"
              />
              <StatCard
                title="Active Orders"
                value={sellerStats.activeOrders}
                icon={<Clock className="w-5 h-5 text-warning-600" />}
                iconBg="bg-warning-100"
              />
              <StatCard
                title="Completed Orders"
                value={sellerStats.completedOrders}
                icon={<CheckCircle className="w-5 h-5 text-success-600" />}
                iconBg="bg-success-100"
                trend={{ value: completionRate, direction: 'up', label: 'completion rate' }}
              />
              <StatCard
                title="Total Revenue"
                value={formatIndianShort(sellerStats.totalRevenue)}
                icon={<IndianRupee className="w-5 h-5 text-info-600" />}
                iconBg="bg-info-100"
              />
            </div>
          )}

          {/* Quick Actions - Buttons in a row, no box */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
            {/* <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Common seller tasks</p> */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Upload className="w-4 h-4 text-success-600" />}
                onClick={() => {
                  const so = sellerOrders.find(o =>
                    ['Approved', 'In Progress', 'Pending'].includes(String(o.status))
                  );

                  if (so) {
                    openDeliveryForm(mapSellerOrderToPO(so));
                  } else {
                    addNotification('info', 'No approved orders available for delivery update.');
                  }
                }}
                className="
    !border
    !border-success-600
    !bg-transparent
    !text-success-700
    hover:!bg-success-50
    hover:!border-success-700
    dark:!border-success-500
    dark:!text-success-400
    dark:hover:!bg-success-900/20
  "
                title="Update Delivery Information"
              >
                Upload Delivery
              </Button>
            </div>
          </div>

          {/* Recent Orders */}
          <SectionCard title="Recent Orders" subtitle="Latest activity">
            {sellerOrders.length === 0 ? (
              <EmptyState
                icon={<Package className="w-8 h-8 text-gray-300" />}
                title="No orders yet"
                action={{ label: 'Add Order', onClick: () => setShowAddOrderForm(true), icon: <Plus className="w-4 h-4" /> }}
              />
            ) : (
              <div className="space-y-3">
                {sellerOrders.slice(0, 3).map(so => (
                  <div key={so.id} className="flex items-center justify-between p-3 bg-surface-subtle dark:bg-slate-700 rounded-card">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-300 text-sm">{so.gemContractNumber || '-'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{so.gemOrderCategory || '-'}</p>
                    </div>
                    <StatusBadge status={getPublicOrderStatus(so)} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Recent Activity */}
          <SectionCard title="Recent Activity" subtitle="Last 5 orders">
            {sellerOrders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No activity yet.</p>
            ) : (
              <div className="space-y-3">
                {sellerOrders.slice(0, 5).map(so => (
                  <div key={so.id} className="flex items-center justify-between p-4 bg-surface-subtle dark:bg-slate-700 rounded-card">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-card">
                        <Package className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-300 text-sm">{so.gemContractNumber || '-'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{so.gemOrderCategory || '-'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Updated {new Date(so.updatedAt || so.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={getPublicOrderStatus(so)} size="sm" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-300 mt-1">{formatIndianShort(getOrderTotal(so))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* ── ORDERS VIEW ───────────────────────────────────────────────── */}
      {viewMode === 'orders' && (
        <SectionCard
          title="My Orders"
          subtitle="All GeM contracts submitted by you"
          actions={
            <Button variant="primary" size="sm" iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddOrderForm(true)}>
              Add New Order
            </Button>
          }
        >
          {dataLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : sellerOrders.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="w-10 h-10 text-gray-300" />}
              title="No orders yet"
              action={{ label: 'Add First Order', onClick: () => setShowAddOrderForm(true), icon: <Plus className="w-4 h-4" /> }}
            />
          ) : (
            <DataTable data={sellerOrders} columns={ordersColumns} />
          )}
        </SectionCard>
      )}

      {/* ── DELIVERY VIEW ─────────────────────────────────────────────── */}
      {viewMode === 'delivery' && (
        <SectionCard
          title="Delivery Management"
          subtitle="Manage batch deliveries and OTP verification"
          actions={
            <Button variant="success" size="sm" iconLeft={<Upload className="h-4 w-4" />}
              onClick={() => {
                const so = sellerOrders.find(o =>
                  ['Approved', 'In Progress', 'Pending'].includes(String(o.status))
                );
                if (so) openDeliveryForm(mapSellerOrderToPO(so));
                else addNotification('info', 'No approved orders available for delivery update.');
              }}>
              Update Delivery Information
            </Button>
          }
        >
          {dataLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-success-600" />
            </div>
          ) : (
            <DataTable
              data={sellerOrders.filter(o =>
                ['Approved', 'In Progress', 'Pending', 'Delivered', 'Completed'].includes(String(o.status))
              )}
              columns={deliveryColumns}
            />
          )}
        </SectionCard>
      )}

      {/* QR Modal — always mounted so it can animate out */}
      <QrPdfDownloadModal
        open={qrModalOrderId !== null}
        onClose={() => { setQrModalOrderId(null); setQrModalGem(''); }}
        orderId={qrModalOrderId}
        gemContractNumber={qrModalGem}
      />

      {/* ── REPORTS VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Orders" value={sellerStats.totalOrders} icon={<ShoppingCart className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-100" />
            <StatCard title="Active Orders" value={sellerStats.activeOrders} icon={<Activity className="w-5 h-5 text-warning-600" />} iconBg="bg-warning-100" />
            <StatCard title="Completed Orders" value={sellerStats.completedOrders} icon={<CheckCircle className="w-5 h-5 text-success-600" />} iconBg="bg-success-100" />
            <StatCard title="Completed Revenue" value={formatIndianShort(sellerStats.totalRevenue)} icon={<IndianRupee className="w-5 h-5 text-info-600" />} iconBg="bg-info-100" />
          </div>

          <SectionCard title="Order Status Summary" subtitle="Breakdown by order status">
            {sellerOrderStatusRows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No orders available.</p>
            ) : (
              <DataTable data={sellerOrderStatusRows} columns={statusSummaryColumns} />
            )}
          </SectionCard>

          <SectionCard title="Delivery Pipeline" subtitle="Orders in active delivery workflow">
            {deliveryReportRows.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No delivery records available.</p>
            ) : (
              <DataTable data={deliveryReportRows} columns={deliveryPipelineColumns} />
            )}
          </SectionCard>
        </div>
      )}

      {/* ── PROFILE VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'profile' && (
        <SectionCard title="Seller Profile" subtitle="Read-only profile information from seller registration.">
          <div className="space-y-8">
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-gray-700 dark:text-gray-400">Company Name:</span> <span className="text-gray-900 dark:text-gray-200">{sellerProfile?.company_name || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-400">GeM Seller ID:</span> <span className="text-gray-900 dark:text-gray-200">{sellerProfile?.gem_seller_id || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-400">GSTIN:</span> <span className="text-gray-900 dark:text-gray-200">{sellerProfile?.gstin || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-400">MSME Registration No:</span> <span className="text-gray-900 dark:text-gray-200">{sellerProfile?.msme_registration_no || '-'}</span></div>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Email &amp; Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-gray-700 dark:text-gray-400">Email ID:</span> <span className="text-gray-900 dark:text-gray-200">{sellerProfile?.email_id || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-400">Password:</span> <span className="text-gray-900 dark:text-gray-200">********</span></div>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                {[
                  { title: 'AMC Contact', name: sellerProfile?.amc_contact_name, mobile: sellerProfile?.amc_contact_mobile, email: sellerProfile?.amc_contact_email },
                  { title: 'Execution Contact', name: sellerProfile?.execution_contact_name || sellerProfile?.contact_person_name, mobile: sellerProfile?.execution_contact_mobile || sellerProfile?.mobile_number, email: sellerProfile?.execution_contact_email || sellerProfile?.email_id },
                  { title: 'Accounts Contact', name: sellerProfile?.accounts_contact_name, mobile: sellerProfile?.accounts_contact_mobile, email: sellerProfile?.accounts_contact_email },
                  { title: 'Director Contact', name: sellerProfile?.director_contact_name, mobile: sellerProfile?.director_contact_mobile, email: sellerProfile?.director_contact_email },
                ].map(c => (
                  <div key={c.title} className="border border-surface-border dark:border-slate-700 dark:bg-slate-700/40 rounded-card p-4 space-y-1">
                    <h4 className="font-semibold text-gray-800 dark:text-white text-sm mb-2">{c.title}</h4>
                    <p><span className="font-medium text-gray-700 dark:text-gray-400">Full Name:</span> <span className="text-gray-900 dark:text-gray-200">{c.name || '-'}</span></p>
                    <p><span className="font-medium text-gray-700 dark:text-gray-400">Mobile:</span> <span className="text-gray-900 dark:text-gray-200">{c.mobile || '-'}</span></p>
                    <p><span className="font-medium text-gray-700 dark:text-gray-400">Email:</span> <span className="text-gray-900 dark:text-gray-200">{c.email || '-'}</span></p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-gray-700 dark:text-gray-400">Social Category:</span> <span className="text-gray-900 dark:text-gray-200">{sellerProfile?.social_category || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-400">Nature of Business:</span> <span className="text-gray-900 dark:text-gray-200">{sellerProfile?.nature_of_business || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-400">Brands Dealt With:</span> <span className="text-gray-900 dark:text-gray-200">{Array.isArray(sellerProfile?.brands_dealt_with) ? sellerProfile.brands_dealt_with.join(', ') : '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-400">Product Categories:</span> <span className="text-gray-900 dark:text-gray-200">{Array.isArray(sellerProfile?.product_categories) ? sellerProfile.product_categories.join(', ') : '-'}</span></div>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Document Uploads</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'TAN Certificates', field: sellerProfile?.tan_certificate },
                  { label: 'Shop & Establishment / MCA Certificates', field: sellerProfile?.shop_est_or_mca_certificate },
                  { label: 'GST Certificate', field: sellerProfile?.gst_certificate },
                  { label: 'MSME Certificates', field: sellerProfile?.msme_certificate },
                ].map(d => (
                  <div key={d.label}>
                    <span className="font-medium text-gray-700 dark:text-gray-400">{d.label}:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-200">{Array.isArray(d.field) && d.field.length > 0 ? `${d.field.length} file(s) uploaded` : 'Not uploaded'}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </SectionCard>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────── */}

      {/* Add Order Form (self-contained modal) */}
      {showAddOrderForm && (
        <AddOrderForm
          onSubmit={handleAddOrderSubmit}
          onCancel={() => setShowAddOrderForm(false)}
          loading={loading}
        />
      )}

      {/* Delivery Proof Form (self-contained modal) */}
      {showDeliveryForm && selectedPurchaseOrder && (
        <DeliveryProofForm
          purchaseOrder={selectedPurchaseOrder}
          onSubmit={handleDeliverySubmit}
          onCancel={() => { setShowDeliveryForm(false); setSelectedPurchaseOrder(null); }}
          loading={loading}
        />
      )}

      {/* Batch OTP Modal */}
      <Modal
        isOpen={showBatchOtpModal && !!selectedDeliveryOrder}
        onClose={() => setShowBatchOtpModal(false)}
        title="Complete Order — Batch OTP Verification"
        size="lg"
      >
        <div className="space-y-4">
          {(getDeliveryInfo(selectedDeliveryOrder)?.batches || []).map((batch: any, idx: number) => (
            <div key={idx} className="border border-surface-border dark:border-slate-700 dark:bg-slate-700/50 rounded-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Batch {idx + 1}: {batch.batchNumber}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{batch.productName} | Qty: {batch.quantity}</p>
                </div>
                <StatusBadge status={batch.status || 'Pending'} size="sm" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" size="sm"
                  disabled={batch.status === 'Delivered'}
                  onClick={() => handleSendBatchOtp(String(selectedDeliveryOrder.id), idx)}>
                  Send OTP
                </Button>
                <input
                  type="text"
                  value={batchOtpInputs[idx] || ''}
                  onChange={e => setBatchOtpInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                  placeholder="Enter OTP"
                  disabled={batch.status === 'Delivered'}
                  className="px-3 py-2 border border-surface-border dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 rounded-card text-sm w-32 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button variant="success" size="sm"
                  disabled={batch.status === 'Delivered'}
                  onClick={() => handleVerifyBatchOtp(String(selectedDeliveryOrder.id), idx)}>
                  Verify OTP
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                OTP is sent to the custodian via email and SMS. Ask the custodian for the OTP at delivery, then enter it above to verify.
              </p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        isOpen={showOrderDetailsModal && !!selectedPurchaseOrder}
        onClose={() => { setShowOrderDetailsModal(false); setSelectedPurchaseOrder(null); }}
        title="Order Details"
        size="xl"
      >
        {selectedPurchaseOrder && (
          <div className="space-y-6">
            {/* ── Order Information ── */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Order Information</h3>
              <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                {selectedPurchaseOrder.gemContractNumber ? (
                  <dl className="divide-y divide-gray-200 dark:divide-slate-600">
                    <InfoRow label="Order ID" value={selectedPurchaseOrder.id} />
                    <InfoRow label="GeM Contract No." value={selectedPurchaseOrder.gemContractNumber} />
                    <InfoRow label="Category" value={selectedPurchaseOrder.gemOrderCategory} />
                    <InfoRow label="Department" value={selectedPurchaseOrder.gemBuyerDepartmentName} />
                    <InfoRow label="Buyer Contact" value={selectedPurchaseOrder.buyerContact?.officerName} />
                    <InfoRow label="Project Manager" value={(selectedPurchaseOrder.projectManager || selectedPurchaseOrder.deliveryPerson)?.officerName} />
                    <InfoRow label="Expected Delivery" value={`${selectedPurchaseOrder.expectedDeliveryWindow?.startDate ?? '-'} – ${selectedPurchaseOrder.expectedDeliveryWindow?.endDate ?? '-'}`} />
                    <InfoRow label="Created" value={new Date(selectedPurchaseOrder.createdAt).toLocaleDateString()} />
                    <div className="grid grid-cols-2 px-4 py-3">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                      <dd className="text-sm flex justify-end">
                        <StatusBadge status={getPublicOrderStatus(selectedPurchaseOrder)} size="sm" />
                      </dd>
                    </div>
                    {selectedPurchaseOrder.approvedBy && <InfoRow label="Approved By" value={selectedPurchaseOrder.approvedBy} />}
                    {selectedPurchaseOrder.approvedAt && <InfoRow label="Approved At" value={new Date(selectedPurchaseOrder.approvedAt).toLocaleDateString()} />}
                    {selectedPurchaseOrder.rejectionReason && (
                      <div className="grid grid-cols-2 px-4 py-3">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Rejection Reason</dt>
                        <dd className="text-sm font-medium text-danger-600 text-right">{selectedPurchaseOrder.rejectionReason}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <dl className="divide-y divide-gray-200 dark:divide-slate-600">
                    <InfoRow label="PO Number" value={selectedPurchaseOrder.poNumber} />
                    <InfoRow label="Title" value={selectedPurchaseOrder.title} />
                    <InfoRow label="Department" value={selectedPurchaseOrder.department} />
                    <InfoRow label="Requested By" value={selectedPurchaseOrder.requestedBy} />
                    <InfoRow label="Requested Date" value={selectedPurchaseOrder.requestedDate} />
                    <InfoRow label="Expected Delivery" value={selectedPurchaseOrder.expectedDeliveryDate} />
                    <div className="grid grid-cols-2 px-4 py-3">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                      <dd className="text-sm flex justify-end">
                        <StatusBadge status={getPublicOrderStatus(selectedPurchaseOrder)} size="sm" />
                      </dd>
                    </div>
                    <InfoRow label="Total Amount" value={formatIndianShort(selectedPurchaseOrder.totalAmount)} />
                  </dl>
                )}
              </div>
            </div>

            {/* ── Order Items ── */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Order Items ({(selectedPurchaseOrder.items || []).length})
              </h3>
              <div className="space-y-3">
                {(selectedPurchaseOrder.items || []).map((item: any, idx: number) => (
                  <div key={item.id ?? idx} className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    {/* Item header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-700/60 border-b border-gray-200 dark:border-slate-600">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {selectedPurchaseOrder.gemContractNumber ? item.productName : item.assetName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {selectedPurchaseOrder.gemContractNumber
                            ? [item.brand, item.modelNumber].filter(Boolean).join(' · ')
                            : item.description}
                        </p>
                      </div>
                      <span className="ml-4 shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedPurchaseOrder.gemContractNumber
                          ? `Qty: ${item.quantity}`
                          : formatIndianShort(item.totalPrice)}
                      </span>
                    </div>
                    {/* Item details */}
                    {selectedPurchaseOrder.gemContractNumber ? (
                      <dl className="divide-y divide-gray-100 dark:divide-slate-700">
                        <ItemRow label="GSTIN" value={item.gstin} />
                        <ItemRow label="Warranty" value={item.warrantyPeriod ? `${item.warrantyPeriod} years` : '-'} />
                        <ItemRow label="AMC Responsibility" value={item.amcResponsibility} />
                        <ItemRow label="Installation Required" value={item.installationRequired ? 'Yes' : 'No'} />
                      </dl>
                    ) : item.specifications ? (
                      <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-medium text-gray-700 dark:text-gray-400">Specifications: </span>
                        {item.specifications}
                      </div>
                    ) : null}
                  </div>
                ))}
                {(selectedPurchaseOrder.items || []).length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No items found.</p>
                )}
              </div>
            </div>

            {/* ── Notes ── */}
            {selectedPurchaseOrder.notes && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Notes</h3>
                <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {selectedPurchaseOrder.notes}
                </div>
              </div>
            )}

            {/* ── Documents ── */}
            {selectedPurchaseOrder.gemContractNumber && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'OEM Authorization Letter', file: selectedPurchaseOrder.oemAuthorizationLetter },
                    { label: 'GeM Order File', file: selectedPurchaseOrder.gemOrderFile },
                    { label: 'Work Order (WO)', file: selectedPurchaseOrder.workOrderFile },
                    { label: 'Purchase Order (PO)', file: selectedPurchaseOrder.purchaseOrderFile },
                  ].filter(d => d.file).map(d => (
                    <div key={d.label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/40 text-sm text-gray-700 dark:text-gray-300">
                      <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                      <span>{d.label}</span>
                    </div>
                  ))}
                  {!selectedPurchaseOrder.oemAuthorizationLetter && !selectedPurchaseOrder.gemOrderFile && !selectedPurchaseOrder.workOrderFile && !selectedPurchaseOrder.purchaseOrderFile && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 col-span-2">No documents uploaded.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Asset Create Modal */}
      {showAssetForm && (
        <AssetForm
          onClose={() => setShowAssetForm(false)}
          onSubmit={handleAssetCreateSubmit}
          sellerOrders={sellerOrders}
        />
      )}

      {/* Asset Details Modal */}
      {showAssetDetails && selectedAsset && (
        <AssetDetails
          asset={selectedAsset}
          onClose={() => { setShowAssetDetails(false); setSelectedAsset(null); }}
        />
      )}
    </div>
  );
};

/* ── Small helper components ─────────────────────────────────────────────── */

/** Two-column row inside a bordered definition list */
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-2 px-4 py-3">
      <dt className="text-sm text-gray-500 dark:text-gray-400 pr-3">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 dark:text-white text-right break-all">{value ?? '-'}</dd>
    </div>
  );
}

/** Compact key-value row inside an item detail block */
function ItemRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="grid grid-cols-2 px-4 py-2">
      <dt className="text-xs text-gray-500 dark:text-gray-400 pr-2">{label}</dt>
      <dd className="text-xs font-medium text-gray-800 dark:text-gray-200 text-right">{value ?? '-'}</dd>
    </div>
  );
}

export default SellerDashboard;
