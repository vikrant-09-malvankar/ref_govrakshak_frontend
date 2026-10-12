import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Clock, Search, Filter, Package, Plus } from 'lucide-react';
import { SellerOrder } from '../../types';
import { ApiService } from '../../services/apiService';
import { getPublicOrderStatus, getStatusColorClass } from '../../utils/orderWorkflow';
import AddOrderForm from '../Seller/AddOrderForm';
import QrPdfDownloadModal from '../Seller/QrPdfDownloadModal';

interface NormalizedContact {
  officerName: string;
  designation: string;
  email: string;
  contactNumber: string;
}

interface NormalizedDeliveryPerson {
  officerName: string;
  designation: string;
  contactNumber: string;
}

interface NormalizedOrderItem {
  id: string;
  productName: string;
  brand: string;
  modelNumber: string;
  categoryType: string;
  quantity: number;
  unitPrice: number;
  gst: number;
  totalPrice: number;
  gstin: string;
  warrantyPeriod: number;
  amcResponsibility: string;
  installationRequired: boolean;
}

interface UiAlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const pickValue = <T = any>(source: any, keys: string[], defaultValue?: T): T => {
  if (!source || typeof source !== 'object') {
    return defaultValue as T;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = source[key];
      if (value !== undefined && value !== null) {
        return value as T;
      }
    }
  }

  return defaultValue as T;
};

const getBuyerContact = (order: any): NormalizedContact => {
  const rawContact = pickValue(order, ['buyerContact', 'buyer_contact'], {});
  const contact = rawContact && typeof rawContact === 'object' ? rawContact : {};

  return {
    officerName: pickValue(contact, ['officerName', 'officer_name'], ''),
    designation: pickValue(contact, ['designation'], ''),
    email: pickValue(contact, ['email'], ''),
    contactNumber: pickValue(contact, ['contactNumber', 'contact_number'], ''),
  };
};

const getDeliveryPerson = (order: any): NormalizedDeliveryPerson => {
  const rawDelivery = pickValue(order, ['projectManager', 'project_manager', 'deliveryPerson', 'delivery_person'], {});
  const delivery = rawDelivery && typeof rawDelivery === 'object' ? rawDelivery : {};

  return {
    officerName: pickValue(delivery, ['officerName', 'officer_name'], ''),
    designation: pickValue(delivery, ['designation'], ''),
    contactNumber: pickValue(delivery, ['contactNumber', 'contact_number'], ''),
  };
};

const getExpectedDeliveryWindow = (order: any) => {
  const rawWindow = pickValue(order, ['expectedDeliveryWindow', 'expected_delivery_window'], {});
  const window = rawWindow && typeof rawWindow === 'object' ? rawWindow : {};

  return {
    startDate: pickValue(window, ['startDate', 'start_date', 'from'], null) as string | null,
    endDate: pickValue(window, ['endDate', 'end_date', 'to'], null) as string | null,
  };
};

const getOrderItems = (order: any): NormalizedOrderItem[] => {
  const rawItems = pickValue(order, ['items'], []);
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => {
      const quantity = Number(pickValue(item, ['quantity'], 0)) || 0;
      const unitPrice = Number(pickValue(item, ['unitPrice', 'unit_price'], 0)) || 0;
      const gstValue = Number(pickValue(item, ['gst', 'gst_amount'], NaN));
      const gst = Number.isFinite(gstValue) ? gstValue : Number((quantity * unitPrice * 0.18).toFixed(2));
      const totalValue = Number(pickValue(item, ['totalPrice', 'total_price'], NaN));
      const totalPrice = Number.isFinite(totalValue) ? totalValue : Number((quantity * unitPrice + gst).toFixed(2));

      return {
        id: pickValue(item, ['id'], `item-${index}`),
        productName: pickValue(item, ['productName', 'product_name'], ''),
        brand: pickValue(item, ['brand'], ''),
        modelNumber: pickValue(item, ['modelNumber', 'model_number'], ''),
        categoryType: pickValue(item, ['categoryType', 'category_type'], ''),
        quantity,
        unitPrice,
        gst,
        totalPrice,
        gstin: pickValue(item, ['gstin'], ''),
        warrantyPeriod: Number(pickValue(item, ['warrantyPeriod', 'warranty_period'], 0)) || 0,
        amcResponsibility: pickValue(item, ['amcResponsibility', 'amc_responsibility'], ''),
        installationRequired: Boolean(pickValue(item, ['installationRequired', 'installation_required'], false)),
      };
    });
};

const getOrderStatus = (order: any): string =>
  String(pickValue(order, ['status'], 'Pending Approval'));

