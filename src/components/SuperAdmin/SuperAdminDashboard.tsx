/**
 * SuperAdminDashboard — modernized with shared UI system.
 * Uses PageHeader, StatCard, SectionCard, DataTable, Modal for consistent layout.
 * All business logic (suspend/activate/delete/approve, registration updates) preserved.
 */
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users, Building2, Trash2, Plus, Clock, Store, Monitor,
  Shield, Settings, BarChart3, Edit, Eye, UserCheck, UserX,
  Mail, Phone, X, Package, Activity, RefreshCw,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import PendingRegistrations from './PendingRegistrations';
import PendingSellerRegistrations from './PendingSellerRegistrations';
import PendingEndUserRegistrations from './PendingEndUserRegistrations';
import SellerOrdersManagement from './SellerOrdersManagement';
import BuyerEditForm from './BuyerEditForm';
import SellerEditForm from './SellerEditForm';
import EndUserEditForm from './EndUserEditForm';
import AuditLogsViewer from './AuditLogsViewer';
import CustodianManagement from '../Custodian/CustodianManagement';
import { themedConfirm } from '../../utils/themedDialogs';
import { ROLE_PERMISSIONS } from '../../types/auth';
import { ApiService } from '../../services/apiService';
import { validateEmail } from '../../config/security';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StatCard, SectionCard, Card } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { StatCardSkeleton } from '../ui/Skeleton';
import { DataTable } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';

// ─── Module-level pure helpers ────────────────────────────────────────────────

type ViewMode =
  | 'overview' | 'registrations' | 'systemManagement' | 'auditLogs'
  | 'buyerManagement' | 'sellerManagement' | 'endUserManagement'
  | 'custodianManagement' | 'procurement';

type RegistrationsTab = 'all' | 'buyer' | 'seller' | 'enduser';

function getViewModeFromPath(path: string): ViewMode {
  if (path === '/superadmin/system' || path === '/superadmin/settings') return 'systemManagement';
  if (path === '/superadmin/audit') return 'auditLogs';
  if (
    path === '/superadmin/buyer-management' ||
    path === '/superadmin/buyers'
  ) return 'buyerManagement';
  if (
    path === '/superadmin/seller-management' ||
    path === '/superadmin/sellers'
  ) return 'sellerManagement';
  if (
    path === '/superadmin/enduser-management' ||
    path === '/superadmin/endusers'
  ) return 'endUserManagement';
  if (
    path === '/superadmin/custodian-management' ||
    path === '/superadmin/custodians'
  ) return 'custodianManagement';
  if (path === '/superadmin/order-management' || path.startsWith('/superadmin/orders')) {
    return 'procurement';
  }
  if (path === '/superadmin/registrations') return 'registrations';
  return 'overview';
}

function normalizeStatus(status?: string): string {
  if (status == null) return 'active';
  switch (String(status).trim().toLowerCase()) {
    case 'active': case 'approved': case 'approved_user': return 'active';
    case 'suspended': case 'inactive': case 'deactivated': case 'deleted': return 'suspended';
    case 'pending': case 'awaiting approval': return 'pending';
    case 'rejected': case 'declined': return 'rejected';
    default: return 'active';
  }
}

function extractDocumentPaths(docs: any): string[] {
  if (!docs) return [];
  if (Array.isArray(docs)) {
    return docs.map((d) => (typeof d === 'string' ? d : (d?.url || d?.path || d?.name || ''))).filter(Boolean);
  }
  if (typeof docs === 'string') {
    try {
      const parsed = JSON.parse(docs);
      if (Array.isArray(parsed)) return parsed.map((d) => typeof d === 'string' ? d : (d?.url || d?.path || '')).filter(Boolean);
    } catch { /* plain string */ }
    return [docs];
  }
  return [];
}

function buildDocumentUrl(path: string): string {
  if (/^(https?:\/\/|data:|blob:)/i.test(path)) return path;
  const n = path.replace(/\\/g, '/');
  if (n.startsWith('/')) return n;
  if (n.startsWith('uploads/')) return `/${n}`;
  return `/uploads/${n}`;
}

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e5e7eb'/%3E%3Ctext x='50' y='60' font-family='Arial' font-size='40' text-anchor='middle' fill='%236b7280'%3E%3F%3C/text%3E%3C/svg%3E";

// ─── User table column factory ─────────────────────────────────────────────
function makeUserColumns(
  onView: (u: any) => void,
  onEdit: (u: any) => void,
  onSuspend: (u: any) => void,
  onActivate: (u: any) => void,
  onDelete: (u: any) => void,
): ColumnDef<any, any>[] {
  return [
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            <img
              className="h-8 w-8 rounded-full object-cover shrink-0"
              src={u.avatar || DEFAULT_AVATAR}
              alt={u.name}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{u.department || u.name}</p>
              <p className="text-xs text-gray-500 truncate">{u.contact_person_name || u.company_name || u.full_name || u.name}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-sm text-gray-700">
          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="truncate">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => <span className="text-sm text-gray-700">{row.original.department || '—'}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={normalizeStatus(row.original.status)} size="sm" />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const u = row.original;
        const ns = normalizeStatus(u.status);
        return (
          <div className="flex items-center gap-1">
            <button onClick={() => onView(u)} className="p-1 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded" title="View">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={() => onEdit(u)} className="p-1 text-success-600 hover:text-success-800 hover:bg-success-50 rounded" title="Edit">
              <Edit className="w-4 h-4" />
            </button>
            {ns === 'active' && (
              <button onClick={() => onSuspend(u)} className="p-1 text-warning-600 hover:text-warning-800 hover:bg-warning-50 rounded" title="Suspend">
                <UserX className="w-4 h-4" />
              </button>
            )}
            {ns === 'suspended' && (
              <button onClick={() => onActivate(u)} className="p-1 text-success-600 hover:text-success-800 hover:bg-success-50 rounded" title="Activate">
                <UserCheck className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => onDelete(u)} className="p-1 text-danger-600 hover:text-danger-800 hover:bg-danger-50 rounded" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];
}

// ─── SuperAdminCustodianSection ───────────────────────────────────────────────

const SuperAdminCustodianSection: React.FC = () => {
  const [buyers, setBuyers] = useState<Array<{ id: number; organization_name?: string; contact_person_name?: string; email_id?: string }>>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<number | ''>('');
  const [loadingBuyers, setLoadingBuyers] = useState(false);

  useEffect(() => {
    setLoadingBuyers(true);
    ApiService.getBuyerRegistrations()
      .then((data: any) => {
        const rows = Array.isArray(data) ? data : (Array.isArray(data?.rows) ? data.rows : []);
        setBuyers(rows.filter((r: any) => r?.id != null));
      })
      .catch(() => setBuyers([]))
      .finally(() => setLoadingBuyers(false));
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Buyer</label>
        <select
          className="w-full md:w-96 border border-surface-border rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={selectedBuyer === '' ? '' : String(selectedBuyer)}
          onChange={(e) => setSelectedBuyer(e.target.value ? Number(e.target.value) : '')}
          disabled={loadingBuyers}
        >
          <option value="">{loadingBuyers ? 'Loading buyers...' : 'Select a buyer to view/manage custodians'}</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.organization_name || b.contact_person_name || b.email_id || `Buyer #${b.id}`}
              {b.email_id ? ` (${b.email_id})` : ''}
            </option>
          ))}
        </select>
      </Card>
      {selectedBuyer !== '' && (
        <CustodianManagement buyerId={selectedBuyer} title={`Custodians for buyer #${selectedBuyer}`} />
      )}
    </div>
  );
};

// ─── Initial form state constants ─────────────────────────────────────────────

const INITIAL_BUYER = {
  organization_type: 'Central Govt', ministry_department: '', organization_name: '',
  buyer_designation: '', contact_person_name: '', email_id: '', password: '',
  contact_number: '', office_address: { zone: '', city: '', state: '', pin: '', fullAddress: '' },
  gstin: '', payment_mode: 'PFMS', billing_authority_designation: '',
  consignee_name: '', consignee_designation: '',
  authorized_designations: [] as string[], contract_reference_numbers: [] as string[],
};

