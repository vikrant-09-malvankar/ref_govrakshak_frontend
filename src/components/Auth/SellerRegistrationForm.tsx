import React, { useState } from 'react';
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
import { SellerRegistrationSubmission, SocialCategory, NatureOfBusiness } from '../../types';
import { ApiService } from '../../services/apiService';

interface SellerRegistrationFormProps {
  onSubmit: (data: SellerRegistrationSubmission) => void;
  loading?: boolean;
}

const SellerRegistrationForm: React.FC<SellerRegistrationFormProps> = ({ onSubmit, loading = false }) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<SellerRegistrationSubmission>>({
    socialCategory: 'General',
    natureOfBusiness: 'OEM',
    brandsDealtWith: [],
    productCategories: [],
    companyAddress: {
      street: '',
      city: '',
      state: '',
      pin: '',
      fullAddress: ''
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<{
    tanCertificate: File[];
    shopEstOrMcaCertificate: File[];
    gstCertificate: File[];
    msmeCertificate: File[];
  }>({
    tanCertificate: [],
    shopEstOrMcaCertificate: [],
    gstCertificate: [],
    msmeCertificate: []
  });

  // Modal states
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Company & contacts', description: 'Business identity' },
    { title: 'Account & address', description: 'Access details' },
    { title: 'Business profile', description: 'Products and categories' },
    { title: 'Documents & review', description: 'Final submission' },
  ];

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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (field: keyof SellerRegistrationSubmission['companyAddress'], value: string) => {
    setFormData(prev => ({
      ...prev,
      companyAddress: {
        ...prev.companyAddress!,
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
        brandsDealtWith: [...(prev.brandsDealtWith || []), newBrand.trim()]
      }));
      setNewBrand('');
      setShowBrandModal(false);
    }
  };

  const removeBrand = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandsDealtWith: prev.brandsDealtWith?.filter((_, i) => i !== index)
    }));
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      setFormData(prev => ({
        ...prev,
        productCategories: [...(prev.productCategories || []), newCategory.trim()]
      }));
      setNewCategory('');
      setShowCategoryModal(false);
    }
  };

  const removeCategory = (index: number) => {
    setFormData(prev => ({
      ...prev,
      productCategories: prev.productCategories?.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName?.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.gemSellerId?.trim()) {
      newErrors.gemSellerId = 'GeM Seller ID is required';
    }
    if (!formData.executionContactName?.trim()) newErrors.executionContactName = 'Execution contact name is required';
    if (!formData.executionContactMobile?.trim()) newErrors.executionContactMobile = 'Execution contact mobile is required';
    if (!formData.executionContactEmail?.trim()) newErrors.executionContactEmail = 'Execution contact email is required';
    if (!formData.amcContactName?.trim()) newErrors.amcContactName = 'AMC contact name is required';
    if (!formData.amcContactMobile?.trim()) newErrors.amcContactMobile = 'AMC contact mobile is required';
    if (!formData.amcContactEmail?.trim()) newErrors.amcContactEmail = 'AMC contact email is required';
    if (!formData.accountsContactName?.trim()) newErrors.accountsContactName = 'Accounts contact name is required';
    if (!formData.accountsContactMobile?.trim()) newErrors.accountsContactMobile = 'Accounts contact mobile is required';
    if (!formData.accountsContactEmail?.trim()) newErrors.accountsContactEmail = 'Accounts contact email is required';
    if (!formData.directorContactName?.trim()) newErrors.directorContactName = 'Director contact name is required';
    if (!formData.directorContactMobile?.trim()) newErrors.directorContactMobile = 'Director contact mobile is required';
    if (!formData.directorContactEmail?.trim()) newErrors.directorContactEmail = 'Director contact email is required';
    if (!formData.loginEmail?.trim()) {
      newErrors.loginEmail = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.loginEmail)) {
      newErrors.loginEmail = 'Please enter a valid email address';
    }
    
    if (!formData.password?.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    if (!formData.confirmPassword?.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.companyAddress?.street?.trim()) {
      newErrors.street = 'Street address is required';
    }
    if (!formData.companyAddress?.city?.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.companyAddress?.state?.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.companyAddress?.pin?.trim()) {
      newErrors.pin = 'PIN code is required';
    } else if (!/^\d{6}$/.test(formData.companyAddress.pin)) {
      newErrors.pin = 'Please enter a valid 6-digit PIN code';
    }
    if (!formData.gstin?.trim()) {
      newErrors.gstin = 'GSTIN is required';
    }
    if (!formData.socialCategory) {
      newErrors.socialCategory = 'Social category is required';
    }
    if (!formData.natureOfBusiness) {
      newErrors.natureOfBusiness = 'Nature of business is required';
    }
    if (!formData.brandsDealtWith?.length) {
      newErrors.brandsDealtWith = 'At least one brand is required';
    }
    if (!formData.productCategories?.length) {
      newErrors.productCategories = 'At least one product category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLocalLoading(true);
    setError('');

    try {
      // Upload logo first if provided
      let logoPath = null;
      if (formData.logo) {
        try {
          const uploadResult = await ApiService.uploadLogoPublic(formData.logo);
          logoPath = uploadResult.logoPath;
        } catch (uploadError) {
          console.error('Logo upload failed:', uploadError);
          setError('Logo upload failed. Please try again or submit without logo.');
          setLocalLoading(false);
          return;
        }
      }

      const completeFormData: SellerRegistrationSubmission = {
        id: Date.now().toString(),
        companyName: formData.companyName!,
        gemSellerId: formData.gemSellerId!,
        contactPersonName: formData.contactPersonName,
        mobileNumber: formData.mobileNumber,
        emailId: formData.loginEmail || '',
        loginEmail: formData.loginEmail || '',
        companyAddress: formData.companyAddress!,
        gstin: formData.gstin!,
        msmeRegistrationNo: formData.msmeRegistrationNo,
        socialCategory: formData.socialCategory!,
        natureOfBusiness: formData.natureOfBusiness!,
        brandsDealtWith: formData.brandsDealtWith!,
        productCategories: formData.productCategories!,
        tanCertificate: formData.tanCertificate,
        amcContactName: formData.amcContactName,
        amcContactMobile: formData.amcContactMobile,
        amcContactEmail: formData.amcContactEmail,
        executionContactName: formData.executionContactName,
        executionContactMobile: formData.executionContactMobile,
        executionContactEmail: formData.executionContactEmail,
        accountsContactName: formData.accountsContactName,
        accountsContactMobile: formData.accountsContactMobile,
        accountsContactEmail: formData.accountsContactEmail,
        directorContactName: formData.directorContactName,
        directorContactMobile: formData.directorContactMobile,
        directorContactEmail: formData.directorContactEmail,
        shopEstOrMcaCertificate: formData.shopEstOrMcaCertificate,
        gstCertificate: formData.gstCertificate,
        msmeCertificate: formData.msmeCertificate,
        status: 'Pending',
        submittedAt: new Date().toISOString(),
        password: formData.password || '',
        confirmPassword: formData.confirmPassword || '',
        logo: logoPath
      };

      await onSubmit(completeFormData);
    } catch (error) {
      console.error('Form submission error:', error);
      setError('Failed to submit form. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const validateCurrentStep = (): boolean => {
    const stepErrors: Record<string, string> = {};
    const requireText = (field: string, value: string | undefined, message: string) => {
      if (!value?.trim()) stepErrors[field] = message;
    };

    if (currentStep === 0) {
      requireText('companyName', formData.companyName, 'Company name is required');
      requireText('gemSellerId', formData.gemSellerId, 'GeM Seller ID is required');

      (['amc', 'execution', 'accounts', 'director'] as const).forEach((prefix) => {
        requireText(`${prefix}ContactName`, formData[`${prefix}ContactName`], `${prefix.toUpperCase()} contact name is required`);
        requireText(`${prefix}ContactMobile`, formData[`${prefix}ContactMobile`], `${prefix.toUpperCase()} contact mobile is required`);
        requireText(`${prefix}ContactEmail`, formData[`${prefix}ContactEmail`], `${prefix.toUpperCase()} contact email is required`);
      });
    }

    if (currentStep === 1) {
      requireText('loginEmail', formData.loginEmail, 'Email ID is required');
      if (formData.loginEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.loginEmail)) {
        stepErrors.loginEmail = 'Please enter a valid email address';
      }
      requireText('password', formData.password, 'Password is required');
      if (formData.password && formData.password.length < 8) {
        stepErrors.password = 'Password must be at least 8 characters long';
      }
      requireText('confirmPassword', formData.confirmPassword, 'Please confirm your password');
      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = 'Passwords do not match';
      }
      requireText('street', formData.companyAddress?.street, 'Street address is required');
      requireText('city', formData.companyAddress?.city, 'City is required');
      requireText('state', formData.companyAddress?.state, 'State is required');
      requireText('pin', formData.companyAddress?.pin, 'PIN code is required');
      if (formData.companyAddress?.pin && !/^\d{6}$/.test(formData.companyAddress.pin)) {
        stepErrors.pin = 'Please enter a valid 6-digit PIN code';
      }
    }

    if (currentStep === 2) {
      requireText('gstin', formData.gstin, 'GSTIN is required');
      if (!formData.socialCategory) stepErrors.socialCategory = 'Social category is required';
      if (!formData.natureOfBusiness) stepErrors.natureOfBusiness = 'Nature of business is required';
      if (!formData.brandsDealtWith?.length) stepErrors.brandsDealtWith = 'At least one brand is required';
      if (!formData.productCategories?.length) stepErrors.productCategories = 'At least one product category is required';
    }

    setErrors((previousErrors) => ({ ...previousErrors, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="seller-registration-form mx-auto max-w-3xl rounded-card border border-surface-border bg-white p-5 shadow-card-md dark:border-slate-700 dark:bg-slate-900 sm:p-7">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <h1 className="mb-0.5 text-xl font-bold text-gray-900 dark:text-white dark:text-white">
          Seller Registration
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-slate-300">
          Register your company to become a vendor on the procurement portal
        </p>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2" aria-label="Registration progress">
        {steps.map((step, index) => (
          <div key={step.title} className="min-w-0">
            <div className={`mb-2 h-1.5 rounded-full ${index <= currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
            <p className={`truncate text-xs font-semibold ${index === currentStep ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-slate-400'}`}>
              {step.title}
            </p>
            <p className="hidden truncate text-[11px] text-gray-400 dark:text-slate-500 sm:block">{step.description}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">
                  Error
                </h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {currentStep === 0 && <>
        {/* Company Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Company Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.companyName || ''}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.companyName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Full company name"
              />
              {errors.companyName && (
                <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                GeM Seller ID *
              </label>
              <input
                type="text"
                value={formData.gemSellerId || ''}
                onChange={(e) => handleInputChange('gemSellerId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.gemSellerId ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="GeM Seller ID"
              />
              {errors.gemSellerId && (
                <p className="text-red-500 text-sm mt-1">{errors.gemSellerId}</p>
              )}
            </div>
          </div>
          
          {/* Company Logo Upload */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Company Logo (Optional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {formData.logo ? (
                  <img
                    src={URL.createObjectURL(formData.logo)}
                    alt="Company Logo"
                    className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 flex items-center justify-center bg-gray-50 dark:bg-slate-700">
                    <Upload className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleInputChange('logo', file);
                    }
                  }}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {formData.logo ? 'Change Logo' : 'Upload Logo'}
                </label>
                {formData.logo && (
                  <button
                    type="button"
                    onClick={() => handleInputChange('logo', null)}
                    className="ml-2 inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: Square image, max 2MB, PNG/JPG format
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Contact Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              ['amc', 'AMC Contact Information'],
              ['execution', 'Execution Contact Information'],
              ['accounts', 'Accounts Contact Information'],
              ['director', 'Director Contact Information']
            ].map(([prefix, title]) => (
              <div key={prefix} className="bg-white border border-gray-200 rounded-md p-4 md:col-span-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={(formData as any)[`${prefix}ContactName`] || ''}
                    onChange={(e) => handleInputChange(`${prefix}ContactName`, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Full Name"
                  />
                  <input
                    type="tel"
                    value={(formData as any)[`${prefix}ContactMobile`] || ''}
                    onChange={(e) => handleInputChange(`${prefix}ContactMobile`, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Mobile Number"
                  />
                  <input
                    type="email"
                    value={(formData as any)[`${prefix}ContactEmail`] || ''}
                    onChange={(e) => handleInputChange(`${prefix}ContactEmail`, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Email ID"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        </>}

        {currentStep === 1 && <>
        {/* Email and Password */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Email ID and Password</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">Email ID *</label>
              <input
                type="email"
                value={formData.loginEmail || ''}
                onChange={(e) => handleInputChange('loginEmail', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.loginEmail ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="company@domain.com"
              />
              {errors.loginEmail && <p className="text-red-500 text-sm mt-1">{errors.loginEmail}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">Password *</label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Create a password"
                required
                minLength={8}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">Confirm Password *</label>
              <input
                type="password"
                value={formData.confirmPassword || ''}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Confirm your password"
                required
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Company Address
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Street Address *
              </label>
              <input
                type="text"
                value={formData.companyAddress?.street || ''}
                onChange={(e) => handleAddressChange('street', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.street ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Complete street address"
              />
              {errors.street && (
                <p className="text-red-500 text-sm mt-1">{errors.street}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.companyAddress?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.city ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="City"
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                State *
              </label>
              <input
                type="text"
                value={formData.companyAddress?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.state ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="State"
              />
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                PIN Code *
              </label>
              <input
                type="text"
                value={formData.companyAddress?.pin || ''}
                onChange={(e) => handleAddressChange('pin', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.pin ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="6-digit PIN code"
                maxLength={6}
              />
              {errors.pin && (
                <p className="text-red-500 text-sm mt-1">{errors.pin}</p>
              )}
            </div>

          </div>
        </div>

        </>}

        {currentStep === 2 && <>
        {/* Business Details */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Briefcase className="h-5 w-5 mr-2" />
            Business Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                GSTIN *
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 uppercase ${
                  errors.gstin ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="22AAAAA0000A1Z5"
                style={{ textTransform: 'uppercase' }}
              />
              {errors.gstin && (
                <p className="text-red-500 text-sm mt-1">{errors.gstin}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                MSME Registration No (if any)
              </label>
              <input
                type="text"
                value={formData.msmeRegistrationNo || ''}
                onChange={(e) => handleInputChange('msmeRegistrationNo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="MSME Registration Number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Social Category *
              </label>
              <select
                value={formData.socialCategory}
                onChange={(e) => handleInputChange('socialCategory', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.socialCategory ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                {socialCategories.map(category => (
                  <option className="dark:bg-slate-800 dark:text-white" key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.socialCategory && (
                <p className="text-red-500 text-sm mt-1">{errors.socialCategory}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Nature of Business *
              </label>
              <select
                value={formData.natureOfBusiness}
                onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.natureOfBusiness ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                {natureOfBusinesses.map(nature => (
                  <option className="dark:bg-slate-800 dark:text-white" key={nature} value={nature}>{nature}</option>
                ))}
              </select>
              {errors.natureOfBusiness && (
                <p className="text-red-500 text-sm mt-1">{errors.natureOfBusiness}</p>
              )}
            </div>
          </div>
        </div>

        {/* Brands and Categories */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Tag className="h-5 w-5 mr-2" />
            Brands and Product Categories
          </h2>
          
          <div className="space-y-6">
            {/* Brands */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Brands you deal with *
                </label>
                <button
                  type="button"
                  onClick={() => setShowBrandModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Add Brand
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {popularBrands.map(brand => (
                  <label key={brand} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.brandsDealtWith?.includes(brand) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            brandsDealtWith: [...(prev.brandsDealtWith || []), brand]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            brandsDealtWith: prev.brandsDealtWith?.filter(b => b !== brand)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 dark:border-slate-600 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{brand}</span>
                  </label>
                ))}
              </div>
              
              {formData.brandsDealtWith && formData.brandsDealtWith.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Brands:</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.brandsDealtWith.map((brand, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {brand}
                        <button
                          type="button"
                          onClick={() => removeBrand(index)}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.brandsDealtWith && (
                <p className="text-red-500 text-sm mt-1">{errors.brandsDealtWith}</p>
              )}
            </div>

            {/* Product Categories */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Product Categories *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Category
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {productCategories.map(category => (
                  <label key={category} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.productCategories?.includes(category) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({
                            ...prev,
                            productCategories: [...(prev.productCategories || []), category]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            productCategories: prev.productCategories?.filter(c => c !== category)
                          }));
                        }
                      }}
                      className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                  </label>
                ))}
              </div>
              
              {formData.productCategories && formData.productCategories.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected Categories:</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.productCategories.map((category, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {category}
                        <button
                          type="button"
                          onClick={() => removeCategory(index)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.productCategories && (
                <p className="text-red-500 text-sm mt-1">{errors.productCategories}</p>
              )}
            </div>
          </div>
        </div>

        </>}

        {currentStep === 3 && <>
        {/* File Uploads */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Document Uploads
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">TAN Certificates</h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('tanCertificate' as keyof typeof uploadedFiles, Array.from(e.target.files || []))}
                  className="hidden"
                  id="tanCertificate-upload"
                />
                <label htmlFor="tanCertificate-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Upload TAN Certificates</p>
                </label>
              </div>
              {(uploadedFiles as any)['tanCertificate']?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {(uploadedFiles as any)['tanCertificate'].map((file: File, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => removeFile('tanCertificate' as keyof typeof uploadedFiles, index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {[
              ['shopEstOrMcaCertificate', 'Shop & Establishment Certificate or MCA Registration Certificates'],
              ['gstCertificate', 'GST Certificate'],
              ['msmeCertificate', 'MSME Certificate']
            ].map(([field, title]) => (
              <div key={field}>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{title}</h3>
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(field as keyof typeof uploadedFiles, Array.from(e.target.files || []))}
                    className="hidden"
                    id={`${field}-upload`}
                  />
                  <label htmlFor={`${field}-upload`} className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Upload {title}</p>
                  </label>
                </div>

                {(uploadedFiles as any)[field].length > 0 && (
                  <div className="mt-4 space-y-2">
                    {(uploadedFiles as any)[field].map((file: File, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(field as keyof typeof uploadedFiles, index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        </>}

        {/* Step navigation and registration notice */}
        <div className="grid gap-4 border-t border-gray-200 pt-5 dark:border-slate-700 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-left dark:border-green-900/70 dark:bg-green-950/30">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-300" />
            <p className="text-xs leading-5 text-green-700 dark:text-green-200">
              <span className="font-semibold text-green-900 dark:text-green-100">Registration Process:</span>{' '}
              Your seller registration will be reviewed by a Super Administrator. You will receive an email notification once your account is approved or if any additional information is required.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 0}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 disabled:invisible dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Back
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="rounded-md bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={localLoading || loading}
                className="flex items-center space-x-2 rounded-md bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {localLoading || loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Submit Registration</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Add Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Add Brand
                </h3>
                <button
                  onClick={() => {
                    setShowBrandModal(false);
                    setNewBrand('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter brand name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addBrand();
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowBrandModal(false);
                      setNewBrand('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addBrand}
                    disabled={!newBrand.trim()}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Brand
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Add Product Category
                </h3>
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategory('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter category name"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addCategory();
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setNewCategory('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCategory}
                    disabled={!newCategory.trim()}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerRegistrationForm;



