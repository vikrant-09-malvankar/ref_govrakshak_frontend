import React, { useState } from 'react';
import { Check, X, Eye, Download, Users, Monitor, Settings, Mail, Phone } from 'lucide-react';
import { EndUserDeviceRegistration } from '../../types';
import BulkOperations from './BulkOperations';

interface PendingEndUserRegistrationsProps {
  registrations: EndUserDeviceRegistration[];
  onRegistrationUpdate: (registrationId: string, status: 'Approved' | 'Rejected', notes?: string) => void;
  onRefresh: () => void;
}

const PendingEndUserRegistrations: React.FC<PendingEndUserRegistrationsProps> = ({
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
          <p className="text-gray-500">All end user registrations have been processed.</p>
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
            <h3 className="text-lg font-medium text-gray-900">Pending End User Registrations</h3>
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
                      {registration.full_name || 'Not provided'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {registration.designation || 'Not provided'} • {registration.department_office_name || 'Not provided'}
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
                      <p><span className="font-medium">Phone:</span> {registration.mobile_number || 'Not provided'}</p>
                      <p><span className="font-medium">Designation:</span> {registration.designation || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Department Details</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Department:</span> {registration.department_office_name || 'Not provided'}</p>
                      <p><span className="font-medium">Language:</span> {registration.language_preference || 'Not provided'}</p>
                      <p><span className="font-medium">AMC Support:</span> {registration.amc_support_contact_details_shown ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                {/* Device Information */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Assigned Devices</h5>
                    <div className="space-y-1">
                      {registration.devices_assigned && registration.devices_assigned.length > 0 ? (
                        registration.devices_assigned.map((device, index) => (
                          <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {device}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No devices assigned</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Device Serial Numbers</h5>
                    <div className="space-y-1">
                      {registration.device_serial_numbers && registration.device_serial_numbers.length > 0 ? (
                        registration.device_serial_numbers.map((serial, index) => (
                          <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {serial}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No serial numbers</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hardware/Software Functioning */}
                {registration.hardware_software_functioning && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Hardware/Software Status</h5>
                    <div className="bg-gray-50 rounded-md p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${registration.hardware_software_functioning.pre_installed_os_present ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-gray-600">OS Present</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${registration.hardware_software_functioning.battery_charger_cable_working ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-gray-600">Battery/Charger</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${registration.hardware_software_functioning.antivirus_ms_office_activation ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-gray-600">Antivirus/MS Office</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Delivery Confirmation OTP:</span> {registration.delivery_confirmation_otp ? 'Enabled' : 'Disabled'}</p>
                    {registration.issues_reported && (
                      <p><span className="font-medium">Issues Reported:</span> {registration.issues_reported}</p>
                    )}
                  </div>
                </div>

                {/* Files */}
                {registration.attached_files && registration.attached_files.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Attached Files</h5>
                    <div className="space-y-1">
                      {registration.attached_files.map((file, index) => (
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
          userType="enduser"
          onSuccess={handleBulkSuccess}
          onCancel={() => setShowBulkOperations(false)}
        />
      )}
    </div>
  );
};

export default PendingEndUserRegistrations; 