import React, { useState } from 'react';
import { X, AlertTriangle, Clock, CheckCircle, User, Calendar, Building, FileText } from 'lucide-react';
import { Complaint } from '../../types';
import { useTranslation } from 'react-i18next';

interface ComplaintDetailsProps {
  complaint: Complaint;
  onClose: () => void;
  onEdit?: (complaint: Complaint) => void;
  canEdit?: boolean;
}

const ComplaintDetails: React.FC<ComplaintDetailsProps> = ({ 
  complaint, 
  onClose, 
  onEdit, 
  canEdit = false 
}) => {
  const { t } = useTranslation();
  const [newStatus, setNewStatus] = useState<'Open' | 'In Progress' | 'Resolved' | 'Closed'>(complaint.status);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(complaint);
      onClose();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'In Progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'Resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Closed':
        return <CheckCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('Complaint Details')}</h2>
              <p className="text-gray-600">{complaint.assetName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {getStatusIcon(complaint.status)}
              {t('Basic Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Complaint ID')}</label>
                <p className="text-lg font-semibold text-gray-900">#{complaint.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Asset Name')}</label>
                <p className="text-lg font-semibold text-gray-900">{complaint.assetName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Asset ID')}</label>
                <p className="text-lg font-semibold text-gray-900">#{complaint.assetId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Status')}</label>
                <p className="text-lg font-semibold text-gray-900">{t(complaint.status)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Priority')}</label>
                <span className={`px-2 py-1 text-sm rounded-full border ${getPriorityColor(complaint.priority)}`}>
                  {t(complaint.priority)}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Department')}</label>
                <p className="text-lg font-semibold text-gray-900">{complaint.department}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              {t('Description')}
            </h3>
            <p className="text-gray-700 leading-relaxed">{complaint.description}</p>
          </div>

          {/* Resolution */}
          {complaint.resolution && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {t('Resolution')}
              </h3>
              <p className="text-gray-700 leading-relaxed">{complaint.resolution}</p>
            </div>
          )}

          {/* Reporter Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" />
              {t('Reporter Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Reported By')}</label>
                <p className="text-gray-900">{complaint.reportedBy}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Reported Date')}</label>
                <p className="text-gray-900">{complaint.reportedDate}</p>
              </div>
              {complaint.assignedTo && (
                <div>
                  <label className="text-sm font-medium text-gray-500">{t('Assigned To')}</label>
                  <p className="text-gray-900">{complaint.assignedTo}</p>
                </div>
              )}
            </div>
          </div>

          {/* Department Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-500" />
              {t('Department Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Department')}</label>
                <p className="text-gray-900">{complaint.department}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Asset Category')}</label>
                <p className="text-gray-900">{t('Asset-related')}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              {t('Timeline')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium text-gray-900">{t('Complaint Reported')}</p>
                  <p className="text-sm text-gray-600">{complaint.reportedDate} • {complaint.reportedBy}</p>
                </div>
              </div>
              {complaint.status !== 'Open' && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900">{t('Status Updated')}</p>
                    <p className="text-sm text-gray-600">{t('Status changed to')} {t(complaint.status)}</p>
                  </div>
                </div>
              )}
              {complaint.resolution && (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900">{t('Resolution Added')}</p>
                    <p className="text-sm text-gray-600">{t('Complaint resolved')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Quick Actions')}</h3>
            <div className="flex flex-wrap gap-3">
              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FileText size={16} />
                  {t('Edit Complaint')}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                <X size={16} />
                {t('Close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;