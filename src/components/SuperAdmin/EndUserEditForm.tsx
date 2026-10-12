import React, { useState, useEffect } from 'react';
import { 
  User, 
  Monitor, 
  CheckCircle,
  AlertCircle,
  Upload,
  X,
  FileText,
  Globe,
  Shield
} from 'lucide-react';
import { EndUserDeviceRegistration, DeviceType, LanguagePreference } from '../../types';

interface EndUserEditFormProps {
  endUser: EndUserDeviceRegistration;
  onSubmit: (updatedData: Partial<EndUserDeviceRegistration>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const EndUserEditForm: React.FC<EndUserEditFormProps> = ({ 
  endUser, 
  onSubmit, 
  onCancel,
  loading = false 
}) => {
  const [formData, setFormData] = useState<Partial<EndUserDeviceRegistration>>({
    ...endUser,
    devices_assigned: endUser.devices_assigned || [],
    device_serial_numbers: endUser.device_serial_numbers || []
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<{
    signed_delivery_receipt: File[];
    issues_reported_files: File[];
  }>({
    signed_delivery_receipt: endUser.signed_delivery_receipt || [],
    issues_reported_files: endUser.issues_reported_files || []
  });

  // Modal states
  const [showSerialNumberModal, setShowSerialNumberModal] = useState(false);
  const [newSerialNumber, setNewSerialNumber] = useState('');

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

  useEffect(() => {
    setFormData(endUser);
    setUploadedFiles({
      signed_delivery_receipt: endUser.signed_delivery_receipt || [],
      issues_reported_files: endUser.issues_reported_files || []
    });
  }, [endUser]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleHardwareSoftwareChange = (field: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      hardware_software_functioning: {
        ...prev.hardware_software_functioning!,
        [field]: value
      }
    }));
  };

  const handleDeviceSelection = (device: DeviceType, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        devices_assigned: [...(prev.devices_assigned || []), device]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        devices_assigned: (prev.devices_assigned || []).filter((d: DeviceType) => d !== device)
      }));
      // Remove corresponding serial number if device is deselected
      setFormData(prev => ({
        ...prev,
        device_serial_numbers: (prev.device_serial_numbers || []).filter((_: string, index: number) => 
          (prev.devices_assigned || []).includes(device) && index !== (prev.devices_assigned || []).indexOf(device)
        )
      }));
    }
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData['full_name']?.trim()) {
      newErrors['full_name'] = 'Full name is required';
    }
    if (!formData['designation']?.trim()) {
      newErrors['designation'] = 'Designation is required';
    }
    if (!formData['department_office_name']?.trim()) {
      newErrors['department_office_name'] = 'Department/Office name is required';
    }
    if (!formData['email_id']?.trim()) {
      newErrors['email_id'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData['email_id'])) {
      newErrors['email_id'] = 'Invalid email format';
    }
    if (!formData['mobile_number']?.trim()) {
      newErrors['mobile_number'] = 'Mobile number is required';
    }
    if (!formData['devices_assigned']?.length) {
      newErrors['devices_assigned'] = 'At least one device must be assigned';
    }

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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Edit End User Information</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Update the end user's registration details below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData['full_name'] || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['full_name'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter full name"
              />
              {errors['full_name'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['full_name']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Designation *
              </label>
              <input
                type="text"
                value={formData['designation'] || ''}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['designation'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter designation"
              />
              {errors['designation'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['designation']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Department/Office Name *
              </label>
              <input
                type="text"
                value={formData['department_office_name'] || ''}
                onChange={(e) => handleInputChange('department_office_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['department_office_name'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter department/office name"
              />
              {errors['department_office_name'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['department_office_name']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Language Preference
              </label>
              <select
                value={formData['language_preference'] || ''}
                onChange={(e) => handleInputChange('language_preference', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {languagePreferences.map(language => (
                  <option className="dark:bg-slate-800 dark:text-white" key={language} value={language}>{language}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Contact Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Email ID *
              </label>
              <input
                type="email"
                value={formData['email_id'] || ''}
                onChange={(e) => handleInputChange('email_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['email_id'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter email address"
              />
              {errors['email_id'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['email_id']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={formData['mobile_number'] || ''}
                onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['mobile_number'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter mobile number"
              />
              {errors['mobile_number'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['mobile_number']}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Device Assignment */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            Device Assignment
          </h4>
          
          <div className="mb-6">
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Select Devices *</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {deviceTypes.map(device => (
                <label key={device} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData['devices_assigned']?.includes(device) || false}
                    onChange={(e) => handleDeviceSelection(device, e.target.checked)}
                    className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{device}</span>
                </label>
              ))}
            </div>
            {errors['devices_assigned'] && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors['devices_assigned']}
              </p>
            )}
          </div>

          {/* Device Serial Numbers */}
          <div>
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Device Serial Numbers</h5>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSerialNumber}
                  onChange={(e) => setNewSerialNumber(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter device serial number"
                />
                <button
                  type="button"
                  onClick={addSerialNumber}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {formData['device_serial_numbers']?.map((serialNumber, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                  <span className="text-gray-700 dark:text-gray-300">{serialNumber}</span>
                  <button
                    type="button"
                    onClick={() => removeSerialNumber(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hardware and Software Functioning */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Hardware and Software Functioning
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData['hardware_software_functioning']?.pre_installed_os_present || false}
                  onChange={(e) => handleHardwareSoftwareChange('pre_installed_os_present', e.target.checked)}
                  className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Pre-installed OS Present</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData['hardware_software_functioning']?.battery_charger_cable_working || false}
                  onChange={(e) => handleHardwareSoftwareChange('battery_charger_cable_working', e.target.checked)}
                  className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Battery/Charger/Cable Working</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData['hardware_software_functioning']?.antivirus_ms_office_activation || false}
                  onChange={(e) => handleHardwareSoftwareChange('antivirus_ms_office_activation', e.target.checked)}
                  className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Antivirus & MS Office Activation</span>
              </label>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData['delivery_confirmation_otp'] || false}
                  onChange={(e) => handleInputChange('delivery_confirmation_otp', e.target.checked)}
                  className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Delivery Confirmation OTP</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData['amc_support_contact_details_shown'] || false}
                  onChange={(e) => handleInputChange('amc_support_contact_details_shown', e.target.checked)}
                  className="rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">AMC Support Contact Details Shown</span>
              </label>
            </div>
          </div>
        </div>

        {/* Issues and Support */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Issues and Support</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
              Issues Reported
            </label>
            <textarea
              value={formData['issues_reported'] || ''}
              onChange={(e) => handleInputChange('issues_reported', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe any issues reported by the user"
            />
          </div>
        </div>

        {/* File Uploads */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Documents
          </h4>
          
          {/* Signed Delivery Receipt */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Signed Delivery Receipt</h5>
            <input
              type="file"
              multiple
              onChange={(e) => handleFileUpload('signed_delivery_receipt', Array.from(e.target.files || []))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <p className="text-sm text-gray-500 mt-1">Upload signed delivery receipt documents</p>
            
            <div className="mt-3 space-y-2">
              {uploadedFiles['signed_delivery_receipt'].map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile('signed_delivery_receipt', index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Issues Reported Files */}
          <div>
            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Issues Reported Files</h5>
            <input
              type="file"
              multiple
              onChange={(e) => handleFileUpload('issues_reported_files', Array.from(e.target.files || []))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <p className="text-sm text-gray-500 mt-1">Upload files related to reported issues</p>
            
            <div className="mt-3 space-y-2">
              {uploadedFiles['issues_reported_files'].map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile('issues_reported_files', index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
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
                Update End User
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EndUserEditForm;



