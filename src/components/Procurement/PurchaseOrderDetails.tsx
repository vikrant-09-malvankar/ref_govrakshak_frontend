import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Phone,
  Mail,
  CheckCircle,
  X,
  ChevronRight,
  ChevronDown,
  Clock,
  Eye,
  Truck,
} from 'lucide-react';
import { PurchaseOrder, SellerOrder } from '../../types';
import { getPublicOrderStatus, getStatusColorClass } from '../../utils/orderWorkflow';
import { ApiService, resolveUploadUrl } from '../../services/apiService';
import { OrderTimeline } from '../ui/OrderTimeline';

function parseJsonField<T = unknown>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return undefined;
    }
  }
  return v as T;
}

function normalizeDeliveryInfoFromPO(po: PurchaseOrder): Record<string, unknown> | null {
  const raw = po.deliveryInformation ?? (po as any).delivery_information;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return raw as Record<string, unknown>;
}

function buildMappedOrderWorkflowTimeline(po: PurchaseOrder): Array<{ id: string; label: string; timestamp: string | null; completed: boolean; notes: string }> {
  const deliveryInfo = normalizeDeliveryInfoFromPO(po);
  const deliveryBatches = Array.isArray(deliveryInfo?.batches) ? (deliveryInfo!.batches as any[]) : [];
  const createdAt = po.createdAt || po.requestedDate;
  const approvedAt = ((po as any).approvedDate || po.mappedAt || createdAt) as string | null;
  const deliveryInfoUpdatedAt = (deliveryInfo?.updatedAt as string) || null;
  const completedAt = (deliveryInfo?.buyerConfirmedAt as string) || (po.status === 'Completed' ? po.updatedAt : null);

  const rows: Array<{ id: string; label: string; timestamp: string | null; completed: boolean; notes: string }> = [
    { id: 'order-created', label: 'Order Created', timestamp: createdAt, completed: true, notes: 'Order created' },
    {
      id: 'order-approved',
      label: 'Order Approved',
      timestamp: approvedAt,
      completed: ['Approved', 'In Progress', 'Delivered', 'Completed'].includes(
        getPublicOrderStatus(po as PurchaseOrder)
      ),
      notes: 'Order approved',
    },
    {
      id: 'delivery-info-updated',
      label: 'Delivery Information Updated',
      timestamp: deliveryInfoUpdatedAt,
      completed: Boolean(deliveryInfo && deliveryBatches.length > 0),
      notes: 'Delivery information update',
    },
  ];

  deliveryBatches.forEach((batch: any, index: number) => {
    rows.push({
      id: `batch-delivered-${index}`,
      label: `Batch Delivered (${batch?.batchNumber || `Batch ${index + 1}`})`,
      timestamp: batch?.deliveredAt || batch?.otpSentAt || null,
      completed: batch?.status === 'Delivered',
      notes: 'Each batch delivered',
    });
  });

  rows.push({
    id: 'order-completed',
    label: 'Order Completed',
    timestamp: completedAt ?? null,
    completed: Boolean(completedAt),
    notes: 'Order completed',
  });

  return rows;
}

function formatWorkflowTimestamp(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
}

function formatSupplierContactInfo(contact: unknown): string {
  if (contact == null || contact === '') return '';
  if (typeof contact === 'string') {
    try {
      const parsed = JSON.parse(contact) as Record<string, string>;
      if (typeof parsed === 'object' && parsed !== null) {
        const parts: string[] = [];
        if (parsed.officerName) parts.push(parsed.officerName);
        if (parsed.designation) parts.push(parsed.designation);
        if (parsed.email) parts.push(parsed.email);
        if (parsed.contactNumber) parts.push(parsed.contactNumber);
        return parts.join(' • ');
      }
    } catch {
      return contact;
    }
    return contact;
  }
  if (typeof contact === 'object' && contact !== null) {
    const c = contact as Record<string, string>;
    const parts: string[] = [];
    if (c.officerName) parts.push(c.officerName);
    if (c.designation) parts.push(c.designation);
    if (c.email) parts.push(c.email);
    if (c.contactNumber) parts.push(c.contactNumber);
    return parts.join(' • ');
  }
  return '';
}

