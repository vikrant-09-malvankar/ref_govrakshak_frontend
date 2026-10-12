import React, { useState } from 'react';
import { 
  User, 
  Monitor, 
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  FileText,
  Globe
} from 'lucide-react';
import { EndUserDeviceRegistration, DeviceType, LanguagePreference } from '../../types';

interface EndUserDeviceRegistrationFormProps {
  onSubmit: (data: EndUserDeviceRegistration) => void;
  loading?: boolean;
}

const EndUserDeviceRegistrationForm: React.FC<EndUserDeviceRegistrationFormProps> = ({ 
  onSubmit, 
  loading = false 
}) => {
  const [formData, setFormData] = useState<Partial<EndUserDeviceRegistration>>({
    devicesAssigned: [],
    deviceSerialNumbers: [],
    deliveryConfirmationOTP: false,
    hardwareSoftwareFunctioning: {
      preInstalledOSPresent: false,
      batteryChargerCableWorking: false,
      antivirusMSOfficeActivation: false
    },
    languagePreference: 'English',
    amcSupportContactDetailsShown: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<{
    signedDeliveryReceipt: File[];
    issuesReportedFiles: File[];
  }>({
    signedDeliveryReceipt: [],
    issuesReportedFiles: []
  });

  // Modal states
  const [showSerialNumberModal, setShowSerialNumberModal] = useState(false);
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: 'User & access', description: 'Your details' },
    { title: 'Devices', description: 'Assigned equipment' },
    { title: 'Delivery & preferences', description: 'Confirmation settings' },
    { title: 'Documents & review', description: 'Final submission' },
  ];

  const deviceTypes: DeviceType[] = [
    'Laptop', 
    'Desktop', 
    'Printer', 
    'Scanner', 
    'Webcam', 
    'Software License Key'
  ];

  const languagePreferences: LanguagePreference[] = [
    'English', 'Hindi', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 
    'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Assamese'
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleHardwareSoftwareChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      hardwareSoftwareFunctioning: {
        ...prev.hardwareSoftwareFunctioning,
        [field]: value
      }
    }));
  };

  const handleDeviceSelection = (device: DeviceType, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        devicesAssigned: [...(prev.devicesAssigned || []), device]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        devicesAssigned: prev.devicesAssigned?.filter(d => d !== device)
      }));
      // Remove corresponding serial number if device is deselected
      setFormData(prev => ({
        ...prev,
        deviceSerialNumbers: prev.deviceSerialNumbers?.filter((_, index) => 
          prev.devicesAssigned?.includes(device) && index !== prev.devicesAssigned?.indexOf(device)
        )
      }));
    }
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

  const addSerialNumber = () => {
    if (newSerialNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        deviceSerialNumbers: [...(prev.deviceSerialNumbers || []), newSerialNumber.trim()]
      }));
      setNewSerialNumber('');
      setShowSerialNumberModal(false);
    }
  };

  const removeSerialNumber = (index: number) => {
    setFormData(prev => ({
      ...prev,
      deviceSerialNumbers: prev.deviceSerialNumbers?.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.designation?.trim()) {
      newErrors.designation = 'Designation is required';
    }
    if (!formData.departmentOfficeName?.trim()) {
      newErrors.departmentOfficeName = 'Department/Office name is required';
    }
    if (!formData.emailId?.trim()) {
      newErrors.emailId = 'Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
      newErrors.emailId = 'Please enter a valid email address';
    }
    if (!formData.mobileNumber?.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
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
    if (!formData.devicesAssigned?.length) {
      newErrors.devicesAssigned = 'At least one device must be selected';
    }
    if (!formData.languagePreference) {
      newErrors.languagePreference = 'Language preference is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const completeFormData: EndUserDeviceRegistration = {
      id: Date.now().toString(),
      ...formData as EndUserDeviceRegistration,
      status: 'Pending',
      submittedAt: new Date().toISOString(),
      password: formData.password || '' // Use the actual password entered by user
    };

    onSubmit(completeFormData);
  };

  const validateCurrentStep = (): boolean => {
    const stepErrors: Record<string, string> = {};
    const requireText = (field: string, value: string | undefined, message: string) => {
      if (!value?.trim()) stepErrors[field] = message;
    };

    if (currentStep === 0) {
      requireText('fullName', formData.fullName, 'Full name is required');
      requireText('designation', formData.designation, 'Designation is required');
      requireText('departmentOfficeName', formData.departmentOfficeName, 'Department/Office name is required');
      requireText('emailId', formData.emailId, 'Email ID is required');
      if (formData.emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailId)) {
        stepErrors.emailId = 'Please enter a valid email address';
      }
      requireText('mobileNumber', formData.mobileNumber, 'Mobile number is required');
      if (formData.mobileNumber && !/^\d{10}$/.test(formData.mobileNumber.replace(/\D/g, ''))) {
        stepErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
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

    if (currentStep === 1 && !formData.devicesAssigned?.length) {
      stepErrors.devicesAssigned = 'At least one device must be selected';
    }

    if (currentStep === 2 && !formData.languagePreference) {
      stepErrors.languagePreference = 'Language preference is required';
    }

    setErrors((previousErrors) => ({ ...previousErrors, ...stepErrors }));
    return Object.keys(stepErrors).length === 0;
  };

  const goToNextStep = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToPreviousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="end-user-registration-form mx-auto max-w-3xl rounded-card border border-surface-border bg-white p-5 shadow-card-md dark:border-slate-700 dark:bg-slate-900 sm:p-7">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-600">
          <User className="h-5 w-5 text-white" />
        </div>
        <h1 className="mb-0.5 text-xl font-bold text-gray-900 dark:text-white dark:text-white">
          End User Device Registration
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-slate-300">
          Register your assigned devices and confirm delivery
        </p>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2" aria-label="Registration progress">
        {steps.map((step, index) => (
          <div key={step.title} className="min-w-0">
            <div className={`mb-2 h-1.5 rounded-full ${index <= currentStep ? 'bg-purple-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
            <p className={`truncate text-xs font-semibold ${index === currentStep ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500 dark:text-slate-400'}`}>
              {step.title}
            </p>
            <p className="hidden truncate text-[11px] text-gray-400 dark:text-slate-500 sm:block">{step.description}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {currentStep === 0 && <>
        {/* User Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="h-5 w-5 mr-2" />
            User Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName || ''}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.fullName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Designation *
              </label>
              <input
                type="text"
                value={formData.designation || ''}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.designation ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="e.g., Software Engineer, Manager"
              />
              {errors.designation && (
                <p className="text-red-500 text-sm mt-1">{errors.designation}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Department / Office Name *
              </label>
              <input
                type="text"
                value={formData.departmentOfficeName || ''}
                onChange={(e) => handleInputChange('departmentOfficeName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.departmentOfficeName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="e.g., IT Department, Finance Office"
              />
              {errors.departmentOfficeName && (
                <p className="text-red-500 text-sm mt-1">{errors.departmentOfficeName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Email ID *
              </label>
              <input
                type="email"
                value={formData.emailId || ''}
                onChange={(e) => handleInputChange('emailId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.emailId ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="your.email@domain.com"
              />
              {errors.emailId && (
                <p className="text-red-500 text-sm mt-1">{errors.emailId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={formData.mobileNumber || ''}
                onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.mobileNumber ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="10-digit mobile number"
              />
              {errors.mobileNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.mobileNumber}</p>
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
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

        {currentStep === 1 && <>
        {/* Device Assignment */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            Device Assignment
          </h2>
          
          <div className="space-y-6">
            {/* Device Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-3">
                Device(s) Assigned *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {deviceTypes.map(device => (
                  <label key={device} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.devicesAssigned?.includes(device) || false}
                      onChange={(e) => handleDeviceSelection(device, e.target.checked)}
                      className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{device}</span>
                  </label>
                ))}
              </div>
              {errors.devicesAssigned && (
                <p className="text-red-500 text-sm mt-1">{errors.devicesAssigned}</p>
              )}
            </div>

            {/* Device Serial Numbers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
                  Device Serial Numbers
                </label>
                <button
                  type="button"
                  onClick={() => setShowSerialNumberModal(true)}
                  className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  Add Serial Number
                </button>
              </div>
              
              {formData.deviceSerialNumbers && formData.deviceSerialNumbers.length > 0 && (
                <div className="space-y-2">
                  {formData.deviceSerialNumbers.map((serialNumber, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="flex-1 px-3 py-2 bg-white border border-gray-300 dark:border-slate-600 rounded-md text-sm">
                        {serialNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSerialNumber(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        </>}

        {currentStep === 2 && <>
        {/* Delivery Confirmation */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Delivery Confirmation
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-3">
                Delivery Confirmation via OTP?
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="deliveryConfirmationOTP"
                    checked={formData.deliveryConfirmationOTP === true}
                    onChange={() => handleInputChange('deliveryConfirmationOTP', true)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="deliveryConfirmationOTP"
                    checked={formData.deliveryConfirmationOTP === false}
                    onChange={() => handleInputChange('deliveryConfirmationOTP', false)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-3">
                Was hardware/software functioning properly?
              </label>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.hardwareSoftwareFunctioning?.preInstalledOSPresent || false}
                    onChange={(e) => handleHardwareSoftwareChange('preInstalledOSPresent', e.target.checked)}
                    className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Pre-installed OS present?</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.hardwareSoftwareFunctioning?.batteryChargerCableWorking || false}
                    onChange={(e) => handleHardwareSoftwareChange('batteryChargerCableWorking', e.target.checked)}
                    className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Battery, charger, cable working?</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.hardwareSoftwareFunctioning?.antivirusMSOfficeActivation || false}
                    onChange={(e) => handleHardwareSoftwareChange('antivirusMSOfficeActivation', e.target.checked)}
                    className="rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Antivirus / MS Office / Activation?</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Language and Support */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Language & Support Preferences
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                Language Preference for UI and Support *
              </label>
              <select
                value={formData.languagePreference}
                onChange={(e) => handleInputChange('languagePreference', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.languagePreference ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                {languagePreferences.map(language => (
                  <option className="dark:bg-slate-800 dark:text-white" key={language} value={language}>{language}</option>
                ))}
              </select>
              {errors.languagePreference && (
                <p className="text-red-500 text-sm mt-1">{errors.languagePreference}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-3">
                AMC / Support Contact Details Shown?
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="amcSupportContactDetailsShown"
                    checked={formData.amcSupportContactDetailsShown === true}
                    onChange={() => handleInputChange('amcSupportContactDetailsShown', true)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="amcSupportContactDetailsShown"
                    checked={formData.amcSupportContactDetailsShown === false}
                    onChange={() => handleInputChange('amcSupportContactDetailsShown', false)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
                </label>
              </div>
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
            {/* Signed Delivery Receipt */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Signed Delivery Receipt (Optional)</h3>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload('signedDeliveryReceipt', Array.from(e.target.files || []))}
                  className="hidden"
                  id="delivery-receipt-upload"
                />
                <label htmlFor="delivery-receipt-upload" className="cursor-pointer">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Upload signed delivery receipt
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, JPG, PNG files accepted
                  </p>
                </label>
              </div>
              
              {uploadedFiles.signedDeliveryReceipt.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Uploaded Files:</h4>
                  {uploadedFiles.signedDeliveryReceipt.map((file, index) => (
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
                        onClick={() => removeFile('signedDeliveryReceipt', index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Issues Reported */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Issues Reported</h3>
              <textarea
                value={formData.issuesReported || ''}
                onChange={(e) => handleInputChange('issuesReported', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={4}
                placeholder="Describe any issues or problems with the devices..."
              />
              
              <div className="mt-4">
                <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload('issuesReportedFiles', Array.from(e.target.files || []))}
                    className="hidden"
                    id="issues-files-upload"
                  />
                  <label htmlFor="issues-files-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Upload supporting files for issues
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, DOC, DOCX, JPG, PNG files accepted
                    </p>
                  </label>
                </div>
                
                {uploadedFiles.issuesReportedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300">Uploaded Files:</h4>
                    {uploadedFiles.issuesReportedFiles.map((file, index) => (
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
                          onClick={() => removeFile('issuesReportedFiles', index)}
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
          </div>
        </div>

        </>}

        {/* Step navigation and registration notice */}
        <div className="grid gap-4 border-t border-gray-200 pt-5 dark:border-slate-700 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex items-start gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-left dark:border-purple-900/70 dark:bg-purple-950/30">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-300" />
            <p className="text-xs leading-5 text-purple-700 dark:text-purple-200">
              <span className="font-semibold text-purple-900 dark:text-purple-100">Registration Process:</span>{' '}
              Your device registration will be reviewed by the IT department. You will receive a confirmation email once your registration is processed.
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
                className="rounded-md bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 rounded-md bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
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

      {/* Add Serial Number Modal */}
      {showSerialNumberModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-slate-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Add Device Serial Number
                </h3>
                <button
                  onClick={() => {
                    setShowSerialNumberModal(false);
                    setNewSerialNumber('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={newSerialNumber}
                    onChange={(e) => setNewSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter device serial number"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addSerialNumber();
                      }
                    }}
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowSerialNumberModal(false);
                      setNewSerialNumber('');
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addSerialNumber}
                    disabled={!newSerialNumber.trim()}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Serial Number
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

export default EndUserDeviceRegistrationForm;



