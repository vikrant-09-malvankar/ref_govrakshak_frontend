import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Truck, 
  Factory,
  FileText,
  Calendar,
  MessageSquare,
  Upload
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus, ProcurementTimeline } from '../../types';
import { getPublicOrderStatus } from '../../utils/orderWorkflow';

interface OrderStatusUpdateModalProps {
  purchaseOrder: PurchaseOrder;
  onSubmit: (orderId: string, newStatus: PurchaseOrderStatus, notes?: string, attachments?: File[]) => void;
  onClose: () => void;
  loading?: boolean;
}

const OrderStatusUpdateModal: React.FC<OrderStatusUpdateModalProps> = ({
  purchaseOrder,
  onSubmit,
  onClose,
  loading = false
}) => {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<PurchaseOrderStatus>(purchaseOrder.status);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);

  const timeline: ProcurementTimeline[] = (() => {
    const steps: PurchaseOrderStatus[] = [
      'Pending Approval', 'Approved', 'Pending', 'In Progress', 'Delivered', 'Completed',
    ];
    const items: ProcurementTimeline[] = [];
    const effectiveStatus = getPublicOrderStatus(purchaseOrder) as PurchaseOrderStatus;
    steps.forEach((status, idx) => {
      const reached = (() => {
        const order = steps;
        const cur = order.includes(effectiveStatus) ? effectiveStatus : (purchaseOrder.status as PurchaseOrderStatus);
        const curIdx = Math.max(0, order.indexOf(cur));
        return order.indexOf(status) <= curIdx;
      })();
      if (!reached && status !== purchaseOrder.status) return;
      items.push({
        id: String(idx + 1),
        purchaseOrderId: purchaseOrder.id,
        status,
        timestamp: purchaseOrder.updatedAt || purchaseOrder.createdAt,
        updatedBy: purchaseOrder.updatedBy || purchaseOrder.requestedBy || 'System',
        notes: status === 'Pending Approval' ? 'Order created' : (status === purchaseOrder.status ? 'Current status' : `Moved to ${status}`)
      });
    });
    return items;
  })();

  const statusOptions: { value: PurchaseOrderStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'In Progress', label: 'In Progress', icon: <Factory className="w-4 h-4" />, color: 'text-blue-600' },
    { value: 'Delivered', label: 'Delivered', icon: <Truck className="w-4 h-4" />, color: 'text-purple-600' },
    { value: 'Completed', label: 'Completed', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600' },
  ];

  const getStatusIcon = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Pending Approval':
        return <FileText className="w-4 h-4" />;
      case 'Approved':
      case 'Pending':
        return <CheckCircle className="w-4 h-4" />;
      case 'In Progress':
        return <Factory className="w-4 h-4" />;
      case 'Delivered':
        return <Truck className="w-4 h-4" />;
      case 'Completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'Pending Approval':
        return 'text-gray-600';
      case 'Approved':
      case 'Pending':
        return 'text-blue-600';
      case 'In Progress':
        return 'text-orange-600';
      case 'Delivered':
      case 'Completed':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(purchaseOrder.id, selectedStatus, notes, attachments);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Update Order Status</h2>
            <p className="text-sm text-gray-600 mt-1">
              PO: {purchaseOrder.poNumber} - {purchaseOrder.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">PO Number:</span>
                  <span className="text-sm font-medium">{purchaseOrder.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Department:</span>
                  <span className="text-sm font-medium">{purchaseOrder.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="text-sm font-medium">₹{purchaseOrder.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Expected Delivery:</span>
                  <span className="text-sm font-medium">{purchaseOrder.expectedDeliveryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor(purchaseOrder.status)}`}>
                    {purchaseOrder.status}
                  </span>
                </div>
              </div>

              {/* Status Update Form */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Update Status</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Status
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {statusOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedStatus === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={option.value}
                            checked={selectedStatus === option.value}
                            onChange={(e) => setSelectedStatus(e.target.value as PurchaseOrderStatus)}
                            className="sr-only"
                          />
                          <div className={`mr-3 ${option.color}`}>
                            {option.icon}
                          </div>
                          <span className="text-sm font-medium">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add any additional notes about this status update..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attachments (Optional)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="w-full"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Supported formats: PDF, DOC, DOCX, JPG, PNG
                      </p>
                    </div>
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-700">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || selectedStatus === purchaseOrder.status}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading ? 'Updating...' : 'Update Status'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Order Timeline</h3>
                <button
                  onClick={() => setShowTimeline(!showTimeline)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {showTimeline ? 'Hide' : 'Show'} Timeline
                </button>
              </div>

              {showTimeline && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-4">
                    {timeline.map((item, index) => (
                      <div key={item.id} className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === timeline.length - 1 ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <div className={getStatusColor(item.status)}>
                              {getStatusIcon(item.status)}
                            </div>
                          </div>
                          {index < timeline.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-200 mx-auto mt-2"></div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{item.status}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                          <p className="text-xs text-gray-500 mt-1">Updated by: {item.updatedBy}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                <div className="space-y-3">
                  {purchaseOrder.items.map((item) => (
                    <div key={item.id} className="bg-white border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{item.assetName}</h4>
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          ₹{item.totalPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Qty: {item.quantity}</span>
                        <span>Status: {item.deliveryStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusUpdateModal; 