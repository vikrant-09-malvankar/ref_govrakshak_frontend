import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem } from '../../types';
import { themedAlert } from '../../utils/themedDialogs';
import { ApiService } from '../../services/apiService';

interface PurchaseOrderFormProps {
  onClose: () => void;
  onSubmit: (purchaseOrder: PurchaseOrder) => void;
  editingPO?: PurchaseOrder;
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ onClose, onSubmit, editingPO }) => {
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    title: editingPO?.title || '',
    description: editingPO?.description || '',
    department: editingPO?.department || '',
    supplier: editingPO?.supplier || '',
    supplierContact: editingPO?.supplierContact || '',
    expectedDeliveryDate: editingPO?.expectedDeliveryDate || '',
    notes: editingPO?.notes || '',
    items: editingPO?.items || [],
    assigneeId: editingPO?.assigneeId || '',
    assigneeName: editingPO?.assigneeName || ''
  });

  const [newItem, setNewItem] = useState<Partial<PurchaseOrderItem>>({
    assetName: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    specifications: '',
    category: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [approvedBuyers, setApprovedBuyers] = useState<any[]>([]);
  const [approvedSellers, setApprovedSellers] = useState<any[]>([]);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [sellerSearch, setSellerSearch] = useState('');
  const [, setLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [buyersData, sellersData] = await Promise.all([
        ApiService.getApprovedBuyers(),
        ApiService.getApprovedSellers()
      ]);
      setApprovedBuyers(buyersData as any[]);
      setApprovedSellers(sellersData as any[]);
    } catch (err) {
      // Handle error silently in production
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Focus trap and close on Esc
  useEffect(() => {
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Derived lists (already approved)
  const buyers = approvedBuyers as Array<{ id: string; name: string; email?: string; department?: string }>;
  const sellers = approvedSellers as Array<{ id: string; name: string; email?: string; department?: string }>;
  const filteredBuyers = buyers.filter(b =>
    [b.name, b.email, b.department].filter(Boolean).some(v => String(v).toLowerCase().includes(buyerSearch.toLowerCase()))
  );
  const filteredSellers = sellers.filter(s =>
    [s.name, s.email, s.department].filter(Boolean).some(v => String(v).toLowerCase().includes(sellerSearch.toLowerCase()))
  );

  const categories = [
    'Computer',
    'Laptop', 
    'Printer',
    'Network Equipment',
    'Display',
    'Server',
    'Accessories',
    'Software',
    'Other'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addItem = () => {
    if (newItem.assetName && newItem.unitPrice && newItem.quantity) {
      const item: PurchaseOrderItem = {
        id: `POI${Date.now()}`,
        assetName: newItem.assetName!,
        description: newItem.description || '',
        quantity: newItem.quantity!,
        unitPrice: newItem.unitPrice!,
        totalPrice: newItem.quantity! * newItem.unitPrice!,
        specifications: newItem.specifications || '',
        category: newItem.category || 'Other',
        deliveryStatus: 'Not Started'
      };

      setFormData(prev => ({
        ...prev,
        items: [...(prev.items || []), item]
      }));

      setNewItem({
        assetName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        specifications: '',
        category: ''
      });
    }
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId) || []
    }));
  };

  const calculateTotal = () => {
    return formData.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
  if (!formData.title) newErrors['title'] = 'Title is required.';
  if (!formData.department) newErrors['department'] = 'Buyer is required.';
  if (!formData.expectedDeliveryDate) newErrors['expectedDeliveryDate'] = 'Expected delivery date is required.';
  if (!formData.items || formData.items.length === 0) newErrors['items'] = 'Add at least one item.';
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

  if (!formData.title || !formData.department || formData.items?.length === 0) {
      await themedAlert('Please fill in all required fields and add at least one item.', 'Validation');
      return;
    }

    // Ensure requestedDate is a concrete string
  const todayStr = new Date().toISOString().split('T')[0];
  const computedRequestedDate = (editingPO?.requestedDate ?? todayStr) as string;

    const purchaseOrder: PurchaseOrder = {
      id: editingPO?.id || `PO${Date.now()}`,
      poNumber: editingPO?.poNumber || `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      title: formData.title!,
      description: formData.description || '',
      department: formData.department!,
      requestedBy: 'Current User', // This would come from auth context
      requestedDate: computedRequestedDate,
  // Map selected seller to supplier fields (since Supplier section is removed)
  supplier: formData.assigneeName || '',
  supplierContact: formData.supplierContact || '',
      totalAmount: calculateTotal(),
      currency: 'INR',
      status: editingPO?.status || 'Pending Approval',
      expectedDeliveryDate: formData.expectedDeliveryDate!,
      items: formData.items!,
  ...(formData.notes !== undefined ? { notes: formData.notes } : {}),
      attachments: [],
      createdAt: editingPO?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assigneeId: formData.assigneeId || '',
      assigneeName: formData.assigneeName || ''
    };

    onSubmit(purchaseOrder);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      aria-modal="true"
      role="dialog"
      tabIndex={-1}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg w-full max-w-4xl lg:max-w-6xl max-h-[95vh] overflow-hidden shadow-xl focus:outline-none"
        tabIndex={0}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
              {editingPO ? 'Edit Purchase Order' : 'Create New Purchase Order'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {editingPO ? 'Update purchase order details' : 'Add a new purchase order for tracking'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close modal"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors['title'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter purchase order title"
                    aria-invalid={!!errors['title']}
                    aria-describedby={errors['title'] ? 'title-error' : undefined}
                  />
                  {errors['title'] && <div id="title-error" className="text-xs text-red-500 mt-1">{errors['title']}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Buyer <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={buyerSearch}
                      onChange={(e) => setBuyerSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Search buyers by name, email, or department"
                    />
                    <select
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className={`w-full px-3 py-2 border ${errors['department'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      aria-invalid={!!errors['department']}
                      aria-describedby={errors['department'] ? 'department-error' : undefined}
                    >
                      <option className="dark:bg-slate-800 dark:text-white" value="">Select Buyer</option>
                      {filteredBuyers.map(b => (
                        <option className="dark:bg-slate-800 dark:text-white" key={b.id} value={b.name}>{b.name} {b.department ? `(${b.department})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  {errors['department'] && <div id="department-error" className="text-xs text-red-500 mt-1">{errors['department']}</div>}
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter detailed description"
                  />
                </div>
              </div>
            </div>

            {/* Seller Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Seller
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search sellers by name or email"
                />
                <select
                  value={formData.assigneeId}
                  onChange={e => {
                    const user = sellers.find(u => u.id === e.target.value);
                    handleInputChange('assigneeId', user?.id || '');
                    handleInputChange('assigneeName', user ? user.name : '');
                    // Also map to supplier fields
                    if (user) {
                      handleInputChange('supplier', user.name);
                      handleInputChange('supplierContact', user.email || '');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option className="dark:bg-slate-800 dark:text-white" value="">Select Seller</option>
                  {filteredSellers.map(user => (
                    <option className="dark:bg-slate-800 dark:text-white" key={user.id} value={user.id}>{user.name}{user.email ? ` (${user.email})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Order Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Expected Delivery Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                    className={`w-full px-3 py-2 border ${errors['expectedDeliveryDate'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    aria-invalid={!!errors['expectedDeliveryDate']}
                    aria-describedby={errors['expectedDeliveryDate'] ? 'expectedDeliveryDate-error' : undefined}
                  />
                  {errors['expectedDeliveryDate'] && <div id="expectedDeliveryDate-error" className="text-xs text-red-500 mt-1">{errors['expectedDeliveryDate']}</div>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Total Amount
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 dark:border-slate-600 rounded-lg">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Order Items <span className="text-red-500">*</span></h3>
              {errors['items'] && <div className="text-xs text-red-500 mb-2">{errors['items']}</div>}
              
              {/* Add New Item */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Add New Item</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Asset Name *</label>
                    <input
                      type="text"
                      value={newItem.assetName}
                      onChange={(e) => setNewItem(prev => ({ ...prev, assetName: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Dell OptiPlex 7090"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      value={newItem.category}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option className="dark:bg-slate-800 dark:text-white" value="">Select Category</option>
                      {categories.map(cat => (
                        <option className="dark:bg-slate-800 dark:text-white" key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      value={newItem.unitPrice}
                      onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the item"
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Specifications</label>
                  <textarea
                    value={newItem.specifications}
                    onChange={(e) => setNewItem(prev => ({ ...prev, specifications: e.target.value }))}
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
                    placeholder="Technical specifications"
                  />
                </div>
                <button
                  onClick={addItem}
                  className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              {/* Items List */}
              {formData.items && formData.items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">Added Items ({formData.items.length})</h4>
                  {formData.items.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{item.assetName}</span>
                            <span className="text-xs text-gray-500">({item.category})</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{item.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Qty: {item.quantity}</span>
                            <span>Unit Price: ₹{item.unitPrice.toLocaleString()}</span>
                            <span className="font-medium">Total: ₹{item.totalPrice.toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any additional notes or special requirements"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base flex items-center gap-2"
          >
            <Save size={16} />
            {editingPO ? 'Update Purchase Order' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderForm; 


