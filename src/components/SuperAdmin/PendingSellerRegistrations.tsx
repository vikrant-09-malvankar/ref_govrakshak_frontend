import React, { useState } from 'react';
import { Check, X, Eye, Download, Users } from 'lucide-react';
import { SellerRegistration } from '../../types';
import BulkOperations from './BulkOperations';

interface PendingSellerRegistrationsProps {
  registrations: SellerRegistration[];
  onRegistrationUpdate: (registrationId: string, status: 'Approved' | 'Rejected', notes?: string) => void;
  onRefresh: () => void;
}

const PendingSellerRegistrations: React.FC<PendingSellerRegistrationsProps> = ({
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
          <p className="text-gray-500">All seller registrations have been processed.</p>
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
            <h3 className="text-lg font-medium text-gray-900">Pending Seller Registrations</h3>
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
                      {registration.company_name || 'Not provided'} • GEM ID: {registration.gem_seller_id || 'Not provided'}
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
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['AMC Contact Information', 'amc_contact_name', 'amc_contact_mobile', 'amc_contact_email'],
                      ['Execution Contact Information', 'execution_contact_name', 'execution_contact_mobile', 'execution_contact_email'],
                      ['Accounts Contact Information', 'accounts_contact_name', 'accounts_contact_mobile', 'accounts_contact_email'],
                      ['Director Contact Information', 'director_contact_name', 'director_contact_mobile', 'director_contact_email']
                    ].map(([title, n, m, e]) => (
                      <div key={title} className="bg-gray-50 rounded-md p-3 text-sm text-gray-600">
                        <p className="font-medium text-gray-800 mb-1">{title}</p>
                        <p>Full Name: {(registration as any)[n] || 'Not provided'}</p>
                        <p>Mobile Number: {(registration as any)[m] || 'Not provided'}</p>
                        <p>Email: {(registration as any)[e] || 'Not provided'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Company Details</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Company:</span> {registration.company_name || 'Not provided'}</p>
                      <p><span className="font-medium">GSTIN:</span> {registration.gstin || 'Not provided'}</p>
                      <p><span className="font-medium">MSME:</span> {registration.msme_registration_no || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                {registration.company_address && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Company Address</h5>
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-sm text-gray-600">{registration.company_address.fullAddress || 'Not provided'}</p>
                      <div className="mt-1 text-xs text-gray-500">
                        {registration.company_address.street && `${registration.company_address.street}, `}
                        {registration.company_address.city && `${registration.company_address.city}, `}
                        {registration.company_address.state && `${registration.company_address.state} `}
                        {registration.company_address.pin && `- ${registration.company_address.pin}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Details */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Business Information</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">Nature:</span> {registration.nature_of_business || 'Not provided'}</p>
                      <p><span className="font-medium">Social Category:</span> {registration.social_category || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Product Categories</h5>
                    <div className="space-y-1">
                      {registration.product_categories && registration.product_categories.length > 0 ? (
                        registration.product_categories.map((category, index) => (
                          <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {category}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">None specified</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Brands */}
                {registration.brands_dealt_with && registration.brands_dealt_with.length > 0 && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Brands Dealt With</h5>
                    <div className="space-y-1">
                      {registration.brands_dealt_with.map((brand, index) => (
                        <span key={index} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                          {brand}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Attached Files</h5>
                  <div className="space-y-2">
                    {(registration as any).tan_certificate && (registration as any).tan_certificate.length > 0 && (
                      <div>
                        <h6 className="text-xs font-medium text-gray-600 mb-1">TAN Certificates</h6>
                        {(registration as any).tan_certificate.map((file: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <Download className="h-4 w-4" />
                            <span>{file.name || `TAN File ${index + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(registration as any).shop_est_or_mca_certificate && (registration as any).shop_est_or_mca_certificate.length > 0 && (
                      <div>
                        <h6 className="text-xs font-medium text-gray-600 mb-1">Shop & Establishment Certificate or MCA Registration Certificates</h6>
                        {(registration as any).shop_est_or_mca_certificate.map((file: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <Download className="h-4 w-4" />
                            <span>{file.name || `Certificate ${index + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(registration as any).gst_certificate && (registration as any).gst_certificate.length > 0 && (
                      <div>
                        <h6 className="text-xs font-medium text-gray-600 mb-1">GST Certificate</h6>
                        {(registration as any).gst_certificate.map((file: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <Download className="h-4 w-4" />
                            <span>{file.name || `GST File ${index + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(registration as any).msme_certificate && (registration as any).msme_certificate.length > 0 && (
                      <div>
                        <h6 className="text-xs font-medium text-gray-600 mb-1">MSME Certificate</h6>
                        {(registration as any).msme_certificate.map((file: any, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <Download className="h-4 w-4" />
                            <span>{file.name || `MSME File ${index + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Preview */}
                {registration.logo_path && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Company Logo</h5>
                    <div className="flex items-center space-x-3">
                      <img
                        src={registration.logo_path}
                        alt="Company Logo"
                        className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          console.error('❌ Failed to load logo:', registration.logo_path);
                        }}
                        onLoad={() => {}}
                      />
                      <div className="text-sm text-gray-500">
                        Logo uploaded successfully
                      </div>
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
          userType="seller"
          onSuccess={handleBulkSuccess}
          onCancel={() => setShowBulkOperations(false)}
        />
      )}
    </div>
  );
};

export default PendingSellerRegistrations;
