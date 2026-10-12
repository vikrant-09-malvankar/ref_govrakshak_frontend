import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  X, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Send,
  FileText,
  Phone,
  Mail,
  User,
  Calendar,
  MapPin,
  Building2,
  Package,
  Truck,
  Shield,
  Settings,
  Plus,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Star,
  Award,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { themedAlert } from '../../utils/themedDialogs';

interface EscalationModalProps {
  onClose: () => void;
  purchaseOrders: PurchaseOrder[];
}

interface Escalation {
  id: string;
  title: string;
  description: string;
  type: 'delivery_delay' | 'quality_issue' | 'payment_dispute' | 'technical_support' | 'contract_issue' | 'other';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  vendorName?: string;
  reportedBy: string;
  reportedDate: string;
  assignedTo?: string;
  assignedDate?: string;
  resolution?: string;
  resolvedDate?: string;
  attachments?: string[];
  notes?: Array<{ date: string; user: string; note: string }>;
}

const EscalationModal: React.FC<EscalationModalProps> = ({
  onClose,
  purchaseOrders
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const [escalations, setEscalations] = useState<Escalation[]>([]);

  const [newEscalation, setNewEscalation] = useState<Partial<Escalation>>({
    title: '',
    description: '',
    type: 'delivery_delay',
    priority: 'Medium',
    purchaseOrderId: '',
    vendorName: '',
    description: ''
  });

  const escalationTypes = [
    { value: 'delivery_delay', label: 'Delivery Delay', icon: Truck },
    { value: 'quality_issue', label: 'Quality Issue', icon: Package },
    { value: 'payment_dispute', label: 'Payment Dispute', icon: Shield },
    { value: 'technical_support', label: 'Technical Support', icon: Settings },
    { value: 'contract_issue', label: 'Contract Issue', icon: FileText },
    { value: 'other', label: 'Other', icon: AlertTriangle }
  ];

  const priorities = ['Low', 'Medium', 'High', 'Critical'];

  const getTypeIcon = (type: string) => {
    const typeConfig = escalationTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : AlertTriangle;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800';
      case 'High':
        return isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-800';
      case 'Medium':
        return isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800';
      default:
        return isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800';
      case 'In Progress':
        return isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800';
      case 'Resolved':
        return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800';
      case 'Closed':
        return isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-800';
      default:
        return isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open':
        return <AlertTriangle size={16} />;
      case 'In Progress':
        return <Clock size={16} />;
      case 'Resolved':
        return <CheckCircle size={16} />;
      case 'Closed':
        return <XCircle size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  const filteredEscalations = escalations.filter(escalation => {
    const statusMatch = filterStatus === 'all' || escalation.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || escalation.priority === filterPriority;
    const typeMatch = filterType === 'all' || escalation.type === filterType;
    return statusMatch && priorityMatch && typeMatch;
  });

  const handleCreateEscalation = async () => {
    if (!newEscalation.title || !newEscalation.description) {
      await themedAlert('Please fill in all required fields', 'Validation');
      return;
    }

    const escalation: Escalation = {
      id: `ESC${Date.now()}`,
      title: newEscalation.title!,
      description: newEscalation.description!,
      type: newEscalation.type!,
      priority: newEscalation.priority!,
      status: 'Open',
      purchaseOrderId: newEscalation.purchaseOrderId,
      purchaseOrderNumber: purchaseOrders.find(po => po.id === newEscalation.purchaseOrderId)?.poNumber,
      vendorName: newEscalation.vendorName,
      reportedBy: user?.name || 'Unknown',
      reportedDate: new Date().toISOString(),
      notes: [
        { date: new Date().toISOString(), user: user?.name || 'Unknown', note: 'Escalation created' }
      ]
    };

    setEscalations([escalation, ...escalations]);
    setNewEscalation({
      title: '',
      description: '',
      type: 'delivery_delay',
      priority: 'Medium',
      purchaseOrderId: '',
      vendorName: ''
    });
    setActiveTab('list');
  };

  const updateEscalationStatus = (escalationId: string, newStatus: Escalation['status']) => {
    setEscalations(prev => prev.map(esc => 
      esc.id === escalationId 
        ? { 
            ...esc, 
            status: newStatus,
            resolvedDate: newStatus === 'Resolved' ? new Date().toISOString() : esc.resolvedDate,
            notes: [
              ...esc.notes || [],
              { 
                date: new Date().toISOString(), 
                user: user?.name || 'Unknown', 
                note: `Status updated to ${newStatus}` 
              }
            ]
          }
        : esc
    ));
  };

  const addNote = (escalationId: string, note: string) => {
    if (!note.trim()) return;
    
    setEscalations(prev => prev.map(esc => 
      esc.id === escalationId 
        ? { 
            ...esc, 
            notes: [
              ...esc.notes || [],
              { 
                date: new Date().toISOString(), 
                user: user?.name || 'Unknown', 
                note: note.trim() 
              }
            ]
          }
        : esc
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className={`sticky top-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Escalation Management</h2>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Raise and track procurement-related issues</p>
            </div>
            <button
              onClick={onClose}
              className={`${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className={`flex ${isDarkMode ? 'border-slate-700' : 'border-gray-200'} border-b mb-6`}>
            <button
              onClick={() => setActiveTab('new')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'new'
                  ? isDarkMode 
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/20' 
                    : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Plus size={16} className="inline mr-2" />
              New Escalation
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'list'
                  ? isDarkMode 
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-900/20' 
                    : 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-slate-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <FileText size={16} className="inline mr-2" />
              All Escalations ({escalations.length})
            </button>
          </div>

          {/* New Escalation Form */}
          {activeTab === 'new' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Escalation Title *
                  </label>
                  <input
                    type="text"
                    value={newEscalation.title || ''}
                    onChange={(e) => setNewEscalation({ ...newEscalation, title: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-white border-gray-300 text-gray-900'}`}
                    placeholder="Enter escalation title"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    GEM Order
                  </label>
                  <select
                    value={newEscalation.purchaseOrderId || ''}
                    onChange={(e) => {
                      const po = purchaseOrders.find(p => p.id === e.target.value);
                      const sellerName = po?.supplier || (po as any)?.sellerName || (po as any)?.seller_name || '';
                      setNewEscalation({ 
                        ...newEscalation, 
                        purchaseOrderId: e.target.value,
                        vendorName: sellerName
                      });
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 text-white border-slate-600 [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="">Select GEM Order</option>
                    {purchaseOrders.map(po => (
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} key={po.id} value={po.id}>
                        {po.poNumber} - {po.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Seller Name
                  </label>
                  <input
                    type="text"
                    value={newEscalation.vendorName || ''}
                    readOnly
                    disabled
                    className={`w-full px-3 py-2 border rounded-lg cursor-not-allowed ${isDarkMode ? 'bg-slate-600 text-gray-400 border-slate-600' : 'bg-gray-50 text-gray-600 border-gray-300'}`}
                    placeholder="Select a GEM Order to auto-populate"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Escalation Type *
                  </label>
                  <select
                    value={newEscalation.type || 'delivery_delay'}
                    onChange={(e) => setNewEscalation({ ...newEscalation, type: e.target.value as any })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 text-white border-slate-600 [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    {escalationTypes.map(type => (
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                    Priority *
                  </label>
                  <select
                    value={newEscalation.priority || 'Medium'}
                    onChange={(e) => setNewEscalation({ ...newEscalation, priority: e.target.value as any })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 text-white border-slate-600 [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    {priorities.map(priority => (
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div>
                <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Description *
                </label>
                <textarea
                  value={newEscalation.description || ''}
                  onChange={(e) => setNewEscalation({ ...newEscalation, description: e.target.value })}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isDarkMode ? 'bg-slate-700 text-white placeholder-gray-400 border-slate-600' : 'bg-white border-gray-300 text-gray-900'}`}
                  placeholder="Provide detailed description of the issue..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setActiveTab('list')}
                  className={`px-4 py-2 border rounded-lg transition-colors font-medium ${isDarkMode ? 'border-slate-600 text-gray-300 hover:bg-slate-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEscalation}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
                >
                  <Send size={16} />
                  Create Escalation
                </button>
              </div>
            </div>
          )}

          {/* Escalations List */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className="flex flex-col lg:flex-row gap-4">
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Filter by Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-600 text-white border-slate-500 [color-scheme:dark]' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="all">All Status</option>
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="Open">Open</option>
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="In Progress">In Progress</option>
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="Resolved">Resolved</option>
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Filter by Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-600 text-white border-slate-500 [color-scheme:dark]' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="all">All Priorities</option>
                      {priorities.map(priority => (
                        <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Filter by Type</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-600 text-white border-slate-500 [color-scheme:dark]' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="all">All Types</option>
                      {escalationTypes.map(type => (
                        <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Escalations Table */}
              <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Escalation</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Type</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Priority</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Status</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>PO Number</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Vendor</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Reported</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} uppercase`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`${isDarkMode ? 'divide-slate-600' : 'divide-gray-200'} divide-y`}>
                      {filteredEscalations.length === 0 ? (
                        <tr>
                          <td colSpan={8} className={`py-12 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            <div className="flex flex-col items-center">
                              <AlertTriangle size={48} className="mb-4 opacity-50" />
                              <div className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>No escalations found</div>
                              <div className={isDarkMode ? 'text-gray-500' : 'text-gray-500'}>Try adjusting your filters or create a new escalation.</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredEscalations.map((escalation) => {
                          const TypeIcon = getTypeIcon(escalation.type);
                          return (
                            <tr key={escalation.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-blue-50'}`}>
                              <td className={`px-6 py-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div>
                                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{escalation.title}</div>
                                  <div className={`text-sm truncate max-w-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {escalation.description}
                                  </div>
                                </div>
                              </td>
                              <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                <div className="flex items-center gap-2">
                                  <TypeIcon size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                                  <span>
                                    {escalationTypes.find(t => t.value === escalation.type)?.label}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(escalation.priority)}`}>
                                  {escalation.priority}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(escalation.status)}`}>
                                  {getStatusIcon(escalation.status)}
                                  {escalation.status}
                                </span>
                              </td>
                              <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                {escalation.purchaseOrderNumber || '-'}
                              </td>
                              <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                                {escalation.vendorName || '-'}
                              </td>
                              <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {new Date(escalation.reportedDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedEscalation(escalation)}
                                    className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}`}
                                    title="View Details"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button className={`${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'}`} title="Contact">
                                    <Phone size={16} />
                                  </button>
                                  <button className={`${isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-900'}`} title="Email">
                                    <Mail size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Escalation Details Modal */}
        {selectedEscalation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto`}>
              <div className={`sticky top-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} border-b px-6 py-4`}>
                <div className="flex justify-between items-center">
                  <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Escalation Details</h3>
                  <button
                    onClick={() => setSelectedEscalation(null)}
                    className={`${isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                {/* Header Info */}
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedEscalation.title}</h4>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{selectedEscalation.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedEscalation.priority)}`}>
                        {selectedEscalation.priority} Priority
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEscalation.status)}`}>
                        {getStatusIcon(selectedEscalation.status)}
                        {selectedEscalation.status}
                      </span>
                    </div>
                    <div className={`text-right ${isDarkMode ? 'text-gray-400' : ''}`}>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reported by {selectedEscalation.reportedBy}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(selectedEscalation.reportedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Update */}
                <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Update Status</h4>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedEscalation.status}
                      onChange={(e) => updateEscalationStatus(selectedEscalation.id, e.target.value as any)}
                      className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-600 text-white border-slate-500 [color-scheme:dark]' : 'border-gray-300 bg-white text-gray-900'}`}
                    >
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="Open">Open</option>
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="In Progress">In Progress</option>
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="Resolved">Resolved</option>
                      <option className={isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-gray-900'} value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className={`${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'} border rounded-lg p-4`}>
                  <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Notes & Updates</h4>
                  <div className="space-y-3 mb-4">
                    {selectedEscalation.notes?.map((note, index) => (
                      <div key={index} className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-600' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{note.user}</span>
                          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {new Date(note.date).toLocaleString()}
                          </span>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{note.note}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Add a note..."
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-600 text-white placeholder-gray-500 border-slate-500' : 'border-gray-300'}`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addNote(selectedEscalation.id, e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addNote(selectedEscalation.id, input.value);
                        input.value = '';
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Note
                    </button>
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

export default EscalationModal; 