import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FileText, Upload, CheckCircle } from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface AddOrderFormProps {
  onSubmit: (orderData: any) => void;
  onCancel: () => void;
  loading?: boolean;
  editingOrder?: any;
}

interface OrderItem {
  id: string;
  productName: string;
  brand: string;
  modelNumber: string;
  categoryType: string;
  quantity: number;
  unitPrice: number;
  gstin: string;
  warrantyPeriod: number;
  amcResponsibility: string;
  installationRequired: boolean;
}

interface BuyerContact {
  officerName: string;
  designation: string;
  email: string;
  contactNumber: string;
}

interface ProjectManager {
  officerName: string;
  designation: string;
  contactNumber: string;
}

const AddOrderForm: React.FC<AddOrderFormProps> = ({ 
  onSubmit, 
  onCancel, 
  loading = false,
  editingOrder = null
}) => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const isSuperAdmin = user?.role === 'Super Admin';
  const [formData, setFormData] = useState({
    gemContractNumber: editingOrder?.gemContractNumber || editingOrder?.gem_contract_number || '',
    gemOrderCategory: editingOrder?.gemOrderCategory || editingOrder?.gem_order_category || '',
    gemBuyerDepartmentName: editingOrder?.gemBuyerDepartmentName || editingOrder?.gem_buyer_department_name || '',
    expectedDeliveryStartDate: editingOrder?.expectedDeliveryWindow?.startDate || editingOrder?.expected_delivery_window?.startDate || '',
    expectedDeliveryEndDate: editingOrder?.expectedDeliveryWindow?.endDate || editingOrder?.expected_delivery_window?.endDate || '',
    oemAuthorizationLetter: null as File | null,
    gemOrderFile: null as File | null,
    workOrderFile: null as File | null,
    purchaseOrderFile: null as File | null,
    selectedBuyerId: editingOrder?.selectedBuyerId || editingOrder?.buyerId || editingOrder?.buyer_id || '',
    selectedSellerId: editingOrder?.selectedSellerId || editingOrder?.sellerId || editingOrder?.seller_id || '',
  });
  
  // Track if files already exist for this order (when editing)
  // Check both File objects and file path strings
  const [existingFiles, setExistingFiles] = useState({
    hasGemOrderFile: !!(editingOrder?.gemOrderFile || editingOrder?.gem_order_file || 
                        editingOrder?.gemOrderFilePath || editingOrder?.gem_order_file_path),
    hasOemAuthLetter: !!(editingOrder?.oemAuthorizationLetter || editingOrder?.oem_authorization_letter ||
                        editingOrder?.oemAuthorizationLetterPath || editingOrder?.oem_authorization_letter_path),
    hasWorkOrderFile: !!(editingOrder?.workOrderFile || editingOrder?.work_order_file),
    hasPurchaseOrderFile: !!(editingOrder?.purchaseOrderFile || editingOrder?.purchase_order_file)
  });

  const [buyerContact, setBuyerContact] = useState<BuyerContact>({
    officerName: editingOrder?.buyerContact?.officerName || editingOrder?.buyer_contact?.officerName || '',
    designation: editingOrder?.buyerContact?.designation || editingOrder?.buyer_contact?.designation || '',
    email: editingOrder?.buyerContact?.email || editingOrder?.buyer_contact?.email || '',
    contactNumber: editingOrder?.buyerContact?.contactNumber || editingOrder?.buyer_contact?.contactNumber || ''
  });

  const [projectManager, setProjectManager] = useState<ProjectManager>({
    officerName: editingOrder?.projectManager?.officerName || editingOrder?.project_manager?.officerName || editingOrder?.deliveryPerson?.officerName || editingOrder?.delivery_person?.officerName || '',
    designation: editingOrder?.projectManager?.designation || editingOrder?.project_manager?.designation || editingOrder?.deliveryPerson?.designation || editingOrder?.delivery_person?.designation || '',
    contactNumber: editingOrder?.projectManager?.contactNumber || editingOrder?.project_manager?.contactNumber || editingOrder?.deliveryPerson?.contactNumber || editingOrder?.delivery_person?.contactNumber || ''
  });

  const [items, setItems] = useState<OrderItem[]>(
    editingOrder?.items?.length > 0 
      ? editingOrder.items.map((item: any, idx: number) => ({
          id: item.id || `item-${idx}`,
          productName: item.productName || item.product_name || '',
          brand: item.brand || '',
          modelNumber: item.modelNumber || item.model_number || '',
          categoryType: item.categoryType || item.category_type || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.unit_price || 0,
          gstin: item.gstin || '',
          warrantyPeriod: item.warrantyPeriod || item.warranty_period || 1,
          amcResponsibility: item.amcResponsibility || item.amc_responsibility || 'OEM',
          installationRequired: item.installationRequired || item.installation_required || false
        }))
      : [{
          id: '1',
          productName: '',
          brand: '',
          modelNumber: '',
          categoryType: '',
          quantity: 1,
          unitPrice: 0,
          gstin: '',
          warrantyPeriod: 1,
          amcResponsibility: 'OEM',
          installationRequired: false
        }]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contractNumberValid, setContractNumberValid] = useState<boolean | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState<number>(-1);
  const [showBrandDropdown, setShowBrandDropdown] = useState<number>(-1);

  // Dropdown defaults (loaded from API)
  const [productNames, setProductNames] = useState(['Laptop', 'Desktop', 'Printer', 'Scanner', 'Server', 'Network Equipment']);
  const [brands, setBrands] = useState(['Dell', 'HP', 'Lenovo', 'Cisco', 'IBM', 'Apple']);
  const categoryPresets = ['IT Hardware', 'Software', 'Services', 'Consumables'] as const;
  const categoryTypes = [...categoryPresets, 'Other'];
  const amcOptions = ['OEM', 'Seller', '3rd Party'];
  const isPresetCategory = (v: string) => (categoryPresets as readonly string[]).includes(v);
  const categorySelectValue = (stored: string) =>
    !stored ? '' : isPresetCategory(stored) ? stored : 'Other';

  // Buyer and Seller data
  const [buyers, setBuyers] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [sellerSearch, setSellerSearch] = useState('');
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [loadingSellers, setLoadingSellers] = useState(false);

  // Load product names and brands from API
  useEffect(() => {
    const loadProductData = async () => {
      try {
        const [productNamesData, brandsData] = await Promise.all([
          ApiService.getProductNames(),
          ApiService.getBrands()
        ]);
        
        if (productNamesData && productNamesData.length > 0) {
          setProductNames(productNamesData);
        }
        if (brandsData && brandsData.length > 0) {
          setBrands(brandsData);
        }
      } catch (error) {
        console.error('Error loading product data:', error);
        // Keep default values on error
      }
    };

    loadProductData();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load buyers and sellers data only for Super Admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const loadBuyersAndSellers = async () => {
      try {
        setLoadingBuyers(true);
        setLoadingSellers(true);
        
        const [buyersData, sellersData] = await Promise.all([
          ApiService.getApprovedBuyers(),
          ApiService.getApprovedSellers()
        ]);
        
        setBuyers(buyersData || []);
        setSellers(sellersData || []);
      } catch (error) {
        console.error('Error loading buyers and sellers:', error);
      } finally {
        setLoadingBuyers(false);
        setLoadingSellers(false);
      }
    };

    loadBuyersAndSellers();
  }, [isSuperAdmin]);

  // Filter buyers and sellers based on search
  const filteredBuyers = buyers.filter(buyer => 
    buyer.name?.toLowerCase().includes(buyerSearch.toLowerCase()) ||
    buyer.email?.toLowerCase().includes(buyerSearch.toLowerCase())
  );

  const filteredSellers = sellers.filter(seller => 
    seller.name?.toLowerCase().includes(sellerSearch.toLowerCase()) ||
    seller.email?.toLowerCase().includes(sellerSearch.toLowerCase())
  );

  const handleBuyerContactChange = (field: keyof BuyerContact, value: string) => {
    setBuyerContact(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProjectManagerChange = (field: keyof ProjectManager, value: string) => {
    setProjectManager(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (itemId: string, field: string, value: string | number | boolean) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addItem = () => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      productName: '',
      brand: '',
      modelNumber: '',
      categoryType: '',
      quantity: 1,
  unitPrice: 0,
      gstin: '',
      warrantyPeriod: 1,
      amcResponsibility: 'OEM',
      installationRequired: false
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const addProductName = (newProductName: string) => {
    if (!productNames.includes(newProductName)) {
      setProductNames(prev => [...prev, newProductName]);
    }
  };

  const addBrand = (newBrand: string) => {
    if (!brands.includes(newBrand)) {
      setBrands(prev => [...prev, newBrand]);
    }
  };

  const removeProductName = (productNameToRemove: string) => {
    setProductNames(prev => prev.filter(name => name !== productNameToRemove));
    // Clear the field if it matches the removed product name
    setItems(prev => prev.map(item => 
      item.productName === productNameToRemove 
        ? { ...item, productName: '' }
        : item
    ));
  };

  const removeBrand = (brandToRemove: string) => {
    setBrands(prev => prev.filter(brand => brand !== brandToRemove));
    // Clear the field if it matches the removed brand
    setItems(prev => prev.map(item => 
      item.brand === brandToRemove 
        ? { ...item, brand: '' }
        : item
    ));
  };

  const handleFileUpload = (field: 'gemOrderFile' | 'oemAuthorizationLetter' | 'workOrderFile' | 'purchaseOrderFile', file: File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const validateContractNumber = async (contractNumber: string) => {
    try {
      if (!contractNumber || contractNumber.length < 10) {
        setContractNumberValid(null);
        return false;
      }
      // Check uniqueness against existing seller orders
      const existing = await ApiService.getSellerOrderByGemContract(contractNumber);
      const isUnique = !existing || (Array.isArray(existing) && existing.length === 0);
      setContractNumberValid(isUnique);
      return isUnique;
    } catch (e) {
      // On error, mark unknown rather than passing
      setContractNumberValid(null);
      return false;
    }
  };

  const handleContractNumberChange = async (value: string) => {
    handleInputChange('gemContractNumber', value);
    if (value.length >= 10) {
      await validateContractNumber(value);
    } else {
      setContractNumberValid(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate GeM Contract Number
    if (!formData.gemContractNumber.trim()) {
      newErrors['gemContractNumber'] = 'GeM Contract Number is required';
    } else if (contractNumberValid === false) {
      newErrors['gemContractNumber'] = 'GeM Contract Number must be unique';
    }

    // Validate GeM Order Upload (only required for new orders, optional when editing)
    if (!editingOrder && !formData.gemOrderFile) {
      newErrors['gemOrderFile'] = 'GeM Order file is required';
    }

    // Validate GeM Order Category (custom text required when Other)
    if (!formData.gemOrderCategory.trim() || formData.gemOrderCategory === 'Other') {
      newErrors['gemOrderCategory'] = formData.gemOrderCategory === 'Other'
        ? 'Please enter a custom category'
        : 'GeM Order Category is required';
    }

    // Validate GeM Buyer Department Name
    if (!formData.gemBuyerDepartmentName.trim()) {
      newErrors['gemBuyerDepartmentName'] = 'GeM Buyer Department Name is required';
    }

    // Validate Seller selection (only for Super Admin and only for new orders)
    // When editing, seller should already be set, but allow override
    if (isSuperAdmin && !editingOrder && !formData.selectedSellerId) {
      newErrors['selectedSellerId'] = 'Seller selection is required';
    }

    // Validate Buyer Contact Details
    if (!buyerContact.officerName.trim()) {
      newErrors['buyerOfficerName'] = 'Buyer Officer Name is required';
    }
    if (!buyerContact.designation.trim()) {
      newErrors['buyerDesignation'] = 'Buyer Designation is required';
    }
    if (!buyerContact.email.trim()) {
      newErrors['buyerEmail'] = 'Buyer Email is required';
    } else if (!/\S+@\S+\.\S+/.test(buyerContact.email)) {
      newErrors['buyerEmail'] = 'Buyer Email must be valid';
    }
    if (!buyerContact.contactNumber.trim()) {
      newErrors['buyerContactNumber'] = 'Buyer Contact Number is required';
    }

    // Validate Project Manager Details
    if (!projectManager.officerName.trim()) {
      newErrors['projectManagerOfficerName'] = 'Project Manager Name is required';
    }
    if (!projectManager.designation.trim()) {
      newErrors['projectManagerDesignation'] = 'Project Manager Designation is required';
    }
    if (!projectManager.contactNumber.trim()) {
      newErrors['projectManagerContactNumber'] = 'Project Manager Contact Number is required';
    }

    // Validate Expected Delivery Window
    if (!formData.expectedDeliveryStartDate) {
      newErrors['expectedDeliveryStartDate'] = 'Expected Delivery Start Date is required';
    }
    if (!formData.expectedDeliveryEndDate) {
      newErrors['expectedDeliveryEndDate'] = 'Expected Delivery End Date is required';
    }

    // Validate Items
    items.forEach((item, index) => {
      if (!item.productName.trim()) {
        newErrors[`item-${index}-productName`] = 'Product Name is required';
      }
      if (!item.brand.trim()) {
        newErrors[`item-${index}-brand`] = 'Brand is required';
      }
      if (!item.modelNumber.trim()) {
        newErrors[`item-${index}-modelNumber`] = 'Model Number is required';
      }
      if (!item.categoryType.trim() || item.categoryType === 'Other') {
        newErrors[`item-${index}-categoryType`] = item.categoryType === 'Other'
          ? 'Please enter a custom category'
          : 'Category Type is required';
      }
      if (item.quantity <= 0) {
        newErrors[`item-${index}-quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice <= 0) {
        newErrors[`item-${index}-unitPrice`] = 'Unit Price must be greater than 0';
      }
      if (!item.gstin.trim()) {
        newErrors[`item-${index}-gstin`] = 'GSTIN is required';
      }
      if (item.warrantyPeriod <= 0) {
        newErrors[`item-${index}-warrantyPeriod`] = 'Warranty Period must be greater than 0';
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

    // Compute grand total from items (quantity * unitPrice + 18% GST per item)
    const grandTotal = items.reduce((sum, it) => {
      const subtotal = (it.quantity || 0) * (it.unitPrice || 0);
      const gst = subtotal * 0.18;
      return sum + subtotal + gst;
    }, 0);

    const orderData = {
      ...(editingOrder ? { id: editingOrder.id } : { id: `ORDER-${Date.now()}` }),
      gemContractNumber: formData.gemContractNumber,
      gemOrderCategory: formData.gemOrderCategory,
      gemBuyerDepartmentName: formData.gemBuyerDepartmentName,
      buyerContact,
      projectManager,
      deliveryPerson: projectManager,
      expectedDeliveryWindow: {
        startDate: formData.expectedDeliveryStartDate,
        endDate: formData.expectedDeliveryEndDate
      },
      items,
  totalAmount: Number(grandTotal.toFixed(2)),
      oemAuthorizationLetter: formData.oemAuthorizationLetter,
      gemOrderFile: formData.gemOrderFile,
      workOrderFile: formData.workOrderFile,
      purchaseOrderFile: formData.purchaseOrderFile,
      createdAt: editingOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: editingOrder?.status || 'Pending Approval',
      sellerId: editingOrder?.sellerId || editingOrder?.seller_id || 'SELL001',
      sellerName: editingOrder?.sellerName || editingOrder?.seller_name || 'Seller',
      // Include selected buyer and seller IDs (only for Super Admin)
      ...(isSuperAdmin && {
        selectedBuyerId: formData.selectedBuyerId,
        selectedSellerId: formData.selectedSellerId
      })
    };

    onSubmit(orderData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
        <div className={`p-6 border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-surface-border bg-white'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {editingOrder ? 'Edit GeM Order' : 'Add GeM Order'}
            </h2>
            <button
              onClick={onCancel}
              className={`${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {editingOrder ? 'Update GeM order details' : 'Create a new GeM order with all required details'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={`p-6 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
          {/* GeM Contract Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">GeM Contract Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GeM Contract Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.gemContractNumber}
                    onChange={(e) => handleContractNumberChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                      errors['gemContractNumber'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                    placeholder="e.g., GEMC-511687794200394"
                  />
                  {contractNumberValid === true && (
                    <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
                  )}
                </div>
                {errors['gemContractNumber'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['gemContractNumber']}</p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Auto-check for uniqueness</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GeM Order Category *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={categorySelectValue(formData.gemOrderCategory)}
                    onChange={(e) => {
                      const v = e.target.value;
                      handleInputChange('gemOrderCategory', v === 'Other' ? 'Other' : v);
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                      errors['gemOrderCategory'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                    }`}
                  >
                    <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="">Select Category</option>
                    {categoryTypes.map((c) => (
                      <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {categorySelectValue(formData.gemOrderCategory) === 'Other' && (
                    <input
                      type="text"
                      value={formData.gemOrderCategory === 'Other' ? '' : formData.gemOrderCategory}
                      onChange={(e) => handleInputChange('gemOrderCategory', e.target.value || 'Other')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                        errors['gemOrderCategory'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                      placeholder="Enter category"
                    />
                  )}
                </div>
                {errors['gemOrderCategory'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['gemOrderCategory']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GeM Buyer Department Name *
                </label>
                <input
                  type="text"
                  value={formData.gemBuyerDepartmentName}
                  onChange={(e) => handleInputChange('gemBuyerDepartmentName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['gemBuyerDepartmentName'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter department name"
                />
                {errors['gemBuyerDepartmentName'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['gemBuyerDepartmentName']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GeM Order Upload (PDF/Excel) {!editingOrder && '*'}
                </label>
                {editingOrder && existingFiles.hasGemOrderFile && !formData.gemOrderFile && (
                  <div className="mb-2 p-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ GeM Order file already uploaded. Upload a new file only if you want to replace it.
                    </p>
                  </div>
                )}
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 text-center bg-gray-50/50 dark:bg-slate-700/30 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    onChange={(e) => {
                      handleFileUpload('gemOrderFile', e.target.files?.[0] || null);
                      if (e.target.files?.[0]) {
                        setExistingFiles(prev => ({ ...prev, hasGemOrderFile: false }));
                      }
                    }}
                    className="hidden"
                    id="gemOrderFile"
                  />
                  <label htmlFor="gemOrderFile" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 dark:text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {formData.gemOrderFile 
                        ? formData.gemOrderFile.name 
                        : editingOrder && existingFiles.hasGemOrderFile
                          ? 'Click to replace existing file (optional)'
                          : 'Click to upload work order file'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF or Excel files only</p>
                  </label>
                </div>
                {errors['gemOrderFile'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['gemOrderFile']}</p>
                )}
              </div>
            </div>
          </div>

          {/* Buyer and Seller Selection - Only for Super Admin */}
          {isSuperAdmin && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Buyer and Seller Selection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Buyer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buyer (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={buyerSearch}
                      onChange={(e) => setBuyerSearch(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                      placeholder="Search buyers by name or email"
                    />
                    <select
                      value={formData.selectedBuyerId}
                      onChange={(e) => handleInputChange('selectedBuyerId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    >
                      <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="">Select Buyer (Optional)</option>
                      {filteredBuyers.map(buyer => (
                        <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={buyer.id} value={buyer.id}>
                          {buyer.name} ({buyer.email})
                        </option>
                      ))}
                    </select>
                    {loadingBuyers && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading buyers...</p>
                    )}
                  </div>
                </div>

                {/* Seller Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seller {!editingOrder && '*'}
                  </label>
                  {editingOrder && formData.selectedSellerId && (
                    <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        ✓ Seller is already assigned to this order and cannot be changed.
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={sellerSearch}
                      onChange={(e) => setSellerSearch(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 ${
                        editingOrder ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''
                      }`}
                      placeholder="Search sellers by name or email"
                      disabled={!!editingOrder}
                      title={editingOrder ? 'Seller cannot be changed when editing an order' : ''}
                    />
                    <select
                      value={formData.selectedSellerId}
                      onChange={(e) => handleInputChange('selectedSellerId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        errors['selectedSellerId'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                      } ${editingOrder ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`}
                      disabled={!!editingOrder}
                      title={editingOrder ? 'Seller cannot be changed when editing an order' : ''}
                    >
                      <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="">
                        {editingOrder 
                          ? formData.selectedSellerId 
                            ? `Current Seller (Cannot be changed)`
                            : 'Select Seller'
                          : 'Select Seller *'}
                      </option>
                      {filteredSellers.map(seller => (
                        <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={seller.id} value={seller.id}>
                          {seller.name} ({seller.email})
                        </option>
                      ))}
                    </select>
                    {loadingSellers && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading sellers...</p>
                    )}
                    {errors['selectedSellerId'] && (
                      <p className="text-red-500 text-sm mt-1">{errors['selectedSellerId']}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buyer Contact Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Buyer Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Officer Name *
                </label>
                <input
                  type="text"
                  value={buyerContact.officerName}
                  onChange={(e) => handleBuyerContactChange('officerName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['buyerOfficerName'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter officer name"
                />
                {errors['buyerOfficerName'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['buyerOfficerName']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Designation *
                </label>
                <input
                  type="text"
                  value={buyerContact.designation}
                  onChange={(e) => handleBuyerContactChange('designation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['buyerDesignation'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter designation"
                />
                {errors['buyerDesignation'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['buyerDesignation']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={buyerContact.email}
                  onChange={(e) => handleBuyerContactChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['buyerEmail'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter email address"
                />
                {errors['buyerEmail'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['buyerEmail']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  value={buyerContact.contactNumber}
                  onChange={(e) => handleBuyerContactChange('contactNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['buyerContactNumber'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter contact number"
                />
                {errors['buyerContactNumber'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['buyerContactNumber']}</p>
                )}
              </div>
            </div>
          </div>

          {/* Project Manager Details */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Project Manager</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={projectManager.officerName}
                  onChange={(e) => handleProjectManagerChange('officerName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['projectManagerOfficerName'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter project manager name"
                />
                {errors['projectManagerOfficerName'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['projectManagerOfficerName']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Designation *
                </label>
                <input
                  type="text"
                  value={projectManager.designation}
                  onChange={(e) => handleProjectManagerChange('designation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['projectManagerDesignation'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter designation"
                />
                {errors['projectManagerDesignation'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['projectManagerDesignation']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Number * (Generate Delivery Confirmation OTP on this number)
                </label>
                <input
                  type="tel"
                  value={projectManager.contactNumber}
                  onChange={(e) => handleProjectManagerChange('contactNumber', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                    errors['projectManagerContactNumber'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder="Enter contact number"
                />
                {errors['projectManagerContactNumber'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['projectManagerContactNumber']}</p>
                )}
              </div>
            </div>
          </div>

          {/* Expected Delivery Window */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Expected Delivery Window</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryStartDate}
                  onChange={(e) => handleInputChange('expectedDeliveryStartDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white dark:[color-scheme:dark] ${
                    errors['expectedDeliveryStartDate'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                {errors['expectedDeliveryStartDate'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['expectedDeliveryStartDate']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryEndDate}
                  onChange={(e) => handleInputChange('expectedDeliveryEndDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white dark:[color-scheme:dark] ${
                    errors['expectedDeliveryEndDate'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                />
                {errors['expectedDeliveryEndDate'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['expectedDeliveryEndDate']}</p>
                )}
              </div>
            </div>
          </div>

          {/* Item-Wise Order Data */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Item-Wise Order Data</h3>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>

            <div className="space-y-6">
              {items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-6 bg-gray-50/50 dark:bg-slate-800/60">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Item {index + 1}</h4>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Product Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                          onFocus={() => setShowProductDropdown(index)}
                          onBlur={() => setTimeout(() => setShowProductDropdown(-1), 200)}
                          placeholder="Type or select product name"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                            errors[`item-${index}-productName`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                          }`}
                        />
                        {showProductDropdown === index && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                            {productNames
                              .filter(option => option.toLowerCase().includes(item.productName.toLowerCase()))
                              .map((option, optionIndex) => (
                                <div
                                  key={optionIndex}
                                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center text-gray-900 dark:text-gray-100"
                                  onClick={() => {
                                    handleItemChange(item.id, 'productName', option);
                                    setShowProductDropdown(-1);
                                  }}
                                >
                                  <span>{option}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeProductName(option);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Delete this product name"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            {item.productName && !productNames.includes(item.productName) && (
                              <div
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 cursor-pointer border-t border-gray-200 dark:border-slate-600"
                                onClick={() => {
                                  addProductName(item.productName);
                                  setShowProductDropdown(-1);
                                }}
                              >
                                + Add "{item.productName}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {errors[`item-${index}-productName`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-productName`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Brand *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={item.brand}
                          onChange={(e) => handleItemChange(item.id, 'brand', e.target.value)}
                          onFocus={() => setShowBrandDropdown(index)}
                          onBlur={() => setTimeout(() => setShowBrandDropdown(-1), 200)}
                          placeholder="Type or select brand"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                            errors[`item-${index}-brand`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                          }`}
                        />
                        {showBrandDropdown === index && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-auto">
                            {brands
                              .filter(option => option.toLowerCase().includes(item.brand.toLowerCase()))
                              .map((option, optionIndex) => (
                                <div
                                  key={optionIndex}
                                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center text-gray-900 dark:text-gray-100"
                                  onClick={() => {
                                    handleItemChange(item.id, 'brand', option);
                                    setShowBrandDropdown(-1);
                                  }}
                                >
                                  <span>{option}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeBrand(option);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Delete this brand"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            {item.brand && !brands.includes(item.brand) && (
                              <div
                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-400 cursor-pointer border-t border-gray-200 dark:border-slate-600"
                                onClick={() => {
                                  addBrand(item.brand);
                                  setShowBrandDropdown(-1);
                                }}
                              >
                                + Add "{item.brand}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {errors[`item-${index}-brand`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-brand`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Model Number / SKU *
                      </label>
                      <input
                        type="text"
                        value={item.modelNumber}
                        onChange={(e) => handleItemChange(item.id, 'modelNumber', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                          errors[`item-${index}-modelNumber`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        placeholder="Enter model number"
                      />
                      {errors[`item-${index}-modelNumber`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-modelNumber`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category Type *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={categorySelectValue(item.categoryType)}
                          onChange={(e) => {
                            const v = e.target.value;
                            handleItemChange(item.id, 'categoryType', v === 'Other' ? 'Other' : v);
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                            errors[`item-${index}-categoryType`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                          }`}
                        >
                          <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="">Select Category</option>
                          {categoryTypes.map(category => (
                            <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={category} value={category}>{category}</option>
                          ))}
                        </select>
                        {categorySelectValue(item.categoryType) === 'Other' && (
                          <input
                            type="text"
                            value={item.categoryType === 'Other' ? '' : item.categoryType}
                            onChange={(e) => handleItemChange(item.id, 'categoryType', e.target.value || 'Other')}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                              errors[`item-${index}-categoryType`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                            }`}
                            placeholder="Enter category"
                          />
                        )}
                      </div>
                      {errors[`item-${index}-categoryType`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-categoryType`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quantity Ordered *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={String(item.quantity)}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/\D/g, '');
                          const qty = onlyDigits === '' ? 0 : parseInt(onlyDigits, 10);
                          handleItemChange(item.id, 'quantity', qty);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                          errors[`item-${index}-quantity`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
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
                        type="text"
                        inputMode="decimal"
                        value={item.unitPrice === 0 ? '' : String(item.unitPrice)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^\d.]/g, '');
                          const parts = raw.split('.');
                          const normalized = parts.length > 2
                            ? `${parts[0]}.${parts.slice(1).join('')}`
                            : raw;
                          handleItemChange(item.id, 'unitPrice', normalized === '' ? 0 : parseFloat(normalized) || 0);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                          errors[`item-${index}-unitPrice`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        placeholder="0.00"
                      />
                      {errors[`item-${index}-unitPrice`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-unitPrice`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        GSTIN of OEM *
                      </label>
                      <input
                        type="text"
                        value={item.gstin}
                        onChange={(e) => handleItemChange(item.id, 'gstin', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                          errors[`item-${index}-gstin`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        placeholder="Enter GSTIN"
                      />
                      {errors[`item-${index}-gstin`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-gstin`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Warranty Period (in years) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={item.warrantyPeriod === 0 ? '' : String(item.warrantyPeriod)}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/\D/g, '');
                          const years = onlyDigits === '' ? 0 : Math.min(10, parseInt(onlyDigits, 10));
                          handleItemChange(item.id, 'warrantyPeriod', years);
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
                          errors[`item-${index}-warrantyPeriod`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                        }`}
                        placeholder="1"
                      />
                      {errors[`item-${index}-warrantyPeriod`] && (
                        <p className="text-red-500 text-sm mt-1">{errors[`item-${index}-warrantyPeriod`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        AMC Responsibility *
                      </label>
                      <select
                        value={item.amcResponsibility}
                        onChange={(e) => handleItemChange(item.id, 'amcResponsibility', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      >
                        {amcOptions.map(option => (
                          <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`installation-${item.id}`}
                        checked={item.installationRequired}
                        onChange={(e) => handleItemChange(item.id, 'installationRequired', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500 bg-white dark:bg-slate-700"
                      />
                      <label htmlFor={`installation-${item.id}`} className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Installation Required?
                      </label>
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="mt-4 bg-gray-50 dark:bg-slate-700/80 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    {(() => {
                      const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
                      const gst = subtotal * 0.18;
                      const total = subtotal + gst;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                            <span className="font-medium text-gray-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">GST (18% rate)</span>
                            <span className="font-medium text-gray-900 dark:text-white">₹{gst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Total Price</span>
                            <span className="font-semibold text-gray-900 dark:text-white">₹{total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Order Value Summary */}
          <div className="mt-6 bg-white dark:bg-slate-750 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4">
            {(() => {
              const grandTotal = items.reduce((sum, it) => {
                const subtotal = (it.quantity || 0) * (it.unitPrice || 0);
                const gst = subtotal * 0.18;
                return sum + subtotal + gst;
              }, 0);
              return (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">Total Order Value</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">₹{grandTotal.toFixed(2)}</div>
                </div>
              );
            })()}
          </div>

          {/* OEM Authorization Letter */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">OEM Authorization Letter (Optional)</h3>
            {editingOrder && existingFiles.hasOemAuthLetter && !formData.oemAuthorizationLetter && (
              <div className="mb-2 p-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ OEM Authorization Letter already uploaded. Upload a new file only if you want to replace it.
                </p>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 text-center bg-gray-50/50 dark:bg-slate-700/30 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  handleFileUpload('oemAuthorizationLetter', e.target.files?.[0] || null);
                  if (e.target.files?.[0]) {
                    setExistingFiles(prev => ({ ...prev, hasOemAuthLetter: false }));
                  }
                }}
                className="hidden"
                id="oemAuthorizationLetter"
              />
              <label htmlFor="oemAuthorizationLetter" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formData.oemAuthorizationLetter 
                    ? formData.oemAuthorizationLetter.name 
                    : editingOrder && existingFiles.hasOemAuthLetter
                      ? 'Click to replace existing file (optional)'
                      : 'Click to upload OEM authorization letter'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, DOC, or DOCX files only</p>
              </label>
            </div>
          </div>

          {/* WO (Work Order) Upload */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">WO (Work Order)</h3>
            {editingOrder && existingFiles.hasWorkOrderFile && !formData.workOrderFile && (
              <div className="mb-2 p-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Work Order file already uploaded. Upload a new file only if you want to replace it.
                </p>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 text-center bg-gray-50/50 dark:bg-slate-700/30 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.xls"
                onChange={(e) => {
                  handleFileUpload('workOrderFile', e.target.files?.[0] || null);
                  if (e.target.files?.[0]) {
                    setExistingFiles(prev => ({ ...prev, hasWorkOrderFile: false }));
                  }
                }}
                className="hidden"
                id="workOrderFile"
              />
              <label htmlFor="workOrderFile" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formData.workOrderFile
                    ? formData.workOrderFile.name
                    : editingOrder && existingFiles.hasWorkOrderFile
                      ? 'Click to replace existing file (optional)'
                      : 'Click to upload work order file'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, DOC, DOCX, or Excel files only</p>
              </label>
            </div>
          </div>

          {/* PO (Purchase Order) Upload */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">PO (Purchase Order)</h3>
            {editingOrder && existingFiles.hasPurchaseOrderFile && !formData.purchaseOrderFile && (
              <div className="mb-2 p-2 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Purchase Order file already uploaded. Upload a new file only if you want to replace it.
                </p>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 text-center bg-gray-50/50 dark:bg-slate-700/30 hover:bg-gray-100/50 dark:hover:bg-slate-700/50 transition-colors">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.xls"
                onChange={(e) => {
                  handleFileUpload('purchaseOrderFile', e.target.files?.[0] || null);
                  if (e.target.files?.[0]) {
                    setExistingFiles(prev => ({ ...prev, hasPurchaseOrderFile: false }));
                  }
                }}
                className="hidden"
                id="purchaseOrderFile"
              />
              <label htmlFor="purchaseOrderFile" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {formData.purchaseOrderFile
                    ? formData.purchaseOrderFile.name
                    : editingOrder && existingFiles.hasPurchaseOrderFile
                      ? 'Click to replace existing file (optional)'
                      : 'Click to upload purchase order file'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, DOC, DOCX, or Excel files only</p>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 dark:bg-primary-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {editingOrder ? 'Updating Order...' : 'Creating Order...'}
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {editingOrder ? 'Update Order' : 'Create Order'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrderForm; 
