import React, { useState } from 'react';
import { Check, X, Eye, Download, Users, CheckSquare, Square } from 'lucide-react';
import { BuyerRegistration } from '../../types';
import BulkOperations from './BulkOperations';

interface PendingRegistrationsProps {
  registrations: BuyerRegistration[];
  onRegistrationUpdate: (registrationId: string, status: 'Approved' | 'Rejected', notes?: string) => void;
  onRefresh: () => void;
}

const PendingRegistrations: React.FC<PendingRegistrationsProps> = ({
  registrations,
  onRegistrationUpdate,
  onRefresh
}) => {
  const [selectedRegistrations, setSelectedRegistrations] = useState<string[]>([]);
  const [showBulkOperations, setShowBulkOperations] = useState(false);

  const handleSelectAll = () => {
    if (selectedRegistrations.length === registrations.length) {
      setSelectedRegistrations([]);
    } else {
      setSelectedRegistrations(registrations.map(reg => reg.id));
    }
  };

  const handleSelectRegistration = (registrationId: string) => {
    setSelectedRegistrations(prev => 
      prev.includes(registrationId) 
        ? prev.filter(id => id !== registrationId)
        : [...prev, registrationId]
    );
  };

  const handleBulkSuccess = () => {
    setSelectedRegistrations([]);
    setShowBulkOperations(false);
    // Refresh the data without full page reload
    onRefresh();
  };

  if (registrations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Registrations</h3>
          <p className="text-gray-500">All buyer registrations have been processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header with bulk operations */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Pending Buyer Registrations</h3>
            <p className="text-sm text-gray-500">{registrations.length} registrations pending approval</p>
          </div>
          {selectedRegistrations.length > 0 && (
            <button
              onClick={() => setShowBulkOperations(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Users className="mr-2 h-4 w-4" />
              Bulk Operations ({selectedRegistrations.length})
            </button>
          )}
        </div>
      </div>

      {/* Bulk selection controls */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedRegistrations.length === registrations.length}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Select All</span>
          </label>
          {selectedRegistrations.length > 0 && (
            <span className="text-sm text-gray-500">
              {selectedRegistrations.length} of {registrations.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Registrations list */}
      <div className="divide-y divide-gray-200">
        {registrations.map((registration) => (
          <div key={registration.id} className="p-6">
            <div className="flex items-start space-x-4">
              {/* Selection checkbox */}
              <div className="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  checked={selectedRegistrations.includes(registration.id)}
                  onChange={() => handleSelectRegistration(registration.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Registration details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {registration.contact_person_name || 'Not provided'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {registration.organization_name || 'Not provided'} • {registration.ministry_department || 'Not provided'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => onRegistrationUpdate(registration.id, 'Approved')}
                        className="inline-flex items-center p-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onRegistrationUpdate(registration.id, 'Rejected')}
                        className="inline-flex items-center p-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Email:</span> {registration.email_id || 'Not provided'}</p>
                      <p><span className="font-medium">Phone:</span> {registration.contact_number || 'Not provided'}</p>
                      <p><span className="font-medium">Designation:</span> {registration.buyer_designation || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Organization Details</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Type:</span> {registration.organization_type || 'Not provided'}</p>
                      <p><span className="font-medium">GSTIN:</span> {registration.gstin || 'Not provided'}</p>
                      <p><span className="font-medium">Payment Mode:</span> {registration.payment_mode || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                {registration.office_address && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Office Address</h5>
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-sm text-gray-600">{registration.office_address.fullAddress || 'Not provided'}</p>
                      <div className="mt-1 text-xs text-gray-500">
                        {registration.office_address.zone && `${registration.office_address.zone}, `}
                        {registration.office_address.city && `${registration.office_address.city}, `}
                        {registration.office_address.state && `${registration.office_address.state} `}
                        {registration.office_address.pin && `- ${registration.office_address.pin}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Billing Authority:</span> {registration.billing_authority_designation || 'Not provided'}</p>
                      <p><span className="font-medium">Consignee:</span> {registration.consignee_name || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Authorized Designations</h5>
                    <div className="space-y-1">
                      {registration.authorized_designations && registration.authorized_designations.length > 0 ? (
                        registration.authorized_designations.map((designation, index) => (
                          <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {designation}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">None specified</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contract References */}
                {registration.contract_reference_numbers && registration.contract_reference_numbers.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Contract References</h5>
                    <div className="space-y-1">
                      {registration.contract_reference_numbers.map((ref, index) => (
                        <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {registration.past_work_orders && registration.past_work_orders.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Attached Files</h5>
                    <div className="space-y-1">
                      {registration.past_work_orders.map((file, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                          <Download className="h-4 w-4" />
                          <span>{file.name || `File ${index + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Submitted: {registration.created_at ? new Date(registration.created_at).toLocaleDateString() : 'Unknown'}</span>
                    <span>ID: {registration.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Operations Modal */}
  {showBulkOperations && (
        <BulkOperations
          selectedRegistrations={selectedRegistrations}
          userType="buyer"
          onSuccess={handleBulkSuccess}
          onCancel={() => setShowBulkOperations(false)}
        />
      )}
    </div>
  );
};

export default PendingRegistrations; 