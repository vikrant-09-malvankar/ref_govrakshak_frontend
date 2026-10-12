import React, { useState } from 'react';
// import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  User, 
  MapPin, 
  FileText, 
  Upload, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { BuyerRegistrationSubmission, OrganizationType, PaymentMode } from '../../types';
import { ApiService } from '../../services/apiService';

interface BuyerRegistrationFormProps {
  onSubmit: (registrationData: BuyerRegistrationSubmission) => void;
  loading?: boolean;
}

const BuyerRegistrationForm: React.FC<BuyerRegistrationFormProps> = ({ onSubmit, loading = false }) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<BuyerRegistrationSubmission>>({
    organizationType: 'Central Govt',
    paymentMode: 'PFMS',
    authorizedDesignations: [],
    contractReferenceNumbers: []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');
  const [newReference, setNewReference] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'Organization', description: 'Basic details' },
    { title: 'Contact', description: 'Account access' },
    { title: 'Address & billing', description: 'Office details' },
    { title: 'Authorization', description: 'Documents & review' },
  ];

  const organizationTypes: OrganizationType[] = [
    'Central Govt',
    'State Govt', 
    'PSU',
    'Autonomous Body',
    'Local Body',
    'Other'
  ];

  const paymentModes: PaymentMode[] = [
    'PFMS',
    'CGDA',
    'Offline',
    'ISRO Internal',
    'Other'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      officeAddress: {
        ...prev.officeAddress,
        [field]: value
      }
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateField = (field: string) => {
    let message = '';

    switch (field) {
      case 'organizationType':
        if (!formData.organizationType) message = 'Organization type is required';
        break;
      case 'ministryDepartment':
        if (!formData.ministryDepartment?.trim()) message = 'Ministry/Department name is required';
        break;
      case 'organizationName':
        if (!formData.organizationName?.trim()) message = 'Organization name is required';
        break;
      case 'buyerDesignation':
        if (!formData.buyerDesignation?.trim()) message = 'Buyer designation is required';
        break;
      case 'contactPersonName':
        if (!formData.contactPersonName?.trim()) message = 'Contact person name is required';
        break;
      case 'emailId':
        if (!formData.emailId?.trim()) {
          message = 'Email ID is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
          message = 'Please enter a valid email address';
        } else if (!formData.emailId.endsWith('.gov.in') && !formData.emailId.endsWith('.nic.in') && !formData.emailId.endsWith('@gov.in')) {
          message = 'Use an official government email (.gov.in or .nic.in)';
        }
        break;
      case 'contactNumber':
        if (!formData.contactNumber?.trim()) {
          message = 'Contact number is required';
        } else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\D/g, ''))) {
          message = 'Please enter a valid 10-digit contact number';
        }
        break;
      case 'password':
        if (!formData.password?.trim()) message = 'Password is required';
        else if (formData.password.length < 8) message = 'Password must be at least 8 characters long';
        break;
      case 'confirmPassword':
        if (!formData.confirmPassword?.trim()) message = 'Please confirm your password';
        else if (formData.password !== formData.confirmPassword) message = 'Passwords do not match';
        break;
      case 'zone':
      case 'city':
      case 'state':
      case 'pin':
        if (!formData.officeAddress?.[field]?.trim()) message = `${field === 'pin' ? 'PIN code' : field[0].toUpperCase() + field.slice(1)} is required`;
        else if (field === 'pin' && !/^\d{6}$/.test(formData.officeAddress.pin)) message = 'Please enter a valid 6-digit PIN code';
        break;
      case 'paymentMode':
        if (!formData.paymentMode) message = 'Payment mode is required';
        break;
      case 'billingAuthorityDesignation':
        if (!formData.billingAuthorityDesignation?.trim()) message = 'Billing authority designation is required';
        break;
      case 'consigneeName':
        if (!formData.consigneeName?.trim()) message = 'Consignee name is required';
        break;
      case 'consigneeDesignation':
        if (!formData.consigneeDesignation?.trim()) message = 'Consignee designation is required';
        break;
      case 'authorizedDesignations':
        if (!formData.authorizedDesignations?.length) message = 'Add at least one authorized designation';
        break;
    }

    setErrors(prev => ({ ...prev, [field]: message }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    setFormData(prev => ({
      ...prev,
      pastWorkOrders: [...(prev.pastWorkOrders || []), ...files]
    }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      pastWorkOrders: prev.pastWorkOrders?.filter((_, i) => i !== index)
    }));
  };

  const addAuthorizedDesignation = () => {
    if (newDesignation.trim()) {
      setFormData(prev => ({
        ...prev,
        authorizedDesignations: [...(prev.authorizedDesignations || []), newDesignation.trim()]
      }));
      setErrors(prev => ({ ...prev, authorizedDesignations: '' }));
      setNewDesignation('');
      setShowDesignationModal(false);
    }
  };

  const removeAuthorizedDesignation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      authorizedDesignations: prev.authorizedDesignations?.filter((_, i) => i !== index)
    }));
  };

  const addContractReference = () => {
    if (newReference.trim()) {
      setFormData(prev => ({
        ...prev,
        contractReferenceNumbers: [...(prev.contractReferenceNumbers || []), newReference.trim()]
      }));
      setNewReference('');
      setShowReferenceModal(false);
    }
  };

  const removeContractReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contractReferenceNumbers: prev.contractReferenceNumbers?.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationType) {
      newErrors.organizationType = 'Organization type is required';
    }
    if (!formData.ministryDepartment?.trim()) {
      newErrors.ministryDepartment = 'Ministry/Department name is required';
    }
    if (!formData.organizationName?.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }
    if (!formData.buyerDesignation?.trim()) {
      newErrors.buyerDesignation = 'Buyer designation is required';
    }
    if (!formData.contactPersonName?.trim()) {
      newErrors.contactPersonName = 'Contact person name is required';
    }
    if (!formData.emailId?.trim()) {
      newErrors.emailId = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
      newErrors.emailId = 'Please enter a valid email address';
    } else if (!formData.emailId.endsWith('.gov.in') && !formData.emailId.endsWith('.nic.in') && !formData.emailId.endsWith('@gov.in')) {
      newErrors.emailId = 'Only official government email domains are allowed (.gov.in, .nic.in, or @gov.in)';
    }
    if (!formData.contactNumber?.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^\d{10}$/.test(formData.contactNumber.replace(/\D/g, ''))) {
      newErrors.contactNumber = 'Please enter a valid 10-digit contact number';
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
    if (!formData.officeAddress?.zone?.trim()) {
      newErrors.zone = 'Zone is required';
    }
    if (!formData.officeAddress?.city?.trim()) {
      newErrors.city = 'City is required';
    }
    if (!formData.officeAddress?.state?.trim()) {
      newErrors.state = 'State is required';
    }
    if (!formData.officeAddress?.pin?.trim()) {
      newErrors.pin = 'PIN code is required';
    } else if (!/^\d{6}$/.test(formData.officeAddress.pin)) {
      newErrors.pin = 'Please enter a valid 6-digit PIN code';
    }
    if (!formData.paymentMode) {
      newErrors.paymentMode = 'Payment mode is required';
    }
    if (!formData.billingAuthorityDesignation?.trim()) {
      newErrors.billingAuthorityDesignation = 'Billing authority designation is required';
    }
    if (!formData.consigneeName?.trim()) {
      newErrors.consigneeName = 'Consignee name is required';
    }
    if (!formData.consigneeDesignation?.trim()) {
      newErrors.consigneeDesignation = 'Consignee designation is required';
    }
    if (!formData.authorizedDesignations?.length) {
      newErrors.authorizedDesignations = 'At least one authorized designation is required';
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

      const completeFormData: BuyerRegistrationSubmission = {
        id: Date.now().toString(),
        organizationType: formData.organizationType!,
        ministryDepartment: formData.ministryDepartment!,
        organizationName: formData.organizationName!,
        buyerDesignation: formData.buyerDesignation!,
        contactPersonName: formData.contactPersonName!,
        emailId: formData.emailId!,
        contactNumber: formData.contactNumber!,
        officeAddress: formData.officeAddress!,
        gstin: formData.gstin,
        paymentMode: formData.paymentMode!,
        billingAuthorityDesignation: formData.billingAuthorityDesignation!,
        consigneeName: formData.consigneeName!,
        consigneeDesignation: formData.consigneeDesignation!,
        pastWorkOrders: formData.pastWorkOrders,
        authorizedDesignations: formData.authorizedDesignations!,
        contractReferenceNumbers: formData.contractReferenceNumbers,
        status: 'Pending',
        submittedAt: new Date().toISOString(),
        password: formData.password!,
        confirmPassword: formData.confirmPassword!,
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
      if (!formData.organizationType) stepErrors.organizationType = 'Organization type is required';
      requireText('ministryDepartment', formData.ministryDepartment, 'Ministry/Department name is required');
      requireText('organizationName', formData.organizationName, 'Organization name is required');
    }

    if (currentStep === 1) {
      requireText('buyerDesignation', formData.buyerDesignation, 'Buyer designation is required');
      requireText('contactPersonName', formData.contactPersonName, 'Contact person name is required');
      requireText('emailId', formData.emailId, 'Email ID is required');
      if (formData.emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
        stepErrors.emailId = 'Please enter a valid email address';
      } else if (formData.emailId && !formData.emailId.endsWith('.gov.in') && !formData.emailId.endsWith('.nic.in') && !formData.emailId.endsWith('@gov.in')) {
        stepErrors.emailId = 'Use an official government email (.gov.in or .nic.in)';
      }
      requireText('contactNumber', formData.contactNumber, 'Contact number is required');
      if (formData.contactNumber && !/^\d{10}$/.test(formData.contactNumber.replace(/\D/g, ''))) {
        stepErrors.contactNumber = 'Please enter a valid 10-digit contact number';
      }
      requireText('password', formData.password, 'Password is required');
      if (formData.password && formData.password.length < 8) {
        stepErrors.password = 'Password must be at least 8 characters long';
      }
      requireText('confirmPassword', formData.confirmPassword, 'Please confirm your password');
      if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
        stepErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (currentStep === 2) {
      requireText('zone', formData.officeAddress?.zone, 'Zone is required');
      requireText('city', formData.officeAddress?.city, 'City is required');
      requireText('state', formData.officeAddress?.state, 'State is required');
      requireText('pin', formData.officeAddress?.pin, 'PIN code is required');
      if (formData.officeAddress?.pin && !/^\d{6}$/.test(formData.officeAddress.pin)) {
        stepErrors.pin = 'Please enter a valid 6-digit PIN code';
      }
      if (!formData.paymentMode) stepErrors.paymentMode = 'Payment mode is required';
      requireText('billingAuthorityDesignation', formData.billingAuthorityDesignation, 'Billing authority designation is required');
      requireText('consigneeName', formData.consigneeName, 'Consignee name is required');
      requireText('consigneeDesignation', formData.consigneeDesignation, 'Consignee designation is required');
    }

    if (currentStep === 3 && !formData.authorizedDesignations?.length) {
      stepErrors.authorizedDesignations = 'At least one authorized designation is required';
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
    <div className="buyer-registration-form mx-auto max-w-3xl rounded-card border border-surface-border bg-white p-5 shadow-card-md sm:p-7">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <h1 className="mb-0.5 text-xl font-bold text-gray-900 dark:text-white dark:text-white">
          Buyer Registration
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-slate-300">
          Register your organization to access the procurement portal
        </p>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2" aria-label="Registration progress">
        {steps.map((step, index) => (
          <div key={step.title} className="min-w-0">
            <div className={`mb-2 h-1.5 rounded-full ${index <= currentStep ? 'bg-primary-600' : 'bg-gray-200'}`} />
            <p className={`truncate text-xs font-semibold ${index === currentStep ? 'text-primary-700' : 'text-gray-500'}`}>
              {step.title}
            </p>
            <p className="hidden truncate text-[11px] text-gray-400 sm:block">{step.description}</p>
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
        {/* Organization Information */}
        <div className="rounded-lg bg-gray-50 p-6 dark:bg-slate-800/70">
          <h2 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white dark:text-slate-100">
            <Building2 className="h-5 w-5 mr-2" />
            Organization Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Organization Type *
              </label>
              <select
                value={formData.organizationType}
                onChange={(e) => handleInputChange('organizationType', e.target.value)}
                onBlur={() => validateField('organizationType')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.organizationType ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                {organizationTypes.map(type => (
                  <option className="dark:bg-slate-800 dark:text-white" key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.organizationType && (
                <p className="text-red-500 text-sm mt-1">{errors.organizationType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Ministry / Department Name *
              </label>
              <input
                type="text"
                value={formData.ministryDepartment || ''}
                onChange={(e) => handleInputChange('ministryDepartment', e.target.value)}
                onBlur={() => validateField('ministryDepartment')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.ministryDepartment ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="e.g., Ministry of Defence"
              />
              {errors.ministryDepartment && (
                <p className="text-red-500 text-sm mt-1">{errors.ministryDepartment}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.organizationName || ''}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                onBlur={() => validateField('organizationName')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.organizationName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Full organization name"
              />
              {errors.organizationName && (
                <p className="text-red-500 text-sm mt-1">{errors.organizationName}</p>
              )}
            </div>
          </div>
          
          {/* Logo Upload */}
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-slate-200">
              Organization Logo (Optional)
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {formData.logo ? (
                  <img
                    src={URL.createObjectURL(formData.logo)}
                    alt="Organization Logo"
                    className="h-16 w-16 rounded-lg border-2 border-gray-200 object-cover dark:border-slate-600"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:border-slate-600 dark:bg-slate-900">
                    <Upload className="h-6 w-6 text-gray-400 dark:text-slate-500" />
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
                  className="inline-flex cursor-pointer items-center rounded-md border border-gray-300 dark:border-slate-600 bg-white px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
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
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Recommended: Square image, max 2MB, PNG/JPG format
                </p>
              </div>
            </div>
          </div>
        </div>
        </>}

        {currentStep === 1 && <>
        {/* Contact Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Contact Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Buyer Designation *
              </label>
              <input
                type="text"
                value={formData.buyerDesignation || ''}
                onChange={(e) => handleInputChange('buyerDesignation', e.target.value)}
                onBlur={() => validateField('buyerDesignation')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.buyerDesignation ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="e.g., Dy Commissioner, Administrative Officer"
              />
              {errors.buyerDesignation && (
                <p className="text-red-500 text-sm mt-1">{errors.buyerDesignation}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Contact Person Name *
              </label>
              <input
                type="text"
                value={formData.contactPersonName || ''}
                onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                onBlur={() => validateField('contactPersonName')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contactPersonName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Full name of contact person"
              />
              {errors.contactPersonName && (
                <p className="text-red-500 text-sm mt-1">{errors.contactPersonName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Email ID (Official Domain) *
              </label>
              <input
                type="email"
                value={formData.emailId || ''}
                onChange={(e) => handleInputChange('emailId', e.target.value)}
                onBlur={() => validateField('emailId')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.emailId ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="name@domain.gov.in"
              />
              {errors.emailId && (
                <p className="text-red-500 text-sm mt-1">{errors.emailId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Contact Number *
              </label>
              <input
                type="tel"
                value={formData.contactNumber || ''}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                onBlur={() => validateField('contactNumber')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.contactNumber ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="10-digit mobile number"
              />
              {errors.contactNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={() => validateField('password')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Create a password"
                required
                minLength={8}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword || ''}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                onBlur={() => validateField('confirmPassword')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Confirm your password"
                required
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>
        </>}

        {currentStep === 2 && <>
        {/* Office Address */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <MapPin className="h-5 w-5 mr-2" />
            Office Address
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Zone *
              </label>
              <input
                type="text"
                value={formData.officeAddress?.zone || ''}
                onChange={(e) => handleAddressChange('zone', e.target.value)}
                onBlur={() => validateField('zone')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.zone ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Zone/Area"
              />
              {errors.zone && (
                <p className="text-red-500 text-sm mt-1">{errors.zone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                City *
              </label>
              <input
                type="text"
                value={formData.officeAddress?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                onBlur={() => validateField('city')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                value={formData.officeAddress?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                onBlur={() => validateField('state')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                value={formData.officeAddress?.pin || ''}
                onChange={(e) => handleAddressChange('pin', e.target.value)}
                onBlur={() => validateField('pin')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pin ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="6-digit PIN code"
                maxLength={6}
              />
              {errors.pin && (
                <p className="text-red-500 text-sm mt-1">{errors.pin}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Complete Address
              </label>
              <textarea
                value={formData.officeAddress?.fullAddress || ''}
                onChange={(e) => handleAddressChange('fullAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Complete office address"
              />
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Business Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                GSTIN (if applicable)
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                placeholder="22AAAAA0000A1Z5"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Payment Mode *
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                onBlur={() => validateField('paymentMode')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.paymentMode ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                {paymentModes.map(mode => (
                  <option className="dark:bg-slate-800 dark:text-white" key={mode} value={mode}>{mode}</option>
                ))}
              </select>
              {errors.paymentMode && (
                <p className="text-red-500 text-sm mt-1">{errors.paymentMode}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Billing Authority Designation *
              </label>
              <input
                type="text"
                value={formData.billingAuthorityDesignation || ''}
                onChange={(e) => handleInputChange('billingAuthorityDesignation', e.target.value)}
                onBlur={() => validateField('billingAuthorityDesignation')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.billingAuthorityDesignation ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="e.g., DDO, Accounts Officer"
              />
              {errors.billingAuthorityDesignation && (
                <p className="text-red-500 text-sm mt-1">{errors.billingAuthorityDesignation}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Consignee Name *
              </label>
              <input
                type="text"
                value={formData.consigneeName || ''}
                onChange={(e) => handleInputChange('consigneeName', e.target.value)}
                onBlur={() => validateField('consigneeName')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.consigneeName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Consignee name"
              />
              {errors.consigneeName && (
                <p className="text-red-500 text-sm mt-1">{errors.consigneeName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Consignee Designation *
              </label>
              <input
                type="text"
                value={formData.consigneeDesignation || ''}
                onChange={(e) => handleInputChange('consigneeDesignation', e.target.value)}
                onBlur={() => validateField('consigneeDesignation')}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.consigneeDesignation ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Consignee designation"
              />
              {errors.consigneeDesignation && (
                <p className="text-red-500 text-sm mt-1">{errors.consigneeDesignation}</p>
              )}
            </div>
          </div>
        </div>
        </>}

        {currentStep === 3 && <>
        {/* Authorized Designations */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Authorized Designations for Approval
          </h2>
          
          <div className="space-y-4">
                         <div className="flex items-center justify-between">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                 Designation(s) authorized for approval (Admin/Financial) *
               </label>
               <button
                 type="button"
                 onClick={() => setShowDesignationModal(true)}
                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
               >
                 Add Designation
               </button>
             </div>
            
            {formData.authorizedDesignations?.map((designation, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="flex-1 px-3 py-2 bg-white border border-gray-300 dark:border-slate-600 rounded-md">
                  {designation}
                </span>
                <button
                  type="button"
                  onClick={() => removeAuthorizedDesignation(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            
            {errors.authorizedDesignations && (
              <p className="text-sm text-red-500" role="alert">{errors.authorizedDesignations}</p>
            )}
          </div>
        </div>

        {/* Contract References */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Contract References (GeM Optional)
          </h2>
          
          <div className="space-y-4">
                         <div className="flex items-center justify-between">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                 Contract Reference Numbers
               </label>
               <button
                 type="button"
                 onClick={() => setShowReferenceModal(true)}
                 className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
               >
                 Add Reference
               </button>
             </div>
            
            {formData.contractReferenceNumbers?.map((reference, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="flex-1 px-3 py-2 bg-white border border-gray-300 dark:border-slate-600 rounded-md">
                  {reference}
                </span>
                <button
                  type="button"
                  onClick={() => removeContractReference(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Past Work Orders (Optional)
          </h2>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Click to upload past work orders
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, XLS, XLSX files accepted
                </p>
              </label>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">Uploaded Files:</h4>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        </>}

        {/* Step navigation and registration notice */}
        <div className="grid gap-4 border-t border-gray-200 pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-left dark:border-blue-900/70 dark:bg-blue-950/40">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
            <p className="text-xs leading-5 text-blue-700 dark:text-blue-200">
              <span className="font-semibold text-blue-900 dark:text-blue-100">Registration Process:</span>{' '}
              Your registration will be reviewed by a Super Administrator. You will receive an email notification once your account is approved or if additional information is required.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 0}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 disabled:invisible"
            >
              Back
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={localLoading || loading}
                className="flex items-center space-x-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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

       {/* Add Designation Modal */}
       {showDesignationModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
             <div className="mt-3">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                   Add Authorized Designation
                 </h3>
                 <button
                   onClick={() => {
                     setShowDesignationModal(false);
                     setNewDesignation('');
                   }}
                   className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                 >
                   <X className="h-6 w-6" />
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                     Designation Title
                   </label>
                   <input
                     type="text"
                     value={newDesignation}
                     onChange={(e) => setNewDesignation(e.target.value)}
                     className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="e.g., Director, Deputy Director"
                     onKeyPress={(e) => {
                       if (e.key === 'Enter') {
                         addAuthorizedDesignation();
                       }
                     }}
                   />
                 </div>
                 
                 <div className="flex items-center justify-end space-x-3">
                   <button
                     onClick={() => {
                       setShowDesignationModal(false);
                       setNewDesignation('');
                     }}
                     className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                   >
                     Cancel
                   </button>
                   <button
                     onClick={addAuthorizedDesignation}
                     disabled={!newDesignation.trim()}
                     className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Add Designation
                   </button>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Add Reference Modal */}
       {showReferenceModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
             <div className="mt-3">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                   Add Contract Reference
                 </h3>
                 <button
                   onClick={() => {
                     setShowReferenceModal(false);
                     setNewReference('');
                   }}
                   className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                 >
                   <X className="h-6 w-6" />
                 </button>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                     Contract Reference Number
                   </label>
                   <input
                     type="text"
                     value={newReference}
                     onChange={(e) => setNewReference(e.target.value)}
                     className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="e.g., GEM-2024-001, PO-2024-001"
                     onKeyPress={(e) => {
                       if (e.key === 'Enter') {
                         addContractReference();
                       }
                     }}
                   />
                 </div>
                 
                 <div className="flex items-center justify-end space-x-3">
                   <button
                     onClick={() => {
                       setShowReferenceModal(false);
                       setNewReference('');
                     }}
                     className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                   >
                     Cancel
                   </button>
                   <button
                     onClick={addContractReference}
                     disabled={!newReference.trim()}
                     className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Add Reference
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

export default BuyerRegistrationForm;



