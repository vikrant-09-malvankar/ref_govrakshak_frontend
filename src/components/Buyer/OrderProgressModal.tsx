import React, { useEffect, useState } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle, 
  Truck, 
  Package,
  Factory,
  FileText,
  MessageSquare,
  Download,
  Radio
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { PurchaseOrder, PurchaseOrderStatus } from '../../types';
import { getPublicOrderStatus } from '../../utils/orderWorkflow';
import { OrderTimeline } from '../ui/OrderTimeline';
import { ApiService } from '../../services/apiService';

interface OrderProgressModalProps {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
  onLiveUpdate?: () => void;
}

const OrderProgressModal: React.FC<OrderProgressModalProps> = ({ 
  purchaseOrder, 
  onClose,
  onLiveUpdate
}) => {
  const { isDarkMode } = useTheme();
  const [liveEvents, setLiveEvents] = useState<Array<{ type: string; at: string }>>([]);

  useEffect(() => {
    const rawId = (purchaseOrder as any)?.sellerOrderId ?? purchaseOrder?.id;
    const numericId = typeof rawId === 'string' && rawId.startsWith('SO-')
      ? Number(rawId.slice(3))
      : Number(rawId);
    if (!Number.isFinite(numericId)) return;
    const unsubscribe = ApiService.subscribeToSellerOrder(numericId, (event: any) => {
      setLiveEvents((prev) => [{ type: String(event?.type || 'event'), at: String(event?.at || new Date().toISOString()) }, ...prev].slice(0, 10));
      if (onLiveUpdate) onLiveUpdate();
    });
    return () => unsubscribe();
  }, [purchaseOrder?.id, onLiveUpdate]);
  // Helper function to format supplier contact information
  const formatSupplierContact = (supplierContact: any) => {
    if (!supplierContact) return 'N/A';
    
    // If it's already a string, try to parse it as JSON first
    if (typeof supplierContact === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(supplierContact);
        if (typeof parsed === 'object' && parsed !== null) {
          // It's a JSON string, format it as an object
          const parts = [];
          if (parsed.officerName) parts.push(parsed.officerName);
          if (parsed.designation) parts.push(parsed.designation);
          if (parsed.email) parts.push(parsed.email);
          if (parsed.contactNumber) parts.push(parsed.contactNumber);
          return parts.join(' • ');
        }
        // If parsing succeeds but it's not an object, return as string
        return supplierContact;
      } catch (e) {
        // If parsing fails, return as string
        return supplierContact;
      }
    }
    
    // If it's an object, format it nicely
    if (typeof supplierContact === 'object') {
      const contact = supplierContact;
      const parts = [];
      
      if (contact.officerName) parts.push(contact.officerName);
      if (contact.designation) parts.push(contact.designation);
      if (contact.email) parts.push(contact.email);
      if (contact.contactNumber) parts.push(contact.contactNumber);
      
      return parts.join(' • ');
    }
    
    return 'N/A';
  };

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Pending Approval':
        return 'text-gray-600';
      case 'Pending':
        return 'text-slate-600';
      case 'Approved':
        return 'text-blue-600';
      case 'In Progress':
        return 'text-orange-600';
      case 'Delivered':
      case 'Completed':
        return 'text-green-600';
      case 'Rejected':
      case 'Cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Pending Approval':
        return 'bg-gray-100';
      case 'Pending':
        return 'bg-slate-100';
      case 'Approved':
        return 'bg-blue-100';
      case 'In Progress':
        return 'bg-orange-100';
      case 'Delivered':
      case 'Completed':
        return 'bg-green-100';
      case 'Rejected':
      case 'Cancelled':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getProgressPercentage = () => {
    const statusOrder = ['Pending Approval', 'Approved', 'In Progress', 'Delivered', 'Completed'];
    const pub = getPublicOrderStatus(purchaseOrder) as PurchaseOrderStatus;
    const currentIndex = Math.max(0, statusOrder.indexOf(pub));
    return Math.round(((currentIndex + 1) / statusOrder.length) * 100);
  };

  const getDeliveryStatus = () => {
    const today = new Date();
    const expectedDate = new Date(purchaseOrder.expectedDeliveryDate);
    const diffTime = expectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (purchaseOrder.status === 'Completed' || purchaseOrder.status === 'Delivered') {
      return { status: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else if (diffDays < 0) {
      return { status: 'Overdue', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else if (diffDays <= 7) {
      return { status: 'Due Soon', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    } else {
      return { status: 'On Track', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
  };

  const deliveryStatus = getDeliveryStatus();
  const deliveryInfo = (() => {
    const raw = (purchaseOrder as any).deliveryInformation || (purchaseOrder as any).delivery_information;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  })();
  const deliveryBatches = Array.isArray(deliveryInfo?.batches) ? deliveryInfo.batches : [];
  const deliveredBatches = deliveryBatches.filter((b: any) => b?.status === 'Delivered').length;
  const formatTimestamp = (value: any) => {
    if (!value) return 'Not available';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'Not available';
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
  };
  const workflowTimeline = (() => {
    const createdAt = purchaseOrder.createdAt || purchaseOrder.requestedDate;
    const approvedAt = (purchaseOrder as any).approvedDate || (purchaseOrder as any).mappedAt || createdAt;
    const deliveryInfoUpdatedAt = deliveryInfo?.updatedAt || null;
    const completedAt = deliveryInfo?.buyerConfirmedAt || (purchaseOrder.status === 'Completed' ? purchaseOrder.updatedAt : null);

    const rows: Array<{ id: string; label: string; timestamp: any; completed: boolean; notes: string }> = [
      {
        id: 'order-created',
        label: 'Order Created',
        timestamp: createdAt,
        completed: true,
        notes: 'Order created',
      },
      {
        id: 'order-approved',
        label: 'Order Approved',
        timestamp: approvedAt,
        completed: ['Approved', 'In Progress', 'Delivered', 'Completed'].includes(
          getPublicOrderStatus(purchaseOrder)
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
        timestamp: batch?.deliveredAt || null,
        completed: batch?.status === 'Delivered',
        notes: 'Each batch delivered',
      });
    });

    rows.push({
      id: 'order-completed',
      label: 'Order Completed',
      timestamp: completedAt,
      completed: Boolean(completedAt),
      notes: 'Order completed',
    });

    return rows;
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} border-b`}>
          <div>
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Order Progress</h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              PO: {purchaseOrder.poNumber} - {purchaseOrder.title}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-700'} mt-1 inline-flex items-center gap-1`}>
              <Radio className="w-3 h-3 animate-pulse" />
              Live updates active{liveEvents.length > 0 ? ` • last: ${liveEvents[0].type.replace(/_/g, ' ')}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ── Order lifecycle timeline ──────────────────────────── */}
        <div className={`px-6 py-4 ${isDarkMode ? 'border-slate-700 bg-slate-700' : 'border-gray-100 bg-gray-50'} border-b`}>
          <p className={`text-xs font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-400'} uppercase tracking-widest mb-3`}>Order Progress</p>
          <OrderTimeline
            status={purchaseOrder.status}
            approvedBy={(purchaseOrder as any).approvedBy ?? (purchaseOrder as any).approved_by}
          />
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Details */}
            <div className="lg:col-span-1">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Order Information</h3>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4 space-y-3`}>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>PO Number:</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseOrder.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department:</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseOrder.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Amount:</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{purchaseOrder.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Expected Delivery:</span>
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{purchaseOrder.expectedDeliveryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor(getPublicOrderStatus(purchaseOrder) as PurchaseOrderStatus)}`}>
                    {getPublicOrderStatus(purchaseOrder)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Delivery Status:</span>
                  <span className={`text-sm font-medium ${deliveryStatus.color}`}>
                    {deliveryStatus.status}
                  </span>
                </div>
                {deliveryBatches.length > 0 && (
                  <div className="flex justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Batch Progress:</span>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                      {deliveredBatches}/{deliveryBatches.length} Delivered
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Overall Progress</span>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{getProgressPercentage()}%</span>
                </div>
                <div className={`w-full ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'} rounded-full h-2`}>
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-6">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Order Items</h3>
                <div className="space-y-3">
                  {purchaseOrder.items.map((item) => (
                    <div key={item.id} className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.assetName}</h4>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.description}</p>
                        </div>
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          ₹{item.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Qty: {item.quantity}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBgColor(item.deliveryStatus as PurchaseOrderStatus)} ${getStatusColor(item.deliveryStatus as PurchaseOrderStatus)}`}>
                          {item.deliveryStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="lg:col-span-2">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Order Timeline</h3>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-6`}>
                <div className="space-y-6">
                  {workflowTimeline.map((item, index) => (
                    <div key={item.id} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.completed ? (isDarkMode ? 'bg-blue-900' : 'bg-blue-100') : (isDarkMode ? 'bg-slate-600' : 'bg-gray-100')
                        }`}>
                          <div className={item.completed ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}>
                            {item.completed ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                        </div>
                        {index < workflowTimeline.length - 1 && (
                          <div className={`w-0.5 h-12 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-200'} mx-auto mt-2`}></div>
                        )}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.label}</span>
                            {item.completed && (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                          </div>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{item.notes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-6">
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Contact Information</h3>
                <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                  <div className="space-y-3">
                    <div>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Supplier:</span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{purchaseOrder.supplier}</p>
                    </div>
                    <div>
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contact:</span>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatSupplierContact(purchaseOrder.supplierContact)}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact Supplier
                      </button>
                      <button className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${isDarkMode ? 'bg-slate-600 text-gray-300 hover:bg-slate-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PO
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {deliveryBatches.length > 0 && (
                <div className="mt-6">
                  <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Batch Delivery Status</h3>
                  <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
                    <table className="w-full">
                      <thead className={isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Batch No.</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Product</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Quantity</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Custodian</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Location</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Date</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDarkMode ? 'divide-slate-600' : 'divide-gray-200'}`}>
                        {deliveryBatches.map((batch: any, idx: number) => (
                          <tr key={`${batch?.batchNumber || idx}-${idx}`} className={isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}>
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batch?.batchNumber || `Batch ${idx + 1}`}</td>
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>{batch?.productName || '-'}</td>
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>{batch?.quantity ?? '-'}</td>
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>{batch?.custodianName || batch?.inventoryManagerName || '-'}</td>
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>{batch?.location || '-'}</td>
                            <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>{formatTimestamp(batch?.deliveredAt || batch?.otpSentAt)}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${batch?.status === 'Delivered' ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700')}`}>
                                {batch?.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderProgressModal; 