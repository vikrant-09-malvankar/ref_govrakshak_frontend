import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Asset } from '../../types';
import { ApiService } from '../../services/apiService';
import { useTranslation } from 'react-i18next';
import { themedAlert } from '../../utils/themedDialogs';

interface AssetFormProps {
  _asset?: Asset | null;
  onClose: () => void;
  onSubmit: (assetData: Asset) => void;
  sellerOrders?: Array<{
    id: string | number;
    status?: string;
    gemContractNumber?: string;
    gem_contract_number?: string;
    items?: Array<{ categoryType?: string; category_type?: string; quantity?: number }>;
  }>;
}

const AssetForm: React.FC<AssetFormProps> = ({ _asset, onClose, onSubmit, sellerOrders = [] }) => {
  const { t, ready } = useTranslation();
  
  // Guard against translation function not being ready - use safe wrapper
  const safeT = React.useMemo(() => {
    if (!ready || !t) {
      return ((key: string) => key); // Fallback: return key as-is
    }
    try {
      // Test if translation function works (no need to store result)
      t('test');
      return t;
    } catch (error) {
      console.warn('Translation function error, using fallback:', error);
      return ((key: string) => key);
    }
  }, [t, ready]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
  asset_uid: '',
    name: '',
    category: '',
    serialNumber: '',
    department: '',
    location: '',
    status: 'Active',
    value: 0,
    purchaseDate: '',
    warrantyExpiry: '',
    amcExpiry: '',
  gem_contract_number: '',
    supplier: '',
    description: '',
    model: '',
    manufacturer: '',
    condition: 'New',
    notes: ''
  });
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [capacity, setCapacity] = useState<{ ordered: number; registered: number; remaining: number } | null>(null);
  const [perCategoryCaps, setPerCategoryCaps] = useState<Array<{ category: string; ordered: number; registered: number; remaining: number }>>([]);
  const [perCategoryLoading, setPerCategoryLoading] = useState(false);
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<string>('');
  const [gemContractValidating, setGemContractValidating] = useState(false);
  const [gemContractExists, setGemContractExists] = useState<boolean | null>(null);
  const [showGemDropdown, setShowGemDropdown] = useState(false);
  const [gemSearchTerm, setGemSearchTerm] = useState('');

  useEffect(() => {
    if (_asset) {
      // Format dates for input fields (YYYY-MM-DD format)
      const formatDateForInput = (dateStr: string | undefined | null): string => {
        if (!dateStr) return '';
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      const purchaseDate = (_asset as any).purchase_date || _asset.purchaseDate || '';
      const warrantyExpiry = (_asset as any).warranty_expiry || _asset.warrantyExpiry || '';
      const amcExpiry = (_asset as any).amc_expiry || _asset.amcExpiry || '';

      setFormData({
        asset_uid: (_asset as any).asset_uid || '',
        name: _asset.name || '',
        category: _asset.category || '',
        serialNumber: (_asset as any).serial_number || _asset.serialNumber || '',
        department: _asset.department || '',
        location: _asset.location || '',
        status: _asset.status || 'Active',
        value: _asset.value || 0,
        purchaseDate: formatDateForInput(purchaseDate),
        warrantyExpiry: formatDateForInput(warrantyExpiry),
        amcExpiry: formatDateForInput(amcExpiry),
        gem_contract_number: (_asset as any).gem_contract_number || '',
        supplier: _asset.supplier || '',
        description: (_asset as any).description || '',
        model: (_asset as any).model || '',
        manufacturer: (_asset as any).manufacturer || '',
        condition: (_asset as any).condition || 'New',
        notes: (_asset as any).notes || ''
      });
      
      // Set the selected order ID from the asset's seller_order_id
      if ((_asset as any).seller_order_id) {
        setSelectedOrderId(String((_asset as any).seller_order_id));
      }
    }
  }, [_asset]);

  // Helper function to find and set selected order from GEM contract number
  // Must be defined before useEffects that use it
  const findAndSetOrderFromGemContract = useCallback((contractNumber: string) => {
    const normalized = contractNumber.trim().toLowerCase();
    const matchingOrder = (sellerOrders || []).find((o: any) => {
      const orderGem = String(o.gemContractNumber || o.gem_contract_number || '').trim().toLowerCase();
      const matches = orderGem === normalized;
      return matches;
    });
    
    if (matchingOrder && matchingOrder.id !== undefined && matchingOrder.id !== null) {
      setSelectedOrderId(String(matchingOrder.id));
    } else {
      setSelectedOrderId('');
    }
  }, [sellerOrders]);

  // Auto-select order if only one approved/completed exists
  useEffect(() => {
    const approved = (sellerOrders || []).filter((o: any) => ['Approved', 'Completed'].includes(String(o.status)));
    if (approved.length === 1 && approved[0] && approved[0].id !== undefined && approved[0].id !== null) {
      const id = String(approved[0].id as any);
      setSelectedOrderId(id);
    }
  }, [sellerOrders]);

  // Try to match GEM contract number when sellerOrders are loaded or when GEM contract number changes
  useEffect(() => {
    if (!formData.gem_contract_number.trim() || !sellerOrders || sellerOrders.length === 0) {
      return;
    }
    
    // Only try to match if we don't already have a selected order or if the selected order doesn't match
    if (selectedOrderId) {
      const currentOrder = (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId));
      const currentOrderGem = String(currentOrder?.gemContractNumber || currentOrder?.gem_contract_number || '').trim().toLowerCase();
      const formGem = formData.gem_contract_number.trim().toLowerCase();
      if (currentOrderGem === formGem) {
        // Already matched, no need to search again
        return;
      }
    }
    
    // Try to find matching order using the helper function
    findAndSetOrderFromGemContract(formData.gem_contract_number);
  }, [sellerOrders, formData.gem_contract_number, selectedOrderId, findAndSetOrderFromGemContract]);

  // When selected order changes, auto-fill some global fields from order (gem, department) and preselect first item
  useEffect(() => {
    if (!selectedOrderId) return;
    const so: any = (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId));
    if (!so) return;
    const gem = (so.gemContractNumber || so.gem_contract_number || '').toString().trim();
    const dept = (so.gemBuyerDepartmentName || so.gem_buyer_department_name || '').toString().trim();

    setFormData(prev => ({
      ...prev,
      gem_contract_number: gem || prev.gem_contract_number,
      department: dept || prev.department,
    }));
    const firstItem = Array.isArray(so.items) && so.items.length > 0 ? so.items[0] : null;
    if (firstItem && firstItem.id !== undefined && firstItem.id !== null) {
      setSelectedOrderItemId(String(firstItem.id));
    } else {
      setSelectedOrderItemId('');
    }
  }, [selectedOrderId, sellerOrders]);

  // When selected order item changes, auto-fill asset fields from item
  useEffect(() => {
    if (!selectedOrderId || !selectedOrderItemId) return;
    const so: any = (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId));
    const it: any = (Array.isArray(so?.items) ? so.items : []).find((i: any) => String(i.id) === String(selectedOrderItemId));
    if (!it) return;
    const name = it.productName ?? '';
    const category = it.categoryType ?? it.category_type ?? '';
    const model = it.modelNumber ?? '';
    const manufacturer = it.brand ?? '';
    const description = [it.brand || '', it.modelNumber || ''].join(' ').trim();
    const value = Number(it.unitPrice ?? it.unit_price ?? it.totalPrice ?? it.total_price ?? 0) || 0;
    setFormData(prev => ({
      ...prev,
      name: name || prev.name,
      category: category || prev.category,
      model: model || prev.model,
      manufacturer: manufacturer || prev.manufacturer,
      description: description || prev.description,
      value: value > 0 ? value : prev.value,
    }));
  }, [selectedOrderItemId, selectedOrderId, sellerOrders]);

  // Validate GEM contract number format
  const validateGemContractFormat = (contractNumber: string): boolean => {
    // GEM contract number format: Flexible pattern to accommodate various formats
    // Example formats: GEM-2024-001, GEM-SELLER-DEMO-001, GEM/2023/001234, GEMC-511687759278412, etc.
    const trimmed = contractNumber.trim();
    
    // Validating GEM contract number
    
    // Must start with letters (at least 2), contain some numbers, and be reasonable length
    // Very flexible pattern: starts with letters, contains numbers, allows hyphens/slashes
    const gemContractPattern = /^[A-Z]{2,}[A-Z0-9\-/]*[0-9][A-Z0-9\-/]*$/i;
    
    // Additional checks: reasonable length (5-50 characters) and contains at least one number
    const hasNumbers = /\d/.test(trimmed);
    const reasonableLength = trimmed.length >= 5 && trimmed.length <= 50;
    const patternMatch = gemContractPattern.test(trimmed);
    
    return patternMatch && hasNumbers && reasonableLength;
  };

  // Get available GEM contract numbers from seller orders
  const getAvailableGemContracts = () => {
    const gemContracts = new Set<string>();
    
    // Get GEM contracts from seller orders
    (sellerOrders || []).forEach((order: any) => {
      const gemContract = order.gemContractNumber || order.gem_contract_number;
      if (gemContract && gemContract.trim()) {
        gemContracts.add(gemContract.trim());
      }
    });
    
    return Array.from(gemContracts).sort();
  };

  // Filter GEM contracts based on search term
  const getFilteredGemContracts = () => {
    const allContracts = getAvailableGemContracts();
    if (!gemSearchTerm.trim()) {
      return allContracts;
    }
    
    return allContracts.filter(contract => 
      contract.toLowerCase().includes(gemSearchTerm.toLowerCase())
    );
  };

  // Check if GEM contract exists in the system
  const checkGemContractExists = async (contractNumber: string): Promise<boolean> => {
    try {
      setGemContractValidating(true);
      // Check in seller orders
      const sellerOrders = await ApiService.getAllSellerOrders() as any[];
      const existsInSellerOrders = sellerOrders.some((order: any) => 
        order.gemContractNumber === contractNumber || order.gem_contract_number === contractNumber
      );
      
      // Check in purchase orders
      const purchaseOrders = await ApiService.getAllPurchaseOrders() as any[];
      const existsInPurchaseOrders = purchaseOrders.some((order: any) => 
        order.gemContractNumber === contractNumber || order.gem_contract_number === contractNumber
      );
      
      return existsInSellerOrders || existsInPurchaseOrders;
    } catch (error) {
      console.error('Error checking GEM contract existence:', error);
      return false;
    } finally {
      setGemContractValidating(false);
    }
  };


  // Handle GEM contract number change
  const handleGemContractChange = async (value: string) => {
    setFormData(prev => ({ ...prev, gem_contract_number: value }));
    setGemSearchTerm(value);
    
    // Clear previous validation state and selected order
    setGemContractExists(null);
    setSelectedOrderId('');
    
    if (!value.trim()) {
      return;
    }
    
    // Validate format
    if (!validateGemContractFormat(value)) {
      setGemContractExists(false);
      return;
    }
    
    // Find matching seller order from props
    findAndSetOrderFromGemContract(value);
    
    // Check if contract exists
    const exists = await checkGemContractExists(value);
    setGemContractExists(exists);
  };

  // Handle GEM contract selection from dropdown
  const handleGemContractSelect = async (contractNumber: string) => {
    setFormData(prev => ({ ...prev, gem_contract_number: contractNumber }));
    setGemSearchTerm(contractNumber);
    setShowGemDropdown(false);
    
    // Clear previous validation state
    setGemContractExists(null);
    
    // Validate format
    if (!validateGemContractFormat(contractNumber)) {
      setGemContractExists(false);
      return;
    }
    
    // Find matching seller order from props
    findAndSetOrderFromGemContract(contractNumber);
    
    // Check if contract exists
    const exists = await checkGemContractExists(contractNumber);
    setGemContractExists(exists);
  };

  // Handle dropdown input focus
  const handleGemContractFocus = () => {
    setShowGemDropdown(true);
    setGemSearchTerm(formData.gem_contract_number);
  };

  // Handle dropdown input blur
  const handleGemContractBlur = () => {
    // Delay hiding dropdown to allow for selection
    setTimeout(() => {
      setShowGemDropdown(false);
    }, 200);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.category) {
      newErrors['category'] = safeT('Category is required');
    }

    if (!formData.serialNumber.trim()) {
      newErrors['serialNumber'] = safeT('Serial number is required');
    }

    if (formData.value <= 0) {
      newErrors['value'] = safeT('Value must be greater than 0');
    }

    if (!formData.purchaseDate) {
      newErrors['purchaseDate'] = safeT('Purchase date is required');
    }

    // Validate GEM contract number
    if (!formData.gem_contract_number.trim()) {
      newErrors['gem_contract_number'] = safeT('GEM Contract Number is required');
    } else if (!validateGemContractFormat(formData.gem_contract_number)) {
      newErrors['gem_contract_number'] = safeT('Invalid GEM Contract Number format');
    } else if (gemContractExists === false) {
      newErrors['gem_contract_number'] = safeT('GEM Contract Number does not exist in the system');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check GEM contract number before validation
    if (formData.gem_contract_number.trim() && !validateGemContractFormat(formData.gem_contract_number)) {
      await themedAlert('Invalid GEM Contract Number format. Please check the format and try again.', 'Validation');
      return;
    }
    
    if (formData.gem_contract_number.trim() && gemContractExists === false) {
      await themedAlert(
        'GEM Contract Number does not exist in the system. Please check the contract number or add the order first before creating an asset.',
        'Validation'
      );
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

   
  const assetData: Asset = {
      id: _asset?.id || '',
      ...(formData.asset_uid ? { asset_uid: formData.asset_uid } : {}),
      name: formData.name,
      category: formData.category,
      serialNumber: formData.serialNumber,
      department: formData.department,
      location: formData.location,
      status: formData.status as any,
      value: formData.value,
      purchaseDate: formData.purchaseDate,
      warrantyExpiry: formData.warrantyExpiry,
      amcExpiry: formData.amcExpiry,
      ...(formData.gem_contract_number ? { gem_contract_number: formData.gem_contract_number } : {}),
      ...(_asset as any), // Include any additional properties
      description: formData.description,
      model: formData.model,
      manufacturer: formData.manufacturer,
      condition: formData.condition,
      notes: formData.notes
    };

    // Get selected seller order data for additional fields
    const selectedOrder = selectedOrderId ? (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId)) : null;
    
    // Attach selected seller order to bind asset with capacity/ownership on server
    const payload: any = {
      ...assetData,
      ...(selectedOrderId ? { seller_order_id: selectedOrderId } : {}),
      // Add procurement-related fields
      ...(selectedOrder ? {
        // The backend will find the corresponding purchase order for this seller order
        // If no purchase order exists, it will throw an error explaining that buyers must map the order first
        procurementStatus: selectedOrder.status === 'Approved' ? 'Procured' : 'Pending',
        invoiceNumber: `INV-${selectedOrder.id}-${Date.now().toString().slice(-6)}`, // Generate invoice number
        paymentStatus: 'Pending' as any,
        deliveryStatus: 'Pending' as any
      } : {}),
    };

    onSubmit(payload);
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };


  // Load and show capacity when order/category changes
  useEffect(() => {
    const fetchCapacity = async () => {
      if (!selectedOrderId) { setCapacity(null); return; }
      try {
        const cat = formData.category || undefined;
        const cap = await ApiService.getSellerOrderCapacity(selectedOrderId, cat);
        setCapacity({
          ordered: cap.ordered,
          registered: cap.registered,
          remaining: cap.remaining
        });
      } catch (_err) {
        setCapacity(null);
      }
    };
    fetchCapacity();
  }, [selectedOrderId, formData.category]);

  // Load itemized per-category capacities from selected order's items
  useEffect(() => {
    const loadPerCategoryCaps = async () => {
      if (!selectedOrderId) { setPerCategoryCaps([]); return; }
      try {
        setPerCategoryLoading(true);
        const so: any = (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId));
        const rawItems: any[] = Array.isArray(so?.items) ? so.items : [];
        // Extract categories from order items and normalize
        const categories = Array.from(new Set(
          rawItems
            .map((it: any) => (it?.categoryType ?? it?.category_type ?? ''))
            .map((v: any) => String(v || '').trim())
            .filter((v: string) => v.length > 0)
        ));
        if (categories.length === 0) {
          setPerCategoryCaps([]);
          return;
        }
        const results = await Promise.all(
          categories.map(async (c) => {
            try {
              const cap = await ApiService.getSellerOrderCapacity(String(selectedOrderId), c);
              return { category: c, ordered: cap.ordered, registered: cap.registered, remaining: cap.remaining };
            } catch {
              return { category: c, ordered: 0, registered: 0, remaining: 0 };
            }
          })
        );
        // Keep original order of categories
        setPerCategoryCaps(results);
      } finally {
        setPerCategoryLoading(false);
      }
    };
    loadPerCategoryCaps();
  }, [selectedOrderId, sellerOrders]);

  // Removed unused getCategoryIcon function

  // Prevent rendering if i18n is not ready to avoid initialization errors
  if (!ready) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              {_asset ? safeT('Edit Asset') : safeT('Add New Asset')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{safeT('Basic Information')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* GEM Contract Number dropdown */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('GEM Contract Number')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.gem_contract_number}
                    onChange={(e) => handleGemContractChange(e.target.value)}
                    onFocus={handleGemContractFocus}
                    onBlur={handleGemContractBlur}
                    placeholder="Search or enter GEM Contract Number"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors['gem_contract_number'] 
                        ? 'border-red-300 focus:ring-red-500' 
                        : gemContractExists === true 
                          ? 'border-green-300 focus:ring-green-500' 
                          : gemContractExists === false 
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 dark:border-slate-600'
                    }`}
                  />
                  
                  {/* Dropdown arrow */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Validation indicators */}
                  {gemContractValidating && (
                    <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  {gemContractExists === true && !gemContractValidating && (
                    <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                      <div className="text-green-600">✓</div>
                    </div>
                  )}
                  {gemContractExists === false && !gemContractValidating && (
                    <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                      <div className="text-red-600">✗</div>
                    </div>
                  )}

                  {/* Dropdown menu */}
                  {showGemDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {getFilteredGemContracts().length > 0 ? (
                        getFilteredGemContracts().map((contract, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 last:border-b-0"
                            onClick={() => handleGemContractSelect(contract)}
                          >
                            {contract}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          {gemSearchTerm.trim() ? 'No matching contracts found' : 'No GEM contracts available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {errors['gem_contract_number'] && (
                  <p className="text-xs text-red-600 mt-1">{errors['gem_contract_number']}</p>
                )}
                {!errors['gem_contract_number'] && gemContractExists === true && (
                  <p className="text-xs text-green-600 mt-1">✓ GEM Contract Number is valid and exists in the system</p>
                )}
                {!errors['gem_contract_number'] && gemContractExists === false && formData.gem_contract_number.trim() && (
                  <p className="text-xs text-red-600 mt-1">✗ GEM Contract Number does not exist in the system</p>
                )}
                {!errors['gem_contract_number'] && !gemContractExists && formData.gem_contract_number.trim() && !gemContractValidating && (
                  <p className="text-xs text-gray-500 mt-1">Enter a valid GEM Contract Number format</p>
                )}
                {getAvailableGemContracts().length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {getAvailableGemContracts().length} GEM contract{getAvailableGemContracts().length !== 1 ? 's' : ''} available from approved orders
                  </p>
                )}
              </div>
              {/* Order Item selector (optional) */}
              {selectedOrderId && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    {safeT('Select Order Item (optional)')}
                  </label>
                  <select
                    value={selectedOrderItemId}
                    onChange={(e) => setSelectedOrderItemId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:border-slate-600 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option className="dark:bg-slate-800 dark:text-white" value="">{safeT('Choose to auto-fill asset details')}</option>
                    {(() => {
                      const so: any = (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId));
                      const items: any[] = Array.isArray(so?.items) ? so.items : [];
                      return items.map((it: any) => (
                        <option className="dark:bg-slate-800 dark:text-white" key={String(it.id)} value={String(it.id)}>
                          {(it.productName ?? 'Item')} • {(it.categoryType ?? it.category_type ?? 'Category')} • {(it.modelNumber ?? '-')}
                        </option>
                      ));
                    })()}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{safeT('Picking an item will fill name, category, model, manufacturer, and value.')}</p>
                </div>
              )}
              {/* Per-category capacity guidance */}
              {selectedOrderId && (
                <div className="md:col-span-2">
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{safeT('Order capacities by category')}</span>
                      {perCategoryLoading && (
                        <span className="text-xs text-gray-500">{safeT('Loading...')}</span>
                      )}
                    </div>
                    {perCategoryCaps.length > 0 ? (
                      <div className="space-y-2">
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="min-w-full text-sm">
                            <thead className="bg-gray-100 text-gray-700 dark:text-gray-300">
                              <tr>
                                <th className="px-3 py-2 text-left">{safeT('Category')}</th>
                                <th className="px-3 py-2 text-left">{safeT('Ordered')}</th>
                                <th className="px-3 py-2 text-left">{safeT('Registered')}</th>
                                <th className="px-3 py-2 text-left">{safeT('Remaining')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {perCategoryCaps.map((row) => (
                                <tr key={row.category} className="border-t">
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => setFormData(prev => ({ ...prev, category: row.category }))}
                                      className={`px-2 py-1 rounded text-xs ${formData.category === row.category ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                                      title={safeT('Click to use this category')}
                                    >
                                      {row.category}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2">{row.ordered}</td>
                                  <td className="px-3 py-2">{row.registered}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-2 py-0.5 rounded text-xs ${row.remaining > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {row.remaining}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="text-xs text-gray-500">
                          {safeT('Tip')}: {safeT('Click a category chip to set it for this asset.')}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">{safeT('No itemized categories found for this order')}</p>
                    )}
                  </div>
                </div>
              )}
              {_asset && (_asset as any).asset_uid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    {safeT('Asset ID')}
                  </label>
                  <input
                    type="text"
                    name="asset_uid"
                    value={formData.asset_uid}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700"
                    readOnly
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Category')} *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['category'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                >
                  <option className="dark:bg-slate-800 dark:text-white" value="">{safeT('Select category')}</option>
                  {(() => {
                    if (!selectedOrderId) return null;
                    const so: any = (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId));
                    if (!so) return null;
                    const items: any[] = Array.isArray(so?.items) ? so.items : [];
                    const categories = Array.from(new Set(
                      items.map((it: any) => String((it.categoryType ?? it.category_type ?? '') || '').trim()).filter((v: string) => v.length > 0)
                    ));
                    return categories.map((c: string) => (
                      <option key={c} className="dark:bg-slate-800 dark:text-white" value={c}>{c}</option>
                    ));
                  })()}
                </select>
                {errors['category'] && <p className="text-red-500 text-sm mt-1">{errors['category']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Serial Number')} *
                </label>
                <input
                  type="text"
                  name="serialNumber"
                  value={formData.serialNumber}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['serialNumber'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder={safeT('Enter serial number')}
                />
                {errors['serialNumber'] && <p className="text-red-500 text-sm mt-1">{errors['serialNumber']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Department')} *
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700"
                  placeholder={safeT('Auto-filled from order')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Location')}
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={safeT('Enter location')}
                />
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{safeT('Technical Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Model')}
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={safeT('Enter model')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Manufacturer')}
                </label>
                <select
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!selectedOrderId}
                >
                  <option className="dark:bg-slate-800 dark:text-white" value="">{safeT('Select manufacturer')}</option>
                  {(() => {
                    if (!selectedOrderId) return null;
                    const so: any = (sellerOrders || []).find((o: any) => String(o.id) === String(selectedOrderId));
                    const items: any[] = Array.isArray(so?.items) ? so.items : [];
                    const brands = Array.from(new Set(items.map((it: any) => String(it.brand || '').trim()).filter((v: string) => v.length > 0)));
                    return brands.map((b: string) => (
                      <option key={b} className="dark:bg-slate-800 dark:text-white" value={b}>{b}</option>
                    ));
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Condition')}
                </label>
                <input type="text" name="condition" value={formData.condition} onChange={handleChange} className="hidden" />
                <div className="text-xs text-gray-500">{safeT('Condition is not required for this entry')}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={safeT('Enter description')}
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{safeT('Financial Information')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Value (₹)')} *
                </label>
                <input
                  type="number"
                  name="value"
                  value={formData.value}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['value'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder={safeT('Enter value')}
                />
                {errors['value'] && <p className="text-red-500 text-sm mt-1">{errors['value']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Purchase Date')} *
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors['purchaseDate'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                {errors['purchaseDate'] && <p className="text-red-500 text-sm mt-1">{errors['purchaseDate']}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Warranty Expiry')}
                </label>
                <input
                  type="date"
                  name="warrantyExpiry"
                  value={formData.warrantyExpiry}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('AMC Expiry')}
                </label>
                <input
                  type="date"
                  name="amcExpiry"
                  value={formData.amcExpiry}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{safeT('Additional Information')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={safeT('Enter asset description')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Model')}
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={safeT('Enter model number')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Manufacturer')}
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={safeT('Enter manufacturer name')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Condition')}
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option className="dark:bg-slate-800 dark:text-white" value="New">{safeT('New')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Used">{safeT('Used')}</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {safeT('Notes')}
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={safeT('Enter additional notes')}
                />
              </div>
            </div>
          </div>


          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-slate-700"
            >
              {safeT('Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (capacity !== null && capacity.remaining <= 0)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {safeT('Saving...')}
                </>
              ) : (
                (capacity !== null && capacity.remaining <= 0) ? safeT('No remaining capacity') : safeT('Save Asset')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssetForm;



