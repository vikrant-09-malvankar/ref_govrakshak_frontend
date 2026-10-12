import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  X,
  Search,
  AlertCircle,
  CheckCircle,
  Package,
  Building2,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Loader2
} from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { ApiService } from '../../services/apiService';

interface BuyerPurchaseOrderFormProps {
  onClose: () => void;
  onSubmit: (purchaseOrder: PurchaseOrder) => void;
  editingPO?: PurchaseOrder | undefined;
}

const BuyerPurchaseOrderForm: React.FC<BuyerPurchaseOrderFormProps> = ({
  onClose,
  onSubmit
}) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  
  // Form state
  const [gemContractNumber, setGemContractNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Fetched order details
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch order details by GeM contract number
  const fetchOrderDetails = async () => {
    if (!gemContractNumber.trim()) {
      setError('Please enter a GeM contract number');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setOrderDetails(null);

      const orderData = await ApiService.getSellerOrderByGemContract(gemContractNumber.trim());
      
      // Order data fetched successfully
      
      if (orderData && (orderData as any).id) {
        // Check if this seller order is already mapped to a buyer
        if ((orderData as any).isMappedToBuyer) {
          setError('This GeM contract is already mapped to a buyer. Please use a different contract number.');
          return;
        }
        
        setOrderDetails(orderData);
        setSuccess('Order details fetched successfully!');
        // Order details fetched (not mapped yet)
      } else {
        setError('No order found with this GeM contract number');
      }
    } catch (err: any) {
      console.error('Error fetching order details:', err);
      
      // Check if it's a 404 error (order not found)
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('No approved seller order found') || err.message?.includes('HTTP 404')) {
        setError('GeM Contract Not Found');
        // Show professional toast notification
        setTimeout(() => {
          // Create a professional toast notification
          const toast = document.createElement('div');
          toast.className = 'fixed top-4 right-4 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-md z-50 transform transition-all duration-300 ease-in-out translate-x-0 opacity-100';
          toast.setAttribute('role', 'alert');
          toast.setAttribute('aria-live', 'assertive');
          toast.innerHTML = `
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <AlertCircle class="h-5 w-5 text-red-400" />
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">GeM Contract Not Found</h3>
                <div class="mt-1 text-sm text-red-700">
                  <p>The GeM contract number "${gemContractNumber}" was not found in our system. Please verify the contract number and try again.</p>
                </div>
              </div>
            </div>
          `;
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
          }, 5000);
        }, 100);
      } else {
        setError(err.message || 'Failed to fetch order details. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Map seller order to buyer
  const mapSellerOrderToBuyer = async () => {
    if (!orderDetails) {
      setError('Please fetch order details first');
      return;
    }

    // Clear any existing errors
    setError(null);

    // Check if this seller order is already mapped to a buyer
    if (orderDetails.isMappedToBuyer) {
      setError('This GeM contract is already mapped to a buyer. Please use a different contract number.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Map seller order to buyer instead of creating purchase order
      const mappingData = {
        buyerId: user?.id,
        buyerName: user?.name
      };

      // Mapping seller order to buyer
      
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api'}/seller-orders/${orderDetails.id}/map-to-buyer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mappingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to map seller order to buyer');
      }

      const mappedOrder = await response.json();
      
      // Seller order mapped to buyer successfully
      setSuccess('Order mapped to buyer successfully!');
      
      // Call the onSubmit callback with the mapped order
      onSubmit(mappedOrder);
    } catch (err: any) {
      console.error('Error mapping seller order to buyer:', err);
      setError('Failed to map order to buyer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key press for GeM contract input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchOrderDetails();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`sticky top-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Map Order to Buyer
            </h2>
            <button
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* GeM Contract Number Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GeM Contract Number *
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={gemContractNumber}
                  onChange={(e) => setGemContractNumber(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter GeM contract number"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 text-white placeholder-gray-500 border-slate-600' : 'border-gray-300'}`}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={fetchOrderDetails}
                disabled={isLoading || !gemContractNumber.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

            {/* Error and Success Messages */}
            {error && (
              <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isDarkMode ? 'bg-red-900/20 border-red-700 text-red-400' : 'bg-red-50 border-red-200 text-red-700'} border`}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isDarkMode ? 'bg-green-900/20 border-green-700 text-green-400' : 'bg-green-50 border-green-200 text-green-700'} border`}>
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

          {/* Order Details Display */}
          {orderDetails && (
            <div className="space-y-3">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <h3 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3 flex items-center gap-2`}>
                  <Package className="w-4 h-4" />
                  Order Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>GeM Contract:</span>
                        <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {orderDetails.gemContractNumber || orderDetails.gem_contract_number}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Users className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Seller:</span>
                        <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {orderDetails.sellerName || orderDetails.seller_name || 'N/A'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Building2 className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Department:</span>
                        <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {orderDetails.gemBuyerDepartmentName || orderDetails.gem_buyer_department_name || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Amount:</span>
                        <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>
                          ₹{(orderDetails.totalAmount || orderDetails.total_amount || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Delivery Window:</span>
                        <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {(() => {
                            const window = orderDetails.expectedDeliveryWindow || orderDetails.expected_delivery_window;
                            if (window?.startDate && window?.endDate) {
                              return `${window.startDate} to ${window.endDate}`;
                            }
                            return 'N/A';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {orderDetails.items && orderDetails.items.length > 0 && (
                  <div className="mt-3">
                    <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Items</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {orderDetails.items.map((item: any, index: number) => (
                        <div key={index} className={`flex justify-between items-start text-xs p-2 rounded ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'} border`}>
                          <div className="min-w-0">
                            <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.productName || item.product_name}</div>
                            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>({item.brand} {item.modelNumber || item.model_number})</div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Qty: {item.quantity}</div>
                            <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              ₹{(item.totalPrice || item.total_price || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className={`px-4 py-2 text-sm border rounded-lg transition-colors ${isDarkMode ? 'border-slate-600 text-gray-300 bg-slate-700 hover:bg-slate-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={mapSellerOrderToBuyer}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <FileText className="w-3 h-3" />
                  )}
                  {isSubmitting ? 'Mapping...' : 'Map Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerPurchaseOrderForm;