const getOrderSellerName = (order: any): string =>
  pickValue(order, ['sellerName', 'seller_name'], '');

const getOrderDepartment = (order: any): string =>
  pickValue(order, ['gemBuyerDepartmentName', 'gem_buyer_department_name'], '');

const getOrderContractNumber = (order: any): string =>
  pickValue(order, ['gemContractNumber', 'gem_contract_number'], '');

const getOrderCreatedAt = (order: any): string | null =>
  pickValue(order, ['createdAt', 'created_at'], null);

const getOrderTotalAmount = (order: any, items: NormalizedOrderItem[]): number => {
  const total = pickValue(order, ['totalAmount', 'total_amount'], null);
  if (total !== null && total !== undefined) {
    const parsed = Number(total);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return items.reduce((sum, item) => sum + item.totalPrice, 0);
};

const getOrderNotes = (order: any): string =>
  pickValue(order, ['notes'], '');

const getOrderRejectionReason = (order: any): string =>
  pickValue(order, ['rejectionReason', 'rejection_reason'], '');

const formatDate = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

interface SellerOrdersManagementProps {
  onOrderUpdate: (orderId: string, status: 'Approved' | 'Rejected', notes?: string) => void;
}

const SellerOrdersManagement: React.FC<SellerOrdersManagementProps> = ({ onOrderUpdate }) => {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [showAddOrderForm, setShowAddOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SellerOrder | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [uiAlert, setUiAlert] = useState<UiAlertState | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'overview' | 'items' | 'delivery'>('overview');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryBatches, setDeliveryBatches] = useState<Array<{
    batchNumber: string;
    custodianName: string;
    custodianPhone: string;
    custodianEmail: string;
    location: string;
    productName: string;
    quantity: number;
  }>>([]);
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);
  const [showQrModalForOrder, setShowQrModalForOrder] = useState<{ id: string | number; gem: string } | null>(null);

  const showThemedAlert = (type: UiAlertState['type'], message: string) => {
    setUiAlert({ type, message });
    window.setTimeout(() => {
      setUiAlert((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    loadSellerOrders();
  }, []);

  const loadSellerOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getAllSellerOrders();
      setOrders((data as any) || []);
    } catch (err) {
      setError(ApiService.handleError(err));
      console.error('Failed to load seller orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const q = searchTerm.trim().toLowerCase();
    const contractNumber = getOrderContractNumber(order).toLowerCase();
    const department = getOrderDepartment(order).toLowerCase();
    const sellerName = getOrderSellerName(order).toLowerCase();
    const buyerContact = getBuyerContact(order);
    const buyerOfficer = (buyerContact.officerName || '').toLowerCase();

    const matchesSearch = q.length === 0 || [
      contractNumber,
      department,
      sellerName,
      buyerOfficer
    ].some(field => field.includes(q));

    const status = getOrderStatus(order);
    const pub = getPublicOrderStatus(order as any);
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'Approved'
          ? pub === 'Approved'
          : status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddOrderSubmit = async (orderData: any) => {
    try {
      setSubmitting(true);
      let result: any;
      
      if (editingOrder) {
        // Update existing order
        result = await ApiService.updateSellerOrder(editingOrder.id, orderData);
      } else {
        // Create new order
        result = await ApiService.createSellerOrder(orderData);
      }
      
      if (result && (result.success || result.id)) {
        setShowAddOrderForm(false);
        setEditingOrder(null);
        await loadSellerOrders();
      } else {
        setError(result?.error || `Failed to ${editingOrder ? 'update' : 'create'} order. Please try again.`);
      }
    } catch (err) {
      setError(ApiService.handleError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOrderAction = (order: SellerOrder, action: 'approve' | 'reject') => {
    setSelectedOrder(order);
    setApprovalAction(action);
    setApprovalNotes('');
    setShowApprovalModal(true);
  };

  const initializeDeliveryState = (order: SellerOrder) => {
    const raw = (order as any).deliveryInformation ?? (order as any).delivery_information;
    let parsed: any = {};
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = {};
      }
    } else if (raw && typeof raw === 'object') {
      parsed = raw;
    }
    const batches = Array.isArray(parsed?.batches) ? parsed.batches : [];
    setDeliveryBatches(
      batches.length > 0
        ? batches.map((b: any) => ({
            batchNumber: String(b?.batchNumber || ''),
            custodianName: String(b?.custodianName || b?.inventoryManagerName || ''),
            custodianPhone: String(b?.custodianPhone || b?.contactNumber || ''),
            custodianEmail: String(b?.custodianEmail || ''),
            location: String(b?.location || ''),
            productName: String(b?.productName || ''),
            quantity: Number(b?.quantity || 0) || 0,
          }))
        : [
            {
              batchNumber: '',
              custodianName: '',
              custodianPhone: '',
              custodianEmail: '',
              location: '',
              productName: '',
              quantity: 1,
            },
          ]
    );
    setDeliveryNotes(String(parsed?.notes || ''));
  };

  const handleApprovalSubmit = async () => {
    if (selectedOrder) {
      try {
        setLoading(true);

        const updatedOrderData =
          approvalAction === 'approve'
            ? {
                status: 'Pending',
                approvedBy: 'Super Admin',
                approvedAt: new Date().toISOString(),
              }
            : {
                status: 'Rejected',
                rejectionReason: approvalNotes,
                approvedBy: null,
                approvedAt: null,
              };

        await ApiService.updateSellerOrder(selectedOrder.id, updatedOrderData);
        
        // Reload the data
        await loadSellerOrders();
        
        onOrderUpdate(selectedOrder.id, approvalAction === 'approve' ? 'Approved' : 'Rejected', approvalNotes);
        showThemedAlert(
          'success',
          approvalAction === 'approve'
            ? 'Order approved and moved to delivery pending.'
            : 'Order rejected successfully.'
        );
        setShowApprovalModal(false);
        setSelectedOrder(null);
        setApprovalNotes('');
      } catch (err) {
        setError(ApiService.handleError(err));
        showThemedAlert('error', ApiService.handleError(err));
        console.error('Failed to update order:', err);
      } finally {
        setLoading(false);
      }
    }
  };

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
        custodianPhone: '',
        custodianEmail: '',
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
    if (!selectedOrder) return;
    try {
      setDeliverySubmitting(true);
      await ApiService.updateSellerDeliveryInformation(String(selectedOrder.id), {
        batches: deliveryBatches.map((b) => {
          const base: any = {
            batchNumber: b.batchNumber,
            custodianName: b.custodianName,
            custodianPhone: b.custodianPhone,
            contactNumber: b.custodianPhone,
            location: b.location,
            productName: b.productName,
            quantity: Number(b.quantity) || 0,
          };
          if (b.custodianEmail) base.custodianEmail = b.custodianEmail;
          return base;
        }),
        notes: deliveryNotes,
      });
      showThemedAlert('success', 'Delivery batch information updated successfully.');
      await loadSellerOrders();
      const refreshed = (await ApiService.getSellerOrderById(String(selectedOrder.id))) as SellerOrder;
      if (refreshed) {
        setSelectedOrder(refreshed);
        initializeDeliveryState(refreshed);
      }
    } catch (err) {
      showThemedAlert('error', ApiService.handleError(err));
    } finally {
      setDeliverySubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending Approval':
        return <Clock className="w-4 h-4" />;
      case 'Approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'Pending':
        return <Clock className="w-4 h-4" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4" />;
      case 'In Progress':
        return <Clock className="w-4 h-4" />;
      case 'Delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {uiAlert && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
            uiAlert.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : uiAlert.type === 'error'
                ? 'bg-red-100 text-red-800 border border-red-200'
                : uiAlert.type === 'warning'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}
        >
          {uiAlert.message}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Seller Orders Management
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved (released)</option>
              <option value="Pending">Pending (delivery)</option>
              <option value="Rejected">Rejected</option>
              <option value="In Progress">In Progress</option>
              <option value="Delivered">Delivered</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddOrderForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add GeM Order
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-700">Order ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">GeM Contract</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Seller</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Department</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Buyer Contact</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Items</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Total (₹)</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Created</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  Loading orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-red-500">
                  Error: {error}
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{order.id}</td>
                  <td className="px-4 py-3 text-gray-700">{order.gemContractNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{(order as any).sellerName || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{order.gemBuyerDepartmentName}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>
                      <div className="font-medium">{order.buyerContact.officerName}</div>
                      <div className="text-xs text-gray-500">{order.buyerContact.designation}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-semibold">
                    {(() => {
                      const total = (order as any).totalAmount ?? order.items.reduce((sum, it: any) => {
                        const subtotal = (it.quantity || 0) * (it.unitPrice || 0);
                        const gst = it.gst ?? subtotal * 0.18;
                        const lineTotal = it.totalPrice ?? subtotal + gst;
                        return sum + lineTotal;
                      }, 0);
                      return `₹${total.toFixed(2)}`;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass(getPublicOrderStatus(order as any))}`}>
                      {getStatusIcon(getPublicOrderStatus(order as any))}
                      {getPublicOrderStatus(order as any)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {new Date((order as any).createdAt || Date.now()).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActiveDetailsTab('overview');
                          initializeDeliveryState(order);
                          setShowOrderModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {order.status === 'Pending Approval' && (
                        <>
                          <button
                            onClick={() => handleOrderAction(order, 'approve')}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                            title="Approve Order"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOrderAction(order, 'reject')}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            title="Reject Order"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Order Details</h3>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4 flex gap-2 border-b pb-3">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'items', label: 'Order Items' },
                  { id: 'delivery', label: 'Delivery Information' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailsTab(tab.id as 'overview' | 'items' | 'delivery')}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      activeDetailsTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeDetailsTab === 'overview' && (
                <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Order ID:</span> {selectedOrder.id}</div>
                    <div><span className="font-medium">GeM Contract:</span> {selectedOrder.gemContractNumber}</div>
                    <div><span className="font-medium">Category:</span> {selectedOrder.gemOrderCategory}</div>
                    <div><span className="font-medium">Department:</span> {selectedOrder.gemBuyerDepartmentName}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass(getPublicOrderStatus(selectedOrder as any))}`}>
                        {getStatusIcon(getPublicOrderStatus(selectedOrder as any))}
                        {getPublicOrderStatus(selectedOrder as any)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Seller Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Seller:</span> {selectedOrder.sellerName}</div>
                    <div><span className="font-medium">Seller ID:</span> {selectedOrder.sellerId}</div>
                    <div><span className="font-medium">Created:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
                    {selectedOrder.approvedBy && (
                      <div><span className="font-medium">Approved By:</span> {selectedOrder.approvedBy}</div>
                    )}
                    {selectedOrder.approvedAt && (
                      <div><span className="font-medium">Approved At:</span> {new Date(selectedOrder.approvedAt).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Buyer Contact</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedOrder.buyerContact.officerName}</div>
                    <div><span className="font-medium">Designation:</span> {selectedOrder.buyerContact.designation}</div>
                    <div><span className="font-medium">Email:</span> {selectedOrder.buyerContact.email}</div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.buyerContact.contactNumber}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Project Manager</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Name:</span> {selectedOrder.deliveryPerson.officerName}</div>
                    <div><span className="font-medium">Designation:</span> {selectedOrder.deliveryPerson.designation}</div>
                    <div><span className="font-medium">Phone:</span> {selectedOrder.deliveryPerson.contactNumber}</div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Expected Delivery Window</h4>
                <div className="text-sm">
                  <span className="font-medium">From:</span> {new Date(selectedOrder.expectedDeliveryWindow.startDate).toLocaleDateString()} 
                  <span className="font-medium ml-4">To:</span> {new Date(selectedOrder.expectedDeliveryWindow.endDate).toLocaleDateString()}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Order Items</h4>
                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Product:</span> {item.productName}
                        </div>
                        <div>
                          <span className="font-medium">Brand:</span> {item.brand}
                        </div>
                        <div>
                          <span className="font-medium">Model:</span> {item.modelNumber}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {item.categoryType}
                        </div>
                        <div>
                          <span className="font-medium">Quantity:</span> {item.quantity}
                        </div>
                        <div>
                          <span className="font-medium">GSTIN:</span> {item.gstin}
                        </div>
                        <div>
                          <span className="font-medium">Warranty:</span> {item.warrantyPeriod} years
                        </div>
                        <div>
                          <span className="font-medium">AMC:</span> {item.amcResponsibility}
                        </div>
                        <div>
                          <span className="font-medium">Installation:</span> {item.installationRequired ? 'Required' : 'Not Required'}
                        </div>
                        {(() => {
                          const subtotal = (item.quantity || 0) * ((item as any).unitPrice || 0);
                          const gst = (item as any).gst ?? subtotal * 0.18;
                          const total = (item as any).totalPrice ?? subtotal + gst;
                          return (
                            <div className="md:col-span-2 lg:col-span-3 mt-2">
                              <div className="bg-gray-50 rounded p-3 grid grid-cols-3 gap-3">
                                <div><span className="text-gray-600">Unit Price:</span> ₹{(((item as any).unitPrice) ?? 0).toFixed(2)}</div>
                                <div><span className="text-gray-600">GST (18%):</span> ₹{gst.toFixed(2)}</div>
                                <div><span className="text-gray-600">Line Total:</span> ₹{total.toFixed(2)}</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Total Summary */}
              <div className="mt-6 bg-white border rounded-lg p-4">
                {(() => {
                  const grandTotal = (selectedOrder as any).totalAmount ?? selectedOrder.items.reduce((sum, it: any) => {
                    const subtotal = (it.quantity || 0) * (it.unitPrice || 0);
                    const gst = it.gst ?? subtotal * 0.18;
                    const lineTotal = it.totalPrice ?? subtotal + gst;
                    return sum + lineTotal;
                  }, 0);
                  return (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700 font-medium">Total Order Value</div>
                      <div className="text-lg font-semibold text-gray-900">₹{grandTotal.toFixed(2)}</div>
                    </div>
                  );
                })()}
              </div>

              {selectedOrder.rejectionReason && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Rejection Reason</h4>
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {selectedOrder.rejectionReason}
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <div className="text-sm bg-gray-50 p-3 rounded-lg">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}
                </>
              )}

              {activeDetailsTab === 'items' && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Order Items</h4>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div><span className="font-medium">Product:</span> {item.productName}</div>
                          <div><span className="font-medium">Brand:</span> {item.brand}</div>
                          <div><span className="font-medium">Model:</span> {item.modelNumber}</div>
                          <div><span className="font-medium">Category:</span> {item.categoryType}</div>
                          <div><span className="font-medium">Quantity:</span> {item.quantity}</div>
                          <div><span className="font-medium">GSTIN:</span> {item.gstin}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDetailsTab === 'delivery' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Batch Delivery Information</h4>
                  {deliveryBatches.map((batch, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="border rounded px-3 py-2 text-sm" placeholder="Batch Number" value={batch.batchNumber} onChange={(e) => updateBatch(idx, 'batchNumber', e.target.value)} />
                        <input className="border rounded px-3 py-2 text-sm" placeholder="Custodian Name" value={batch.custodianName} onChange={(e) => updateBatch(idx, 'custodianName', e.target.value)} />
                        <input className="border rounded px-3 py-2 text-sm" placeholder="Custodian Phone (+91XXXXXXXXXX)" value={batch.custodianPhone} onChange={(e) => updateBatch(idx, 'custodianPhone', e.target.value)} />
                        <input className="border rounded px-3 py-2 text-sm" placeholder="Custodian Email (optional)" value={batch.custodianEmail} onChange={(e) => updateBatch(idx, 'custodianEmail', e.target.value)} />
                        <input className="border rounded px-3 py-2 text-sm" placeholder="Location" value={batch.location} onChange={(e) => updateBatch(idx, 'location', e.target.value)} />
                        <input className="border rounded px-3 py-2 text-sm" placeholder="Product Name" value={batch.productName} onChange={(e) => updateBatch(idx, 'productName', e.target.value)} />
                        <input className="border rounded px-3 py-2 text-sm" type="number" min={1} placeholder="Quantity" value={batch.quantity} onChange={(e) => updateBatch(idx, 'quantity', Number(e.target.value) || 0)} />
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => removeBatch(idx)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
                    Tip: enter the custodian's phone number even if the buyer hasn't added a custodian record yet. When the buyer creates a custodian with this phone, the batch will be auto-linked.
                  </div>

                  <div className="flex gap-3">
                    <button onClick={addBatch} className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">Add Batch</button>
                  </div>

                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="w-full border rounded px-3 py-2 text-sm"
                    rows={3}
                    placeholder="Delivery notes (optional)"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowQrModalForOrder({ id: selectedOrder.id, gem: (selectedOrder as any).gemContractNumber ?? (selectedOrder as any).gem_contract_number ?? '' })}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Download QR Codes
                    </button>
                    <button
                      onClick={handleSubmitDeliveryInformation}
                      disabled={deliverySubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {deliverySubmitting ? 'Saving...' : 'Save Delivery Information'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {approvalAction === 'approve' ? 'Approve Order' : 'Reject Order'}
              </h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder={approvalAction === 'approve' ? 'Add any notes for approval...' : 'Please provide a reason for rejection...'}
                  required={approvalAction === 'reject'}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalSubmit}
                  disabled={loading || approvalAction === 'reject' && !approvalNotes.trim()}
                  className={`px-4 py-2 rounded-lg text-white ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddOrderForm && (
        <AddOrderForm
          onSubmit={handleAddOrderSubmit}
          onCancel={() => {
            setShowAddOrderForm(false);
            setEditingOrder(null);
          }}
          loading={submitting}
          editingOrder={editingOrder}
        />
      )}

      <QrPdfDownloadModal
        open={showQrModalForOrder !== null}
        onClose={() => setShowQrModalForOrder(null)}
        orderId={showQrModalForOrder?.id ?? null}
        gemContractNumber={showQrModalForOrder?.gem || ''}
      />
    </div>
  );
};

export default SellerOrdersManagement;