const INITIAL_SELLER = {
  companyName: '', gemSellerId: '', contactPersonName: '', mobileNumber: '',
  emailId: '', password: '', companyAddress: { street: '', city: '', state: '', pin: '', fullAddress: '' },
  gstin: '', msmeRegistrationNo: '', socialCategory: 'General', genderOfOwner: 'Male',
  natureOfBusiness: 'OEM', brandsDealtWith: [] as string[], productCategories: [] as string[],
};

const INITIAL_ENDUSER = {
  fullName: '', designation: '', departmentOfficeName: '', emailId: '', password: '',
  mobileNumber: '', devicesAssigned: [] as string[], deviceSerialNumbers: [] as string[],
  deliveryConfirmationOTP: false, hardwareSoftwareFunctioning: {
    preInstalledOSPresent: false, batteryChargerCableWorking: false, antivirusMSOfficeActivation: false,
  }, languagePreference: 'English', amcSupportContactDetailsShown: false, issuesReported: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SuperAdminDashboard: React.FC = () => {
  const location = useLocation();

  const [toast, setToast]                                 = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewMode, setViewMode]                           = useState<ViewMode>('overview');

  // User data
  const [allUsers, setAllUsers]                           = useState<any[]>([]);
  const [, setUsers]                                      = useState<any[]>([]);
  const [pendingRegistrations, setPendingRegistrations]   = useState<any[]>([]);
  const [loading, setLoading]                             = useState(false);
  const [userDataError, setUserDataError]                 = useState<string | null>(null);

  // Activity
  const [recentActivity, setRecentActivity]               = useState<any[]>([]);
  const [activityLoading, setActivityLoading]             = useState(false);

  // Search / filter
  const [buyerSearch, setBuyerSearch]                     = useState('');
  const [sellerSearch, setSellerSearch]                   = useState('');
  const [endUserSearch, setEndUserSearch]                 = useState('');
  const [buyerFilter, setBuyerFilter]                     = useState('all');
  const [sellerFilter, setSellerFilter]                   = useState('all');
  const [endUserFilter, setEndUserFilter]                 = useState('all');

  // Modals — view/edit
  const [selectedUser, setSelectedUser]                   = useState<any>(null);
  const [showUserModal, setShowUserModal]                 = useState(false);
  const [showEditUserModal, setShowEditUserModal]         = useState(false);
  const [editingUser, setEditingUser]                     = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword]     = useState(false);
  const [showEditForm, setShowEditForm]                   = useState(false);
  const [isUpdatingUser, setIsUpdatingUser]               = useState(false);

  // Management tabs
  const [registrationsTab, setRegistrationsTab]           = useState<RegistrationsTab>('all');
  const [buyerManagementTab, setBuyerManagementTab]       = useState<'users' | 'registrations'>('users');
  const [sellerManagementTab, setSellerManagementTab]     = useState<'users' | 'registrations'>('users');
  const [endUserManagementTab, setEndUserManagementTab]   = useState<'users' | 'registrations'>('users');

  // Add-user modals
  const [showAddBuyerModal, setShowAddBuyerModal]         = useState(false);
  const [showAddSellerModal, setShowAddSellerModal]       = useState(false);
  const [showAddEndUserModal, setShowAddEndUserModal]     = useState(false);

  // Add-user forms
  const [newBuyer, setNewBuyer]                           = useState({ ...INITIAL_BUYER, office_address: { ...INITIAL_BUYER.office_address } });
  const [newSeller, setNewSeller]                         = useState({ ...INITIAL_SELLER, companyAddress: { ...INITIAL_SELLER.companyAddress } });
  const [newEndUser, setNewEndUser]                       = useState({ ...INITIAL_ENDUSER, hardwareSoftwareFunctioning: { ...INITIAL_ENDUSER.hardwareSoftwareFunctioning } });

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const mode = getViewModeFromPath(location.pathname);
    setViewMode(mode);
    if (mode === 'registrations') setRegistrationsTab('all');
    if (mode === 'buyerManagement') setBuyerManagementTab('users');
    if (mode === 'sellerManagement') setSellerManagementTab('users');
    if (mode === 'endUserManagement') setEndUserManagementTab('users');
  }, [location.pathname]);

  useEffect(() => {
    fetchUsers();
    loadPendingRegistrations();
    loadRecentActivity();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setUserDataError(null);
      const users = await ApiService.getAllUsers();
      setAllUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      setUserDataError(ApiService.handleError(error));
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRegistrations = async () => {
    try {
      const [buyerRegs, sellerRegs, endUserRegs] = await Promise.all([
        ApiService.getPendingBuyerRegistrations(),
        ApiService.getPendingSellerRegistrations(),
        ApiService.getPendingEndUserRegistrations(),
      ]);
      const allPending = [
        ...(buyerRegs as any[]).filter((r: any) => r.status === 'Pending').map((r: any) => ({ ...r, type: 'buyer' })),
        ...(sellerRegs as any[]).filter((r: any) => r.status === 'Pending').map((r: any) => ({ ...r, type: 'seller' })),
        ...(endUserRegs as any[]).filter((r: any) => r.status === 'Pending').map((r: any) => ({ ...r, type: 'enduser' })),
      ];
      setPendingRegistrations(allPending);
    } catch {
      setPendingRegistrations([]);
    }
  };

  const loadRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const activities = await ApiService.getRecentActivity(10);
      setRecentActivity(activities);
    } catch { /* silent */ }
    finally { setActivityLoading(false); }
  };

  // ── User data mapping ──────────────────────────────────────────────────────

  const mapUserData = (user: any) => {
    if (!user) return null;
    let source = user.source;
    if (!source) {
      if (user.user_type === 'buyer'   || user.role === 'Buyer')    source = 'buyer_registrations';
      else if (user.user_type === 'seller' || user.role === 'Seller')   source = 'seller_registrations';
      else if (user.user_type === 'enduser' || user.role === 'End User') source = 'end_user_device_registrations';
      else if (user.user_type === 'approved_user')                       source = 'users';
    }
    const base = { ...user, source: source || 'unknown', status: normalizeStatus(user.status) };
    if (source === 'buyer_registrations' || user.role === 'Buyer') {
      return { ...base, name: user.organization_name || user.name, email: user.email_id || user.email, department: user.ministry_department || user.department, avatar: user.logo_path || user.logo_url || DEFAULT_AVATAR, userType: 'buyer', role: user.role || 'Buyer' };
    }
    if (source === 'seller_registrations' || user.role === 'Seller') {
      return { ...base, name: user.company_name || user.name, email: user.email_id || user.email, department: user.department || 'Company', avatar: user.logo_url || user.logo_path || DEFAULT_AVATAR, userType: 'seller', role: user.role || 'Seller' };
    }
    if (source === 'end_user_device_registrations' || user.role === 'End User') {
      return { ...base, name: user.full_name || user.name, email: user.email_id || user.email, department: user.department_office_name || user.department, avatar: DEFAULT_AVATAR, userType: 'enduser', role: user.role || 'End User' };
    }
    if (source === 'users' || user.user_type === 'approved_user') {
      return { ...base, avatar: DEFAULT_AVATAR, userType: user.role?.toLowerCase() || 'unknown' };
    }
    return base;
  };

  const mappedUsers = (allUsers || []).map(mapUserData).filter(Boolean);

  const dedupeByRoleEmail = (users: any[]) => {
    const priority = (u: any) => (['seller_registrations','buyer_registrations','end_user_device_registrations'].includes(u.source) ? 1 : 2);
    const map = new Map<string, any>();
    for (const u of users) {
      const key = `${u.role || u.userType}:${String(u.email || u.email_id || '').toLowerCase()}`;
      if (!key) continue;
      const existing = map.get(key);
      if (!existing || priority(u) < priority(existing)) map.set(key, u);
    }
    return Array.from(map.values());
  };

  const statusIsExisting = (s?: string) => ['active', 'suspended'].includes(normalizeStatus(s));

  const getBuyerUsers  = () => mappedUsers.filter(u => u.source === 'buyer_registrations'   || (u.source === 'users' && u.role === 'Buyer')    || u.role === 'Buyer');
  const getSellerUsers = () => mappedUsers.filter(u => u.source === 'seller_registrations'  || (u.source === 'users' && u.role === 'Seller')   || u.role === 'Seller');
  const getEndUserUsers= () => mappedUsers.filter(u => u.source === 'end_user_device_registrations' || (u.source === 'users' && u.role === 'End User') || u.role === 'End User');

  const getExistingBuyerUsers  = () => dedupeByRoleEmail(getBuyerUsers().filter(u  => statusIsExisting(u.status)));
  const getExistingSellerUsers = () => dedupeByRoleEmail(getSellerUsers().filter(u => statusIsExisting(u.status)));
  const getExistingEndUserUsers= () => dedupeByRoleEmail(getEndUserUsers().filter(u=> statusIsExisting(u.status)));
  const getExistingAllUsers    = () => dedupeByRoleEmail(mappedUsers.filter(u       => statusIsExisting(u.status)));

  const filteredBuyers   = getExistingBuyerUsers().filter(u =>
    (u.name?.toLowerCase().includes(buyerSearch.toLowerCase())   || u.email?.toLowerCase().includes(buyerSearch.toLowerCase())   || u.department?.toLowerCase().includes(buyerSearch.toLowerCase())) &&
    (buyerFilter   === 'all' || u.department?.includes(buyerFilter)));
  const filteredSellers  = getExistingSellerUsers().filter(u =>
    (u.name?.toLowerCase().includes(sellerSearch.toLowerCase())  || u.email?.toLowerCase().includes(sellerSearch.toLowerCase())  || u.department?.toLowerCase().includes(sellerSearch.toLowerCase())) &&
    (sellerFilter  === 'all' || u.department?.includes(sellerFilter)));
  const filteredEndUsers = getExistingEndUserUsers().filter(u =>
    (u.name?.toLowerCase().includes(endUserSearch.toLowerCase()) || u.email?.toLowerCase().includes(endUserSearch.toLowerCase()) || u.department?.toLowerCase().includes(endUserSearch.toLowerCase())) &&
    (endUserFilter === 'all' || u.department?.includes(endUserFilter)));

  const systemStats = {
    totalUsers:            getExistingAllUsers().length,
    totalBuyers:           getExistingBuyerUsers().length,
    totalSellers:          getExistingSellerUsers().length,
    totalEndUsers:         getExistingEndUserUsers().length,
    pendingRegistrations:  pendingRegistrations.length,
    pendingBuyers:         pendingRegistrations.filter(r => r.type === 'buyer').length,
    pendingSellers:        pendingRegistrations.filter(r => r.type === 'seller').length,
    pendingEndUsers:       pendingRegistrations.filter(r => r.type === 'enduser').length,
    systemHealth: 'Good',
    lastBackup: '2024-01-15 02:00:00',
    uptime: '99.9%',
  };

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleRegistrationUpdate = async (registrationId: string, status: 'Approved' | 'Rejected', notes?: string) => {
    try {
      const registration = pendingRegistrations.find(reg => reg.id === registrationId);
      if (!registration) throw new Error('Registration not found');
      const userType = registration.type === 'buyer' ? 'buyer' : registration.type === 'seller' ? 'seller' : 'enduser';
      const approvedBy = '1';
      if (status === 'Approved') {
        await ApiService.approveUser(registrationId, userType, approvedBy);
        setPendingRegistrations(prev => prev.filter(r => r.id !== registrationId));
        await Promise.all([fetchUsers(), loadPendingRegistrations()]);
      } else {
        await ApiService.rejectUser(registrationId, userType, approvedBy, notes || 'No reason provided');
        setPendingRegistrations(prev => prev.filter(r => r.id !== registrationId));
        await loadPendingRegistrations();
      }
      setToast({ type: 'success', message: `Registration ${status.toLowerCase()} successfully.` });
    } catch (error) {
      setToast({ type: 'error', message: `Failed to ${status.toLowerCase()} registration: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  };

  const handleUserAction = async (user: any, action: string) => {
    setSelectedUser(user);
    switch (action) {
      case 'view': setShowUserModal(true); break;
      case 'edit':
        if (user.role === 'Seller' && user.source === 'users') {
          const email = String(user.email || user.email_id || '').toLowerCase();
          const match = allUsers.filter(u => u?.source === 'seller_registrations').find(u => String(u.email_id || u.email || '').toLowerCase() === email);
          setEditingUser(match || user);
        } else {
          setEditingUser(user);
        }
        setShowEditUserModal(true);
        break;
      case 'approve': handleApproveUser(user); break;
      case 'suspend':
        if (await themedConfirm(`Are you sure you want to suspend ${user.name}?`, 'Suspend User')) handleSuspendUser(user);
        break;
      case 'activate':
        if (await themedConfirm(`Are you sure you want to activate ${user.name}?`, 'Activate User')) handleActivateUser(user);
        break;
      case 'delete':
        if (await themedConfirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`, 'Delete User')) handleDeleteUser(user);
        break;
      default: setShowUserModal(true);
    }
  };

  const handleApproveUser = async (user: any) => {
    try {
      if (user.source === 'users' || normalizeStatus(user.status) === 'active') {
        setToast({ type: 'success', message: 'User is already approved.' }); return;
      }
      const userType = user.source === 'buyer_registrations' ? 'buyer' : user.source === 'seller_registrations' ? 'seller' : 'enduser';
      await ApiService.approveUserStatus(user.id, userType);
      setToast({ type: 'success', message: `${user.name} has been approved successfully!` });
      await fetchUsers();
    } catch {
      setToast({ type: 'error', message: 'Failed to approve user. Please try again.' });
    }
  };

  const resolveUserType = (u: any): 'buyer' | 'seller' | 'enduser' | 'user' => {
    if (u.source === 'users') return 'user';
    if (u.source === 'buyer_registrations' || u.role === 'Buyer') return 'buyer';
    if (u.source === 'seller_registrations' || u.role === 'Seller') return 'seller';
    if (u.source === 'end_user_device_registrations' || u.role === 'End User') return 'enduser';
    return 'user';
  };

  const handleSuspendUser = async (userItem: any) => {
    try {
      setLoading(true);
      const userToSuspend = userItem?.source
        ? allUsers.find(u => String(u.id) === String(userItem.id) && u.source === userItem.source)
        : allUsers.find(u => String(u.id) === String(userItem?.id || userItem));
      if (!userToSuspend) { setToast({ type: 'error', message: 'User not found.' }); return; }
      const userType = resolveUserType(userToSuspend);
      const result: any = await ApiService.updateUserStatus(userToSuspend.id, userType, 'suspended');
      if (result?.success) {
        setAllUsers(prev => prev.map(u => (String(u.id) === String(userToSuspend.id) && u.source === userToSuspend.source) ? { ...u, status: 'suspended' } : u));
        setToast({ type: 'success', message: 'User suspended successfully!' });
        await fetchUsers();
      } else {
        setToast({ type: 'error', message: result?.error || 'Failed to suspend user.' });
      }
    } catch { setToast({ type: 'error', message: 'Failed to suspend user.' }); }
    finally { setLoading(false); }
  };

  const handleActivateUser = async (userItem: any) => {
    try {
      setLoading(true);
      const userToActivate = userItem?.source
        ? allUsers.find(u => String(u.id) === String(userItem.id) && u.source === userItem.source)
        : allUsers.find(u => String(u.id) === String(userItem?.id || userItem));
      if (!userToActivate) { setToast({ type: 'error', message: 'User not found.' }); return; }
      const userType = resolveUserType(userToActivate);
      const result: any = await ApiService.updateUserStatus(userToActivate.id, userType, 'active');
      if (result?.success) {
        setAllUsers(prev => prev.map(u => (String(u.id) === String(userToActivate.id) && u.source === userToActivate.source) ? { ...u, status: 'active' } : u));
        setToast({ type: 'success', message: 'User activated successfully!' });
        await fetchUsers();
      } else {
        setToast({ type: 'error', message: result?.error || 'Failed to activate user.' });
      }
    } catch { setToast({ type: 'error', message: 'Failed to activate user.' }); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (userItem: any) => {
    try {
      setLoading(true);
      const userToDelete = userItem?.source
        ? allUsers.find(u => String(u.id) === String(userItem.id) && u.source === userItem.source)
        : allUsers.find(u => String(u.id) === String(userItem?.id || userItem));
      if (!userToDelete) { setToast({ type: 'error', message: 'User not found.' }); return; }
      let result: any;
      if (userToDelete.source === 'users') result = await ApiService.deleteApprovedUser(String(userToDelete.id));
      else if (userToDelete.source === 'buyer_registrations'  || userToDelete.role === 'Buyer')    result = await ApiService.deleteBuyer(String(userToDelete.id));
      else if (userToDelete.source === 'seller_registrations' || userToDelete.role === 'Seller')   result = await ApiService.deleteSeller(String(userToDelete.id));
      else if (userToDelete.source === 'end_user_device_registrations' || userToDelete.role === 'End User') result = await ApiService.deleteEndUser(String(userToDelete.id));
      else { setToast({ type: 'error', message: 'Unknown user type.' }); return; }
      if (result?.success) {
        setAllUsers(prev => prev.filter(u => !(String(u.id) === String(userToDelete.id) && u.source === userToDelete.source)));
        setToast({ type: 'success', message: 'User deleted successfully!' });
        setShowUserModal(false); setSelectedUser(null);
        await fetchUsers();
      } else { setToast({ type: 'error', message: result?.error || 'Failed to delete user.' }); }
    } catch { setToast({ type: 'error', message: 'Failed to delete user.' }); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (userId: string, userType: 'buyer' | 'seller' | 'enduser') => {
    try {
      setIsResettingPassword(true);
      const response: any = await ApiService.resetUserPassword(userId, userType);
      if (response.success) setToast({ type: 'success', message: `Password reset successfully! Sent to ${response.userEmail}.` });
      else setToast({ type: 'error', message: response.error || 'Failed to reset password.' });
    } catch { setToast({ type: 'error', message: 'Failed to reset password.' }); }
    finally { setIsResettingPassword(false); }
  };

  const handleUpdateUser = async (updatedData: any) => {
    setIsUpdatingUser(true);
    try {
      let result: any;
      if (editingUser.source === 'buyer_registrations' || editingUser.role === 'Buyer') result = await ApiService.updateBuyer(editingUser.id, updatedData);
      else if (editingUser.source === 'seller_registrations' || editingUser.role === 'Seller') result = await ApiService.updateSeller(editingUser.id, updatedData);
      else if (editingUser.source === 'end_user_device_registrations' || editingUser.role === 'End User') result = await ApiService.updateEndUser(editingUser.id, updatedData);
      if (result.success) {
        setToast({ type: 'success', message: 'User information updated successfully' });
        setShowEditForm(false); setShowEditUserModal(false); setEditingUser(null);
        await fetchUsers();
      } else { setToast({ type: 'error', message: result.error || 'Failed to update user information' }); }
    } catch { setToast({ type: 'error', message: 'Failed to update user information' }); }
    finally { setIsUpdatingUser(false); }
  };

  const handleAddBuyer = () => {
    if (!newBuyer.organization_name || !newBuyer.email_id || !newBuyer.ministry_department || !newBuyer.buyer_designation) {
      setToast({ type: 'error', message: 'Please fill all required fields.' }); return;
    }
    if (!validateEmail(newBuyer.email_id)) { setToast({ type: 'error', message: 'Invalid email format.' }); return; }
    setUsers(prev => [...prev, { id: `USR${Date.now()}`, name: newBuyer.contact_person_name, email: newBuyer.email_id, password: newBuyer.password || 'TempPassword123!', role: 'Buyer' as const, department: newBuyer.ministry_department, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newBuyer.contact_person_name)}&background=blue&color=fff`, permissions: ROLE_PERMISSIONS['Buyer'] }]);
    setToast({ type: 'success', message: 'Buyer added successfully!' });
    setShowAddBuyerModal(false);
    setNewBuyer({ ...INITIAL_BUYER, office_address: { ...INITIAL_BUYER.office_address } });
  };

  const handleAddSeller = () => {
    if (!newSeller.companyName || !newSeller.emailId || !newSeller.gemSellerId || !newSeller.gstin) {
      setToast({ type: 'error', message: 'Please fill all required fields.' }); return;
    }
    if (!validateEmail(newSeller.emailId)) { setToast({ type: 'error', message: 'Invalid email format.' }); return; }
    setUsers(prev => [...prev, { id: `USR${Date.now()}`, name: newSeller.contactPersonName, email: newSeller.emailId, password: newSeller.password || 'TempPassword123!', role: 'Seller' as const, department: newSeller.companyName, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newSeller.contactPersonName)}&background=green&color=fff`, permissions: ROLE_PERMISSIONS['Seller'] }]);
    setToast({ type: 'success', message: 'Seller added successfully!' });
    setShowAddSellerModal(false);
    setNewSeller({ ...INITIAL_SELLER, companyAddress: { ...INITIAL_SELLER.companyAddress } });
  };

  const handleAddEndUser = () => {
    if (!newEndUser.fullName || !newEndUser.emailId || !newEndUser.designation || !newEndUser.departmentOfficeName) {
      setToast({ type: 'error', message: 'Please fill all required fields.' }); return;
    }
    if (!validateEmail(newEndUser.emailId)) { setToast({ type: 'error', message: 'Invalid email format.' }); return; }
    setUsers(prev => [...prev, { id: `USR${Date.now()}`, name: newEndUser.fullName, email: newEndUser.emailId, password: newEndUser.password || 'TempPassword123!', role: 'End User' as const, department: newEndUser.departmentOfficeName, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newEndUser.fullName)}&background=purple&color=fff`, permissions: ROLE_PERMISSIONS['End User'] }]);
    setToast({ type: 'success', message: 'End User added successfully!' });
    setShowAddEndUserModal(false);
    setNewEndUser({ ...INITIAL_ENDUSER, hardwareSoftwareFunctioning: { ...INITIAL_ENDUSER.hardwareSoftwareFunctioning } });
  };

  // ── Column defs ────────────────────────────────────────────────────────────

  const userColumns = makeUserColumns(
    (u) => handleUserAction(u, 'view'),
    (u) => handleUserAction(u, 'edit'),
    (u) => handleUserAction(u, 'suspend'),
    (u) => handleUserAction(u, 'activate'),
    (u) => handleUserAction(u, 'delete'),
  );

  // ── Dynamic title/subtitle ─────────────────────────────────────────────────

  const pageTitle: Record<ViewMode, string> = {
    overview: 'Super Admin Dashboard',
    registrations: 'Pending Registrations',
    systemManagement: 'System Management & Reports',
    auditLogs: 'Audit Logs',
    buyerManagement: 'Buyer Management',
    sellerManagement: 'Seller Management',
    endUserManagement: 'End User Management',
    custodianManagement: 'Custodian Management',
    procurement: 'Order Management',
  };
  const pageSubtitle: Record<ViewMode, string> = {
    overview: 'Complete system administration and management platform',
    registrations: 'Review and approve buyer, seller, and end user registration requests',
    systemManagement: 'Configure system settings, monitor security, and generate reports',
    auditLogs: 'Full system audit trail',
    buyerManagement: 'Manage buyer accounts and procurement activities',
    sellerManagement: 'Manage seller accounts and vendor relationships',
    endUserManagement: 'Manage end user accounts and device allocations',
    custodianManagement: 'Manage custodians by buyer',
    procurement: 'Review and approve seller orders',
  };

  // ── Shared tab button renderer ─────────────────────────────────────────────

  const TabBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={[
        'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
        active ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      ].join(' ')}
    >
      {label}
    </button>
  );

  // ── Inline form field helpers ───────────────────────────────────────────────

  const fieldCls = 'w-full px-3 py-2 border border-surface-border rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

  // ── Document viewer ────────────────────────────────────────────────────────

  const previewDocument = (path: string) => window.open(buildDocumentUrl(path), '_blank', 'noopener,noreferrer');

  // ── Seller contact rows (used in view + edit modals) ──────────────────────

  const SellerContacts = ({ user }: { user: any }) => (
    <>
      {[
        ['AMC Contact Information',       'amc_contact_name',       'amc_contact_mobile',       'amc_contact_email'],
        ['Execution Contact Information',  'execution_contact_name', 'execution_contact_mobile', 'execution_contact_email'],
        ['Accounts Contact Information',   'accounts_contact_name',  'accounts_contact_mobile',  'accounts_contact_email'],
        ['Director Contact Information',   'director_contact_name',  'director_contact_mobile',  'director_contact_email'],
      ].map(([title, n, m, e]) => (
        <div key={title} className="rounded-card border border-surface-border p-3 bg-surface-subtle text-sm space-y-0.5">
          <p className="font-medium text-gray-800">{title}</p>
          <p className="text-gray-600">Full Name: {user[n] || 'Not provided'}</p>
          <p className="text-gray-600">Mobile: {user[m] || 'Not provided'}</p>
          <p className="text-gray-600">Email: {user[e] || 'Not provided'}</p>
        </div>
      ))}
    </>
  );

  const SellerDocs = ({ user }: { user: any }) => (
    <div className="space-y-2 text-sm">
      {[
        ['TAN Certificates', user.tan_certificate],
        ['Shop & Establishment / MCA Certificates', user.shop_est_or_mca_certificate],
        ['GST Certificate', user.gst_certificate],
        ['MSME Certificate', user.msme_certificate],
      ].map(([label, docs]) => {
        const paths = extractDocumentPaths(docs);
        return (
          <div key={label as string}>
            <p><span className="font-medium text-gray-700">{label}:</span> {paths.length > 0 ? `${paths.length} file(s)` : 'Not provided'}</p>
            {paths.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {paths.map((p, i) => (
                  <button key={i} onClick={() => previewDocument(p)} className="px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded border border-primary-200 hover:bg-primary-100">
                    Preview {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={[
          'fixed top-6 right-6 z-[200] px-4 py-3 rounded-card shadow-xl text-white font-medium text-sm transition-all duration-300',
          toast.type === 'success' ? 'bg-success-600' : 'bg-danger-600',
        ].join(' ')}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={pageTitle[viewMode]}
        subtitle={pageSubtitle[viewMode]}
        icon={<Shield className="w-5 h-5 text-indigo-600" />}
        actions={
          <Button variant="ghost" size="sm" iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={fetchUsers} disabled={loading}>
            Refresh
          </Button>
        }
      />

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'overview' && (
        <>
          {/* Stat cards */}
          {loading && mappedUsers.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1,2,3,4,5,6].map(i => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard title="Total Users"  value={systemStats.totalUsers}            icon={<Users   className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-100" />
              <StatCard title="Buyers"       value={systemStats.totalBuyers}           icon={<Users   className="w-5 h-5 text-success-600" />} iconBg="bg-success-100" />
              <StatCard title="Sellers"      value={systemStats.totalSellers}          icon={<Store   className="w-5 h-5 text-warning-600" />} iconBg="bg-warning-100" />
              <StatCard title="End Users"    value={systemStats.totalEndUsers}         icon={<Monitor className="w-5 h-5 text-info-600"    />} iconBg="bg-info-100"    />
              <StatCard title="Pending"      value={systemStats.pendingRegistrations}  icon={<Clock   className="w-5 h-5 text-danger-600"  />} iconBg="bg-danger-100"  />
              <StatCard title="System Health" value={systemStats.systemHealth}         icon={<Shield  className="w-5 h-5 text-success-600" />} iconBg="bg-success-100" />
            </div>
          )}

          {/* Quick Actions */}
          <SectionCard title="Quick Actions" subtitle="Navigate to management sections">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Manage Buyers',     icon: <Users className="w-5 h-5 text-primary-600"  />, desc: 'Manage buyer accounts and procurement',      view: 'buyerManagement'   as ViewMode, variant: 'primary'   as const },
                { label: 'Manage Sellers',    icon: <Store className="w-5 h-5 text-success-600" />, desc: 'Manage seller accounts and vendor relations',  view: 'sellerManagement'  as ViewMode, variant: 'success'   as const },
                { label: 'Manage End Users',  icon: <Monitor className="w-5 h-5 text-info-600" />, desc: 'Manage end user accounts and devices',          view: 'endUserManagement' as ViewMode, variant: 'default'   as const },
                { label: 'Manage Orders',     icon: <Package className="w-5 h-5 text-warning-600"/>, desc: 'Review and approve seller orders',            view: 'procurement'       as ViewMode, variant: 'warning'   as const },
              ].map(({ label, icon, desc, view, variant }) => (
                <div key={label} className="bg-white rounded-card border border-surface-border p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface-subtle rounded-lg">{icon}</div>
                    <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                  </div>
                  <p className="text-xs text-gray-500 flex-1">{desc}</p>
                  <Button variant={variant} size="sm" className="w-full" onClick={() => setViewMode(view)}>{label}</Button>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Recent Activity */}
          <SectionCard title="Recent Activity" subtitle="Latest system events">
            {activityLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                <span className="text-sm">Loading activities...</span>
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-2">
                {recentActivity.map((activity, index) => {
                  const colorMap: Record<string, string> = { green: 'bg-success-500', blue: 'bg-primary-500', purple: 'bg-info-500', orange: 'bg-warning-500', indigo: 'bg-indigo-500', red: 'bg-danger-500' };
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-surface-subtle dark:bg-slate-700 rounded-card">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${colorMap[activity.color] || 'bg-gray-400'}`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{activity.description}</span>
                        {activity.user_email && <span className="text-xs text-gray-400 dark:text-gray-500">({activity.user_email})</span>}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-4">{activity.timeAgo}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Clock className="w-10 h-10 text-gray-300" />}
                title="No recent activity"
                description="Activities will appear here as users interact with the system"
              />
            )}
          </SectionCard>
        </>
      )}

      {/* ── PENDING REGISTRATIONS (all types) ─────────────────────────────── */}
      {viewMode === 'registrations' && (
        <SectionCard
          title="Pending Registrations"
          subtitle={`${systemStats.pendingRegistrations} registration${systemStats.pendingRegistrations === 1 ? '' : 's'} awaiting approval`}
          actions={
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => { loadPendingRegistrations(); fetchUsers(); }}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard title="Total Pending" value={systemStats.pendingRegistrations} icon={<Clock className="w-5 h-5 text-danger-600" />} iconBg="bg-danger-100" />
            <StatCard title="Buyers"        value={systemStats.pendingBuyers}        icon={<Building2 className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-100" />
            <StatCard title="Sellers"       value={systemStats.pendingSellers}       icon={<Store className="w-5 h-5 text-success-600" />} iconBg="bg-success-100" />
            <StatCard title="End Users"     value={systemStats.pendingEndUsers}      icon={<Monitor className="w-5 h-5 text-info-600" />} iconBg="bg-info-100" />
          </div>

          <div className="border-b border-surface-border mb-4">
            <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
              <TabBtn label={`All (${systemStats.pendingRegistrations})`}  active={registrationsTab === 'all'}     onClick={() => setRegistrationsTab('all')} />
              <TabBtn label={`Buyers (${systemStats.pendingBuyers})`}       active={registrationsTab === 'buyer'}   onClick={() => setRegistrationsTab('buyer')} />
              <TabBtn label={`Sellers (${systemStats.pendingSellers})`}     active={registrationsTab === 'seller'}  onClick={() => setRegistrationsTab('seller')} />
              <TabBtn label={`End Users (${systemStats.pendingEndUsers})`}  active={registrationsTab === 'enduser'} onClick={() => setRegistrationsTab('enduser')} />
            </nav>
          </div>

          {(registrationsTab === 'all' || registrationsTab === 'buyer') && (
            <div className={registrationsTab === 'all' ? 'mb-8' : ''}>
              {registrationsTab === 'all' && (
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Buyer Registrations</h3>
              )}
              <PendingRegistrations
                registrations={pendingRegistrations.filter(r => r.type === 'buyer')}
                onRegistrationUpdate={handleRegistrationUpdate}
                onRefresh={() => { loadPendingRegistrations(); fetchUsers(); }}
              />
            </div>
          )}

          {(registrationsTab === 'all' || registrationsTab === 'seller') && (
            <div className={registrationsTab === 'all' ? 'mb-8' : ''}>
              {registrationsTab === 'all' && (
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Seller Registrations</h3>
              )}
              <PendingSellerRegistrations
                registrations={pendingRegistrations.filter(r => r.type === 'seller')}
                onRegistrationUpdate={handleRegistrationUpdate}
                onRefresh={() => { loadPendingRegistrations(); fetchUsers(); }}
              />
            </div>
          )}

          {(registrationsTab === 'all' || registrationsTab === 'enduser') && (
            <div>
              {registrationsTab === 'all' && (
                <h3 className="text-sm font-semibold text-gray-700 mb-3">End User Registrations</h3>
              )}
              <PendingEndUserRegistrations
                registrations={pendingRegistrations.filter(r => r.type === 'enduser')}
                onRegistrationUpdate={handleRegistrationUpdate}
                onRefresh={() => { loadPendingRegistrations(); fetchUsers(); }}
              />
            </div>
          )}
        </SectionCard>
      )}

      {/* ── BUYER MANAGEMENT ──────────────────────────────────────────────── */}
      {viewMode === 'buyerManagement' && (
        <SectionCard
          title="Buyer Management"
          subtitle={`${getExistingBuyerUsers().length} registered buyers`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={fetchUsers} disabled={loading}>Refresh</Button>
              <Button variant="primary" size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setShowAddBuyerModal(true)}>Add Buyer</Button>
            </div>
          }
        >
          <div className="border-b border-surface-border mb-4">
            <nav className="-mb-px flex space-x-8">
              <TabBtn label={`Existing Users (${getExistingBuyerUsers().length})`}    active={buyerManagementTab === 'users'}         onClick={() => setBuyerManagementTab('users')} />
              <TabBtn label={`Pending Registrations (${systemStats.pendingBuyers})`}  active={buyerManagementTab === 'registrations'} onClick={() => setBuyerManagementTab('registrations')} />
            </nav>
          </div>

          {buyerManagementTab === 'users' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-48">
                  <input type="text" value={buyerSearch} onChange={e => setBuyerSearch(e.target.value)} placeholder="Search buyers…" className={`${fieldCls} pl-9`} />
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <select value={buyerFilter} onChange={e => setBuyerFilter(e.target.value)} className={fieldCls} style={{ maxWidth: 200 }}>
                  <option value="all">All Departments</option>
                  <option value="Central Procurement Department">Central Procurement</option>
                  <option value="District Procurement Office">District Procurement</option>
                </select>
              </div>
              {userDataError ? (
                <div className="p-4 text-danger-600 text-sm text-center">{userDataError} <button onClick={fetchUsers} className="underline ml-2">Retry</button></div>
              ) : (
                <DataTable columns={userColumns} data={filteredBuyers} loading={loading} emptyMessage="No buyers found" />
              )}
            </>
          )}

          {buyerManagementTab === 'registrations' && (
            <PendingRegistrations
              registrations={pendingRegistrations.filter(r => r.type === 'buyer')}
              onRegistrationUpdate={handleRegistrationUpdate}
              onRefresh={() => { loadPendingRegistrations(); fetchUsers(); }}
            />
          )}
        </SectionCard>
      )}

      {/* ── SELLER MANAGEMENT ─────────────────────────────────────────────── */}
      {viewMode === 'sellerManagement' && (
        <SectionCard
          title="Seller Management"
          subtitle={`${getExistingSellerUsers().length} registered sellers`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={fetchUsers} disabled={loading}>Refresh</Button>
              <Button variant="success" size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setShowAddSellerModal(true)}>Add Seller</Button>
            </div>
          }
        >
          <div className="border-b border-surface-border mb-4">
            <nav className="-mb-px flex space-x-8">
              <TabBtn label={`Existing Users (${getExistingSellerUsers().length})`}    active={sellerManagementTab === 'users'}         onClick={() => setSellerManagementTab('users')} />
              <TabBtn label={`Pending Registrations (${systemStats.pendingSellers})`}  active={sellerManagementTab === 'registrations'} onClick={() => setSellerManagementTab('registrations')} />
            </nav>
          </div>

          {sellerManagementTab === 'users' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-48">
                  <input type="text" value={sellerSearch} onChange={e => setSellerSearch(e.target.value)} placeholder="Search sellers…" className={`${fieldCls} pl-9`} />
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} className={fieldCls} style={{ maxWidth: 200 }}>
                  <option value="all">All Companies</option>
                  <option value="Dell Technologies">Dell Technologies</option>
                  <option value="HP India">HP India</option>
                  <option value="Lenovo India">Lenovo India</option>
                </select>
              </div>
              {userDataError ? (
                <div className="p-4 text-danger-600 text-sm text-center">{userDataError} <button onClick={fetchUsers} className="underline ml-2">Retry</button></div>
              ) : (
                <DataTable columns={userColumns} data={filteredSellers} loading={loading} emptyMessage="No sellers found" />
              )}
            </>
          )}

          {sellerManagementTab === 'registrations' && (
            <PendingSellerRegistrations
              registrations={pendingRegistrations.filter(r => r.type === 'seller')}
              onRegistrationUpdate={handleRegistrationUpdate}
              onRefresh={() => { loadPendingRegistrations(); fetchUsers(); }}
            />
          )}
        </SectionCard>
      )}

      {/* ── END USER MANAGEMENT ───────────────────────────────────────────── */}
      {viewMode === 'endUserManagement' && (
        <SectionCard
          title="End User Management"
          subtitle={`${getExistingEndUserUsers().length} registered end users`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" iconLeft={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />} onClick={fetchUsers} disabled={loading}>Refresh</Button>
              <Button variant="default" size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={() => setShowAddEndUserModal(true)}>Add End User</Button>
            </div>
          }
        >
          <div className="border-b border-surface-border mb-4">
            <nav className="-mb-px flex space-x-8">
              <TabBtn label={`Existing Users (${getExistingEndUserUsers().length})`}    active={endUserManagementTab === 'users'}         onClick={() => setEndUserManagementTab('users')} />
              <TabBtn label={`Pending Registrations (${systemStats.pendingEndUsers})`}  active={endUserManagementTab === 'registrations'} onClick={() => setEndUserManagementTab('registrations')} />
            </nav>
          </div>

          {endUserManagementTab === 'users' && (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-48">
                  <input type="text" value={endUserSearch} onChange={e => setEndUserSearch(e.target.value)} placeholder="Search end users…" className={`${fieldCls} pl-9`} />
                  <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <select value={endUserFilter} onChange={e => setEndUserFilter(e.target.value)} className={fieldCls} style={{ maxWidth: 220 }}>
                  <option value="all">All Departments</option>
                  <option value="Taluka Development Office">Taluka Development</option>
                  <option value="Police Station">Police Station</option>
                  <option value="District Office">District Office</option>
                  <option value="Municipal Corporation">Municipal Corporation</option>
                </select>
              </div>
              {userDataError ? (
                <div className="p-4 text-danger-600 text-sm text-center">{userDataError} <button onClick={fetchUsers} className="underline ml-2">Retry</button></div>
              ) : (
                <DataTable columns={userColumns} data={filteredEndUsers} loading={loading} emptyMessage="No end users found" />
              )}
            </>
          )}

          {endUserManagementTab === 'registrations' && (
            <PendingEndUserRegistrations
              registrations={pendingRegistrations.filter(r => r.type === 'enduser')}
              onRegistrationUpdate={handleRegistrationUpdate}
              onRefresh={() => { loadPendingRegistrations(); fetchUsers(); }}
            />
          )}
        </SectionCard>
      )}

      {/* ── SYSTEM MANAGEMENT ─────────────────────────────────────────────── */}
      {viewMode === 'systemManagement' && (
        <div className="space-y-6">
          <SectionCard title="System Settings & Configuration" subtitle="System information and admin actions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-surface-subtle rounded-card p-4">
                <h3 className="font-semibold text-gray-900 text-sm">System Information</h3>
                {[
                  { label: 'System Health', value: systemStats.systemHealth, highlight: true },
                  { label: 'Uptime', value: systemStats.uptime },
                  { label: 'Last Backup', value: systemStats.lastBackup },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{label}:</span>
                    <span className={highlight ? 'text-sm font-semibold text-success-600 px-2 py-0.5 bg-success-100 rounded-full' : 'text-sm font-semibold text-gray-900'}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">System Actions</h3>
                <Button variant="primary" className="w-full justify-center" iconLeft={<Shield className="w-4 h-4" />}>Run System Backup</Button>
                <Button variant="success" className="w-full justify-center" iconLeft={<RefreshCw className="w-4 h-4" />}>Clear System Cache</Button>
                <Button variant="warning" className="w-full justify-center" iconLeft={<Activity className="w-4 h-4" />}>Check System Health</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="System Reports & Analytics" subtitle="Generate reports and view audit trails">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: <Shield className="w-8 h-8 text-primary-600" />, label: 'SECURITY', title: 'Audit Logs & Security', desc: 'View comprehensive audit logs, security alerts, and real-time monitoring', action: () => setViewMode('auditLogs'), btnText: 'View Logs', variant: 'primary' as const },
                { icon: <Activity className="w-8 h-8 text-success-600" />, label: 'ACTIVITY', title: 'User Activity Report', desc: 'Generate report of user login activity and system usage patterns', action: () => {}, btnText: 'Generate Report', variant: 'success' as const },
                { icon: <Users className="w-8 h-8 text-info-600" />, label: 'USERS', title: 'Registration Report', desc: 'View statistics on user registrations and approval trends', action: () => {}, btnText: 'Generate Report', variant: 'default' as const },
                { icon: <Monitor className="w-8 h-8 text-warning-600" />, label: 'PERFORMANCE', title: 'System Performance', desc: 'Monitor system performance and resource usage metrics', action: () => {}, btnText: 'Generate Report', variant: 'warning' as const },
              ].map(({ icon, label, title, desc, action, btnText, variant }) => (
                <div key={title} className="border border-surface-border rounded-card p-5 hover:shadow-md transition-shadow bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    {icon}
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-surface-subtle text-gray-600">{label}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="text-xs text-gray-500">{desc}</p>
                  <Button variant={variant} size="sm" className="w-full justify-center" onClick={action}>{btnText} →</Button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── AUDIT LOGS ────────────────────────────────────────────────────── */}
      {viewMode === 'auditLogs' && (
        <SectionCard
          title="Audit Logs"
          subtitle="Full system audit trail"
          actions={<Button variant="ghost" size="sm" iconLeft={<Settings className="w-4 h-4" />} onClick={() => setViewMode('systemManagement')}>← Back to System</Button>}
        >
          <AuditLogsViewer variant="audit" />
        </SectionCard>
      )}

      {/* ── ORDER MANAGEMENT ──────────────────────────────────────────────── */}
      {viewMode === 'procurement' && (
        <SellerOrdersManagement
          onOrderUpdate={(orderId, status) => setToast({ type: 'success', message: `Order ${orderId} ${status.toLowerCase()} successfully.` })}
        />
      )}

      {/* ── CUSTODIAN MANAGEMENT ──────────────────────────────────────────── */}
      {viewMode === 'custodianManagement' && <SuperAdminCustodianSection />}

      {/* ── MODAL: User Detail ────────────────────────────────────────────── */}
      <Modal isOpen={showUserModal && !!selectedUser} onClose={() => setShowUserModal(false)} title="User Details" size="lg">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img className="h-14 w-14 rounded-full object-cover" src={selectedUser.avatar || DEFAULT_AVATAR} alt={selectedUser.name} onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }} />
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h4>
                <p className="text-gray-600 text-sm">{selectedUser.role}</p>
                <p className="text-xs text-gray-400">ID: {selectedUser.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Contact Information</h5>
                {selectedUser.role === 'Seller' ? (
                  <div className="space-y-2"><SellerContacts user={selectedUser} /></div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{selectedUser.email}</span></div>
                    <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{selectedUser.department || selectedUser.departmentOfficeName}</span></div>
                    {selectedUser.contactNumber && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{selectedUser.contactNumber}</span></div>}
                    {selectedUser.mobileNumber  && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{selectedUser.mobileNumber}</span></div>}
                  </div>
                )}
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Account Status</h5>
                <StatusBadge status={normalizeStatus(selectedUser.status)} />
                <p className="text-xs text-gray-400 mt-1">Last login: Today</p>
              </div>
            </div>

            {selectedUser.role === 'Seller' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Business Information</h5>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-medium">Social Category:</span> {selectedUser.social_category || selectedUser.socialCategory || 'N/A'}</p>
                    <p><span className="font-medium">Nature of Business:</span> {selectedUser.nature_of_business || selectedUser.natureOfBusiness || 'N/A'}</p>
                    <p><span className="font-medium">GSTIN:</span> {selectedUser.gstin || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Documents</h5>
                  <SellerDocs user={selectedUser} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
              <Button variant="ghost" onClick={() => setShowUserModal(false)}>Close</Button>
              <Button variant="primary" onClick={() => { setShowUserModal(false); handleUserAction(selectedUser, 'edit'); }}>Edit User</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: Edit User ──────────────────────────────────────────────── */}
      <Modal isOpen={showEditUserModal && !!editingUser} onClose={() => { setShowEditUserModal(false); setEditingUser(null); setShowEditForm(false); }} title={showEditForm ? 'Edit User Details' : 'User Details'} size="xl">
        {editingUser && (
          <>
            {!showEditForm ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <img className="h-14 w-14 rounded-full object-cover" src={editingUser.avatar || DEFAULT_AVATAR} alt={editingUser.name || editingUser.contactPersonName} onError={e => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }} />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{editingUser.name || editingUser.contactPersonName || editingUser.fullName}</h4>
                    <p className="text-gray-600 text-sm">{editingUser.role || editingUser.userType}</p>
                    <p className="text-xs text-gray-400">ID: {editingUser.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Contact Information</h5>
                    {editingUser.role === 'Seller' ? (
                      <div className="space-y-2"><SellerContacts user={editingUser} /></div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{editingUser.email || editingUser.emailId}</span></div>
                        <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{editingUser.department || editingUser.ministryDepartment || editingUser.departmentOfficeName}</span></div>
                        {editingUser.contactNumber && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{editingUser.contactNumber}</span></div>}
                        {editingUser.mobileNumber  && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-gray-700">{editingUser.mobileNumber}</span></div>}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">Account Status</h5>
                    <StatusBadge status={normalizeStatus(editingUser.status)} />
                    <p className="text-xs text-gray-400 mt-1">Last updated: {editingUser.updatedAt ? new Date(editingUser.updatedAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                {editingUser.role === 'Seller' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Business Information</h5>
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><span className="font-medium">Social Category:</span> {editingUser.social_category || editingUser.socialCategory || 'N/A'}</p>
                        <p><span className="font-medium">Nature of Business:</span> {editingUser.nature_of_business || editingUser.natureOfBusiness || 'N/A'}</p>
                        <p><span className="font-medium">GSTIN:</span> {editingUser.gstin || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Documents</h5>
                      <SellerDocs user={editingUser} />
                    </div>
                  </div>
                )}

                {/* Password Reset */}
                <div className="pt-4 border-t border-surface-border space-y-3">
                  <h5 className="font-medium text-gray-900">Password Management</h5>
                  <div className="bg-warning-50 border border-warning-200 rounded-card p-4 text-sm text-warning-800">
                    Click below to generate a new password. It will be automatically sent to the user's registered email address.
                  </div>
                  <Button
                    variant="danger"
                    className="w-full justify-center"
                    disabled={isResettingPassword}
                    onClick={() => {
                      const userType = editingUser.role === 'Buyer' ? 'buyer' : editingUser.role === 'Seller' ? 'seller' : 'enduser';
                      handleResetPassword(editingUser.id, userType);
                    }}
                  >
                    {isResettingPassword ? 'Resetting…' : 'Reset Password'}
                  </Button>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
                  <Button variant="ghost" onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}>Close</Button>
                  <Button variant="primary" onClick={() => setShowEditForm(true)}>Edit User Details</Button>
                </div>
              </div>
            ) : (
              <div>
                {editingUser.role === 'Buyer'    && <BuyerEditForm    buyer={editingUser}   onSubmit={handleUpdateUser} onCancel={() => setShowEditForm(false)} loading={isUpdatingUser} />}
                {editingUser.role === 'Seller'   && <SellerEditForm   seller={editingUser}  onSubmit={handleUpdateUser} onCancel={() => setShowEditForm(false)} loading={isUpdatingUser} />}
                {editingUser.role === 'End User' && <EndUserEditForm  endUser={editingUser} onSubmit={handleUpdateUser} onCancel={() => setShowEditForm(false)} loading={isUpdatingUser} />}
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ── MODAL: Add Buyer ──────────────────────────────────────────────── */}
      <Modal isOpen={showAddBuyerModal} onClose={() => { setShowAddBuyerModal(false); setNewBuyer({ ...INITIAL_BUYER, office_address: { ...INITIAL_BUYER.office_address } }); }} title="Add New Buyer" size="lg">
        <form onSubmit={e => { e.preventDefault(); handleAddBuyer(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Organization Name *', key: 'organization_name', required: true },
              { label: 'Contact Person Name *', key: 'contact_person_name', required: true },
              { label: 'Email Address *', key: 'email_id', type: 'email', required: true },
              { label: 'Password', key: 'password', type: 'password' },
              { label: 'Contact Number', key: 'contact_number', type: 'tel' },
              { label: 'Ministry/Department *', key: 'ministry_department', required: true },
              { label: 'Buyer Designation *', key: 'buyer_designation', required: true },
              { label: 'GSTIN', key: 'gstin' },
            ].map(({ label, key, type = 'text', required }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input type={type} value={(newBuyer as any)[key]} onChange={e => setNewBuyer({ ...newBuyer, [key]: e.target.value })} className={fieldCls} placeholder={label.replace(' *', '')} required={required} />
              </div>
            ))}
            <div>
              <label className={labelCls}>Payment Mode</label>
              <select value={newBuyer.payment_mode} onChange={e => setNewBuyer({ ...newBuyer, payment_mode: e.target.value })} className={fieldCls}>
                <option>PFMS</option><option>CGDA</option><option>Offline</option><option>ISRO Internal</option><option>Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Office Zone</label>
              <input type="text" value={newBuyer.office_address.zone} onChange={e => setNewBuyer({ ...newBuyer, office_address: { ...newBuyer.office_address, zone: e.target.value } })} className={fieldCls} placeholder="Zone" />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input type="text" value={newBuyer.office_address.city} onChange={e => setNewBuyer({ ...newBuyer, office_address: { ...newBuyer.office_address, city: e.target.value } })} className={fieldCls} placeholder="City" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input type="text" value={newBuyer.office_address.state} onChange={e => setNewBuyer({ ...newBuyer, office_address: { ...newBuyer.office_address, state: e.target.value } })} className={fieldCls} placeholder="State" />
            </div>
            <div>
              <label className={labelCls}>PIN Code</label>
              <input type="text" value={newBuyer.office_address.pin} onChange={e => setNewBuyer({ ...newBuyer, office_address: { ...newBuyer.office_address, pin: e.target.value } })} className={fieldCls} placeholder="PIN Code" maxLength={6} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Complete Address</label>
              <textarea value={newBuyer.office_address.fullAddress} onChange={e => setNewBuyer({ ...newBuyer, office_address: { ...newBuyer.office_address, fullAddress: e.target.value } })} className={fieldCls} placeholder="Full address" rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <Button variant="ghost" type="button" onClick={() => setShowAddBuyerModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add Buyer</Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Add Seller ─────────────────────────────────────────────── */}
      <Modal isOpen={showAddSellerModal} onClose={() => { setShowAddSellerModal(false); setNewSeller({ ...INITIAL_SELLER, companyAddress: { ...INITIAL_SELLER.companyAddress } }); }} title="Add New Seller" size="lg">
        <form onSubmit={e => { e.preventDefault(); handleAddSeller(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Company Name *', key: 'companyName', required: true },
              { label: 'GeM Seller ID *', key: 'gemSellerId', required: true },
              { label: 'Contact Person Name *', key: 'contactPersonName', required: true },
              { label: 'Email Address *', key: 'emailId', type: 'email', required: true },
              { label: 'Password', key: 'password', type: 'password' },
              { label: 'Mobile Number *', key: 'mobileNumber', type: 'tel', required: true },
              { label: 'GSTIN *', key: 'gstin', required: true },
              { label: 'MSME Registration No', key: 'msmeRegistrationNo' },
            ].map(({ label, key, type = 'text', required }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input type={type} value={(newSeller as any)[key]} onChange={e => setNewSeller({ ...newSeller, [key]: e.target.value })} className={fieldCls} placeholder={label.replace(' *', '')} required={required} />
              </div>
            ))}
            <div>
              <label className={labelCls}>Social Category</label>
              <select value={newSeller.socialCategory} onChange={e => setNewSeller({ ...newSeller, socialCategory: e.target.value })} className={fieldCls}>
                <option>General</option><option>SC</option><option>ST</option><option>OBC</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Gender of Owner</label>
              <select value={newSeller.genderOfOwner} onChange={e => setNewSeller({ ...newSeller, genderOfOwner: e.target.value })} className={fieldCls}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Nature of Business</label>
              <select value={newSeller.natureOfBusiness} onChange={e => setNewSeller({ ...newSeller, natureOfBusiness: e.target.value })} className={fieldCls}>
                <option>OEM</option><option>Authorized Distributor</option><option>Reseller</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Street Address</label>
              <input type="text" value={newSeller.companyAddress.street} onChange={e => setNewSeller({ ...newSeller, companyAddress: { ...newSeller.companyAddress, street: e.target.value } })} className={fieldCls} placeholder="Street address" />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input type="text" value={newSeller.companyAddress.city} onChange={e => setNewSeller({ ...newSeller, companyAddress: { ...newSeller.companyAddress, city: e.target.value } })} className={fieldCls} placeholder="City" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input type="text" value={newSeller.companyAddress.state} onChange={e => setNewSeller({ ...newSeller, companyAddress: { ...newSeller.companyAddress, state: e.target.value } })} className={fieldCls} placeholder="State" />
            </div>
            <div>
              <label className={labelCls}>PIN Code</label>
              <input type="text" value={newSeller.companyAddress.pin} onChange={e => setNewSeller({ ...newSeller, companyAddress: { ...newSeller.companyAddress, pin: e.target.value } })} className={fieldCls} placeholder="PIN Code" maxLength={6} />
            </div>
            <div>
              <label className={labelCls}>Full Address</label>
              <textarea value={newSeller.companyAddress.fullAddress} onChange={e => setNewSeller({ ...newSeller, companyAddress: { ...newSeller.companyAddress, fullAddress: e.target.value } })} className={fieldCls} placeholder="Complete address" rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <Button variant="ghost" type="button" onClick={() => setShowAddSellerModal(false)}>Cancel</Button>
            <Button variant="success" type="submit">Add Seller</Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: Add End User ───────────────────────────────────────────── */}
      <Modal isOpen={showAddEndUserModal} onClose={() => { setShowAddEndUserModal(false); setNewEndUser({ ...INITIAL_ENDUSER, hardwareSoftwareFunctioning: { ...INITIAL_ENDUSER.hardwareSoftwareFunctioning } }); }} title="Add New End User" size="lg">
        <form onSubmit={e => { e.preventDefault(); handleAddEndUser(); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Full Name *', key: 'fullName', required: true },
              { label: 'Email Address *', key: 'emailId', type: 'email', required: true },
              { label: 'Password', key: 'password', type: 'password' },
              { label: 'Designation *', key: 'designation', required: true },
              { label: 'Department/Office Name *', key: 'departmentOfficeName', required: true },
              { label: 'Mobile Number *', key: 'mobileNumber', type: 'tel', required: true },
            ].map(({ label, key, type = 'text', required }) => (
              <div key={key}>
                <label className={labelCls}>{label}</label>
                <input type={type} value={(newEndUser as any)[key]} onChange={e => setNewEndUser({ ...newEndUser, [key]: e.target.value })} className={fieldCls} placeholder={label.replace(' *', '')} required={required} />
              </div>
            ))}
            <div>
              <label className={labelCls}>Language Preference</label>
              <select value={newEndUser.languagePreference} onChange={e => setNewEndUser({ ...newEndUser, languagePreference: e.target.value })} className={fieldCls}>
                {['English','Hindi','Marathi','Gujarati','Bengali','Tamil','Telugu','Kannada','Malayalam','Punjabi','Odia','Assamese'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Device Types (Optional)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {['Laptop','Desktop','Printer','Scanner','Webcam','Software License Key'].map(device => (
                  <label key={device} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={newEndUser.devicesAssigned.includes(device)}
                      onChange={e => setNewEndUser({ ...newEndUser, devicesAssigned: e.target.checked ? [...newEndUser.devicesAssigned, device] : newEndUser.devicesAssigned.filter(d => d !== device) })}
                      className="rounded"
                    />
                    {device}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <Button variant="ghost" type="button" onClick={() => setShowAddEndUserModal(false)}>Cancel</Button>
            <Button variant="default" type="submit">Add End User</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default SuperAdminDashboard;
