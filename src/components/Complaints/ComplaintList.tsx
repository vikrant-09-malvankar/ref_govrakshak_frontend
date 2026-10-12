import React, { useState, useEffect } from 'react';
import { Complaint } from '../../types';
import { ApiService } from '../../services/apiService';

const ComplaintList: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getAllComplaints();
      setComplaints(data);
    } catch (err) {
      setError(ApiService.handleError(err));
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading complaints: {error}</p>
        <button
          onClick={loadComplaints}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No complaints found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {complaints.map((complaint) => (
        <div
          key={complaint.id}
          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">
                {complaint.assetName || `Asset #${complaint.assetId}`}
              </h3>
              <p className="text-sm text-gray-600">
                {complaint.department} • Reported by: {complaint.reportedBy}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {complaint.description}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Reported: {complaint.reportedDate}
              </p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 text-xs rounded-full ${
                complaint.priority === 'High' ? 'bg-red-100 text-red-800' :
                complaint.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {complaint.priority}
              </span>
              <span className={`block mt-1 px-2 py-1 text-xs rounded-full ${
                complaint.status === 'Open' ? 'bg-blue-100 text-blue-800' :
                complaint.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                complaint.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {complaint.status}
              </span>
            </div>
          </div>
          {complaint.assignedTo && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Assigned to: <span className="font-medium">{complaint.assignedTo}</span>
              </p>
            </div>
          )}
          {complaint.resolution && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Resolution:</span> {complaint.resolution}
              </p>
              {complaint.resolvedDate && (
                <p className="text-xs text-gray-400 mt-1">
                  Resolved: {complaint.resolvedDate}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ComplaintList;