interface PurchaseOrderDetailsProps {
  purchaseOrder: PurchaseOrder;
  sellerOrder?: SellerOrder | null;
  onClose: () => void;
  onStatusChange?: (status: string, extras?: { rejectionReason?: string }) => void;
}

const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({ purchaseOrder, sellerOrder, onClose, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'items' | 'documents' | 'delivery'>('overview');
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const [deliveryBatches, setDeliveryBatches] = useState<Array<{
    batchNumber: string;
    custodianName: string;
    contactNumber: string;
    location: string;
    productName: string;
    quantity: number;
  }>>([]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);
  const [deliveryFeedback, setDeliveryFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);

  const mergedPurchaseOrder = useMemo((): PurchaseOrder => {
    if (!sellerOrder) return purchaseOrder;
    const so: any = sellerOrder;
    let fromSo = so.deliveryInformation ?? so.delivery_information;
    if (typeof fromSo === 'string') {
      try {
        fromSo = JSON.parse(fromSo);
      } catch {
        fromSo = undefined;
      }
    }
    if (fromSo && typeof fromSo === 'object') {
      return { ...purchaseOrder, deliveryInformation: fromSo as PurchaseOrder['deliveryInformation'] };
    }
    return purchaseOrder;
  }, [purchaseOrder, sellerOrder]);

  const supplierContactDisplay = useMemo(
    () => formatSupplierContactInfo(mergedPurchaseOrder.supplierContact),
    [mergedPurchaseOrder.supplierContact]
  );

  useEffect(() => {
    const raw = (sellerOrder as any)?.deliveryInformation ?? (sellerOrder as any)?.delivery_information ?? mergedPurchaseOrder.deliveryInformation ?? (mergedPurchaseOrder as any).delivery_information;
    let info: any = {};
    if (typeof raw === 'string') {
      try {
        info = JSON.parse(raw);
      } catch {
        info = {};
      }
    } else if (raw && typeof raw === 'object') {
      info = raw;
    }
    const batches = Array.isArray(info?.batches) ? info.batches : [];
    setDeliveryBatches(
      batches.length > 0
        ? batches.map((b: any) => ({
            batchNumber: String(b?.batchNumber || ''),
            custodianName: String(b?.custodianName || b?.inventoryManagerName || ''),
            contactNumber: String(b?.contactNumber || ''),
            location: String(b?.location || ''),
            productName: String(b?.productName || ''),
            quantity: Number(b?.quantity || 0) || 0,
          }))
        : [
            {
              batchNumber: '',
              custodianName: '',
              contactNumber: '',
              location: '',
              productName: '',
              quantity: 1,
            },
          ]
    );
    setDeliveryNotes(String(info?.notes || ''));
  }, [sellerOrder, mergedPurchaseOrder.deliveryInformation]);

  const updateBatch = (idx: number, key: string, value: string | number) => {
    setDeliveryBatches((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, [key]: value } : b))
    );
  };

  const addBatch = () => {
    setDeliveryBatches((prev) => [
      ...prev,
      {
        batchNumber: '',
        custodianName: '',
        contactNumber: '',
        location: '',
        productName: '',
        quantity: 1,
      },
    ]);
  };

  const removeBatch = (idx: number) => {
    setDeliveryBatches((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const handleSubmitDeliveryInformation = async () => {
    if (!sellerOrder) return;
    try {
      setDeliverySubmitting(true);
      setDeliveryFeedback(null);
      await ApiService.updateSellerDeliveryInformation(String(sellerOrder.id), {
        batches: deliveryBatches.map((b) => ({
          ...b,
          quantity: Number(b.quantity) || 0,
        })),
        notes: deliveryNotes,
      });
      setDeliveryFeedback({ type: 'success', text: 'Delivery information saved successfully.' });
    } catch (err) {
      setDeliveryFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save delivery information.',
      });
    } finally {
      setDeliverySubmitting(false);
    }
  };

  const workflowTimeline = useMemo(() => buildMappedOrderWorkflowTimeline(mergedPurchaseOrder), [mergedPurchaseOrder]);

  const documentRows = useMemo(() => {
    const rows: { label: string; path: string }[] = [];
    const so: any = sellerOrder || {};
    const add = (label: string, path?: string | null) => {
      if (path && String(path).trim()) rows.push({ label, path: String(path).trim() });
    };
    add('GeM order document', mergedPurchaseOrder.gemOrderFilePath || so.gem_order_file || so.gemOrderFile);
    add('OEM authorization letter', mergedPurchaseOrder.oemAuthorizationLetterPath || so.oem_authorization_letter || so.oemAuthorizationLetter);
    add('Work order', mergedPurchaseOrder.workOrderFilePath || so.work_order_file || so.workOrderFile);
    add('Purchase order', mergedPurchaseOrder.purchaseOrderFilePath || so.purchase_order_file || so.purchaseOrderFile);
    (mergedPurchaseOrder.attachments || []).forEach((a, i) => {
      if (a) add(`Attachment ${i + 1}`, a);
    });
    return rows;
  }, [mergedPurchaseOrder, sellerOrder]);

  // Focus trap, Esc, and body scroll lock
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const canApproveReject =
    Boolean(onStatusChange) &&
    String(mergedPurchaseOrder.status || '') === 'Pending Approval' &&
    Boolean(sellerOrder || String(purchaseOrder.id || '').startsWith('SO-'));

  const handleApprove = async () => {
    if (!onStatusChange) return;
    try {
      setStatusBusy(true);
      await onStatusChange('Pending');
    } finally {
      setStatusBusy(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!onStatusChange) return;
    if (!rejectionReason.trim()) return;
    try {
      setStatusBusy(true);
      await onStatusChange('Rejected', { rejectionReason: rejectionReason.trim() });
      setRejectOpen(false);
    } finally {
      setStatusBusy(false);
    }
  };

  


  const getStatusColor = (status: string) => getStatusColorClass(status);

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getProgressPercentage = () => {
    const statusOrder = ['Pending Approval', 'Approved', 'In Progress', 'Delivered', 'Completed'];
    const pub = getPublicOrderStatus(mergedPurchaseOrder as PurchaseOrder);
    const currentIndex = Math.max(0, statusOrder.indexOf(pub));
    return Math.round(((currentIndex + 1) / statusOrder.length) * 100);
  };

  const isSellerOrderView = Boolean(sellerOrder) || purchaseOrder.id.startsWith('SO-');
  const so: any = sellerOrder || {};
  const buyerContactView =
    parseJsonField<Record<string, string>>(so.buyerContact) ??
    parseJsonField<Record<string, string>>(so.buyer_contact) ??
    (typeof mergedPurchaseOrder.supplierContact === 'object' ? (mergedPurchaseOrder.supplierContact as any) : undefined);
  const projectManagerView =
    parseJsonField<Record<string, string>>(so.projectManager) ??
    parseJsonField<Record<string, string>>(so.project_manager) ??
    parseJsonField<Record<string, string>>(so.deliveryPerson) ??
    parseJsonField<Record<string, string>>(so.delivery_person);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg w-full max-w-4xl lg:max-w-6xl max-h-[95vh] overflow-hidden shadow-xl focus:outline-none flex flex-col"
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{purchaseOrder.poNumber}</h2>
            <p className="text-sm sm:text-base text-gray-600 truncate">{purchaseOrder.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        {/* Status / assignee badges */}
        <div className="flex flex-wrap gap-2 px-4 sm:px-6 pt-4 pb-2 flex-shrink-0">
          <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(getPublicOrderStatus(mergedPurchaseOrder as PurchaseOrder))}`} title="Status">{getPublicOrderStatus(mergedPurchaseOrder as PurchaseOrder)}</span>
          {mergedPurchaseOrder.assigneeName && (
            <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium" title="Assignee">{mergedPurchaseOrder.assigneeName}</span>
          )}
        </div>
        {/* Order lifecycle timeline */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-y border-gray-100 flex-shrink-0">
          <OrderTimeline
            status={mergedPurchaseOrder.status}
            approvedBy={(mergedPurchaseOrder as any).approvedBy ?? (mergedPurchaseOrder as any).approved_by}
          />
        </div>
        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex flex-wrap space-x-2 sm:space-x-8 px-4 sm:px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'timeline', label: 'Timeline', icon: Clock },
              { id: 'items', label: 'Items', icon: FileText },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'delivery', label: 'Delivery', icon: Truck }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.substring(0, 3)}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">{getProgressPercentage()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg max-w-md">
                <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Current Status</h3>
                <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full ${getStatusColor(getPublicOrderStatus(mergedPurchaseOrder as PurchaseOrder))}`}>
                  {getPublicOrderStatus(mergedPurchaseOrder as PurchaseOrder)}
                </span>
              </div>

              {isSellerOrderView ? (
                <>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">GeM &amp; order</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg text-sm">
                      <div className="flex justify-between gap-2"><span className="text-gray-600">GeM contract number</span><span className="font-medium text-right">{so.gem_contract_number || so.gemContractNumber || mergedPurchaseOrder.gemContractNumber || '—'}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-600">Order category</span><span className="font-medium text-right">{so.gem_order_category || so.gemOrderCategory || mergedPurchaseOrder.gemOrderCategory || '—'}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-600">Buyer department (GeM)</span><span className="font-medium text-right">{so.gem_buyer_department_name || so.gemBuyerDepartmentName || mergedPurchaseOrder.department || '—'}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-gray-600">Expected delivery</span><span className="font-medium text-right">
                        {(mergedPurchaseOrder.expectedDeliveryStartDate || so.expected_delivery_window?.startDate || so.expectedDeliveryWindow?.startDate)
                          ? `${new Date((mergedPurchaseOrder.expectedDeliveryStartDate || so.expected_delivery_window?.startDate || so.expectedDeliveryWindow?.startDate) as string).toLocaleDateString()} – ${new Date((mergedPurchaseOrder.expectedDeliveryEndDate || so.expected_delivery_window?.endDate || so.expectedDeliveryWindow?.endDate || mergedPurchaseOrder.expectedDeliveryDate) as string).toLocaleDateString()}`
                          : new Date(mergedPurchaseOrder.expectedDeliveryDate).toLocaleDateString()}
                      </span></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Parties</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                        <p className="font-medium text-gray-900">Seller</p>
                        <p className="text-gray-700">{so.seller_name || so.sellerName || mergedPurchaseOrder.supplier}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
                        <p className="font-medium text-gray-900">Buyer</p>
                        <p className="text-gray-700">{so.buyer_name || so.buyerName || mergedPurchaseOrder.buyerName || '—'}</p>
                        {mergedPurchaseOrder.mappedAt && (
                          <p className="text-xs text-gray-500">Mapped {new Date(mergedPurchaseOrder.mappedAt).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3 text-sm">Buyer contact</h3>
                      {buyerContactView ? (
                        <div className="text-sm text-gray-700 space-y-1">
                          <p className="font-medium text-gray-900">{buyerContactView.officerName || '—'}</p>
                          <p>{buyerContactView.designation || '—'}</p>
                          <div className="flex items-center mt-2"><Mail size={14} className="text-gray-400 mr-2" /><span>{buyerContactView.email || '—'}</span></div>
                          <div className="flex items-center"><Phone size={14} className="text-gray-400 mr-2" /><span>{buyerContactView.contactNumber || '—'}</span></div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not provided</p>
                      )}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3 text-sm">Project manager</h3>
                      {projectManagerView ? (
                        <div className="text-sm text-gray-700 space-y-1">
                          <p className="font-medium text-gray-900">{projectManagerView.officerName || '—'}</p>
                          <p>{projectManagerView.designation || '—'}</p>
                          <div className="flex items-center"><Phone size={14} className="text-gray-400 mr-2" /><span>{projectManagerView.contactNumber || '—'}</span></div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Not provided</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Line items</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Brand / Model</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-700">Qty</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-700">Unit</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(so.items || mergedPurchaseOrder.items || []).map((it: any, idx: number) => (
                            <tr key={it.id || idx}>
                              <td className="px-3 py-2">{it.productName || it.product_name || it.assetName || '—'}</td>
                              <td className="px-3 py-2 text-gray-600">{[it.brand, it.modelNumber || it.model_number].filter(Boolean).join(' ') || it.description || '—'}</td>
                              <td className="px-3 py-2 text-right">{it.quantity ?? '—'}</td>
                              <td className="px-3 py-2 text-right">{it.unitPrice != null || it.unit_price != null ? `₹${Number(it.unitPrice ?? it.unit_price).toLocaleString()}` : '—'}</td>
                              <td className="px-3 py-2 text-right font-medium">{it.totalPrice != null || it.total_price != null ? `₹${Number(it.totalPrice ?? it.total_price).toLocaleString()}` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 flex justify-end text-sm">
                      <span className="text-gray-600 mr-2">Order total</span>
                      <span className="font-semibold">₹{Number(mergedPurchaseOrder.totalAmount || so.total_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </>
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Purchase Order Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">₹{mergedPurchaseOrder.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Currency:</span>
                      <span className="font-medium">{mergedPurchaseOrder.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Delivery:</span>
                      <span className="font-medium">{new Date(mergedPurchaseOrder.expectedDeliveryDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items:</span>
                      <span className="font-medium">{mergedPurchaseOrder.items.length}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Department Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium">{mergedPurchaseOrder.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Requested By:</span>
                      <span className="font-medium">{mergedPurchaseOrder.requestedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Requested Date:</span>
                      <span className="font-medium">{new Date(mergedPurchaseOrder.requestedDate).toLocaleDateString()}</span>
                    </div>
                    {mergedPurchaseOrder.approvedBy && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Approved By:</span>
                        <span className="font-medium">{mergedPurchaseOrder.approvedBy}</span>
                      </div>
                    )}
                    {mergedPurchaseOrder.assigneeName && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Assignee:</span>
                        <span className="font-medium">{mergedPurchaseOrder.assigneeName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* Supplier Information (from order — vendor registry removed) */}
              {mergedPurchaseOrder.supplier && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Supplier Information</h3>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <p className="font-medium text-gray-900">{mergedPurchaseOrder.supplier}</p>
                    {supplierContactDisplay ? (
                      <p className="text-sm text-gray-600 mt-2">{supplierContactDisplay}</p>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(mergedPurchaseOrder.notes || so.notes) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700">{mergedPurchaseOrder.notes || so.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-4">Order Timeline</h3>
              <p className="text-sm text-gray-500 mb-4">Same progression as shown to the buyer after the order is mapped.</p>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-6">
                  {workflowTimeline.map((item, index) => (
                    <div key={item.id} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.completed ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <div className={item.completed ? 'text-blue-600' : 'text-gray-500'}>
                            {item.completed ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                        </div>
                        {index < workflowTimeline.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200 mx-auto mt-2" />
                        )}
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{item.label}</span>
                            {item.completed && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">{formatWorkflowTimestamp(item.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Batch Delivery Information</h3>
              {!isSellerOrderView && (
                <p className="text-sm text-gray-500">
                  This tab is available for orders originating from seller GeM orders. For pure buyer POs,
                  delivery is managed via seller deliveries and buyer confirmation.
                </p>
              )}
              {isSellerOrderView && (
                <>
                  {deliveryBatches.map((batch, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className="border rounded px-3 py-2 text-sm"
                          placeholder="Batch Number"
                          value={batch.batchNumber}
                          onChange={(e) => updateBatch(idx, 'batchNumber', e.target.value)}
                        />
                        <input
                          className="border rounded px-3 py-2 text-sm"
                          placeholder="Custodian Name"
                          value={batch.custodianName}
                          onChange={(e) => updateBatch(idx, 'custodianName', e.target.value)}
                        />
                        <input
                          className="border rounded px-3 py-2 text-sm"
                          placeholder="Contact Number"
                          value={batch.contactNumber}
                          onChange={(e) => updateBatch(idx, 'contactNumber', e.target.value)}
                        />
                        <input
                          className="border rounded px-3 py-2 text-sm"
                          placeholder="Location"
                          value={batch.location}
                          onChange={(e) => updateBatch(idx, 'location', e.target.value)}
                        />
                        <input
                          className="border rounded px-3 py-2 text-sm"
                          placeholder="Product Name"
                          value={batch.productName}
                          onChange={(e) => updateBatch(idx, 'productName', e.target.value)}
                        />
                        <input
                          className="border rounded px-3 py-2 text-sm"
                          type="number"
                          min={1}
                          placeholder="Quantity"
                          value={batch.quantity}
                          onChange={(e) => updateBatch(idx, 'quantity', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => removeBatch(idx)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 mb-3">
                    <button
                      onClick={addBatch}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                      Add Batch
                    </button>
                  </div>

                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Delivery notes (optional)"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitDeliveryInformation}
                      disabled={deliverySubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {deliverySubmitting ? 'Saving...' : 'Save Delivery Information'}
                    </button>
                  </div>
                  {deliveryFeedback && (
                    <p className={`text-sm ${deliveryFeedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {deliveryFeedback.text}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-4">Order Items</h3>
              {mergedPurchaseOrder.items.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleItemExpansion(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.assetName}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">₹{item.totalPrice.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(item.deliveryStatus)}`}>
                          {item.deliveryStatus}
                        </span>
                        {expandedItems.includes(item.id) ? (
                          <ChevronDown size={16} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedItems.includes(item.id) && (
                    <div className="px-4 pb-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Specifications</h5>
                          <p className="text-sm text-gray-600">{item.specifications}</p>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-2">Delivery Information</h5>
                          <div className="space-y-1">
                            {item.estimatedDeliveryDate && (
                              <p className="text-sm text-gray-600">
                                Estimated: {new Date(item.estimatedDeliveryDate).toLocaleDateString()}
                              </p>
                            )}
                            {item.actualDeliveryDate && (
                              <p className="text-sm text-gray-600">
                                Actual: {new Date(item.actualDeliveryDate).toLocaleDateString()}
                              </p>
                            )}
                            {item.assetId && (
                              <p className="text-sm text-gray-600">
                                UIFID: {item.assetId}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 mb-4">Documents &amp; attachments</h3>
              {documentRows.length > 0 ? (
                <div className="space-y-3">
                  {documentRows.map((doc, index) => {
                    const fileLabel = doc.path.split(/[/\\]/).pop() || doc.label;
                    const url = resolveUploadUrl(doc.path);
                    return (
                      <div key={`${doc.label}-${index}`} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3 min-w-0">
                          <FileText size={20} className="text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{doc.label}</p>
                            <p className="text-xs text-gray-500 truncate" title={doc.path}>{fileLabel}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!url}
                          onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye size={16} />
                          Preview
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No documents attached</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0">
          <div className="flex flex-wrap gap-2">
            {canApproveReject && !rejectOpen && (
              <>
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={handleApprove}
                  className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {statusBusy ? 'Saving...' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={statusBusy}
                  onClick={() => setRejectOpen(true)}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  Reject
                </button>
              </>
            )}
            {canApproveReject && rejectOpen && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Rejection reason (required)"
                  className="border rounded-lg px-3 py-2 text-sm min-w-[220px]"
                />
                <button
                  type="button"
                  disabled={statusBusy || !rejectionReason.trim()}
                  onClick={handleRejectConfirm}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  Confirm Reject
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectOpen(false); setRejectionReason(''); }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm sm:text-base"
            >
              Close
            </button>
            <button className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base">
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderDetails; 