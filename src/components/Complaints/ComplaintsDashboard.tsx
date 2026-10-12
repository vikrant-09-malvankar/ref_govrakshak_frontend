/**
 * ComplaintsDashboard — modernized with shared UI system.
 * Replaces raw modal divs → Modal, raw buttons → Button,
 * inline status chips → StatusBadge / Badge, spinner → Skeleton.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, RefreshCw, Filter } from 'lucide-react';
import { Complaint } from '../../types';
import { ApiService } from '../../services/apiService';
import ComplaintList from './ComplaintList';
import ComplaintForm from './ComplaintForm';
import ComplaintDetails from './ComplaintDetails';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StatusBadge, Badge } from '../ui/Badge';
import { StatCardSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

const STATUS_OPTIONS = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'] as const;

const ComplaintsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [complaints,        setComplaints]        = useState<Complaint[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [showForm,          setShowForm]          = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [editingComplaint,  setEditingComplaint]  = useState<Complaint | null>(null);
  const [statusFilter,      setStatusFilter]      = useState<string>('All');

  const canCreate = user?.role === 'Buyer' || user?.role === 'Super Admin';
  const canEdit   = user?.role === 'Super Admin';

  const loadComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getAllComplaints();
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(ApiService.handleError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadComplaints(); }, [loadComplaints]);

  const handleSubmit = async (complaintData: Complaint) => {
    try {
      if (editingComplaint) {
        await ApiService.updateComplaint(editingComplaint.id, complaintData);
      } else {
        await ApiService.createComplaint(complaintData);
      }
      setShowForm(false);
      setEditingComplaint(null);
      await loadComplaints();
    } catch (err) {
      setError(ApiService.handleError(err));
    }
  };

  const handleEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setSelectedComplaint(null);
    setShowForm(true);
  };

  const filteredComplaints = statusFilter === 'All'
    ? complaints
    : complaints.filter(c => c.status === statusFilter);

  const statusCounts = {
    Open:        complaints.filter(c => c.status === 'Open').length,
    'In Progress': complaints.filter(c => c.status === 'In Progress').length,
    Resolved:    complaints.filter(c => c.status === 'Resolved').length,
    Closed:      complaints.filter(c => c.status === 'Closed').length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Complaints"
        subtitle="Track and manage asset complaints and escalations"
        icon={<AlertTriangle className="w-5 h-5 text-danger-600" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
              disabled={loading}
              onClick={loadComplaints}
            >
              Refresh
            </Button>
            {canCreate && (
              <Button
                variant="danger"
                size="sm"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={() => { setEditingComplaint(null); setShowForm(true); }}
              >
                New Complaint
              </Button>
            )}
          </div>
        }
      />

      {/* Status stat cards — clickable filters */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
              className={[
                'p-4 rounded-card border-2 text-left transition-all focus:outline-none focus:ring-2 focus:ring-danger-500',
                statusFilter === status
                  ? 'border-danger-500 bg-danger-50'
                  : 'border-surface-border bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 mt-0.5">{status}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-card border border-surface-border flex-wrap">
        <Filter className="h-4 w-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-500 shrink-0">Filter:</span>
        {STATUS_OPTIONS.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={[
              'px-3 py-1 text-sm rounded-full transition-colors font-medium',
              statusFilter === status
                ? 'bg-danger-600 text-white'
                : 'text-gray-600 hover:bg-gray-100',
            ].join(' ')}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-danger-100 border border-danger-600/20 rounded-card text-danger-600 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadComplaints} className="ml-2 underline hover:no-underline text-xs">Retry</button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-danger-600" />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-card border border-surface-border">
          <EmptyState
            icon={<AlertTriangle className="w-10 h-10 text-gray-300" />}
            title={statusFilter === 'All' ? 'No complaints found' : `No ${statusFilter} complaints`}
            action={canCreate && statusFilter === 'All' ? {
              label: 'File First Complaint',
              onClick: () => setShowForm(true),
              icon: <Plus className="w-4 h-4" />,
            } : undefined}
          />
        </div>
      ) : (
        <div className="bg-white rounded-card border border-surface-border divide-y divide-surface-border">
          {filteredComplaints.map(complaint => (
            <div
              key={complaint.id}
              className="p-4 hover:bg-surface-subtle cursor-pointer transition-colors"
              onClick={() => setSelectedComplaint(complaint)}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {complaint.assetName || `Asset #${complaint.assetId}`}
                  </h3>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {complaint.department} · Reported by {complaint.reportedBy}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{complaint.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge
                    size="sm"
                    variant={
                      complaint.priority === 'Critical' ? 'danger' :
                      complaint.priority === 'High'     ? 'danger' :
                      complaint.priority === 'Medium'   ? 'warning' : 'success'
                    }
                  >
                    {complaint.priority}
                  </Badge>
                  <StatusBadge status={complaint.status} size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complaint Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingComplaint(null); }}
        title={editingComplaint ? 'Edit Complaint' : 'New Complaint'}
        size="lg"
      >
        <ComplaintForm
          complaint={editingComplaint}
          onClose={() => { setShowForm(false); setEditingComplaint(null); }}
          onSubmit={handleSubmit}
        />
      </Modal>

      {/* Complaint Details Modal */}
      <Modal
        isOpen={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title="Complaint Details"
        size="lg"
      >
        {selectedComplaint && (
          <ComplaintDetails
            complaint={selectedComplaint}
            onClose={() => setSelectedComplaint(null)}
            onEdit={canEdit ? handleEdit : undefined}
            canEdit={canEdit}
          />
        )}
      </Modal>

    </div>
  );
};

export default ComplaintsDashboard;
