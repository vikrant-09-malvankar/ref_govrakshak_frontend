import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, UserCheck } from 'lucide-react';
import { Asset } from '../../types';
import { ApiService } from '../../services/apiService';
import { themedConfirm } from '../../utils/themedDialogs';

interface AssetAssignmentModalProps {
  asset: Asset;
  onClose: () => void;
  onAssignmentUpdate: (updatedAsset: Asset) => void;
}

const AssetAssignmentModal: React.FC<AssetAssignmentModalProps> = ({ 
  asset, 
  onClose, 
  onAssignmentUpdate 
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [asset]);

  const handleUnassignAsset = async () => {
    const confirmed = await themedConfirm(
      'Are you sure you want to unassign this asset from the current end user?',
      'Unassign Asset'
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      setError(null);

      const updatedAsset: Asset = {
        ...asset,
        endUserId: undefined,
        endUserName: undefined,
        endUserDesignation: undefined,
        endUserEmail: undefined,
        allocationDate: undefined
      };

      // Update via API
      await ApiService.updateAsset(asset.id, updatedAsset);
      
      onAssignmentUpdate(updatedAsset);
      onClose();
    } catch (err) {
      setError('Failed to unassign asset. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('Asset Assignment')}</h2>
              <p className="text-gray-600">{asset.name} - {asset.serialNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Current Assignment Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('Current Assignment')}</h3>
            {asset.endUserName ? (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{asset.endUserName}</div>
                    <div className="text-sm text-gray-600">{asset.endUserDesignation}</div>
                    <div className="text-sm text-gray-500">{asset.endUserEmail}</div>
                    {asset.allocationDate && (
                      <div className="text-xs text-gray-400">
                        {t('Assigned on')}: {new Date(asset.allocationDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleUnassignAsset}
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                >
                  {submitting ? t('Unassigning...') : t('Unassign')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-600">{t('Unassigned')}</div>
                  <div className="text-sm text-gray-500">{t('This asset is not currently assigned to any user')}</div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetAssignmentModal;
