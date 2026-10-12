import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock, CheckCircle, User, FileText } from 'lucide-react';
import { Complaint } from '../../types';
import { useTranslation } from 'react-i18next';

interface ComplaintFormProps {
  complaint?: Complaint | null;
  onClose: () => void;
  onSubmit: (complaint: Complaint) => void;
}

const ComplaintForm: React.FC<ComplaintFormProps> = ({ complaint, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    assetId: '',
    assetName: '',
    department: '',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    status: 'Open' as 'Open' | 'In Progress' | 'Resolved' | 'Closed',
    reportedBy: '',
    assignedTo: '',
    resolution: ''
  });

  useEffect(() => {
    if (complaint) {
      setFormData({
        assetId: complaint.assetId || '',
        assetName: complaint.assetName || '',
        department: complaint.department || '',
        description: complaint.description || '',
        priority: complaint.priority || 'Medium',
        status: complaint.status || 'Open',
        reportedBy: complaint.reportedBy || '',
        assignedTo: complaint.assignedTo || '',
        resolution: complaint.resolution || ''
      });
    }
  }, [complaint]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.assetName.trim()) {
      newErrors.assetName = t('Asset name is required');
    }

    if (!formData.department) {
      newErrors.department = t('Department is required');
    }

    if (!formData.description.trim()) {
      newErrors.description = t('Description is required');
    }

    if (!formData.reportedBy.trim()) {
      newErrors.reportedBy = t('Reporter name is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const complaintData: Complaint = {
      id: complaint?.id || '',
      assetId: formData.assetId,
      assetName: formData.assetName,
      department: formData.department,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      reportedBy: formData.reportedBy,
      reportedDate: complaint?.reportedDate || new Date().toISOString().split('T')[0],
      assignedTo: formData.assignedTo || undefined,
      resolution: formData.resolution || undefined
    };

    onSubmit(complaintData);
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {complaint ? t('Edit Complaint') : t('Add New Complaint')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              {t('Asset Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Asset Name')} *
                </label>
                <input
                  type="text"
                  name="assetName"
                  value={formData.assetName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.assetName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder={t('Enter asset name')}
                />
                {errors.assetName && <p className="text-red-500 text-sm mt-1">{errors.assetName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Asset ID')}
                </label>
                <input
                  type="text"
                  name="assetId"
                  value={formData.assetId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('Enter asset ID')}
                />
              </div>
            </div>
          </div>

          {/* Complaint Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {t('Complaint Details')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Department')} *
                </label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.department ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                >
                  <option className="dark:bg-slate-800 dark:text-white" value="">{t('Select department')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="IT">{t('IT')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="HR">{t('HR')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Finance">{t('Finance')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Operations">{t('Operations')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Security">{t('Security')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Maintenance">{t('Maintenance')}</option>
                </select>
                {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Priority')}
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option className="dark:bg-slate-800 dark:text-white" value="Low">{t('Low')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Medium">{t('Medium')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="High">{t('High')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Critical">{t('Critical')}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Description')} *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder={t('Describe the issue in detail')}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>
            </div>
          </div>

          {/* Status and Assignment */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              {t('Status and Assignment')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Status')}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option className="dark:bg-slate-800 dark:text-white" value="Open">{t('Open')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="In Progress">{t('In Progress')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Resolved">{t('Resolved')}</option>
                  <option className="dark:bg-slate-800 dark:text-white" value="Closed">{t('Closed')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Assigned To')}
                </label>
                <input
                  type="text"
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('Enter assignee name')}
                />
              </div>
            </div>
          </div>

          {/* Reporter Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" />
              {t('Reporter Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Reported By')} *
                </label>
                <input
                  type="text"
                  name="reportedBy"
                  value={formData.reportedBy}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.reportedBy ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
                  }`}
                  placeholder={t('Enter reporter name')}
                />
                {errors.reportedBy && <p className="text-red-500 text-sm mt-1">{errors.reportedBy}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Report Date')}
                </label>
                <input
                  type="date"
                  value={complaint?.reportedDate || new Date().toISOString().split('T')[0]}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Resolution */}
          {(formData.status === 'Resolved' || formData.status === 'Closed') && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {t('Resolution')}
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  {t('Resolution Details')}
                </label>
                <textarea
                  name="resolution"
                  value={formData.resolution}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('Enter resolution details')}
                />
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-slate-700"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t('Saving...')}
                </>
              ) : (
                t('Save Complaint')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintForm;


