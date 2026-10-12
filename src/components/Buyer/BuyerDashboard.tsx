/**
 * BuyerDashboard — modernized with shared UI system.
 * Uses PageHeader, StatCard, SectionCard, DataTable, Modal for consistent layout.
 * Replaces duplicate formatIndianCurrency with formatIndianShort.
 * Preserves all business logic: PO normalization, asset processing, escalation management,
 * delivery confirmation, periodic asset refresh, URL-based view-mode sync.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Truck, CheckCircle, Clock, AlertTriangle,
  FileText, IndianRupee, Phone, Mail,
  Plus, Shield, BarChart3, Eye, AlertCircle,
  XCircle, Package, Send, Settings, Activity,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { ApiService } from '../../services/apiService';
import { PurchaseOrder, Asset } from '../../types';
import { getPublicOrderStatus } from '../../utils/orderWorkflow';
import { formatVerificationGpsLine, getVerificationLocationLabel } from '../../utils/verificationMetadataDisplay';
import BuyerPurchaseOrderForm from './BuyerPurchaseOrderForm';
import BuyerPurchaseOrderDetails from './BuyerPurchaseOrderDetails';
import AssetDetailsModal from './AssetDetailsModal';
import BuyerReports from './BuyerReports';
import OrderProgressModal from './OrderProgressModal';
import CustodianManagement from '../Custodian/CustodianManagement';
import { themedAlert } from '../../utils/themedDialogs';
import { isWarrantyExpiringWithin30Days, isWarrantyExpired } from '../../utils/buyerAssetReportUtils';
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
interface Escalation {
  id: string;
  title: string;
  description: string;
  type: 'delivery_delay' | 'quality_issue' | 'payment_dispute' | 'technical_support' | 'contract_issue' | 'other';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  vendorName?: string;
  reportedBy: string;
  reportedDate: string;
  assignedTo?: string;
  assignedDate?: string;
  resolution?: string;
  resolvedDate?: string;
  attachments?: string[];
  notes?: Array<{ date: string; user: string; note: string }>;
}

interface BuyerProfile {
  organization_type?: string;
  ministry_department?: string;
  organization_name?: string;
  buyer_designation?: string;
  contact_person_name?: string;
  email_id?: string;
  contact_number?: string;
  office_address?: any;
  gstin?: string;
  payment_mode?: string;
  billing_authority_designation?: string;
  consignee_name?: string;
  consignee_designation?: string;
  authorized_designations?: string[];
  contract_reference_numbers?: string[];
  past_work_orders?: string[];
}

type ViewMode = 'overview' | 'procurement' | 'assets' | 'reports' | 'escalation' | 'profile' | 'custodians';

/* ── Constants ──────────────────────────────────────────────────────────── */
const ESCALATION_TYPES = [
  { value: 'delivery_delay',   label: 'Delivery Delay',     icon: Truck },
  { value: 'quality_issue',    label: 'Quality Issue',      icon: Package },
  { value: 'payment_dispute',  label: 'Payment Dispute',    icon: Shield },
  { value: 'technical_support',label: 'Technical Support',  icon: Settings },
  { value: 'contract_issue',   label: 'Contract Issue',     icon: FileText },
  { value: 'other',            label: 'Other',              icon: AlertTriangle },
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
const ESCALATION_LABEL_CLASS =
  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
const ESCALATION_FIELD_CLASS =
  'w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-card text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:outline-none dark:[color-scheme:dark]';
const ESCALATION_FILTER_CLASS =
  'px-3 py-2 border border-surface-border dark:border-slate-600 rounded-card text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:[color-scheme:dark]';
const ESCALATION_OPTION_CLASS = 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white';

/* Reused for the procurement + asset filter dropdowns so they match the escalation selects in dark mode */
const SELECT_FIELD_CLASS = ESCALATION_FILTER_CLASS;
const SELECT_OPTION_CLASS = ESCALATION_OPTION_CLASS;

/* ── Pure helpers ───────────────────────────────────────────────────────── */
function getViewModeFromPath(path: string): ViewMode {
  if (path === '/buyer/procurement' || path === '/buyer/orders') return 'procurement';
  if (path === '/buyer/assets')    return 'assets';
  if (path === '/buyer/reports')   return 'reports';
  if (path === '/buyer/escalation') return 'escalation';
  if (path === '/buyer/profile')   return 'profile';
  if (path === '/buyer/custodians') return 'custodians';
  return 'overview';
}

function formatSupplierContact(supplierContact: any): string {
  if (!supplierContact) return 'N/A';
  let contact: any;
  if (typeof supplierContact === 'string') {
    try { contact = JSON.parse(supplierContact); } catch { return supplierContact; }
  } else if (typeof supplierContact === 'object') {
    contact = supplierContact;
  } else return 'N/A';
  const parts: string[] = [];
  if (contact.officerName)  parts.push(contact.officerName);
  if (contact.designation)  parts.push(contact.designation);
  if (contact.email)        parts.push(contact.email);
  if (contact.contactNumber) parts.push(contact.contactNumber);
  return parts.join(' · ') || 'N/A';
}

function priorityVariant(p: string): 'danger' | 'warning' | 'success' | 'default' {
  if (p === 'Critical' || p === 'High') return 'danger';
  if (p === 'Medium') return 'warning';
  if (p === 'Low')    return 'success';
  return 'default';
}

function escalationStatusIcon(status: string) {
  switch (status) {
    case 'Open':        return <AlertTriangle size={14} />;
    case 'In Progress': return <Clock size={14} />;
    case 'Resolved':    return <CheckCircle size={14} />;
    case 'Closed':      return <XCircle size={14} />;
    default:            return <AlertTriangle size={14} />;
  }
}

/* ── Component ──────────────────────────────────────────────────────────── */
const BuyerDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  /* --- data --- */
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [assets,         setAssets]         = useState<Asset[]>([]);
  const [buyerProfile,   setBuyerProfile]   = useState<BuyerProfile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [assetsLoading,  setAssetsLoading]  = useState(false);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);

  /* --- PO filters --- */
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus,     setSelectedStatus]     = useState('all');

  /* --- Asset filters --- */
  const [assetStatusFilter,   setAssetStatusFilter]   = useState('all');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
  const [assetLocationFilter, setAssetLocationFilter] = useState('all');

  /* --- Modals --- */
  const [showForm,            setShowForm]            = useState(false);
  const [editingPO,           setEditingPO]           = useState<PurchaseOrder | null>(null);
  const [selectedPO,          setSelectedPO]          = useState<PurchaseOrder | null>(null);
  const [selectedAsset,       setSelectedAsset]       = useState<Asset | null>(null);
  const [showAssetDetails,    setShowAssetDetails]    = useState(false);
  const [showOrderProgress,   setShowOrderProgress]   = useState(false);
  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<PurchaseOrder | null>(null);
  const [orderPendingConfirmation, setOrderPendingConfirmation] = useState<PurchaseOrder | null>(null);

  /* --- Alert banner --- */
  const [uiAlert, setUiAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  /* --- Escalations --- */
  const [escalations,        setEscalations]        = useState<Escalation[]>([]);
  const [activeEscalationTab, setActiveEscalationTab] = useState<'new' | 'list'>('new');
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [filterStatus,       setFilterStatus]       = useState('all');
  const [filterPriority,     setFilterPriority]     = useState('all');
  const [filterType,         setFilterType]         = useState('all');
  const [noteInputValue,     setNoteInputValue]     = useState('');
  const [newEscalation, setNewEscalation] = useState<Partial<Escalation>>({
    title: '', description: '', type: 'delivery_delay', priority: 'Medium',
    purchaseOrderId: '', vendorName: '',
  });

  /* ── URL sync ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    setViewMode(getViewModeFromPath(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === '/buyer/vendors') navigate('/buyer', { replace: true });
  }, [location.pathname, navigate]);

  /* ── Asset normalization ──────────────────────────────────────────────── */
  const normalizeAssetRow = useCallback((a: any): Asset => {
    const gem = a.gem_contract_number ?? a.gemContractNumber;
    return {
      ...a,
      id: String(a.id),
      asset_uid: a.asset_uid ?? a.assetUid,
      assetUid: a.assetUid ?? a.asset_uid,
      serialNumber: a.serial_number || a.serialNumber,
      purchaseDate: a.purchase_date || a.purchaseDate,
      warrantyExpiry: a.warranty_expiry || a.warrantyExpiry,
      amcExpiry: a.amc_expiry || a.amcExpiry,
      gem_contract_number: gem,
      gemContractNumber: gem,
      qrCode: a.qr_code || a.qrCode,
      lastMovement: a.last_movement || a.lastMovement,
      procurementStatus: a.procurement_status || a.procurementStatus,
      deliveryStatus: a.delivery_status || a.deliveryStatus,
      expectedDeliveryDate: a.expected_delivery_date || a.expectedDeliveryDate,
      actualDeliveryDate: a.actual_delivery_date || a.actualDeliveryDate,
      invoiceNumber: a.invoice_number || a.invoiceNumber,
      paymentStatus: a.payment_status || a.paymentStatus,
      procurementNotes: a.procurement_notes || a.procurementNotes,
      buyerId: a.buyer_id != null ? String(a.buyer_id) : a.buyerId != null ? String(a.buyerId) : undefined,
      buyerName: a.buyer_name || a.buyerName,
      buyerDepartment: a.buyer_department || a.buyerDepartment,
      endUserId: a.end_user_id || a.endUserId,
      endUserName: a.end_user_name || a.endUserName,
      endUserDesignation: a.end_user_designation || a.endUserDesignation,
      endUserEmail: a.end_user_email || a.endUserEmail,
      allocationDate: a.allocation_date || a.allocationDate,
      purchaseOrderId: a.purchase_order_id != null ? String(a.purchase_order_id) : a.purchaseOrderId != null ? String(a.purchaseOrderId) : undefined,
      sellerOrderId: a.seller_order_id ?? a.sellerOrderId,
      acknowledgmentStatus: a.acknowledgment_status || a.acknowledgmentStatus,
      verificationStatus: a.verification_status || a.verificationStatus,
      verifiedAt: a.verified_at || a.verifiedAt,
      verificationMetadata: a.verification_metadata ?? a.verificationMetadata ?? null,
    } as Asset;
  }, []);

  const processAssets = useCallback(
    (allAssets: any[], pos: PurchaseOrder[]) => {
      if (!Array.isArray(allAssets) || !Array.isArray(pos)) return [];
      const mapped = allAssets.map(normalizeAssetRow);
      if (pos.length === 0) return mapped;
      const buyerGemSet = new Set(
        pos.filter((po: any) => po.gemContractNumber || po.gem_contract_number)
           .map((po: any) => po.gemContractNumber || po.gem_contract_number)
           .filter(Boolean)
      );
      const buyerMappedOrderIds = new Set(pos.map((po: any) => String(po.id)).filter(Boolean));
      return mapped.filter((a: Asset) => {
        const gem = a.gem_contract_number || a.gemContractNumber;
        const gemMatch = gem && buyerGemSet.has(gem);
        const sellerOrderId   = String(a.sellerOrderId ?? '').trim();
        const purchaseOrderId = String(a.purchaseOrderId ?? '').trim();
        const orderLinkMatch =
          (sellerOrderId && buyerMappedOrderIds.has(sellerOrderId)) ||
          (purchaseOrderId && buyerMappedOrderIds.has(purchaseOrderId));
        return Boolean(gemMatch || orderLinkMatch);
      });
    },
    [normalizeAssetRow]
  );

  /* ── Data loading ─────────────────────────────────────────────────────── */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
        const [poResp, profileResp] = await Promise.all([
          ApiService.getPurchaseOrdersByBuyer(currentUser?.id || ''),
          ApiService.getCurrentBuyerProfile().catch(() => null),
        ]);
        let rawOrders: any[] = [];
        if (poResp && (poResp as any).success) rawOrders = (poResp as any).orders || [];
        else if (Array.isArray(poResp)) rawOrders = poResp as any;
        const processedOrders = rawOrders.map((po: any) => ({
          ...po,
          totalAmount: Number(po.totalAmount || po.total_amount || 0),
          requestedDate: po.requestedDate || po.requested_date,
          expectedDeliveryDate: po.expectedDeliveryDate || po.expected_delivery_date,
          gemContractNumber: po.gemContractNumber || po.gem_contract_number,
          poNumber: po.poNumber || po.po_number,
          supplierContact: po.supplierContact || po.supplier_contact,
        }));
        setPurchaseOrders(processedOrders);
        setBuyerProfile(profileResp);
      } catch (err) {
        console.error('Error loading buyer data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  /* Load assets whenever POs change */
  useEffect(() => {
    const loadAssets = async () => {
      setAssetsLoading(true);
      try {
        const allAssets = await ApiService.getAllAssets();
        setAssets(processAssets(allAssets as any[], purchaseOrders));
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        setAssetsLoading(false);
      }
    };
    loadAssets();
  }, [purchaseOrders, processAssets]);

  /* Periodic asset refresh every 30 s */
  useEffect(() => {
    if (!user || purchaseOrders.length === 0) return;
    const interval = setInterval(async () => {
      try {
        const allAssets = await ApiService.getAllAssets();
        setAssets(processAssets(allAssets as any[], purchaseOrders));
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [user, purchaseOrders, processAssets]);

  /* Load escalations when escalation view is active */
  useEffect(() => {
    if (viewMode !== 'escalation') return;
    const loadEscalations = async () => {
      try {
        const filters: any = {};
        if (filterStatus   !== 'all') filters.status   = filterStatus;
        if (filterPriority !== 'all') filters.priority = filterPriority;
        if (filterType     !== 'all') filters.type     = filterType;
        if (user?.id) filters.buyerId = user.id.toString();
        const data = await ApiService.getAllEscalations(filters);
        const normalized = (Array.isArray(data) ? data : []).map((esc: any): Escalation => ({
          id: esc.id?.toString() || esc.id,
          title: esc.title,
          description: esc.description,
          type: esc.type,
          priority: esc.priority,
          status: esc.status || 'Open',
          purchaseOrderId: esc.purchaseOrderId?.toString() || esc.purchaseOrderId,
          purchaseOrderNumber: esc.purchaseOrderNumber,
          vendorName: esc.vendorName,
          reportedBy: esc.reportedBy,
          reportedDate: esc.reportedDate || esc.createdAt,
          assignedTo: esc.assignedTo,
          assignedDate: esc.assignedDate,
          resolution: esc.resolution,
          resolvedDate: esc.resolvedDate,
          attachments: esc.attachments || [],
          notes: esc.notes || [],
        }));
        setEscalations(normalized);
      } catch {
        setEscalations([]);
      }
    };
    loadEscalations();
  }, [viewMode, filterStatus, filterPriority, filterType, user?.id]);

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalPOs     = purchaseOrders.length;
    const activePOs    = purchaseOrders.filter(po => !['Completed', 'Rejected', 'Cancelled'].includes(po.status)).length;
    const completedPOs = purchaseOrders.filter(po => po.status === 'Completed').length;
    const totalValue   = purchaseOrders.reduce((s, po) => s + (po.totalAmount || 0), 0);
    const pendingValue = purchaseOrders.filter(po => !['Completed', 'Rejected', 'Cancelled'].includes(po.status)).reduce((s, po) => s + (po.totalAmount || 0), 0);
    const overdueDeliveries = purchaseOrders.filter(po => {
      if (!po.expectedDeliveryDate) return false;
      const due = new Date(po.expectedDeliveryDate);
      return po.status !== 'Completed' && po.status !== 'Cancelled' && due < new Date();
    }).length;
    const warrantyExpiring = assets.filter(a => isWarrantyExpiringWithin30Days(a)).length;
    const amcExpiring = assets.filter(a => {
      if (!a.amcExpiry) return false;
      const d = Math.ceil((new Date(a.amcExpiry).getTime() - Date.now()) / 86400000);
      return d <= 30 && d > 0;
    }).length;
    return { totalPOs, activePOs, completedPOs, totalValue, pendingValue, overdueDeliveries, warrantyExpiring, amcExpiring };
  }, [purchaseOrders, assets]);

  const departments = useMemo(() => [...new Set(purchaseOrders.map(po => po.department))], [purchaseOrders]);

  const filteredPOs = useMemo(() => purchaseOrders.filter(po => {
    if (po.status === 'Rejected') return false;
    const matchesDept   = selectedDepartment === 'all' || po.department === selectedDepartment;
    const pub           = getPublicOrderStatus(po as any);
    const matchesStatus = selectedStatus === 'all' ? true : selectedStatus === 'Approved' ? pub === 'Approved' : po.status === selectedStatus;
    return matchesDept && matchesStatus;
  }), [purchaseOrders, selectedDepartment, selectedStatus]);

  const assetCategories = useMemo(() => [...new Set(assets.map(a => a.category))], [assets]);
  const assetLocations  = useMemo(() => [...new Set(assets.map(a => a.location))], [assets]);

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchesStatus =
        assetStatusFilter === 'all'              ? true :
        assetStatusFilter === 'warranty_expiring_30' ? isWarrantyExpiringWithin30Days(a) :
        assetStatusFilter === 'warranty_expired' ? isWarrantyExpired(a) :
        a.status === assetStatusFilter;
      const matchesCategory = assetCategoryFilter === 'all' || a.category === assetCategoryFilter;
      const matchesLocation = assetLocationFilter === 'all' || a.location === assetLocationFilter;
      return matchesStatus && matchesCategory && matchesLocation;
    });
  }, [assets, assetStatusFilter, assetCategoryFilter, assetLocationFilter]);

  const filteredEscalations = useMemo(() => escalations.filter(e => {
    const sm = filterStatus   === 'all' || e.status   === filterStatus;
    const pm = filterPriority === 'all' || e.priority === filterPriority;
    const tm = filterType     === 'all' || e.type     === filterType;
    return sm && pm && tm;
  }), [escalations, filterStatus, filterPriority, filterType]);

  /* ── Delivery helpers ─────────────────────────────────────────────────── */
  const getDeliveryInfo = (order: PurchaseOrder) => {
    const info = (order as any).deliveryInformation || (order as any).delivery_information;
    if (!info) return null;
    if (typeof info === 'string') { try { return JSON.parse(info); } catch { return null; } }
    return info;
  };
  const getBatchDeliveryStatus = (order: PurchaseOrder) => {
    const batches = Array.isArray(getDeliveryInfo(order)?.batches) ? getDeliveryInfo(order).batches : [];
    return { delivered: batches.filter((b: any) => b?.status === 'Delivered').length, total: batches.length };
  };
  const allBatchesDelivered = (order: PurchaseOrder) => {
    const { delivered, total } = getBatchDeliveryStatus(order);
    return total > 0 && delivered === total;
  };
  const isBuyerConfirmed = (order: PurchaseOrder) => Boolean(getDeliveryInfo(order)?.buyerConfirmed);

  /* ── Alert helper ─────────────────────────────────────────────────────── */
  const showThemedAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setUiAlert({ type, message });
    window.setTimeout(() => setUiAlert(prev => prev?.message === message ? null : prev), 3500);
  };

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleCreatePO = async (po: PurchaseOrder) => {
    try {
      const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
      const response = await ApiService.getPurchaseOrdersByBuyer(currentUser?.id || '');
      const freshOrders = (response as any)?.orders || response || [];
      setPurchaseOrders(Array.isArray(freshOrders) ? freshOrders : []);
    } catch {
      setPurchaseOrders(prev => {
        const exists = prev.find(p => p.id === po.id);
        return exists ? prev.map(p => p.id === po.id ? po : p) : [po, ...prev];
      });
    }
    setShowForm(false);
    setReportsRefreshKey(k => k + 1);
  };

  const handleConfirmDelivery = (order: PurchaseOrder) => {
    if (order.status !== 'Delivered') {
      showThemedAlert('warning', 'You can mark an order complete only after it is Delivered (all batch OTP verifications done).');
      return;
    }
    if (!allBatchesDelivered(order)) {
      showThemedAlert('warning', 'All delivery batches must be marked delivered before confirmation.');
      return;
    }
    setOrderPendingConfirmation(order);
  };

  const confirmOrderCompletion = async () => {
    if (!orderPendingConfirmation) return;
    try {
      const response = await ApiService.confirmBuyerOrderDelivery(orderPendingConfirmation.id);
      const updatedOrder = (response as any)?.order;
      setPurchaseOrders(prev => prev.map(po => {
        if (po.id !== orderPendingConfirmation.id) return po;
        return {
          ...po,
          status: updatedOrder?.status || 'Completed',
          deliveryInformation: updatedOrder?.delivery_information || updatedOrder?.deliveryInformation || (po as any).deliveryInformation,
        } as PurchaseOrder;
      }));
      showThemedAlert('success', 'Order marked as completed successfully.');
      setOrderPendingConfirmation(null);
    } catch (error) {
      showThemedAlert('error', ApiService.handleError(error));
    }
  };

  const refreshAssets = async () => {
    setAssetsLoading(true);
    try {
      const allAssets = await ApiService.getAllAssets();
      setAssets(processAssets(allAssets as any[], purchaseOrders));
    } catch {}
    finally { setAssetsLoading(false); }
  };

  const handleCreateEscalation = async () => {
    if (!newEscalation.title || !newEscalation.description) {
      await themedAlert('Please fill in all required fields', 'Validation');
      return;
    }
    try {
      const escalationData: any = {
        title:       newEscalation.title!,
        description: newEscalation.description!,
        type:        newEscalation.type!,
        priority:    newEscalation.priority!,
        notes:       [{ date: new Date().toISOString(), user: user?.name || 'Unknown', note: 'Escalation created' }],
        attachments: [],
      };
      if (newEscalation.purchaseOrderId) {
        escalationData.purchaseOrderId = newEscalation.purchaseOrderId;
        const po = purchaseOrders.find(p => p.id === newEscalation.purchaseOrderId);
        if (po?.poNumber) escalationData.purchaseOrderNumber = po.poNumber;
      }
      if (newEscalation.vendorName) escalationData.vendorName = newEscalation.vendorName;

      const created = await ApiService.createEscalation(escalationData);
      const normalized: Escalation = {
        id: created.id?.toString() || created.id,
        title: created.title, description: created.description,
        type: created.type, priority: created.priority,
        status: created.status || 'Open',
        purchaseOrderId: created.purchaseOrderId?.toString(),
        purchaseOrderNumber: created.purchaseOrderNumber,
        vendorName: created.vendorName,
        reportedBy: created.reportedBy,
        reportedDate: created.reportedDate || created.createdAt,
        assignedTo: created.assignedTo, assignedDate: created.assignedDate,
        resolution: created.resolution, resolvedDate: created.resolvedDate,
        attachments: created.attachments || [], notes: created.notes || [],
      };
      setEscalations([normalized, ...escalations]);
      setNewEscalation({ title: '', description: '', type: 'delivery_delay', priority: 'Medium', purchaseOrderId: '', vendorName: '' });
      setActiveEscalationTab('list');
    } catch {
      await themedAlert('Failed to create escalation. Please try again.', 'Error');
    }
  };

  const updateEscalationStatus = async (escalationId: string, newStatus: Escalation['status']) => {
    try {
      const current = escalations.find(e => e.id === escalationId);
      if (!current) return;
      const updatedNotes = [...(current.notes || []), { date: new Date().toISOString(), user: user?.name || 'Unknown', note: `Status updated to ${newStatus}` }];
      const updated = await ApiService.updateEscalation(escalationId, { status: newStatus, notes: updatedNotes });
      const normalized: Escalation = {
        id: updated.id?.toString() || updated.id,
        title: updated.title, description: updated.description,
        type: updated.type, priority: updated.priority,
        status: updated.status || newStatus,
        purchaseOrderId: updated.purchaseOrderId?.toString(),
        purchaseOrderNumber: updated.purchaseOrderNumber, vendorName: updated.vendorName,
        reportedBy: updated.reportedBy, reportedDate: updated.reportedDate || updated.createdAt,
        assignedTo: updated.assignedTo, assignedDate: updated.assignedDate,
        resolution: updated.resolution, resolvedDate: updated.resolvedDate,
        attachments: updated.attachments || [], notes: updated.notes || [],
      };
      setEscalations(prev => prev.map(e => e.id === escalationId ? normalized : e));
      setSelectedEscalation(prev => prev?.id === escalationId ? normalized : prev);
    } catch {
      await themedAlert('Failed to update escalation status. Please try again.', 'Error');
    }
  };

  const addNote = async (escalationId: string, note: string) => {
    if (!note.trim()) return;
    try {
      const current = escalations.find(e => e.id === escalationId);
      if (!current) return;
      const updatedNotes = [...(current.notes || []), { date: new Date().toISOString(), user: user?.name || 'Unknown', note: note.trim() }];
      const updated = await ApiService.updateEscalation(escalationId, { notes: updatedNotes });
      const normalized: Escalation = {
        id: updated.id?.toString() || updated.id,
        title: updated.title, description: updated.description,
        type: updated.type, priority: updated.priority,
        status: updated.status || current.status,
        purchaseOrderId: updated.purchaseOrderId?.toString(),
        purchaseOrderNumber: updated.purchaseOrderNumber, vendorName: updated.vendorName,
        reportedBy: updated.reportedBy, reportedDate: updated.reportedDate || updated.createdAt,
        assignedTo: updated.assignedTo, assignedDate: updated.assignedDate,
        resolution: updated.resolution, resolvedDate: updated.resolvedDate,
        attachments: updated.attachments || [], notes: updated.notes || [],
      };
      setEscalations(prev => prev.map(e => e.id === escalationId ? normalized : e));
      setSelectedEscalation(prev => prev?.id === escalationId ? normalized : prev);
      setNoteInputValue('');
    } catch {
      await themedAlert('Failed to add note. Please try again.', 'Error');
    }
  };

  /* ── Column definitions ───────────────────────────────────────────────── */
  const procurementColumns: ColumnDef<PurchaseOrder, any>[] = [
    {
      id: 'contract',
      header: 'GeM Contract',
      cell: ({ row }) => {
        const po = row.original;
        const d = (po as any).purchaseDate || (po as any).purchase_date || (po as any).requestedDate || (po as any).requested_date || (po as any).createdAt || (po as any).created_at;
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{(po as any).gemContractNumber || (po as any).gem_contract_number || 'N/A'}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">Date: {d ? new Date(d).toLocaleDateString() : 'N/A'}</div>
          </div>
        );
      },
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white truncate max-w-[140px]">{row.original.department}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{row.original.requestedBy}</div>
        </div>
      ),
    },
    {
      id: 'seller',
      header: 'Seller',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white truncate max-w-[140px]">{(row.original as any).sellerName || row.original.supplier}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatSupplierContact(row.original.supplierContact)}</div>
        </div>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{formatIndianShort(row.original.totalAmount || 0)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.currency}</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const po = row.original;
        const { delivered, total } = getBatchDeliveryStatus(po);
        return (
          <div className="space-y-1">
            <StatusBadge status={getPublicOrderStatus(po as any)} size="sm" />
            {total > 0 && <div className="text-xs text-gray-500 dark:text-gray-400">Batch: {delivered}/{total} delivered</div>}
          </div>
        );
      },
    },
    {
      id: 'delivery',
      header: 'Expected Delivery',
      cell: ({ row }) => {
        const po = row.original;
        const date = (po as any).expectedDeliveryEndDate || po.expectedDeliveryDate;
        return (
          <div>
            <div className="text-sm text-gray-900 dark:text-white">{date ? new Date(date).toLocaleDateString() : 'N/A'}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{po.items?.length || 0} items</div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const po = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs" iconLeft={<Eye className="w-4 h-4" />} onClick={() => setSelectedPO(po)} title="View Details" />
            <Button variant="ghost" size="xs" iconLeft={<Truck className="w-4 h-4 text-info-600" />} onClick={() => { setSelectedOrderForProgress(po); setShowOrderProgress(true); }} title="Track Delivery" />
            {allBatchesDelivered(po) && !isBuyerConfirmed(po) && (
              <Button variant="ghost" size="xs" iconLeft={<CheckCircle className="w-4 h-4 text-success-600" />} onClick={() => handleConfirmDelivery(po)} title="Confirm Delivery" />
            )}
          </div>
        );
      },
    },
  ];

  const assetColumns: ColumnDef<Asset, any>[] = [
    {
      id: 'asset',
      header: 'Asset',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.original.name}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.original.serialNumber || '-'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => <span className="text-sm text-gray-900 dark:text-gray-200">{getValue()}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} size="sm" />,
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ getValue }) => <span className="text-sm text-gray-900 dark:text-gray-200">{getValue()}</span>,
    },
    {
      accessorKey: 'warrantyExpiry',
      header: 'Warranty Expiry',
      cell: ({ row }) => {
        const a = row.original;
        if (!a.warrantyExpiry) return <span className="text-gray-400 dark:text-gray-500">N/A</span>;
        const d = new Date(a.warrantyExpiry);
        const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
        return (
          <div>
            <div className="text-sm text-gray-900 dark:text-white">{d.toLocaleDateString()}</div>
            {daysLeft <= 30 && daysLeft > 0 && (
              <div className="text-xs text-warning-600 dark:text-warning-400">Expires in {daysLeft} days</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'amcExpiry',
      header: 'AMC Expiry',
      cell: ({ row }) => {
        const a = row.original;
        if (!a.amcExpiry) return <span className="text-gray-400 dark:text-gray-500">No AMC</span>;
        const d = new Date(a.amcExpiry);
        const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
        return (
          <div>
            <div className="text-sm text-gray-900 dark:text-white">{d.toLocaleDateString()}</div>
            {daysLeft <= 30 && daysLeft > 0 && (
              <div className="text-xs text-danger-600 dark:text-danger-400">Expires in {daysLeft} days</div>
            )}
          </div>
        );
      },
    },
    {
      id: 'verification',
      header: 'Verification',
      cell: ({ row }) => {
        const a = row.original;
        if (String(a.verificationStatus || '').toLowerCase() === 'completed') {
          const meta = a.verificationMetadata as Record<string, unknown> | undefined;
          const addr = getVerificationLocationLabel(meta);
          const gps  = formatVerificationGpsLine(meta);
          return (
            <div className="space-y-1 text-xs">
              <Badge variant="success" size="sm">Verified</Badge>
              {a.verifiedAt && (
                <div className="text-gray-500 dark:text-gray-400">{new Date(a.verifiedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</div>
              )}
              {addr && <div className="text-gray-700 dark:text-gray-300 line-clamp-2">{addr}</div>}
              {gps  && <div className="font-mono text-[11px] text-gray-600 dark:text-gray-400 break-all">{gps}</div>}
            </div>
          );
        }
        return <span className="text-xs text-gray-500 dark:text-gray-400">{a.verificationStatus || 'Pending'}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">User: {a.endUserName || 'Unassigned'}</div>
            <Button variant="ghost" size="xs" iconLeft={<Eye className="w-4 h-4" />}
              onClick={() => { setSelectedAsset(a); setShowAssetDetails(true); }}>
              View
            </Button>
          </div>
        );
      },
    },
  ];

  const escalationColumns: ColumnDef<Escalation, any>[] = [
    {
      id: 'escalation',
      header: 'Escalation',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.original.title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{row.original.description}</div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => {
        const TypeIcon = (ESCALATION_TYPES.find(t => t.value === getValue()) || { icon: AlertTriangle }).icon;
        const label    = ESCALATION_TYPES.find(t => t.value === getValue())?.label || getValue();
        return (
          <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
            <TypeIcon size={14} className="text-gray-500 dark:text-gray-400 shrink-0" />
            <span>{label}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => <Badge variant={priorityVariant(getValue())} size="sm">{getValue()}</Badge>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <span className="inline-flex items-center gap-1">
          {escalationStatusIcon(getValue())}
          <StatusBadge status={getValue()} size="sm" />
        </span>
      ),
    },
    {
      accessorKey: 'purchaseOrderNumber',
      header: 'PO Number',
      cell: ({ getValue }) => <span className="text-sm text-gray-700 dark:text-gray-300">{getValue() || '-'}</span>,
    },
    {
      accessorKey: 'vendorName',
      header: 'Seller',
      cell: ({ getValue }) => <span className="text-sm text-gray-700 dark:text-gray-300">{getValue() || '-'}</span>,
    },
    {
      accessorKey: 'reportedDate',
      header: 'Reported',
      cell: ({ getValue }) => <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(getValue()).toLocaleDateString()}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" iconLeft={<Eye className="w-4 h-4" />} onClick={() => setSelectedEscalation(row.original)} title="View Details" />
          <Button variant="ghost" size="xs" iconLeft={<Phone className="w-4 h-4 text-success-600" />} title="Contact" />
          <Button variant="ghost" size="xs" iconLeft={<Mail className="w-4 h-4 text-info-600" />} title="Email" />
        </div>
      ),
    },
  ];

  /* ── Dynamic page header ──────────────────────────────────────────────── */
  const pageTitle = {
    overview:    buyerProfile?.ministry_department?.trim() || buyerProfile?.organization_name?.trim() || user?.department?.trim() || 'Ministry',
    procurement: 'Order Management',
    assets:      'Asset Status',
    reports:     'Analytics & Reports',
    escalation:  'Issue Escalation',
    profile:     'Buyer Profile',
    custodians:  'Custodian Management',
  }[viewMode] || 'Dashboard';

  const pageSubtitle = {
    overview:    'Comprehensive procurement, asset, and seller management platform',
    procurement: 'Manage mapped orders, deliveries, and final confirmations',
    assets:      'End-to-end asset tracking from procurement to disposal',
    reports:     'Generate comprehensive procurement insights and analytics',
    escalation:  'Efficiently manage and resolve procurement issues',
    profile:     'Read-only details from your buyer registration form',
    custodians:  'Manage custodians for your department',
  }[viewMode] || '';

  const pageActions = (
    <>
      {(viewMode === 'overview' || viewMode === 'procurement') && (
        <Button variant="primary" size="sm" iconLeft={<Plus className="h-4 w-4" />}
          onClick={() => setShowForm(true)}>
          New Order
        </Button>
      )}
      {viewMode === 'overview' && (
        <Button variant="danger" size="sm" iconLeft={<AlertCircle className="h-4 w-4" />}
          onClick={() => navigate('/buyer/escalation')}>
          Raise Escalation
        </Button>
      )}
    </>
  );

  /* ── Loading state ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-surface-subtle rounded-card animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        icon={<FileText className="w-5 h-5 text-primary-600" />}
        actions={<div className="flex items-center gap-2">{pageActions}</div>}
      />

      {/* Alert banner */}
      {uiAlert && (
        <div className={[
          'rounded-card border px-4 py-3 text-sm font-medium',
          uiAlert.type === 'success' ? 'bg-success-50 border-success-200 text-success-700' :
          uiAlert.type === 'warning' ? 'bg-warning-50 border-warning-200 text-warning-700' :
          'bg-danger-50 border-danger-200 text-danger-700',
        ].join(' ')}>
          {uiAlert.message}
        </div>
      )}

      {/* ── OVERVIEW VIEW ─────────────────────────────────────────────── */}
      {viewMode === 'overview' && (
        <>
          {/* Critical alerts */}
          {(stats.overdueDeliveries > 0 || stats.warrantyExpiring > 0 || stats.amcExpiring > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.overdueDeliveries > 0 && (
                <div className="bg-danger-50 border border-danger-200 rounded-card p-4 flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-danger-600 shrink-0" />
                  <div>
                    <p className="font-medium text-danger-900">{stats.overdueDeliveries} Overdue Deliveries</p>
                    <p className="text-sm text-danger-700">Requires immediate attention</p>
                  </div>
                </div>
              )}
              {stats.warrantyExpiring > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-card p-4 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-warning-600 shrink-0" />
                  <div>
                    <p className="font-medium text-warning-900">{stats.warrantyExpiring} Warranties Expiring</p>
                    <p className="text-sm text-warning-700">Within 30 days</p>
                  </div>
                </div>
              )}
              {stats.amcExpiring > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-card p-4 flex items-center gap-3">
                  <Shield className="w-6 h-6 text-orange-600 shrink-0" />
                  <div>
                    <p className="font-medium text-orange-900">{stats.amcExpiring} AMC Expiring</p>
                    <p className="text-sm text-orange-700">Within 30 days</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Orders"
              value={stats.totalPOs}
              icon={<FileText className="w-5 h-5 text-primary-600" />}
              iconBg="bg-primary-100"
              trend={{ value: 15, direction: 'up', label: 'from last month' }}
            />
            <StatCard
              title="Active Orders"
              value={stats.activePOs}
              icon={<Clock className="w-5 h-5 text-warning-600" />}
              iconBg="bg-warning-100"
              description={formatIndianShort(stats.pendingValue) + ' pending value'}
            />
            <StatCard
              title="Total Value"
              value={formatIndianShort(stats.totalValue)}
              icon={<IndianRupee className="w-5 h-5 text-success-600" />}
              iconBg="bg-success-100"
              trend={{ value: 20, direction: 'up', label: 'from last month' }}
            />
          </div>

          {/* Quick Actions - Buttons in a row, no box */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-600" />
              Quick Actions
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Common buyer tasks</p>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: 'Add PO',      sub: 'New purchase order',    icon: Plus,       color: 'text-primary-600', onClick: () => setShowForm(true) },
                { label: 'Asset Status', sub: 'Track asset status',   icon: Package,    color: 'text-info-600',    onClick: () => navigate('/buyer/assets') },
                { label: 'Escalation',  sub: 'Raise issues',          icon: AlertCircle, color: 'text-danger-600', onClick: () => navigate('/buyer/escalation') },
                { label: 'Reports',     sub: 'Generate insights',     icon: FileText,   color: 'text-primary-600', onClick: () => navigate('/buyer/reports') },
                { label: 'Track Orders', sub: 'View progress',        icon: Truck,      color: 'text-warning-600', onClick: () => {
                  const active = purchaseOrders.find(po => ['In Progress', 'Delivered', 'Pending', 'Approved'].includes(po.status));
                  if (active) { setSelectedOrderForProgress(active); setShowOrderProgress(true); }
                  else navigate('/buyer/orders');
                }},
              ].map(action => {
                const Icon = action.icon;
                return (
                  <button key={action.label} onClick={action.onClick}
                    className="flex items-center gap-2 px-4 py-2 border border-surface-border dark:border-slate-700 rounded-card hover:border-primary-200 dark:hover:border-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-all">
                    <Icon className={`w-4 h-4 ${action.color}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 w-full">
            {/* Recent Activity */}
            <SectionCard title="Recent Activity" icon={<Activity className="w-4 h-4 text-primary-600" />}>
              {purchaseOrders.length === 0 ? (
                <EmptyState icon={<FileText className="w-8 h-8 text-gray-300" />} title="No orders yet"
                  action={{ label: 'Create Order', onClick: () => setShowForm(true), icon: <Plus className="w-4 h-4" /> }} />
              ) : (
                <div className="space-y-3">
                  {purchaseOrders.slice(0, 5).map(po => (
                    <div key={po.id} className="flex items-center gap-3 p-3 bg-surface-subtle dark:bg-slate-700 rounded-card hover:bg-primary-50/30 dark:hover:bg-slate-600 transition-colors">
                      <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-300 truncate">{po.poNumber}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{po.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(po.requestedDate).toLocaleDateString()} · {formatIndianShort(po.totalAmount || 0)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={getPublicOrderStatus(po as any)} size="sm" />
                        <Button variant="ghost" size="xs" iconLeft={<Truck className="w-4 h-4" />}
                          onClick={() => { setSelectedOrderForProgress(po); setShowOrderProgress(true); }}
                          title="Track Order" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}

      {/* ── PROCUREMENT VIEW ──────────────────────────────────────────── */}
      {viewMode === 'procurement' && (
        <SectionCard title="Orders" subtitle="Manage mapped orders, deliveries, and final confirmations">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className={SELECT_FIELD_CLASS}
            >
              <option className={SELECT_OPTION_CLASS} value="all">All Departments</option>
              {departments.map(d => <option className={SELECT_OPTION_CLASS} key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className={SELECT_FIELD_CLASS}
            >
              <option className={SELECT_OPTION_CLASS} value="all">All Status</option>
              {['Pending Approval','Approved','Pending','In Progress','Delivered','Completed','Cancelled'].map(s => (
                <option className={SELECT_OPTION_CLASS} key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {filteredPOs.length === 0 ? (
            <EmptyState icon={<FileText className="w-10 h-10 text-gray-300" />} title="No orders found"
              description="Try adjusting your filters or add a new order."
              action={{ label: 'New Order', onClick: () => setShowForm(true), icon: <Plus className="w-4 h-4" /> }} />
          ) : (
            <DataTable data={filteredPOs} columns={procurementColumns} />
          )}
        </SectionCard>
      )}

      {/* ── ASSETS VIEW ───────────────────────────────────────────────── */}
      {viewMode === 'assets' && (
        <div className="space-y-4">
          {/* Asset stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Assets"       value={assets.length}                                           icon={<Package       className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-100" />
            <StatCard title="Active Assets"      value={assets.filter(a => a.status === 'Active').length}        icon={<CheckCircle   className="w-5 h-5 text-success-600" />} iconBg="bg-success-100" />
            <StatCard title="Warranty Expiring"  value={stats.warrantyExpiring}                                  icon={<Clock         className="w-5 h-5 text-warning-600" />} iconBg="bg-warning-100" />
            <StatCard title="AMC Expiring"       value={stats.amcExpiring}                                       icon={<Shield        className="w-5 h-5 text-danger-600"  />} iconBg="bg-danger-100"  />
          </div>

          <SectionCard
            title="Asset Status"
            subtitle="View asset details and current assignee"
            actions={
              <Button variant="ghost" size="sm" disabled={assetsLoading} onClick={refreshAssets}>
                {assetsLoading ? 'Refreshing...' : 'Refresh Assets'}
              </Button>
            }
          >
            {/* Asset Filters */}
            <div className="bg-surface-subtle dark:bg-slate-700/50 p-4 rounded-card mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select value={assetStatusFilter}   onChange={e => setAssetStatusFilter(e.target.value)}   className={SELECT_FIELD_CLASS}>
                  <option className={SELECT_OPTION_CLASS} value="all">All Status</option>
                  <option className={SELECT_OPTION_CLASS} value="Active">Active</option>
                  <option className={SELECT_OPTION_CLASS} value="warranty_expiring_30">Warranty Expiring (30d)</option>
                  <option className={SELECT_OPTION_CLASS} value="warranty_expired">Warranty Expired</option>
                  <option className={SELECT_OPTION_CLASS} value="Under Repair">Under Repair</option>
                  <option className={SELECT_OPTION_CLASS} value="Disposed">Disposed</option>
                </select>
                <select value={assetCategoryFilter} onChange={e => setAssetCategoryFilter(e.target.value)} className={SELECT_FIELD_CLASS}>
                  <option className={SELECT_OPTION_CLASS} value="all">All Categories</option>
                  {assetCategories.map(c => <option className={SELECT_OPTION_CLASS} key={c} value={c}>{c}</option>)}
                </select>
                <select value={assetLocationFilter} onChange={e => setAssetLocationFilter(e.target.value)} className={SELECT_FIELD_CLASS}>
                  <option className={SELECT_OPTION_CLASS} value="all">All Locations</option>
                  {assetLocations.map(l => <option className={SELECT_OPTION_CLASS} key={l} value={l}>{l}</option>)}
                </select>
                <Button variant="ghost" size="sm" onClick={() => { setAssetStatusFilter('all'); setAssetCategoryFilter('all'); setAssetLocationFilter('all'); }}>
                  Clear Filters
                </Button>
              </div>
            </div>

            {assetsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <EmptyState icon={<Package className="w-10 h-10 text-gray-300" />} title="No assets found" description="Try adjusting your filters." />
            ) : (
              <DataTable data={filteredAssets} columns={assetColumns} />
            )}
          </SectionCard>
        </div>
      )}

      {/* ── REPORTS VIEW ──────────────────────────────────────────────── */}
      {viewMode === 'reports' && (
        <BuyerReports
          key={reportsRefreshKey}
          purchaseOrders={purchaseOrders}
          assets={assets}
        />
      )}

      {/* ── ESCALATION VIEW ───────────────────────────────────────────── */}
      {viewMode === 'escalation' && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-surface-border dark:border-slate-700">
            {(['new', 'list'] as const).map(tab => (
              <button key={tab}
                onClick={() => setActiveEscalationTab(tab)}
                className={[
                  'px-6 py-3 font-medium text-sm transition-colors',
                  activeEscalationTab === tab
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-surface-subtle dark:hover:bg-slate-700',
                ].join(' ')}
              >
                {tab === 'new' ? <><Plus size={14} className="inline mr-1.5" />New Escalation</> : <><FileText size={14} className="inline mr-1.5" />All Escalations ({escalations.length})</>}
              </button>
            ))}
          </div>

          {/* New Escalation Form */}
          {activeEscalationTab === 'new' && (
            <SectionCard title="New Escalation">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className={ESCALATION_LABEL_CLASS}>Escalation Title *</label>
                  <input type="text" value={newEscalation.title || ''}
                    onChange={e => setNewEscalation({ ...newEscalation, title: e.target.value })}
                    className={ESCALATION_FIELD_CLASS}
                    placeholder="Enter escalation title" />
                </div>
                <div>
                  <label className={ESCALATION_LABEL_CLASS}>GEM Order</label>
                  <select value={newEscalation.purchaseOrderId || ''}
                    onChange={e => {
                      const po = purchaseOrders.find(p => p.id === e.target.value);
                      setNewEscalation({ ...newEscalation, purchaseOrderId: e.target.value, vendorName: po?.supplier || (po as any)?.sellerName || '' });
                    }}
                    className={ESCALATION_FIELD_CLASS}
                  >
                    <option className={ESCALATION_OPTION_CLASS} value="">Select GEM Order</option>
                    {purchaseOrders.map(po => <option className={ESCALATION_OPTION_CLASS} key={po.id} value={po.id}>{po.poNumber} - {po.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className={ESCALATION_LABEL_CLASS}>Seller Name</label>
                  <input type="text" value={newEscalation.vendorName || ''} readOnly disabled
                    className={`${ESCALATION_FIELD_CLASS} bg-surface-subtle dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed`}
                    placeholder="Select a GEM Order to auto-populate" />
                </div>
                <div>
                  <label className={ESCALATION_LABEL_CLASS}>Escalation Type *</label>
                  <select value={newEscalation.type || 'delivery_delay'}
                    onChange={e => setNewEscalation({ ...newEscalation, type: e.target.value as any })}
                    className={ESCALATION_FIELD_CLASS}
                  >
                    {ESCALATION_TYPES.map(t => <option className={ESCALATION_OPTION_CLASS} key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={ESCALATION_LABEL_CLASS}>Priority *</label>
                  <select value={newEscalation.priority || 'Medium'}
                    onChange={e => setNewEscalation({ ...newEscalation, priority: e.target.value as any })}
                    className={ESCALATION_FIELD_CLASS}
                  >
                    {PRIORITIES.map(p => <option className={ESCALATION_OPTION_CLASS} key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className={ESCALATION_LABEL_CLASS}>Description *</label>
                  <textarea value={newEscalation.description || ''}
                    onChange={e => setNewEscalation({ ...newEscalation, description: e.target.value })}
                    rows={4}
                    className={ESCALATION_FIELD_CLASS}
                    placeholder="Provide detailed description of the issue..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="ghost" onClick={() => setActiveEscalationTab('list')}>Cancel</Button>
                <Button variant="primary" iconLeft={<Send size={14} />} onClick={handleCreateEscalation}>Create Escalation</Button>
              </div>
            </SectionCard>
          )}

          {/* Escalations List */}
          {activeEscalationTab === 'list' && (
            <SectionCard title={`All Escalations (${escalations.length})`}>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select value={filterStatus}   onChange={e => setFilterStatus(e.target.value)}   className={ESCALATION_FILTER_CLASS}>
                  <option className={ESCALATION_OPTION_CLASS} value="all">All Status</option>
                  {['Open','In Progress','Resolved','Closed'].map(s => <option className={ESCALATION_OPTION_CLASS} key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={ESCALATION_FILTER_CLASS}>
                  <option className={ESCALATION_OPTION_CLASS} value="all">All Priorities</option>
                  {PRIORITIES.map(p => <option className={ESCALATION_OPTION_CLASS} key={p} value={p}>{p}</option>)}
                </select>
                <select value={filterType}     onChange={e => setFilterType(e.target.value)}     className={ESCALATION_FILTER_CLASS}>
                  <option className={ESCALATION_OPTION_CLASS} value="all">All Types</option>
                  {ESCALATION_TYPES.map(t => <option className={ESCALATION_OPTION_CLASS} key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {filteredEscalations.length === 0 ? (
                <EmptyState icon={<AlertTriangle className="w-10 h-10 text-gray-300" />} title="No escalations found"
                  description="Try adjusting your filters or create a new escalation."
                  action={{ label: 'New Escalation', onClick: () => setActiveEscalationTab('new'), icon: <Plus className="w-4 h-4" /> }} />
              ) : (
                <DataTable data={filteredEscalations} columns={escalationColumns} />
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* ── CUSTODIANS VIEW ───────────────────────────────────────────── */}
      {viewMode === 'custodians' && <CustodianManagement />}

      {/* ── PROFILE VIEW ──────────────────────────────────────────────── */}
      {/* {viewMode === 'profile' && (
        <SectionCard title="Buyer Profile" subtitle="Read-only profile information from buyer registration.">
          <div className="space-y-8 text-sm">
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Organization Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Organization Type:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.organization_type || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Ministry / Department:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.ministry_department || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Organization Name:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.organization_name || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">GSTIN:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.gstin || '-'}</span></div>
              </div>
            </section>
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Contact Person Name:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.contact_person_name || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Buyer Designation:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.buyer_designation || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Email ID:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.email_id || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Contact Number:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.contact_number || '-'}</span></div>
              </div>
            </section>
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Office Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Zone:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.office_address?.zone || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">City:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.office_address?.city || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">State:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.office_address?.state || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">PIN:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.office_address?.pin || '-'}</span></div>
                <div className="md:col-span-2"><span className="font-medium text-gray-700 dark:text-gray-300">Full Address:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.office_address?.fullAddress || '-'}</span></div>
              </div>
            </section>
            <section>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Business Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Payment Mode:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.payment_mode || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Billing Authority Designation:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.billing_authority_designation || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Consignee Name:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.consignee_name || '-'}</span></div>
                <div><span className="font-medium text-gray-700 dark:text-gray-300">Consignee Designation:</span> <span className="text-gray-900 dark:text-gray-200">{buyerProfile?.consignee_designation || '-'}</span></div>
                <div className="md:col-span-2"><span className="font-medium text-gray-700 dark:text-gray-300">Authorized Designations:</span> <span className="text-gray-900 dark:text-gray-200">{Array.isArray(buyerProfile?.authorized_designations) && buyerProfile.authorized_designations.length > 0 ? buyerProfile.authorized_designations.join(', ') : '-'}</span></div>
                <div className="md:col-span-2"><span className="font-medium text-gray-700 dark:text-gray-300">Contract Reference Numbers:</span> <span className="text-gray-900 dark:text-gray-200">{Array.isArray(buyerProfile?.contract_reference_numbers) && buyerProfile.contract_reference_numbers.length > 0 ? buyerProfile.contract_reference_numbers.join(', ') : '-'}</span></div>
                <div className="md:col-span-2"><span className="font-medium text-gray-700 dark:text-gray-300">Past Work Orders:</span> <span className="text-gray-900 dark:text-gray-200">{Array.isArray(buyerProfile?.past_work_orders) && buyerProfile.past_work_orders.length > 0 ? `${buyerProfile.past_work_orders.length} file(s) uploaded` : 'Not uploaded'}</span></div>
              </div>
            </section>
          </div>
        </SectionCard>
      )} */}
      {viewMode === 'profile' && (
  <SectionCard
    title="Buyer Profile"
    subtitle="Read-only profile information from buyer registration."
  >
    <div className="space-y-6">

      {/* ─────────────────────────────────────────────────────────────
          ORGANIZATION INFORMATION
      ───────────────────────────────────────────────────────────── */}
      <section className="
        rounded-lg
        border border-gray-200 dark:border-slate-700
        bg-gray-50 dark:bg-slate-800/70
        p-5
      ">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary-600 dark:bg-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Organization Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Organization Type */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Organization Type
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.organization_type || '-'}
            </p>
          </div>

          {/* Ministry / Department */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Ministry / Department
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.ministry_department || '-'}
            </p>
          </div>

          {/* Organization Name */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Organization Name
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.organization_name || '-'}
            </p>
          </div>

          {/* GSTIN */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              GSTIN
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.gstin || '-'}
            </p>
          </div>

        </div>
      </section>


      {/* ─────────────────────────────────────────────────────────────
          CONTACT INFORMATION
      ───────────────────────────────────────────────────────────── */}
      <section className="
        rounded-lg
        border border-gray-200 dark:border-slate-700
        bg-gray-50 dark:bg-slate-800/70
        p-5
      ">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary-600 dark:bg-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Contact Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Contact Person */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Contact Person Name
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.contact_person_name || '-'}
            </p>
          </div>

          {/* Buyer Designation */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Buyer Designation
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.buyer_designation || '-'}
            </p>
          </div>

          {/* Email */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Email ID
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 break-all">
              {buyerProfile?.email_id || '-'}
            </p>
          </div>

          {/* Contact Number */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Contact Number
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.contact_number || '-'}
            </p>
          </div>

        </div>
      </section>


      {/* ─────────────────────────────────────────────────────────────
          OFFICE ADDRESS
      ───────────────────────────────────────────────────────────── */}
      <section className="
        rounded-lg
        border border-gray-200 dark:border-slate-700
        bg-gray-50 dark:bg-slate-800/70
        p-5
      ">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary-600 dark:bg-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Office Address
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Zone */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Zone
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.office_address?.zone || '-'}
            </p>
          </div>

          {/* City */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              City
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.office_address?.city || '-'}
            </p>
          </div>

          {/* State */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              State
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.office_address?.state || '-'}
            </p>
          </div>

          {/* PIN */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              PIN
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.office_address?.pin || '-'}
            </p>
          </div>

          {/* Full Address */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Full Address
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-6">
              {buyerProfile?.office_address?.fullAddress || '-'}
            </p>
          </div>

        </div>
      </section>


      {/* ─────────────────────────────────────────────────────────────
          BUSINESS INFORMATION
      ───────────────────────────────────────────────────────────── */}
      <section className="
        rounded-lg
        border border-gray-200 dark:border-slate-700
        bg-gray-50 dark:bg-slate-800/70
        p-5
      ">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-primary-600 dark:bg-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Business Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          {/* Payment Mode */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Payment Mode
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.payment_mode || '-'}
            </p>
          </div>

          {/* Billing Authority */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Billing Authority Designation
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.billing_authority_designation || '-'}
            </p>
          </div>

          {/* Consignee Name */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Consignee Name
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.consignee_name || '-'}
            </p>
          </div>

          {/* Consignee Designation */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Consignee Designation
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
              {buyerProfile?.consignee_designation || '-'}
            </p>
          </div>

          {/* Authorized Designations */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
              Authorized Designations
            </p>

            {Array.isArray(buyerProfile?.authorized_designations) &&
            buyerProfile.authorized_designations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {buyerProfile.authorized_designations.map(
                  (designation, index) => (
                    <span
                      key={index}
                      className="
                        inline-flex items-center
                        px-2.5 py-1
                        rounded-md
                        text-xs font-medium
                        bg-white text-gray-700
                        border border-gray-200
                        dark:bg-slate-700
                        dark:text-slate-200
                        dark:border-slate-600
                      "
                    >
                      {designation}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                -
              </p>
            )}
          </div>

          {/* Contract Reference Numbers */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
              Contract Reference Numbers
            </p>

            {Array.isArray(buyerProfile?.contract_reference_numbers) &&
            buyerProfile.contract_reference_numbers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {buyerProfile.contract_reference_numbers.map(
                  (reference, index) => (
                    <span
                      key={index}
                      className="
                        inline-flex items-center
                        px-2.5 py-1
                        rounded-md
                        text-xs font-medium
                        bg-white text-gray-700
                        border border-gray-200
                        dark:bg-slate-700
                        dark:text-slate-200
                        dark:border-slate-600
                      "
                    >
                      {reference}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                -
              </p>
            )}
          </div>

          {/* Past Work Orders */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
              Past Work Orders
            </p>

            {Array.isArray(buyerProfile?.past_work_orders) &&
            buyerProfile.past_work_orders.length > 0 ? (
              <div className="
                inline-flex items-center
                gap-2
                px-3 py-2
                rounded-md
                bg-white
                border border-gray-200
                dark:bg-slate-700
                dark:border-slate-600
              ">
                <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" />

                <span className="text-sm font-medium text-gray-800 dark:text-slate-200">
                  {buyerProfile.past_work_orders.length} file(s) uploaded
                </span>
              </div>
            ) : (
              <p className="
                inline-flex items-center
                px-3 py-2
                rounded-md
                text-sm
                bg-white text-gray-500
                border border-gray-200
                dark:bg-slate-700
                dark:text-slate-400
                dark:border-slate-600
              ">
                Not uploaded
              </p>
            )}
          </div>

        </div>
      </section>

    </div>
  </SectionCard>
)}

      {/* ── MODALS ────────────────────────────────────────────────────── */}

      {/* Order Completion Confirmation */}
      <Modal
        isOpen={!!orderPendingConfirmation}
        onClose={() => setOrderPendingConfirmation(null)}
        title="Confirm Order Completion"
        size="sm"
      >
        {orderPendingConfirmation && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">All batches are delivered. Mark this order as complete?</p>
            <div className="bg-surface-subtle dark:bg-slate-700/50 rounded-card p-3 text-sm space-y-1">
              <div><span className="font-medium text-gray-900 dark:text-white">Order:</span> <span className="text-gray-700 dark:text-gray-300">{orderPendingConfirmation.poNumber || (orderPendingConfirmation as any).gemContractNumber || orderPendingConfirmation.id}</span></div>
              <div><span className="font-medium text-gray-900 dark:text-white">Seller:</span> <span className="text-gray-700 dark:text-gray-300">{orderPendingConfirmation.supplier || 'N/A'}</span></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOrderPendingConfirmation(null)}>Cancel</Button>
              <Button variant="primary" onClick={confirmOrderCompletion}>Confirm</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Escalation Details */}
      <Modal
        isOpen={!!selectedEscalation}
        onClose={() => setSelectedEscalation(null)}
        title="Escalation Details"
        size="xl"
      >
        {selectedEscalation && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-surface-subtle dark:bg-slate-700/50 rounded-card p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{selectedEscalation.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedEscalation.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={priorityVariant(selectedEscalation.priority)} size="sm">{selectedEscalation.priority} Priority</Badge>
                  <StatusBadge status={selectedEscalation.status} size="sm" />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 lg:text-right">
                  <div>Reported by {selectedEscalation.reportedBy}</div>
                  <div>{new Date(selectedEscalation.reportedDate).toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Status Update */}
            <div className="border border-surface-border dark:border-slate-700 rounded-card p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Update Status</h4>
              <select
                value={selectedEscalation.status}
                onChange={e => updateEscalationStatus(selectedEscalation.id, e.target.value as any)}
                className={ESCALATION_FILTER_CLASS}
              >
                <option className={ESCALATION_OPTION_CLASS} value="Open">Open</option>
                <option className={ESCALATION_OPTION_CLASS} value="In Progress">In Progress</option>
                <option className={ESCALATION_OPTION_CLASS} value="Resolved">Resolved</option>
                <option className={ESCALATION_OPTION_CLASS} value="Closed">Closed</option>
              </select>
            </div>

            {/* Notes */}
            <div className="border border-surface-border dark:border-slate-700 rounded-card p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Notes & Updates</h4>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {(selectedEscalation.notes || []).map((note, i) => (
                  <div key={i} className="p-3 bg-surface-subtle dark:bg-slate-700/50 rounded-card">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">{note.user}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(note.date).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{note.note}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={noteInputValue}
                  onChange={e => setNoteInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && noteInputValue.trim()) { addNote(selectedEscalation.id, noteInputValue); } }}
                  placeholder="Add a note..."
                  className={`${ESCALATION_FIELD_CLASS} flex-1`} />
                <Button variant="primary" size="sm"
                  onClick={() => { if (noteInputValue.trim()) addNote(selectedEscalation.id, noteInputValue); }}>
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Self-contained modals (have their own overlay) */}
      {showForm && (
        <BuyerPurchaseOrderForm
          onClose={() => { setShowForm(false); setEditingPO(null); }}
          onSubmit={handleCreatePO}
          editingPO={editingPO || undefined}
        />
      )}
      {selectedPO && (
        <BuyerPurchaseOrderDetails
          purchaseOrder={selectedPO}
          onClose={() => setSelectedPO(null)}
          onEdit={(po: PurchaseOrder) => { setEditingPO(po); setShowForm(true); setSelectedPO(null); }}
        />
      )}
      {showAssetDetails && selectedAsset && (
        <AssetDetailsModal
          asset={selectedAsset}
          purchaseOrders={purchaseOrders}
          onClose={() => { setShowAssetDetails(false); setSelectedAsset(null); }}
        />
      )}
      {showOrderProgress && selectedOrderForProgress && (
        <OrderProgressModal
          purchaseOrder={selectedOrderForProgress}
          onClose={() => { setShowOrderProgress(false); setSelectedOrderForProgress(null); }}
          onLiveUpdate={() => setReportsRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
};

export default BuyerDashboard;