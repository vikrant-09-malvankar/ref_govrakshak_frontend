import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Truck,
  Shield,
  Download,
  Edit,
  Phone,
  Mail,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { PurchaseOrder } from '../../types';
import OrderProgressModal from './OrderProgressModal';
import BuyerPurchaseOrderForm from './BuyerPurchaseOrderForm';
import { ApiService } from '../../services/apiService';
import { themedAlert } from '../../utils/themedDialogs';
import { useTheme } from '../../contexts/ThemeContext';
// jsPDF loaded dynamically to avoid transforming heavy dependencies during build

interface BuyerPurchaseOrderDetailsProps {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
  onEdit?: (purchaseOrder: PurchaseOrder) => void;
}

const BuyerPurchaseOrderDetails: React.FC<BuyerPurchaseOrderDetailsProps> = ({ 
  purchaseOrder, 
  onClose,
  onEdit
}) => {
  const { isDarkMode } = useTheme();
  // Component initialized
  // Helper function to format supplier contact information
  const formatSupplierContact = (supplierContact: any) => {
    if (!supplierContact) return 'N/A';
    
    // If it's already a string, try to parse it as JSON first
    if (typeof supplierContact === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(supplierContact);
        // Parsed JSON successfully
        if (typeof parsed === 'object' && parsed !== null) {
          // It's a JSON string, format it as an object
          const parts = [];
          if (parsed.officerName) parts.push(parsed.officerName);
          if (parsed.designation) parts.push(parsed.designation);
          if (parsed.email) parts.push(parsed.email);
          if (parsed.contactNumber) parts.push(parsed.contactNumber);
          const result = parts.join('\n');
          // Formatted result from JSON string
          return result;
        }
        // If parsing succeeds but it's not an object, return as string
        return supplierContact;
      } catch (e) {
        // JSON parsing failed, returning as string
        // If parsing fails, return as string
        return supplierContact;
      }
    }
    
    // If it's an object, format it with line breaks
    if (typeof supplierContact === 'object') {
      // Processing as object
      const contact = supplierContact;
      const parts = [];
      
      if (contact.officerName) parts.push(contact.officerName);
      if (contact.designation) parts.push(contact.designation);
      if (contact.email) parts.push(contact.email);
      if (contact.contactNumber) parts.push(contact.contactNumber);
      
      const result = parts.join('\n');
      // Formatted result from object
      return result;
    }
    
    return 'N/A';
  };
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'items']));
  const [showOrderProgress, setShowOrderProgress] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [currentPurchaseOrder, setCurrentPurchaseOrder] = useState<PurchaseOrder>(purchaseOrder);

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'Not Started':
        return isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800';
      case 'Pending Approval':
        return isDarkMode ? 'bg-yellow-900/40 text-yellow-300' : 'bg-yellow-100 text-yellow-800';
      case 'Pending':
        return isDarkMode ? 'bg-slate-600 text-slate-200' : 'bg-slate-100 text-slate-800';
      case 'Approved':
        return isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return isDarkMode ? 'bg-orange-900/40 text-orange-300' : 'bg-orange-100 text-orange-800';
      case 'Ready for Delivery':
        return isDarkMode ? 'bg-cyan-900/40 text-cyan-300' : 'bg-cyan-100 text-cyan-800';
      case 'In Transit':
        return isDarkMode ? 'bg-pink-900/40 text-pink-300' : 'bg-pink-100 text-pink-800';
      case 'Delivered':
        return isDarkMode ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-800';
      case 'Completed':
        return isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-800';
      case 'Cancelled':
        return isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800';
      case 'Rejected':
        return isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-100 text-red-800';
      default:
        return isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800';
    }
  };


  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };


  const isOverdue = () => {
    if (!purchaseOrder.expectedDeliveryDate) return false;
    const due = new Date(purchaseOrder.expectedDeliveryDate);
    const now = new Date();
    return purchaseOrder.status !== 'Completed' && purchaseOrder.status !== 'Cancelled' && !isNaN(due.getTime()) && due < now;
  };

  const totalAmount = (purchaseOrder.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`sticky top-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>GEM Order Details</h2>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{purchaseOrder.poNumber}</p>
            </div>
            <button
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Header Information */}
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} p-6 rounded-lg`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>{purchaseOrder.title}</h3>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{purchaseOrder.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="mt-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'}`}>
                      {purchaseOrder.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{totalAmount.toLocaleString()}</div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{purchaseOrder.currency}</div>
                {isOverdue() && (
                  <div className={`mt-2 text-sm font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>⚠️ Overdue</div>
                )}
              </div>
            </div>
          </div>


          {/* Collapsible Sections */}
          <div className="space-y-4">
            {/* Basic Information */}
            <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg`}>
              <button
                onClick={() => toggleSection('basic')}
                className={`w-full px-6 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}`}
              >
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Basic Information</h3>
                {expandedSections.has('basic') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {expandedSections.has('basic') && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>GeM Contract Number</label>
                      <p className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                        {purchaseOrder.gemContractNumber || purchaseOrder.poNumber || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>GeM Order Category</label>
                      <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{purchaseOrder.gemOrderCategory || purchaseOrder.title || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>GeM Buyer Department</label>
                      <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{purchaseOrder.gemBuyerDepartment || purchaseOrder.department || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Seller Name</label>
                      <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{(purchaseOrder as any).sellerName || purchaseOrder.supplier || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Expected Delivery Window</label>
                      <p className={`${isOverdue() ? (isDarkMode ? 'text-red-400' : 'text-red-600') : (isDarkMode ? 'text-gray-200' : 'text-gray-900')} font-medium`}>
                        {(() => {
                          const startDate = purchaseOrder.expectedDeliveryStartDate || purchaseOrder.expectedDeliveryDate;
                          const endDate = purchaseOrder.expectedDeliveryEndDate;
                          
                          if (startDate && endDate) {
                            return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
                          } else if (startDate) {
                            return new Date(startDate).toLocaleDateString();
                          } else {
                            return 'Not specified';
                          }
                        })()}
                        {isOverdue() && ' (Overdue)'}
                      </p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Order Created Date</label>
                      <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{purchaseOrder.createdAt ? new Date(purchaseOrder.createdAt).toLocaleDateString() : 'Not specified'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Order Status</label>
                      <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{purchaseOrder.status || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Total Amount</label>
                      <p className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'} font-medium`}>₹{purchaseOrder.totalAmount ? purchaseOrder.totalAmount.toLocaleString() : 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Buyer Contact & Delivery Information */}
            <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg`}>
              <button
                onClick={() => toggleSection('buyerContact')}
                className={`w-full px-6 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}`}
              >
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Buyer Contact & Delivery Information</h3>
                {expandedSections.has('buyerContact') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {expandedSections.has('buyerContact') && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Buyer Contact Information */}
                    <div className="space-y-4">
                      <h4 className={`text-md font-medium ${isDarkMode ? 'text-white border-slate-600' : 'text-gray-900 border-gray-200'} border-b pb-2`}>Buyer Contact Details</h4>
                      {(() => {
                        const buyerContact = purchaseOrder.supplierContact as any;
                        if (buyerContact && typeof buyerContact === 'object') {
                          return (
                            <div className="space-y-3">
                              <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Officer Name</label>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{buyerContact.officerName || buyerContact.name || 'Not specified'}</p>
                              </div>
                              <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Designation</label>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{buyerContact.designation || 'Not specified'}</p>
                              </div>
                              <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Email</label>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{buyerContact.email || 'Not specified'}</p>
                              </div>
                              <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Contact Number</label>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{buyerContact.contactNumber || buyerContact.phone || 'Not specified'}</p>
                              </div>
                            </div>
                          );
                        } else {
                          return <p className={isDarkMode ? 'text-gray-400 italic' : 'text-gray-500 italic'}>Buyer contact information not available</p>;
                        }
                      })()}
                    </div>

                    {/* Delivery Person Information */}
                    <div className="space-y-4">
                      <h4 className={`text-md font-medium ${isDarkMode ? 'text-white border-slate-600' : 'text-gray-900 border-gray-200'} border-b pb-2`}>Delivery Person Details</h4>
                      {(() => {
                        const deliveryPerson = (purchaseOrder as any).deliveryPerson;
                        if (deliveryPerson && typeof deliveryPerson === 'object') {
                          return (
                            <div className="space-y-3">
                              <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Officer Name</label>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{deliveryPerson.officerName || deliveryPerson.name || 'Not specified'}</p>
                              </div>
                              <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Designation</label>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{deliveryPerson.designation || 'Not specified'}</p>
                              </div>
                              <div>
                                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Contact Number</label>
                                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{deliveryPerson.contactNumber || deliveryPerson.phone || 'Not specified'}</p>
                              </div>
                            </div>
                          );
                        } else {
                          return <p className={isDarkMode ? 'text-gray-400 italic' : 'text-gray-500 italic'}>Delivery person information not available</p>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seller Information */}
            <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg`}>
              <button
                onClick={() => toggleSection('seller')}
                className={`w-full px-6 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}`}
              >
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Seller Information</h3>
                {expandedSections.has('seller') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {expandedSections.has('seller') && (
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Seller Name</label>
                      <p className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'} font-medium`}>{(purchaseOrder as any).sellerName || purchaseOrder.supplier || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Contact Person</label>
                      <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'} style={{whiteSpace: 'pre-line'}}>{formatSupplierContact(purchaseOrder.supplierContact)}</p>
                    </div>
                    <div className="lg:col-span-2">
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            const contact = purchaseOrder.supplierContact as any;
                            if (contact && typeof contact === 'object' && contact.contactNumber) {
                              window.open(`tel:${contact.contactNumber}`, '_self');
                            } else {
                              void themedAlert('Contact number not available', 'Unavailable');
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 ${isDarkMode ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'} rounded-lg transition-colors`}
                        >
                          <Phone size={16} />
                          Contact Seller
                        </button>
                        <button 
                          onClick={() => {
                            const contact = purchaseOrder.supplierContact as any;
                            if (contact && typeof contact === 'object' && contact.email) {
                              window.open(`mailto:${contact.email}?subject=Regarding GEM Order ${purchaseOrder.poNumber}`, '_blank');
                            } else {
                              void themedAlert('Email address not available', 'Unavailable');
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 ${isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-50 text-green-700 hover:bg-green-100'} rounded-lg transition-colors`}
                        >
                          <Mail size={16} />
                          Send Email
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Items */}
            <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg`}>
              <button
                onClick={() => toggleSection('items')}
                className={`w-full px-6 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}`}
              >
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Purchase Items ({(purchaseOrder.items || []).length})</h3>
                {expandedSections.has('items') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              {expandedSections.has('items') && (
                <div className="px-6 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className={isDarkMode ? 'bg-slate-600' : 'bg-gray-50'}>
                        <tr>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase`}>Item</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase`}>Category</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase`}>Qty</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase`}>Unit Price</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase`}>Total</th>
                          <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase`}>Status</th>
                        </tr>
                      </thead>
                      <tbody className={`${isDarkMode ? 'divide-slate-600' : 'divide-gray-200'} divide-y`}>
                        {(purchaseOrder.items || []).map((item) => (
                          <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3">
                               <div>
                                 <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{item.assetName || 'N/A'}</div>
                                 <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.description || 'No description'}</div>
                               </div>
                            </td>
                             <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{item.category || 'N/A'}</td>
                             <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{item.quantity || 0}</td>
                             <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>₹{(item.unitPrice || 0).toLocaleString()}</td>
                             <td className={`px-4 py-3 font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>₹{(item.totalPrice || 0).toLocaleString()}</td>
                             <td className="px-4 py-3">
                               <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(item.deliveryStatus || 'Not Started')}`}>
                                 {item.deliveryStatus || 'Not Started'}
                               </span>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(purchaseOrder.items || []).some(item => item.specifications) && (
                    <div className="mt-4">
                      <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Specifications & Requirements</h4>
                      {(purchaseOrder.items || []).map((item) => (
                        item.specifications && (
                          <div key={item.id} className={`mb-2 p-3 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-50'} rounded-lg`}>
                            <div className={`font-medium text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-1`}>{item.assetName}</div>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {typeof item.specifications === 'object' ? (
                                <div className="space-y-1">
                                  {(() => {
                                    const specs = item.specifications as any;
                                    return (
                                      <>
                                        {specs?.brand && <div><strong>Brand:</strong> {specs.brand}</div>}
                                        {specs?.model && <div><strong>Model:</strong> {specs.model}</div>}
                                        {specs?.category && <div><strong>Category:</strong> {specs.category}</div>}
                                        {specs?.warrantyPeriod && <div><strong>Warranty:</strong> {specs.warrantyPeriod}</div>}
                                        {specs?.amcResponsibility && <div><strong>AMC:</strong> {specs.amcResponsibility}</div>}
                                        <div><strong>Installation:</strong> {specs?.installationRequired || specs?.installation || specs?.installation_required || 'Not specified'}</div>
                                      </>
                                    );
                                  })()}
                                </div>
                              ) : (
                                String(item.specifications)
                              )}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* GeM Contract Information */}
            {(purchaseOrder.gemContractNumber || purchaseOrder.gemOrderCategory || purchaseOrder.gemBuyerDepartment) && (
              <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg`}>
                <button
                  onClick={() => toggleSection('gem')}
                  className={`w-full px-6 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}`}
                >
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                    <Shield className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    GeM Contract Information
                  </h3>
                  {expandedSections.has('gem') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                {expandedSections.has('gem') && (
                  <div className="px-6 pb-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>GeM Contract Number</label>
                        <p className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'} font-medium`}>{purchaseOrder.gemContractNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Order Category</label>
                        <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{purchaseOrder.gemOrderCategory || 'N/A'}</p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>GeM Buyer Department</label>
                        <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{purchaseOrder.gemBuyerDepartment || purchaseOrder.department || 'N/A'}</p>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Delivery Window</label>
                        <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
                          {purchaseOrder.expectedDeliveryStartDate && purchaseOrder.expectedDeliveryEndDate
                            ? `${new Date(purchaseOrder.expectedDeliveryStartDate).toLocaleDateString()} - ${new Date(purchaseOrder.expectedDeliveryEndDate).toLocaleDateString()}`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    {(purchaseOrder.oemAuthorizationLetterPath || purchaseOrder.gemOrderFilePath) && (
                      <div className="mt-6">
                        <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>GeM Documents</h4>
                        <div className="space-y-2">
                          {purchaseOrder.oemAuthorizationLetterPath && (
                            <div className={`flex items-center gap-3 p-3 ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} rounded-lg`}>
                              <FileText size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                              <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>OEM Authorization Letter</span>
                              <button className={`ml-auto ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                                <Download size={16} />
                              </button>
                            </div>
                          )}
                          {purchaseOrder.gemOrderFilePath && (
                            <div className={`flex items-center gap-3 p-3 ${isDarkMode ? 'bg-green-900/20' : 'bg-green-50'} rounded-lg`}>
                              <FileText size={16} className={isDarkMode ? 'text-green-400' : 'text-green-600'} />
                              <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>GeM Order File</span>
                              <button className={`ml-auto ${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-800'}`}>
                                <Download size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Notes and Attachments */}
            {(purchaseOrder.notes || (purchaseOrder.attachments && purchaseOrder.attachments.length > 0)) && (
              <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg`}>
                <button
                  onClick={() => toggleSection('notes')}
                  className={`w-full px-6 py-4 flex items-center justify-between ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-50'}`}
                >
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Notes & Attachments</h3>
                  {expandedSections.has('notes') ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                {expandedSections.has('notes') && (
                  <div className="px-6 pb-4">
                    {purchaseOrder.notes && (
                      <div className="mb-4">
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Notes</label>
                        <div className={`p-3 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-50'} rounded-lg`}>
                          <p className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>{purchaseOrder.notes}</p>
                        </div>
                      </div>
                    )}
                    {(purchaseOrder.attachments && purchaseOrder.attachments.length > 0) && (
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Attachments</label>
                        <div className="space-y-2">
                          {purchaseOrder.attachments.map((attachment, index) => (
                            <div key={index} className={`flex items-center gap-3 p-3 ${isDarkMode ? 'bg-slate-600' : 'bg-gray-50'} rounded-lg`}>
                              <FileText size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                              <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{attachment}</span>
                              <button className={`ml-auto ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>
                                <Download size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className={`flex justify-between items-center pt-6 ${isDarkMode ? 'border-slate-600' : 'border-gray-200'} border-t`}>
            <div className="flex gap-3">
              {onEdit ? (
                <button 
                  onClick={() => {
                    onEdit(purchaseOrder);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit size={16} />
                  Edit Order
                </button>
              ) : (
                <button 
                  onClick={() => setShowEditForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit size={16} />
                  Edit Order
                </button>
              )}
              <button 
                onClick={async () => {
                  try {
                    // Dynamically load jsPDF to avoid build transformation of fast-png
                    const jsPDF = (await import('jspdf')).default;
                    // Generate PDF using jsPDF
                    const doc = new jsPDF();
                    
                    // Set up fonts and colors
                    doc.setFont('helvetica');
                    
                    // Title
                    doc.setFontSize(20);
                    doc.setTextColor(0, 0, 0);
                    doc.text('GEM ORDER DETAILS', 20, 30);
                    
                    // Order Information Section
                    doc.setFontSize(12);
                    doc.setTextColor(0, 0, 0);
                    doc.text('Order Information', 20, 50);
                    
                    let yPosition = 60;
                    const lineHeight = 7;
                    
                    // Order details
                    const orderDetails = [
                      `Order ID: ${purchaseOrder.id}`,
                      `GEM Contract: ${purchaseOrder.gemContractNumber || purchaseOrder.poNumber || 'N/A'}`,
                      `Department: ${purchaseOrder.department || 'N/A'}`,
                      `Supplier: ${purchaseOrder.supplier || 'N/A'}`,
                      `Total Amount: ₹${purchaseOrder.totalAmount?.toLocaleString() || 'N/A'}`,
                      `Status: ${purchaseOrder.status || 'N/A'}`,
                      `Created: ${purchaseOrder.createdAt ? new Date(purchaseOrder.createdAt).toLocaleDateString() : 'N/A'}`,
                      `Expected Delivery: ${purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString() : 'N/A'}`
                    ];
                    
                    orderDetails.forEach(detail => {
                      doc.text(detail, 20, yPosition);
                      yPosition += lineHeight;
                    });
                    
                    // Items Section
                    yPosition += 10;
                    doc.setFontSize(12);
                    doc.text('Order Items', 20, yPosition);
                    yPosition += lineHeight;
                    
                    if (purchaseOrder.items && purchaseOrder.items.length > 0) {
                      // Table headers
                      doc.setFontSize(10);
                      doc.text('Item', 20, yPosition);
                      doc.text('Description', 60, yPosition);
                      doc.text('Qty', 120, yPosition);
                      doc.text('Unit Price', 140, yPosition);
                      doc.text('Total', 170, yPosition);
                      yPosition += lineHeight;
                      
                      // Draw line under headers
                      doc.line(20, yPosition - 2, 190, yPosition - 2);
                      
                      // Items data
                      purchaseOrder.items.forEach((item: any, index: number) => {
                        if (yPosition > 270) { // Check if we need a new page
                          doc.addPage();
                          yPosition = 20;
                        }
                        
                        doc.text(`${index + 1}. ${item.assetName || 'N/A'}`, 20, yPosition);
                        doc.text(item.description || 'N/A', 60, yPosition);
                        doc.text(`${item.quantity || 0}`, 120, yPosition);
                        doc.text(`₹${item.unitPrice?.toLocaleString() || 'N/A'}`, 140, yPosition);
                        doc.text(`₹${item.totalPrice?.toLocaleString() || 'N/A'}`, 170, yPosition);
                        yPosition += lineHeight;
                      });
                    } else {
                      doc.text('No items found', 20, yPosition);
                      yPosition += lineHeight;
                    }
                    
                    // Footer
                    yPosition += 20;
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPosition);
                    doc.text('GEM Procurement System', 20, yPosition + 5);
                    
                    // Save the PDF
                    const fileName = `gem-order-${purchaseOrder.id}-${new Date().toISOString().split('T')[0]}.pdf`;
                    doc.save(fileName);
                  } catch (error) {
                    console.error('Failed to generate PDF:', error);
                    await themedAlert('Failed to generate PDF. Please try again.', 'Error');
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={16} />
                Export PDF
              </button>
              <button 
                onClick={() => setShowOrderProgress(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Truck size={16} />
                Track Delivery
              </button>
            </div>
            <button
              onClick={onClose}
              className={`px-4 py-2 ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} border rounded-lg`}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Order Progress Modal */}
      {showOrderProgress && (
        <OrderProgressModal
          purchaseOrder={currentPurchaseOrder}
          onClose={() => setShowOrderProgress(false)}
        />
      )}

      {showEditForm && (
        <BuyerPurchaseOrderForm
          editingPO={currentPurchaseOrder}
          onClose={() => setShowEditForm(false)}
          onSubmit={async (updatedOrder) => {
            try {
              await ApiService.updatePurchaseOrder(updatedOrder.id, updatedOrder);
              setCurrentPurchaseOrder(updatedOrder);
              setShowEditForm(false);
              // Optionally refresh parent component or show success message
            } catch (error) {
              console.error('Failed to update purchase order:', error);
              await themedAlert('Failed to update purchase order. Please try again.', 'Error');
            }
          }}
        />
      )}
    </div>
  );
};

export default BuyerPurchaseOrderDetails;
