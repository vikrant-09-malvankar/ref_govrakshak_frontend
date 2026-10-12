import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Package, 
  Calendar, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  MapPin,
  IndianRupee,
  Truck,
  Settings,
  Users,
  Building2,
  BarChart3,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  Award,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Plus,
  QrCode,
  Wrench,
  LifeBuoy
} from 'lucide-react';
import { Asset, PurchaseOrder } from '../../types';
import { themedAlert } from '../../utils/themedDialogs';

interface AssetLifecycleModalProps {
  onClose: () => void;
  assets: Asset[];
  purchaseOrders: PurchaseOrder[];
}

interface AssetLifecycleEvent {
  id: string;
  assetId: string;
  eventType: 'procurement' | 'delivery' | 'installation' | 'warranty_claim' | 'maintenance' | 'repair' | 'disposal';
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'in_progress' | 'scheduled' | 'cancelled';
  assignedTo?: string;
  cost?: number;
  notes?: string;
}

const AssetLifecycleModal: React.FC<AssetLifecycleModalProps> = ({
  onClose,
  assets,
  purchaseOrders
}) => {
  const { t } = useTranslation();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'analytics'>('list');

  const [lifecycleEvents] = useState<AssetLifecycleEvent[]>([]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'procurement':
        return <FileText size={16} />;
      case 'delivery':
        return <Truck size={16} />;
      case 'installation':
        return <Settings size={16} />;
      case 'warranty_claim':
        return <Shield size={16} />;
      case 'maintenance':
        return <Wrench size={16} />;
      case 'repair':
        return <LifeBuoy size={16} />;
      case 'disposal':
        return <Trash2 size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'procurement':
        return 'text-blue-600 bg-blue-100';
      case 'delivery':
        return 'text-green-600 bg-green-100';
      case 'installation':
        return 'text-purple-600 bg-purple-100';
      case 'warranty_claim':
        return 'text-orange-600 bg-orange-100';
      case 'maintenance':
        return 'text-yellow-600 bg-yellow-100';
      case 'repair':
        return 'text-red-600 bg-red-100';
      case 'disposal':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssetStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Under Repair':
        return 'bg-orange-100 text-orange-800';
      case 'Disposed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isWarrantyExpiring = (asset: Asset) => {
    const warrantyDate = new Date(asset.warrantyExpiry);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const isAmcExpiring = (asset: Asset) => {
    const amcDate = new Date(asset.amcExpiry);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((amcDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const filteredAssets = assets.filter(asset => {
    const statusMatch = filterStatus === 'all' || asset.status === filterStatus;
    const categoryMatch = filterCategory === 'all' || asset.category === filterCategory;
    const departmentMatch = filterDepartment === 'all' || asset.department === filterDepartment;
    return statusMatch && categoryMatch && departmentMatch;
  });

  const categories = [...new Set(assets.map(asset => asset.category))];
  const departments = [...new Set(assets.map(asset => asset.department))];

  const getAssetLifecycleEvents = (assetId: string) => {
    return lifecycleEvents.filter(event => event.assetId === assetId);
  };

  const getAssetPurchaseOrder = (asset: Asset) => {
    return purchaseOrders.find(po => po.id === asset.purchaseOrderId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Asset Status</h2>
              <p className="text-gray-600">Track assets from procurement to disposal</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => void themedAlert('Export asset lifecycle report coming soon!', 'Coming Soon')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download size={16} />
                Export Report
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* View Mode Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-3 font-medium transition-colors ${
                viewMode === 'list'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Package size={16} className="inline mr-2" />
              Asset List
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-6 py-3 font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={16} className="inline mr-2" />
              Status timeline
            </button>
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-6 py-3 font-medium transition-colors ${
                viewMode === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={16} className="inline mr-2" />
              Analytics
            </button>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col lg:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Under Repair">Under Repair</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Department</label>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  {departments.map(department => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Asset List View */}
          {viewMode === 'list' && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Asset status overview</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">AMC</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center">
                            <Package size={48} className="mb-4" />
                            <div className="text-lg font-medium">No assets found</div>
                            <div className="text-gray-500">Try adjusting your filters.</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-blue-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{asset.name}</div>
                                <div className="text-sm text-gray-500">{asset.serialNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{asset.category}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{asset.department}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAssetStatusColor(asset.status)}`}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(asset.warrantyExpiry).toLocaleDateString()}
                            </div>
                            {isWarrantyExpiring(asset) && (
                              <div className="text-xs text-orange-600 font-medium">⚠️ Expiring soon</div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(asset.amcExpiry).toLocaleDateString()}
                            </div>
                            {isAmcExpiring(asset) && (
                              <div className="text-xs text-orange-600 font-medium">⚠️ Expiring soon</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            ₹{asset.value.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedAsset(asset)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View status"
                              >
                                <Eye size={16} />
                              </button>
                              <button className="text-green-600 hover:text-green-900" title="Edit Asset">
                                <Edit size={16} />
                              </button>
                              <button className="text-purple-600 hover:text-purple-900" title="QR Code">
                                <QrCode size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Status timeline view */}
          {viewMode === 'timeline' && (
            <div className="space-y-6">
              {filteredAssets.map((asset) => {
                const events = getAssetLifecycleEvents(asset.id);
                const purchaseOrder = getAssetPurchaseOrder(asset);
                
                return (
                  <div key={asset.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
                        <p className="text-sm text-gray-600">{asset.serialNumber} • {asset.category}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAssetStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                      <div className="space-y-4">
                        {events.map((event, index) => (
                          <div key={event.id} className="flex items-start gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventColor(event.eventType)}`}>
                              {getEventIcon(event.eventType)}
                            </div>
                            <div className="flex-1 bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">{event.title}</h4>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                                  {event.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                                {event.cost && (
                                  <span className="font-medium">₹{event.cost.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Analytics View */}
          {viewMode === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Status Distribution</h3>
                <div className="space-y-3">
                  {['Active', 'Under Repair', 'Disposed'].map(status => {
                    const count = assets.filter(asset => asset.status === status).length;
                    const percentage = (count / assets.length) * 100;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{status}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Distribution</h3>
                <div className="space-y-3">
                  {categories.map(category => {
                    const count = assets.filter(asset => asset.category === category).length;
                    const percentage = (count / assets.length) * 100;
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Asset Value</h3>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  ₹{(assets.reduce((sum, asset) => sum + asset.value, 0) / 100000).toFixed(1)}L
                </div>
                <div className="text-sm text-gray-600 mb-4">Total value of all assets</div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Warranty Expiring:</span>
                    <span className="font-medium text-orange-600">
                      {assets.filter(asset => isWarrantyExpiring(asset)).length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">AMC Expiring:</span>
                    <span className="font-medium text-orange-600">
                      {assets.filter(asset => isAmcExpiring(asset)).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Asset Details Modal */}
        {selectedAsset && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-900">{selectedAsset.name} — Status details</h3>
                  <button
                    onClick={() => setSelectedAsset(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Asset Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Asset Information</h4>
                    <div className="space-y-2">
                      <p><strong>Serial Number:</strong> {selectedAsset.serialNumber}</p>
                      <p><strong>Category:</strong> {selectedAsset.category}</p>
                      <p><strong>Department:</strong> {selectedAsset.department}</p>
                      <p><strong>Location:</strong> {selectedAsset.location}</p>
                      <p><strong>Value:</strong> ₹{selectedAsset.value.toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Warranty & AMC</h4>
                    <div className="space-y-2">
                      <p><strong>Warranty Expiry:</strong> {new Date(selectedAsset.warrantyExpiry).toLocaleDateString()}</p>
                      <p><strong>AMC Expiry:</strong> {new Date(selectedAsset.amcExpiry).toLocaleDateString()}</p>
                      <p><strong>Purchase Date:</strong> {new Date(selectedAsset.purchaseDate).toLocaleDateString()}</p>
                      <p><strong>Supplier:</strong> {selectedAsset.supplier}</p>
                    </div>
                  </div>
                </div>

                {/* Status events */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Status events</h4>
                  <div className="space-y-3">
                    {getAssetLifecycleEvents(selectedAsset.id).map((event) => (
                      <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getEventColor(event.eventType)}`}>
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h5 className="font-medium text-gray-900">{event.title}</h5>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                              {event.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            {event.cost && (
                              <span className="font-medium">₹{event.cost.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetLifecycleModal; 