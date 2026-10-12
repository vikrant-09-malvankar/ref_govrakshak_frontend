import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, FileText } from 'lucide-react';
import { PurchaseOrder } from '../../types';

interface QuoteFormProps {
  purchaseOrder: PurchaseOrder;
  onSubmit: (quoteData: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface QuoteItem {
  id: string;
  assetName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications: string;
  deliveryTime: string;
  warranty: string;
}

const QuoteForm: React.FC<QuoteFormProps> = ({ 
  purchaseOrder, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const { t } = useTranslation();
  
  // Utility function to format Indian currency (Lakhs and Crores)
  const formatIndianCurrency = (amount: number): string => {
    if (isNaN(amount) || amount === 0) {
      return '₹0';
    }
    if (amount >= 10000000) {
      // Crores (1 Crore = 10,000,000)
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      // Lakhs (1 Lakh = 100,000)
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      // Thousands
      return `₹${(amount / 1000).toFixed(2)} K`;
    } else {
      return `₹${amount.toFixed(2)}`;
    }
  };

  const [formData, setFormData] = useState({
    quoteNumber: `Q-${purchaseOrder.poNumber}-${Date.now()}`,
    quoteDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: 'Net 30 days, 3-year warranty included',
    deliveryTime: '2-3 weeks',
    warranty: '3 years on-site warranty',
    notes: ''
  });

  const [items, setItems] = useState<QuoteItem[]>(
    purchaseOrder.items.map(item => ({
      id: item.id,
      assetName: item.assetName,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      specifications: item.specifications || '',
      deliveryTime: '2-3 weeks',
      warranty: '3 years on-site warranty'
    }))
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (itemId: string, field: string, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      assetName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      specifications: '',
      deliveryTime: '2-3 weeks',
      warranty: '3 years on-site warranty'
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.quoteNumber.trim()) {
      newErrors.quoteNumber = 'Quote number is required';
    }
    if (!formData.quoteDate) {
      newErrors.quoteDate = 'Quote date is required';
    }
    if (!formData.validUntil) {
      newErrors.validUntil = 'Valid until date is required';
    }
    if (!formData.terms.trim()) {
      newErrors.terms = 'Terms are required';
    }
    if (!formData.deliveryTime.trim()) {
      newErrors.deliveryTime = 'Delivery time is required';
    }
    if (!formData.warranty.trim()) {
      newErrors.warranty = 'Warranty information is required';
    }

    // Validate items
    items.forEach((item, index) => {
      if (!item.assetName.trim()) {
        newErrors[`item-${index}-assetName`] = 'Asset name is required';
      }
      if (!item.description.trim()) {
        newErrors[`item-${index}-description`] = 'Description is required';
      }
      if (item.quantity <= 0) {
        newErrors[`item-${index}-quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice <= 0) {
        newErrors[`item-${index}-unitPrice`] = 'Unit price must be greater than 0';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const quoteData = {
      id: `QUOTE-${Date.now()}`,
      purchaseOrderId: purchaseOrder.id,
      vendorName: 'Vendor',
      quoteNumber: formData.quoteNumber,
      quoteDate: formData.quoteDate,
      validUntil: formData.validUntil,
      totalAmount,
      currency: 'INR',
      terms: formData.terms,
      deliveryTime: formData.deliveryTime,
      warranty: formData.warranty,
      status: 'Pending',
      items,
      notes: formData.notes
    };

    onSubmit(quoteData);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Submit Quote</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Responding to Purchase Order: {purchaseOrder.poNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Quote Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quote Number
              </label>
              <input
                type="text"
                value={formData.quoteNumber}
                onChange={(e) => handleInputChange('quoteNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.quoteNumber ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter quote number"
              />
              {errors.quoteNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.quoteNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quote Date
              </label>
              <input
                type="date"
                value={formData.quoteDate}
                onChange={(e) => handleInputChange('quoteDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.quoteDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
              />
              {errors.quoteDate && (
                <p className="text-red-500 text-sm mt-1">{errors.quoteDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valid Until
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => handleInputChange('validUntil', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.validUntil ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
              />
              {errors.validUntil && (
                <p className="text-red-500 text-sm mt-1">{errors.validUntil}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Time
              </label>
              <input
                type="text"
                value={formData.deliveryTime}
                onChange={(e) => handleInputChange('deliveryTime', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.deliveryTime ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="e.g., 2-3 weeks"
              />
              {errors.deliveryTime && (
                <p className="text-red-500 text-sm mt-1">{errors.deliveryTime}</p>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Terms & Conditions
            </label>
            <textarea
              value={formData.terms}
              onChange={(e) => handleInputChange('terms', e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.terms ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder="Enter terms and conditions"
            />
            {errors.terms && (
              <p className="text-red-500 text-sm mt-1">{errors.terms}</p>
            )}
          </div>

          {/* Warranty Information */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Warranty Information
            </label>
            <textarea
              value={formData.warranty}
              onChange={(e) => handleInputChange('warranty', e.target.value)}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.warranty ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
              }`}
              placeholder="Enter warranty details"
            />
            {errors.warranty && (
              <p className="text-red-500 text-sm mt-1">{errors.warranty}</p>
            )}
          </div>

          {/* Quote Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quote Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Asset Name
                      </label>
                      <input
                        type="text"
                        value={item.assetName}
                        onChange={(e) => handleItemChange(item.id, 'assetName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item-${index}-assetName`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        placeholder="Enter asset name"
                      />
                      {errors[`item-${index}-assetName`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-assetName`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item-${index}-quantity`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        min="1"
                      />
                      {errors[`item-${index}-quantity`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Unit Price (₹)
                      </label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors[`item-${index}-unitPrice`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        min="0"
                        step="0.01"
                      />
                      {errors[`item-${index}-unitPrice`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-unitPrice`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total Price (₹)
                      </label>
                      <input
                        type="number"
                        value={item.totalPrice}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      rows={2}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors[`item-${index}-description`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="Enter item description"
                    />
                    {errors[`item-${index}-description`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-description`]}</p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Specifications
                    </label>
                    <textarea
                      value={item.specifications}
                      onChange={(e) => handleItemChange(item.id, 'specifications', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter technical specifications"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Amount:</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatIndianCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any additional notes or comments"
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Submit Quote
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteForm; 

