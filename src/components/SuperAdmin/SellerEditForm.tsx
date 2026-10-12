import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  User, 
  MapPin, 
  FileText, 
  Upload, 
  X,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Tag
} from 'lucide-react';
import { SellerRegistration, SocialCategory, NatureOfBusiness } from '../../types';

interface SellerEditFormProps {
  seller: SellerRegistration;
  onSubmit: (updatedData: Partial<SellerRegistration>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const SellerEditForm: React.FC<SellerEditFormProps> = ({ 
  seller, 
  onSubmit, 
  onCancel,
  loading = false 
}) => {
  const [formData, setFormData] = useState<Partial<SellerRegistration>>(seller);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<{
    tan_certificate: File[];
    shop_est_or_mca_certificate: File[];
    gst_certificate: File[];
    msme_certificate: File[];
  }>({
    tan_certificate: (seller as any).tan_certificate || [],
    shop_est_or_mca_certificate: (seller as any).shop_est_or_mca_certificate || [],
    gst_certificate: (seller as any).gst_certificate || [],
    msme_certificate: (seller as any).msme_certificate || []
  });

  // Modal states
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const socialCategories: SocialCategory[] = ['General', 'SC', 'ST', 'OBC'];
  const natureOfBusinesses: NatureOfBusiness[] = ['OEM', 'Authorized Distributor', 'Reseller'];

  const popularBrands = [
    'Microsoft', 'HP', 'Lenovo', 'Dell', 'Epson', 'Canon', 'Samsung', 'Apple',
    'Cisco', 'Juniper', 'Fortinet', 'VMware', 'Oracle', 'Adobe', 'Autodesk'
  ];

  const productCategories = [
    'Software', 'Desktop', 'Laptop', 'Printer', 'Scanner', 'Network Equipment',
    'Server', 'Storage', 'Security', 'Cloud Services', 'Mobile Devices'
  ];

  useEffect(() => {
    setFormData(seller);
    setUploadedFiles({
      tan_certificate: (seller as any).tan_certificate || [],
      shop_est_or_mca_certificate: (seller as any).shop_est_or_mca_certificate || [],
      gst_certificate: (seller as any).gst_certificate || [],
      msme_certificate: (seller as any).msme_certificate || []
    });
  }, [seller]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (field: keyof SellerRegistration['company_address'], value: string) => {
    setFormData(prev => ({
      ...prev,
      company_address: {
        ...prev.company_address!,
        [field]: value
      }
    }));
  };

  const handleFileUpload = (type: keyof typeof uploadedFiles, files: File[]) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...files]
    }));
    setFormData(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), ...files]
    }));
  };

  const removeFile = (type: keyof typeof uploadedFiles, index: number) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
    setFormData(prev => ({
      ...prev,
      [type]: prev[type]?.filter((_, i) => i !== index)
    }));
  };

  const addBrand = () => {
    if (newBrand.trim()) {
      setFormData(prev => ({
        ...prev,
        brands_dealt_with: [...(prev.brands_dealt_with || []), newBrand.trim()]
      }));
      setNewBrand('');
      setShowBrandModal(false);
    }
  };

  const removeBrand = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brands_dealt_with: prev.brands_dealt_with?.filter((_, i) => i !== index)
    }));
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      setFormData(prev => ({
        ...prev,
        product_categories: [...(prev.product_categories || []), newCategory.trim()]
      }));
      setNewCategory('');
      setShowCategoryModal(false);
    }
  };

  const removeCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      product_categories: prev.product_categories?.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name?.trim()) {
      newErrors.company_name = 'Company name is required';
    }
    if (!(formData as any).execution_contact_name?.trim()) newErrors.execution_contact_name = 'Execution contact name is required';
    if (!(formData as any).execution_contact_mobile?.trim()) newErrors.execution_contact_mobile = 'Execution contact mobile is required';
    if (!(formData as any).execution_contact_email?.trim()) newErrors.execution_contact_email = 'Execution contact email is required';
    if (!(formData as any).amc_contact_name?.trim()) newErrors.amc_contact_name = 'AMC contact name is required';
    if (!(formData as any).amc_contact_mobile?.trim()) newErrors.amc_contact_mobile = 'AMC contact mobile is required';
    if (!(formData as any).amc_contact_email?.trim()) newErrors.amc_contact_email = 'AMC contact email is required';
    if (!(formData as any).accounts_contact_name?.trim()) newErrors.accounts_contact_name = 'Accounts contact name is required';
    if (!(formData as any).accounts_contact_mobile?.trim()) newErrors.accounts_contact_mobile = 'Accounts contact mobile is required';
    if (!(formData as any).accounts_contact_email?.trim()) newErrors.accounts_contact_email = 'Accounts contact email is required';
    if (!(formData as any).director_contact_name?.trim()) newErrors.director_contact_name = 'Director contact name is required';
    if (!(formData as any).director_contact_mobile?.trim()) newErrors.director_contact_mobile = 'Director contact mobile is required';
    if (!(formData as any).director_contact_email?.trim()) newErrors.director_contact_email = 'Director contact email is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Edit Seller Information</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Update the seller's registration details below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Company Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.company_name || ''}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.company_name ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter company name"
              />
              {errors.company_name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.company_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                GEM Seller ID
              </label>
              <input
                type="text"
                value={formData.gem_seller_id || ''}
                onChange={(e) => handleInputChange('gem_seller_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter GEM seller ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                MSME Registration No.
              </label>
              <input
                type="text"
                value={formData.msme_registration_no || ''}
                onChange={(e) => handleInputChange('msme_registration_no', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter MSME registration number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                GSTIN *
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => handleInputChange('gstin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter GSTIN"
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Contact Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ['amc', 'AMC Contact Information'],
              ['execution', 'Execution Contact Information'],
              ['accounts', 'Accounts Contact Information'],
              ['director', 'Director Contact Information']
            ].map(([prefix, title]) => (
              <div key={prefix} className="bg-white border border-gray-200 rounded-md p-4 md:col-span-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={(formData as any)[`${prefix}_contact_name`] || ''} onChange={(e) => handleInputChange(`${prefix}_contact_name`, e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Full Name" />
                  <input type="tel" value={(formData as any)[`${prefix}_contact_mobile`] || ''} onChange={(e) => handleInputChange(`${prefix}_contact_mobile`, e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mobile Number" />
                  <input type="email" value={(formData as any)[`${prefix}_contact_email`] || ''} onChange={(e) => handleInputChange(`${prefix}_contact_email`, e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email ID" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Address */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Company Address
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Street
              </label>
              <input
                type="text"
                value={formData.company_address?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.company_address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.company_address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter state"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                PIN Code
              </label>
              <input
                type="text"
                value={formData.company_address?.pin || ''}
                onChange={(e) => handleAddressChange('pin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter PIN code"
              />
            </div>

          </div>
        </div>

        {/* Business Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Business Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Social Category
              </label>
              <select
                value={formData.social_category || ''}
                onChange={(e) => handleInputChange('social_category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {socialCategories.map(category => (
                  <option className="dark:bg-slate-800 dark:text-white" key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Nature of Business
              </label>
              <select
                value={formData.nature_of_business || ''}
                onChange={(e) => handleInputChange('nature_of_business', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {natureOfBusinesses.map(nature => (
                  <option className="dark:bg-slate-800 dark:text-white" key={nature} value={nature}>{nature}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Brands and Categories */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Tag className="w-5 h-5 mr-2" />
            Brands and Product Categories
          </h4>
          
          {/* Brands */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Brands Dealt With</h5>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new brand"
                />
                <button
                  type="button"
                  onClick={addBrand}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {formData.brands_dealt_with?.map((brand, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                  <span className="text-gray-700 dark:text-gray-300">{brand}</span>
                  <button
                    type="button"
                    onClick={() => removeBrand(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Product Categories */}
          <div>
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Product Categories</h5>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new category"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {formData.product_categories?.map((category, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                  <span className="text-gray-700 dark:text-gray-300">{category}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* File Uploads */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Documents and Certificates
          </h4>
          {[
            ['tan_certificate', 'TAN Certificates'],
            ['shop_est_or_mca_certificate', 'Shop & Establishment Certificate or MCA Registration Certificates'],
            ['gst_certificate', 'GST Certificate'],
            ['msme_certificate', 'MSME Certificate']
          ].map(([field, title]) => (
            <div key={field} className="mb-6">
              <h5 className="font-medium text-gray-900 dark:text-white mb-3">{title}</h5>
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(field as keyof typeof uploadedFiles, Array.from(e.target.files || []))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <div className="mt-3 space-y-2">
                {(uploadedFiles as any)[field]?.map((file: File, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
                    </div>
                    <button type="button" onClick={() => removeFile(field as keyof typeof uploadedFiles, index)} className="text-red-600 hover:text-red-800 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Update Seller
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellerEditForm;



