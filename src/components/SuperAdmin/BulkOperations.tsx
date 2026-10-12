import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface BulkOperationsProps {
  selectedRegistrations: string[];
  userType: 'buyer' | 'seller' | 'enduser';
  onSuccess: () => void;
  onCancel: () => void;
}

const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedRegistrations,
  userType,
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const [operation, setOperation] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBulkApprove = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await ApiService.bulkApproveUsers(
        selectedRegistrations,
        userType,
        user.id
      );
      
      setOperation(null);
      onSuccess();
    } catch (err) {
      console.warn('Bulk approval API failed, attempting per-item fallback...', err);
      try {
        await Promise.all(
          selectedRegistrations.map((id) => ApiService.approveUser(id, userType, user.id))
        );
        setOperation(null);
        onSuccess();
      } catch (fallbackErr) {
        setError('Failed to approve users. Please try again.');
        console.error('Bulk approval fallback error:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (!user || !reason.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await ApiService.bulkRejectUsers(
        selectedRegistrations,
        userType,
        user.id,
        reason.trim()
      );
      
      setOperation(null);
      setReason('');
      onSuccess();
    } catch (err) {
      console.warn('Bulk rejection API failed, attempting per-item fallback...', err);
      try {
        await Promise.all(
          selectedRegistrations.map((id) => ApiService.rejectUser(id, userType, user.id, reason.trim()))
        );
        setOperation(null);
        setReason('');
        onSuccess();
      } catch (fallbackErr) {
        setError('Failed to reject users. Please try again.');
        console.error('Bulk rejection fallback error:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeLabel = () => {
    switch (userType) {
      case 'buyer': return 'Buyers';
      case 'seller': return 'Sellers';
      case 'enduser': return 'End Users';
      default: return 'Users';
    }
  };

  if (operation === null) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Bulk Operations
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              {selectedRegistrations.length} {getUserTypeLabel()} selected
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setOperation('approve')}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Check size={16} />
                <span>Approve All</span>
              </button>
              <button
                onClick={() => setOperation('reject')}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <X size={16} />
                <span>Reject All</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (operation === 'approve') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Bulk Approval
            </h3>
            <button
              onClick={() => setOperation(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="text-green-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Approve {selectedRegistrations.length} {getUserTypeLabel()}</p>
                <p className="text-sm text-gray-600">This will create user accounts and approve their registrations</p>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={handleBulkApprove}
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                <span>{loading ? 'Processing...' : 'Confirm Approval'}</span>
              </button>
              <button
                onClick={() => setOperation(null)}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (operation === 'reject') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm Bulk Rejection
            </h3>
            <button
              onClick={() => setOperation(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-red-100 p-2 rounded-full">
                <X className="text-red-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Reject {selectedRegistrations.length} {getUserTypeLabel()}</p>
                <p className="text-sm text-gray-600">This will reject their registrations and require a reason</p>
              </div>
            </div>
            
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                required
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={handleBulkReject}
                disabled={loading || !reason.trim()}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <X size={16} />
                )}
                <span>{loading ? 'Processing...' : 'Confirm Rejection'}</span>
              </button>
              <button
                onClick={() => setOperation(null)}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default BulkOperations;
