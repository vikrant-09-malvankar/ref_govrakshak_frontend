import React, { useState, useEffect } from 'react';
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
import { BuyerRegistration, OrganizationType, PaymentMode } from '../../types';

interface BuyerEditFormProps {
  buyer: BuyerRegistration;
  onSubmit: (updatedData: Partial<BuyerRegistration>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const BuyerEditForm: React.FC<BuyerEditFormProps> = ({ 
  buyer, 
  onSubmit, 
  onCancel,
  loading = false 
}) => {
  const [formData, setFormData] = useState<Partial<BuyerRegistration>>(buyer);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFiles, setUploadedFiles] = useState<File[]>(buyer.past_work_orders || []);
  const [newDesignation, setNewDesignation] = useState('');
  const [newReference, setNewReference] = useState('');

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

  useEffect(() => {
    setFormData(buyer);
    setUploadedFiles(buyer.past_work_orders || []);
  }, [buyer]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      office_address: {
        ...prev.office_address!,
        [field]: value
      }
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
    setFormData(prev => ({
      ...prev,
  past_work_orders: ([...(prev.past_work_orders ?? []), ...files] as File[])
    }));
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
  past_work_orders: ((prev.past_work_orders ?? []).filter((_, i) => i !== index) as File[])
    }));
  };

  const addAuthorizedDesignation = () => {
    if (newDesignation.trim()) {
      setFormData(prev => ({
        ...prev,
  authorized_designations: ([...(prev.authorized_designations ?? []), newDesignation.trim()] as string[])
      }));
      setNewDesignation('');
    }
  };

  const removeAuthorizedDesignation = (index: number) => {
    setFormData(prev => ({
      ...prev,
  authorized_designations: ((prev.authorized_designations ?? []).filter((_, i) => i !== index) as string[])
    }));
  };

  const addContractReference = () => {
    if (newReference.trim()) {
      setFormData(prev => ({
        ...prev,
  contract_reference_numbers: ([...(prev.contract_reference_numbers ?? []), newReference.trim()] as string[])
      }));
      setNewReference('');
    }
  };

  const removeContractReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
  contract_reference_numbers: ((prev.contract_reference_numbers ?? []).filter((_, i) => i !== index) as string[])
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organization_name?.trim()) {
      newErrors['organization_name'] = 'Organization name is required';
    }
    if (!formData.contact_person_name?.trim()) {
      newErrors['contact_person_name'] = 'Contact person name is required';
    }
    if (!formData.email_id?.trim()) {
      newErrors['email_id'] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_id)) {
      newErrors['email_id'] = 'Invalid email format';
    }
    if (!formData.contact_number?.trim()) {
      newErrors['contact_number'] = 'Contact number is required';
    }
    if (!formData.office_address?.fullAddress?.trim()) {
      newErrors['fullAddress'] = 'Full address is required';
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Edit Buyer Information</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Update the buyer's registration details below</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Organization Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Organization Type *
              </label>
              <select
                value={formData.organization_type || ''}
                onChange={(e) => handleInputChange('organization_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {organizationTypes.map(type => (
                  <option className="dark:bg-slate-800 dark:text-white" key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Ministry/Department *
              </label>
              <input
                type="text"
                value={formData.ministry_department || ''}
                onChange={(e) => handleInputChange('ministry_department', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ministry/department"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                value={formData.organization_name || ''}
                onChange={(e) => handleInputChange('organization_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['organization_name'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter organization name"
              />
              {errors['organization_name'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['organization_name']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Buyer Designation
              </label>
              <input
                type="text"
                value={formData.buyer_designation || ''}
                onChange={(e) => handleInputChange('buyer_designation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter designation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                GSTIN
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                value={formData.contact_person_name || ''}
                onChange={(e) => handleInputChange('contact_person_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['contact_person_name'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter contact person name"
              />
              {errors['contact_person_name'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['contact_person_name']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Email ID *
              </label>
              <input
                type="email"
                value={formData.email_id || ''}
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
                Contact Number *
              </label>
              <input
                type="tel"
                value={formData.contact_number || ''}
                onChange={(e) => handleInputChange('contact_number', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['contact_number'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter contact number"
              />
              {errors['contact_number'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['contact_number']}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Payment Mode *
              </label>
              <select
                value={formData.payment_mode || ''}
                onChange={(e) => handleInputChange('payment_mode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {paymentModes.map(mode => (
                  <option className="dark:bg-slate-800 dark:text-white" key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Office Address */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Office Address
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Zone
              </label>
              <input
                type="text"
                value={formData.office_address?.zone || ''}
                onChange={(e) => handleAddressChange('zone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter zone"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.office_address?.city || ''}
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
                value={formData.office_address?.state || ''}
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
                value={formData.office_address?.pin || ''}
                onChange={(e) => handleAddressChange('pin', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter PIN code"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Full Address *
              </label>
              <textarea
                value={formData.office_address?.fullAddress || ''}
                onChange={(e) => handleAddressChange('fullAddress', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors['fullAddress'] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                }`}
                rows={3}
                placeholder="Enter complete address"
              />
              {errors['fullAddress'] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors['fullAddress']}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Billing and Consignee Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Billing and Consignee Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Billing Authority Designation
              </label>
              <input
                type="text"
                value={formData.billing_authority_designation || ''}
                onChange={(e) => handleInputChange('billing_authority_designation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter billing authority designation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Consignee Name
              </label>
              <input
                type="text"
                value={formData.consignee_name || ''}
                onChange={(e) => handleInputChange('consignee_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter consignee name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                Consignee Designation
              </label>
              <input
                type="text"
                value={formData.consignee_designation || ''}
                onChange={(e) => handleInputChange('consignee_designation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter consignee designation"
              />
            </div>
          </div>
        </div>

        {/* Authorized Designations */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Authorized Designations</h4>
          
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newDesignation}
                onChange={(e) => setNewDesignation(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new designation"
              />
              <button
                type="button"
                onClick={addAuthorizedDesignation}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {formData.authorized_designations?.map((designation, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                <span className="text-gray-700 dark:text-gray-300">{designation}</span>
                <button
                  type="button"
                  onClick={() => removeAuthorizedDesignation(index)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Reference Numbers */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Contract Reference Numbers</h4>
          
          <div className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newReference}
                onChange={(e) => setNewReference(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new reference number"
              />
              <button
                type="button"
                onClick={addContractReference}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {formData.contract_reference_numbers?.map((reference, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                <span className="text-gray-700 dark:text-gray-300">{reference}</span>
                <button
                  type="button"
                  onClick={() => removeContractReference(index)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* File Uploads */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Past Work Orders
          </h4>
          
          <div className="mb-4">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
            />
            <p className="text-sm text-gray-500 mt-1">Upload past work orders (PDF, DOC, XLS)</p>
          </div>

          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-md border">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-700 dark:text-gray-300">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
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
                Update Buyer
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BuyerEditForm;



