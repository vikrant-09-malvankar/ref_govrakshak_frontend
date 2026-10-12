/**
 * EndUserDashboard — modernized with shared UI system.
 * Uses PageHeader, StatCard, SectionCard, Modal for consistent layout.
 * All device management and verification logic preserved.
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { ApiService } from '../../services/apiService';
import {
  Laptop, Printer, Monitor, Smartphone,
  CheckCircle, AlertTriangle, Clock, FileText, Video, Plus, Eye, Package,
} from 'lucide-react';
import { AllocatedDevice } from '../../types';
import DeviceVerification from './DeviceVerification';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StatCard, SectionCard } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

// ── Pure helpers ──────────────────────────────────────────────────────────────

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'Laptop':   return <Laptop   className="w-5 h-5" />;
    case 'Desktop':  return <Monitor  className="w-5 h-5" />;
    case 'Printer':  return <Printer  className="w-5 h-5" />;
    case 'Scanner':  return <FileText className="w-5 h-5" />;
    case 'Webcam':   return <Video    className="w-5 h-5" />;
    default:         return <Smartphone className="w-5 h-5" />;
  }
}

function formatLocation(loc: unknown): string {
  if (!loc) return 'N/A';
  if (typeof loc === 'string') return loc;
  if (typeof loc === 'object') {
    const l = loc as { building?: string; floor?: string; room?: string; desk?: string };
    const parts = [l.building, l.floor, l.room, l.desk].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  }
  return String(loc);
}

// ── Component ─────────────────────────────────────────────────────────────────

const EndUserDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const [allocatedDevices, setAllocatedDevices]               = useState<AllocatedDevice[]>([]);
  const [loading, setLoading]                                  = useState(true);
  const [error, setError]                                      = useState<string | null>(null);
  const [successMessage, setSuccessMessage]                    = useState<string | null>(null);

  // Device verification
  const [showDeviceVerification, setShowDeviceVerification]   = useState(false);
  const [selectedDevice, setSelectedDevice]                   = useState<AllocatedDevice | null>(null);

  // Device details modal
  const [showDeviceDetails, setShowDeviceDetails]             = useState(false);
  const [selectedDeviceForDetails, setSelectedDeviceForDetails] = useState<AllocatedDevice | null>(null);

  // Add device
  const [showAddDeviceModal, setShowAddDeviceModal]           = useState(false);
  const [newDeviceSerial, setNewDeviceSerial]                 = useState('');
  const [addingDevice, setAddingDevice]                       = useState(false);

  const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

  // ── Data ───────────────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const devices = await ApiService.getEndUserDevices();
      setAllocatedDevices(devices);
    } catch (err) {
      setError('Failed to load data. Please try again.');
      setAllocatedDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDeviceVerification = (device: AllocatedDevice) => {
    setSelectedDevice(device);
    setShowDeviceVerification(true);
  };

  const handleVerificationComplete = async (_deviceId: string, _status: 'Completed' | 'Failed') => {
    await loadData();
    setShowDeviceVerification(false);
    setSelectedDevice(null);
    setSuccessMessage('Device verified successfully with secure geotag evidence.');
  };

  const handleAddDeviceSubmit = async () => {
    if (!newDeviceSerial.trim()) return;
    try {
      setAddingDevice(true);
      setError(null);
      await ApiService.addDeviceBySerialNumber(newDeviceSerial.trim());
      setNewDeviceSerial('');
      setShowAddDeviceModal(false);
      setSuccessMessage('Device added successfully. Status is now Pending Verification.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add device');
    } finally {
      setAddingDevice(false);
    }
  };

  // ── View mode ──────────────────────────────────────────────────────────────

  const currentSection = location.pathname === '/enduser/devices' ? 'devices' : 'dashboard';

  // ── Derived stats ──────────────────────────────────────────────────────────

  const verifiedCount = allocatedDevices.filter(d => d.verificationStatus === 'Completed').length;
  const pendingCount  = allocatedDevices.filter(d => d.verificationStatus === 'Pending').length;

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title={currentSection === 'devices' ? 'My Devices' : `Welcome, ${user?.name || 'User'}`}
        subtitle={currentSection === 'devices'
          ? 'View and manage all your allocated devices'
          : 'Manage your allocated devices and verify receipts'}
        icon={<Monitor className="w-5 h-5 text-primary-600" />}
        actions={currentSection === 'devices' ? (
          <Button variant="primary" size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setShowAddDeviceModal(true)}>
            Add Device
          </Button>
        ) : undefined}
      />

      {/* Feedback banners */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-success-50 border border-success-200 rounded-card text-success-800 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0 text-success-600" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-success-600 hover:text-success-800 ml-2 text-xs underline">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-50 border border-danger-200 rounded-card text-danger-800 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 text-danger-600" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-danger-600 hover:text-danger-800 ml-2 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* ── DASHBOARD VIEW ───────────────────────────────────────────────── */}
      {currentSection === 'dashboard' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Devices"
              value={loading ? '—' : allocatedDevices.length}
              icon={<Laptop className="w-5 h-5 text-primary-600" />}
              iconBg="bg-primary-100"
            />
            <StatCard
              title="Verified"
              value={loading ? '—' : verifiedCount}
              icon={<CheckCircle className="w-5 h-5 text-success-600" />}
              iconBg="bg-success-100"
            />
            <StatCard
              title="Pending Verification"
              value={loading ? '—' : pendingCount}
              icon={<Clock className="w-5 h-5 text-warning-600" />}
              iconBg="bg-warning-100"
            />
          </div>

          {/* Recent Devices */}
          <SectionCard title="Recent Device Allocations" subtitle="Your latest allocated devices">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                <span className="text-sm">Loading devices…</span>
              </div>
            ) : allocatedDevices.length === 0 ? (
              <EmptyState
                icon={<Package className="w-10 h-10 text-gray-300" />}
                title="No devices allocated"
                description="You don't have any allocated devices yet."
              />
            ) : (
              <div className="space-y-2">
                {allocatedDevices.slice(0, 3).map(device => (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-surface-subtle dark:bg-slate-700 rounded-card">
                    <div className="p-2 bg-white dark:bg-slate-600 rounded-lg border border-surface-border dark:border-slate-600 text-gray-600 dark:text-gray-300 shrink-0">
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{device.deviceName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{device.serialNumber}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={device.status} size="sm" />
                      {device.verificationStatus === 'Pending' && isMobileDevice && (
                        <button onClick={() => handleDeviceVerification(device)} className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 underline font-medium">
                          Verify Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {allocatedDevices.length > 3 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
                    + {allocatedDevices.length - 3} more devices — switch to My Devices view to see all
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        </>
      )}

      {/* ── DEVICES VIEW ─────────────────────────────────────────────────── */}
      {currentSection === 'devices' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
              <span>Loading your devices…</span>
            </div>
          ) : allocatedDevices.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-card border border-surface-border dark:border-slate-700">
              <EmptyState
                icon={<Package className="w-12 h-12 text-gray-300" />}
                title="No devices found"
                description="You don't have any allocated devices yet."
                action={{ label: 'Add Your First Device', onClick: () => setShowAddDeviceModal(true), icon: <Plus className="w-4 h-4" /> }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allocatedDevices.map(device => (
                <div key={device.id} className="bg-white dark:bg-slate-800 rounded-card border border-surface-border dark:border-slate-700 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow space-y-3">
                  {/* Card header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-surface-subtle dark:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-400">
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{device.deviceName}</h3>
                    </div>
                    <button onClick={() => { setSelectedDeviceForDetails(device); setShowDeviceDetails(true); }} className="p-1 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 rounded" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Details */}
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><span className="font-medium text-gray-700 dark:text-gray-300">Serial:</span> {device.serialNumber}</p>
                    <p><span className="font-medium text-gray-700 dark:text-gray-300">Model:</span> {device.model}</p>
                    <p><span className="font-medium text-gray-700 dark:text-gray-300">Allocated:</span> {device.allocationDate}</p>
                    <p><span className="font-medium text-gray-700 dark:text-gray-300">Location:</span> {formatLocation(device.location)}</p>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={device.status} size="sm" />
                    <StatusBadge status={device.verificationStatus} size="sm" />
                  </div>

                  {/* Verification CTA */}
                  {device.verificationStatus === 'Pending' && isMobileDevice && (
                    <Button variant="primary" size="sm" className="w-full justify-center" onClick={() => handleDeviceVerification(device)}>
                      Verify Device
                    </Button>
                  )}
                  {device.verificationStatus === 'Pending' && !isMobileDevice && (
                    <p className="text-xs text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 rounded-card px-3 py-2">
                      Pending verification — log in from a mobile device to complete verification.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MODAL: Device Verification ────────────────────────────────────── */}
      {showDeviceVerification && selectedDevice && (
        <DeviceVerification
          device={selectedDevice}
          onVerificationComplete={handleVerificationComplete}
          onClose={() => setShowDeviceVerification(false)}
        />
      )}

      {/* ── MODAL: Device Details ─────────────────────────────────────────── */}
      <Modal
        isOpen={showDeviceDetails && !!selectedDeviceForDetails}
        onClose={() => { setShowDeviceDetails(false); setSelectedDeviceForDetails(null); }}
        title="Device Details"
        size="lg"
      >
       {selectedDeviceForDetails && (
  <div className="space-y-6">
<section className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-primary-600 rounded-full" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Basic Information
        </h4>
      </div>

      <div className="rounded-card border border-surface-border dark:border-slate-700 overflow-hidden">
        <div className="divide-y divide-surface-border dark:divide-slate-700">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Device Name
            </span>
            <span className="sm:col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {selectedDeviceForDetails.deviceName || '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Serial Number
            </span>
            <span className="sm:col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {selectedDeviceForDetails.serialNumber || '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Model
            </span>
            <span className="sm:col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {selectedDeviceForDetails.model || '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Manufacturer
            </span>
            <span className="sm:col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {selectedDeviceForDetails.manufacturer || '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Device Type
            </span>
            <span className="sm:col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {selectedDeviceForDetails.deviceType || '—'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Allocation Date
            </span>
            <span className="sm:col-span-2 text-sm text-gray-900 dark:text-gray-100">
              {selectedDeviceForDetails.allocationDate || '—'}
            </span>
          </div>
        </div>
      </div>
    </section>
<section className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-primary-600 rounded-full" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Status Information
        </h4>
      </div>

      <div className="rounded-card border border-surface-border dark:border-slate-700 overflow-hidden">
        <div className="divide-y divide-surface-border dark:divide-slate-700">

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Status
            </span>

            <StatusBadge
              status={selectedDeviceForDetails.status}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Verification
            </span>

            <StatusBadge
              status={selectedDeviceForDetails.verificationStatus}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Acknowledgment
            </span>

            <StatusBadge
              status={selectedDeviceForDetails.acknowledgmentStatus}
              size="sm"
            />
          </div>

        </div>
      </div>
    </section>

  </div>
)}
      </Modal>

      {/* ── MODAL: Add Device ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showAddDeviceModal}
        onClose={() => { setShowAddDeviceModal(false); setNewDeviceSerial(''); }}
        title="Add New Device"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Enter the serial number of the device you received to link it to your account.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device Serial Number</label>
            <input
              type="text"
              value={newDeviceSerial}
              onChange={e => setNewDeviceSerial(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newDeviceSerial.trim()) handleAddDeviceSubmit(); }}
              placeholder="Enter device serial number"
              className="w-full px-3 py-2 border border-surface-border dark:border-slate-600 rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-slate-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-surface-border dark:border-slate-700">
            <Button variant="ghost" onClick={() => { setShowAddDeviceModal(false); setNewDeviceSerial(''); }}>Cancel</Button>
            <Button variant="primary" disabled={!newDeviceSerial.trim() || addingDevice} onClick={handleAddDeviceSubmit}>
              {addingDevice ? 'Adding…' : 'Add Device'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default EndUserDashboard;
