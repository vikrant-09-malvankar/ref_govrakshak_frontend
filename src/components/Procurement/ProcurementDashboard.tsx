/**
 * ProcurementDashboard — modernized with shared UI system.
 * Replaces raw <table>, inline modals, and custom stat cards with
 * DataTable, Modal, StatCard, StatusBadge, and Button.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { type ColumnDef } from '@tanstack/react-table';
import {
  CheckCircle, Clock, FileText, IndianRupee, Plus,
  Edit, Eye, AlertTriangle, Download,
} from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { PurchaseOrder, ProcurementTimeline, SellerOrder } from '../../types';
import {
  getPublicOrderStatus,
  getStatusColorClass,
  ORDER_WORKFLOW_STATUSES,
} from '../../utils/orderWorkflow';
import { formatIndianShort } from '../../utils/currency';
import { DataTable } from '../ui/DataTable';
import { StatCard, SectionCard } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import PurchaseOrderDetails from './PurchaseOrderDetails';
import AddOrderForm from '../Seller/AddOrderForm';
import { saveAs } from 'file-saver';
import { themedAlert } from '../../utils/themedDialogs';

// ─── mapSellerOrderToPO (business logic preserved) ───────────────────────────
function mapSellerOrderToPO(so: SellerOrder): PurchaseOrder {
  const anySo: any = so;
  const gemContractNumber      = anySo.gemContractNumber ?? anySo.gem_contract_number;
  const gemOrderCategory       = anySo.gemOrderCategory ?? anySo.gem_order_category;
  const gemBuyerDepartmentName = anySo.gemBuyerDepartmentName ?? anySo.gem_buyer_department_name;
  let buyerContact             = anySo.buyerContact ?? anySo.buyer_contact;
  if (typeof buyerContact === 'string') {
    try { buyerContact = JSON.parse(buyerContact); } catch { buyerContact = undefined; }
  }
  const expectedDeliveryWindow = anySo.expectedDeliveryWindow ?? anySo.expected_delivery_window;
  const createdAt              = anySo.createdAt ?? anySo.created_at;
  const updatedAt              = anySo.updatedAt ?? anySo.updated_at ?? createdAt;
  const totalAmount            = anySo.totalAmount ?? anySo.total_amount ?? 0;
  const sellerName             = anySo.sellerName ?? anySo.seller_name ?? 'Seller';
  const notesVal: string | undefined = anySo.notes;
  let deliveryInformation      = anySo.deliveryInformation ?? anySo.delivery_information;
  if (typeof deliveryInformation === 'string') {
    try { deliveryInformation = JSON.parse(deliveryInformation); } catch { deliveryInformation = undefined; }
  }

  const base: PurchaseOrder = {
    id:                   `SO-${anySo.id}`,
    poNumber:             gemContractNumber || `SO-${anySo.id}`,
    title:                gemOrderCategory || 'Seller Order',
    description:          notesVal || '',
    department:           gemBuyerDepartmentName || '-',
    requestedBy:          buyerContact?.officerName || sellerName || 'Seller',
    requestedDate:        createdAt || new Date().toISOString(),
    supplier:             sellerName,
    supplierContact:      buyerContact?.email || '',
    totalAmount,
    currency:             'INR',
    status:               (anySo.status as any) || 'Pending Approval',
    approvedBy:           anySo.approvedBy ?? anySo.approved_by,
    expectedDeliveryDate: expectedDeliveryWindow?.endDate || expectedDeliveryWindow?.startDate || new Date().toISOString(),
    items:                (anySo.items || []).map((it: any, idx: number) => ({
      id:              `${anySo.id}-${idx + 1}`,
      assetName:       it.productName,
      description:     `${it.brand || ''} ${it.modelNumber || ''}`.trim(),
      quantity:        it.quantity,
      unitPrice:       it.unitPrice || 0,
      totalPrice:      it.totalPrice || 0,
      specifications:  it.categoryType,
      category:        it.categoryType,
      deliveryStatus:  'Not Started',
    })),
    attachments: [],
    createdAt:   createdAt || new Date().toISOString(),
    updatedAt:   updatedAt || new Date().toISOString(),
    gemContractNumber:          gemContractNumber  || undefined,
    gemOrderCategory:           gemOrderCategory   || undefined,
    gemBuyerDepartment:         gemBuyerDepartmentName || undefined,
    expectedDeliveryStartDate:  expectedDeliveryWindow?.startDate,
    expectedDeliveryEndDate:    expectedDeliveryWindow?.endDate,
    oemAuthorizationLetterPath: anySo.oem_authorization_letter || anySo.oemAuthorizationLetter,
    gemOrderFilePath:           anySo.gem_order_file || anySo.gemOrderFile,
    workOrderFilePath:          anySo.work_order_file || anySo.workOrderFile,
    purchaseOrderFilePath:      anySo.purchase_order_file || anySo.purchaseOrderFile,
    ...(deliveryInformation ? { deliveryInformation } : {}),
  };

  return {
    ...base,
    ...(notesVal ? { notes: notesVal } : {}),
    approved_by: anySo.approved_by ?? anySo.approvedBy,
    buyerId:     anySo.buyerId,
    buyerName:   anySo.buyerName,
    mappedAt:    anySo.mappedAt,
    isMappedToBuyer: anySo.isMappedToBuyer,
  } as PurchaseOrder;
}

// ─── Component ────────────────────────────────────────────────────────────────
const ProcurementDashboard: React.FC = () => {
  const { user } = useAuth();
  const isEndUser   = user?.role === 'End User';
  const isSuperAdmin = user?.role === 'Super Admin';

  // ── Data state ──────────────────────────────────────────────────────────────
  const [purchaseOrders,  setPurchaseOrders]  = useState<PurchaseOrder[]>([]);
  const [sellerOrders,    setSellerOrders]    = useState<SellerOrder[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [selectedStatus,     setSelectedStatus]     = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [searchTerm,         setSearchTerm]         = useState('');

  // ── UI modals ─────────────────────────────────────────────────────────────
  const [selectedPO,             setSelectedPO]             = useState<PurchaseOrder | null>(null);
  const [detailsSellerOrder,     setDetailsSellerOrder]     = useState<SellerOrder | null>(null);
  const [showSellerOrderForm,    setShowSellerOrderForm]    = useState(false);
  const [editingSellerOrder,     setEditingSellerOrder]     = useState<any>(null);
  const [pendingCompleteOrderId, setPendingCompleteOrderId] = useState<string | null>(null);
  const [statusErrorMessage,     setStatusErrorMessage]     = useState<string | null>(null);
  const [alertMsg,               setAlertMsg]               = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersData, sellerOrdersData] = await Promise.all([
        ApiService.getAllPurchaseOrders(),
        ApiService.getAllSellerOrders(),
      ]);
      setPurchaseOrders(ordersData as PurchaseOrder[]);
      setSellerOrders((sellerOrdersData as any) as SellerOrder[]);
    } catch {
      setError('Failed to load procurement data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Unified order list ───────────────────────────────────────────────────
  const unifiedOrders = useMemo(
    () => sellerOrders.map(mapSellerOrderToPO),
    [sellerOrders],
  );

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalPOs     = unifiedOrders.length;
  const activePOs    = unifiedOrders.filter(po => !['Completed','Rejected','Cancelled'].includes(po.status)).length;
  const completedPOs = unifiedOrders.filter(po => po.status === 'Completed').length;
  const totalValue   = unifiedOrders.reduce((s, po) => s + (Number(po.totalAmount) || 0), 0);

  // ── Filter options ───────────────────────────────────────────────────────
  const departments = useMemo(() => [...new Set(unifiedOrders.map(po => po.department))], [unifiedOrders]);
  const statuses    = useMemo(
    () => isSuperAdmin ? [...ORDER_WORKFLOW_STATUSES] : [...new Set(unifiedOrders.map(po => po.status))],
    [isSuperAdmin, unifiedOrders],
  );

  // ── Notification counts ──────────────────────────────────────────────────
  const pendingApprovalCount      = unifiedOrders.filter(po => po.status === 'Pending Approval').length;
  const inProgressOrDeliveredCount = unifiedOrders.filter(po => ['In Progress','Delivered'].includes(po.status)).length;
  const overdueCount              = unifiedOrders.filter(po => {
    if (!po.expectedDeliveryDate) return false;
    try { return !['Completed','Cancelled'].includes(po.status) && new Date(po.expectedDeliveryDate) < new Date(); }
    catch { return false; }
  }).length;

  // ── Filtered list ────────────────────────────────────────────────────────
  const filteredPOs = useMemo(() => {
    return unifiedOrders.filter(po => {
      const pubStatus = getPublicOrderStatus(po);
      const matchStatus =
        selectedStatus === 'all'     ? true :
        selectedStatus === 'Approved' ? pubStatus === 'Approved' :
                                        po.status === selectedStatus;
      const matchDept    = selectedDepartment === 'all' || po.department === selectedDepartment;
      const matchUser    = !isEndUser || (po.assigneeId === user?.id || po.requestedBy === user?.name);
      const matchSearch  = !searchTerm || [po.poNumber, po.title, po.department, po.supplier, po.requestedBy]
        .some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchDept && matchUser && matchSearch;
    });
  }, [unifiedOrders, selectedStatus, selectedDepartment, isEndUser, user, searchTerm]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openDetails = (po: PurchaseOrder) => {
    setSelectedPO(po);
    if (po.id.startsWith('SO-')) {
      const rawId = po.id.slice(3);
      setDetailsSellerOrder(sellerOrders.find(s => String(s.id) === rawId) || null);
    } else {
      setDetailsSellerOrder(null);
    }
  };

  const handleEditPO = (po: PurchaseOrder) => {
    if (!po.id.startsWith('SO-')) return;
    const rawId = po.id.slice(3);
    const so = sellerOrders.find(s => String(s.id) === rawId);
    if (so) { setEditingSellerOrder(so); setShowSellerOrderForm(true); }
  };

  const handleSellerOrderSubmit = async (orderData: any) => {
    try {
      if (editingSellerOrder) {
        await ApiService.updateSellerOrder(editingSellerOrder.id, orderData);
      } else {
        await ApiService.createSellerOrder(orderData);
      }
      await loadData();
      setShowSellerOrderForm(false);
      setEditingSellerOrder(null);
    } catch (err) {
      console.error('Failed to save seller order:', err);
    }
  };

  const applyStatusChange = async (
    orderId: string,
    newStatus: string,
    extras?: { rejectionReason?: string }
  ) => {
    if (orderId.startsWith('SO-')) {
      const rawId = orderId.slice(3);
      const so = sellerOrders.find(s => String(s.id) === rawId);
      if (so) {
        const payload: Record<string, unknown> = {
          status: newStatus,
          ...(isSuperAdmin && newStatus === 'Completed' ? { confirmBuyerVerified: true } : {}),
        };
        // Approve: store Pending + approved_by (public label shows Approved)
        if (isSuperAdmin && newStatus === 'Pending') {
          payload.approvedBy = user?.name || user?.email || 'Super Admin';
          payload.approvedAt = new Date().toISOString();
        }
        if (newStatus === 'Rejected') {
          payload.rejectionReason = extras?.rejectionReason || '';
          payload.approvedBy = null;
          payload.approvedAt = null;
        }
        await ApiService.updateSellerOrder(rawId, payload);
        setSellerOrders(prev => prev.map(s =>
          String(s.id) === rawId
            ? {
                ...s,
                status: newStatus as any,
                ...(payload.approvedBy !== undefined ? { approvedBy: payload.approvedBy as any, approved_by: payload.approvedBy } : {}),
                ...(payload.approvedAt !== undefined ? { approvedAt: payload.approvedAt as any, approved_at: payload.approvedAt } : {}),
                ...(payload.rejectionReason !== undefined ? { rejectionReason: payload.rejectionReason as string } : {}),
              }
            : s
        ));
      }
    } else {
      const po = purchaseOrders.find(p => p.id === orderId);
      if (po) {
        const updated = await ApiService.updatePurchaseOrder(orderId, { ...po, status: newStatus });
        setPurchaseOrders(prev => prev.map(p => p.id === orderId ? (updated as PurchaseOrder) : p));
      }
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: string,
    extras?: { rejectionReason?: string }
  ) => {
    try {
      if (isSuperAdmin && newStatus === 'Completed') {
        setPendingCompleteOrderId(orderId);
        return;
      }
      await applyStatusChange(orderId, newStatus, extras);
      setAlertMsg({
        type: 'success',
        text: newStatus === 'Pending'
          ? 'Order approved and ready for delivery.'
          : newStatus === 'Rejected'
            ? 'Order rejected.'
            : 'Order status updated successfully.',
      });
      setSelectedPO(null);
      setDetailsSellerOrder(null);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Order status update failed. Please review required fields.';
      setStatusErrorMessage(msg);
      setAlertMsg({ type: 'error', text: 'Order status update failed.' });
    }
  };

  const exportCSV = () => {
    const headers = ['PO Number','Title','Department','Supplier','Amount','Status','Expected Delivery','Requested By','Requested Date'];
    const rows = unifiedOrders.map(po => [
      po.poNumber, po.title, po.department, po.supplier,
      isNaN(Number(po.totalAmount)) ? '0' : po.totalAmount,
      getPublicOrderStatus(po), po.expectedDeliveryDate, po.requestedBy, po.requestedDate,
    ]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, 'purchase_orders.csv');
  };

  // ── DataTable columns ────────────────────────────────────────────────────
  const columns: ColumnDef<PurchaseOrder, any>[] = useMemo(() => [
    {
      id: 'poDetails',
      header: 'PO Details',
      accessorKey: 'poNumber',
      cell: ({ row }) => {
        const po = row.original;
        return (
          <div className="min-w-[160px]">
            <div className="text-sm font-medium text-gray-900 truncate">{po.poNumber || '—'}</div>
            <div className="text-sm text-gray-500 truncate">{po.title || '—'}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {po.requestedDate ? new Date(po.requestedDate).toLocaleDateString('en-IN') : '—'}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-gray-900">{row.original.department || '—'}</div>
          <div className="text-xs text-gray-500">{row.original.requestedBy || '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-gray-900">{row.original.supplier || '—'}</div>
          <div className="text-xs text-gray-500 truncate max-w-[140px]">{row.original.supplierContact || '—'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'assigneeName',
      header: 'Assignee',
      cell: ({ getValue }) => {
        const name = getValue<string>();
        if (!name) return <span className="text-gray-400 text-sm">—</span>;
        return <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800 font-medium">{name}</span>;
      },
    },
    {
      accessorKey: 'totalAmount',
      header: 'Amount',
      cell: ({ row }) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatIndianShort(Number(row.original.totalAmount) || 0)}
          </div>
          <div className="text-xs text-gray-500">{row.original.currency || 'INR'}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const po        = row.original;
        const pubStatus = getPublicOrderStatus(po);
        return (
          <div className="flex items-center gap-2 min-w-[160px]">
            <StatusBadge status={pubStatus} />
            {isSuperAdmin && !isEndUser && (
              <select
                value={po.status}
                onClick={e => e.stopPropagation()}
                onChange={e => { e.stopPropagation(); handleStatusChange(po.id, e.target.value); }}
                className="ml-1 px-1.5 py-0.5 text-xs rounded border border-surface-border bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {statuses
                  .filter(s => {
                    const pub = getPublicOrderStatus(po);
                    if (pub === 'Approved' && s === 'Pending Approval') return false;
                    if (po.status !== 'Pending Approval' && s === 'Pending Approval') return false;
                    return true;
                  })
                  .map(s => <option key={s} value={s}>{s}</option>)
                }
              </select>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'expectedDeliveryDate',
      header: 'Expected Delivery',
      cell: ({ row }) => {
        const po = row.original;
        const isOverdue = po.expectedDeliveryDate &&
          !['Completed','Cancelled'].includes(po.status) &&
          new Date(po.expectedDeliveryDate) < new Date();
        return (
          <div>
            <div className={`text-sm ${isOverdue ? 'text-danger-600 font-medium' : 'text-gray-900 dark:text-white'}`}>
              {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN') : '—'}
              {isOverdue && <span className="ml-1 text-xs">(Overdue)</span>}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{(po.items || []).length} items</div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      size: 100,
      cell: ({ row }) => {
        const po = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); openDetails(po); }}
              className="p-1.5 text-gray-400 hover:text-primary-600 rounded transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" />
            </button>
            {!isEndUser && (
              <button
                onClick={e => { e.stopPropagation(); handleEditPO(po); }}
                className="p-1.5 text-gray-400 hover:text-success-600 rounded transition-colors"
                title="Edit Order"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isSuperAdmin, isEndUser, statuses, sellerOrders, purchaseOrders]);

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !loading) {
    return (
      <div className="p-4 bg-danger-100 border border-danger-600/20 rounded-card">
        <p className="text-danger-600 font-medium">Error loading procurement data: {error}</p>
        <Button size="sm" variant="danger" className="mt-2" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Inline alert */}
      {alertMsg && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-card text-sm font-medium border ${
          alertMsg.type === 'success'
            ? 'bg-success-100 text-success-800 border-success-600/30'
            : 'bg-danger-100 text-danger-600 border-danger-600/30'
        }`}>
          <span>{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="shrink-0 opacity-60 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      {/* Notification chips */}
      {(pendingApprovalCount > 0 || inProgressOrDeliveredCount > 0 || overdueCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {pendingApprovalCount > 0 && (
            <button
              onClick={() => setSelectedStatus('Pending Approval')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warning-100 text-warning-800 text-sm font-medium rounded-btn border border-warning-600/30 hover:bg-warning-100/80 transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              {pendingApprovalCount} Pending Approval
            </button>
          )}
          {inProgressOrDeliveredCount > 0 && (
            <button
              onClick={() => setSelectedStatus('In Progress')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-info-100 text-info-800 text-sm font-medium rounded-btn border border-info-600/30 hover:bg-info-100/80 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              {inProgressOrDeliveredCount} In Progress / Delivered
            </button>
          )}
          {overdueCount > 0 && (
            <button
              onClick={() => setSelectedStatus('all')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger-100 text-danger-600 text-sm font-medium rounded-btn border border-danger-600/30 hover:bg-danger-100/80 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {overdueCount} Overdue
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Order Management"
        subtitle="Track assets from procurement to delivery"
        actions={
          <div className="flex items-center gap-2">
            {!isEndUser && (
              <>
                <Button variant="ghost" size="sm" iconLeft={<Download className="w-4 h-4" />} onClick={exportCSV}>
                  Export CSV
                </Button>
                <Button variant="ghost" size="sm" iconLeft={<Download className="w-4 h-4" />} onClick={() => themedAlert('Export to PDF coming soon!', 'Coming Soon')}>
                  Export PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeft={<Plus className="w-4 h-4" />}
                  onClick={() => setShowSellerOrderForm(true)}
                >
                  Add Seller Order
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={totalPOs}
          icon={FileText}
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
          change="+15%"
          changeType="positive"
        />
        <StatCard
          title="Active Orders"
          value={activePOs}
          icon={Clock}
          iconBg="bg-warning-100"
          iconColor="text-warning-600"
          change="+8%"
          changeType="positive"
        />
        <StatCard
          title="Completed Orders"
          value={completedPOs}
          icon={CheckCircle}
          iconBg="bg-success-100"
          iconColor="text-success-600"
          change="+12%"
          changeType="positive"
        />
        <StatCard
          title="Total Value"
          value={formatIndianShort(totalValue)}
          icon={IndianRupee}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          change="+20%"
          changeType="positive"
        />
      </div>

      {/* Filters */}
      <SectionCard>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-col gap-1">
            <label className="field-label">Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="Approved">Approved (admin released)</option>
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="field-label">Department</label>
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="border border-surface-border rounded-btn px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {(selectedStatus !== 'all' || selectedDepartment !== 'all') && (
            <div className="flex items-end">
              <button
                onClick={() => { setSelectedStatus('all'); setSelectedDepartment('all'); }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium pb-2"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Orders table */}
      <SectionCard>
        <DataTable<PurchaseOrder>
          data={filteredPOs}
          columns={columns}
          loading={loading}
          enableSorting
          enablePagination
          enableColumnVisibility
          enableExport
          defaultPageSize={20}
          getRowId={row => row.id}
          onRowClick={openDetails}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by PO number, title, department, supplier…"
          exportFilename="purchase_orders"
          emptyTitle="No orders found"
          emptyDescription="Try adjusting your filters or add a new seller order."
          emptyAction={!isEndUser ? { label: 'Add Seller Order', onClick: () => setShowSellerOrderForm(true), icon: <Plus className="w-4 h-4" /> } : undefined}
        />
      </SectionCard>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Seller Order Form */}
      {showSellerOrderForm && (
        <AddOrderForm
          onSubmit={handleSellerOrderSubmit}
          onCancel={() => { setShowSellerOrderForm(false); setEditingSellerOrder(null); }}
          loading={false}
          editingOrder={editingSellerOrder}
        />
      )}

      {/* Purchase Order Details */}
      {selectedPO && (
        <PurchaseOrderDetails
          purchaseOrder={selectedPO}
          sellerOrder={detailsSellerOrder}
          onClose={() => { setSelectedPO(null); setDetailsSellerOrder(null); }}
          onStatusChange={(newStatus, extras) => handleStatusChange(selectedPO.id, newStatus, extras)}
        />
      )}

      {/* Confirm Completion Modal */}
      <Modal
        isOpen={!!pendingCompleteOrderId}
        onClose={() => setPendingCompleteOrderId(null)}
        title="Confirm Completion"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPendingCompleteOrderId(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                const orderId = pendingCompleteOrderId;
                setPendingCompleteOrderId(null);
                if (!orderId) return;
                try {
                  const rawId = orderId.startsWith('SO-') ? orderId.slice(3) : orderId;
                  await ApiService.updateSellerOrder(rawId, { status: 'Completed', confirmBuyerVerified: true });
                  setSellerOrders(prev => prev.map(s => String(s.id) === rawId ? { ...s, status: 'Completed' as any } : s));
                  setAlertMsg({ type: 'success', text: 'Order marked as Completed after buyer verification.' });
                } catch {
                  setAlertMsg({ type: 'error', text: 'Could not mark order as Completed.' });
                }
              }}
            >
              Confirm and Complete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Please confirm you have verified this completion with the buyer before proceeding.
        </p>
      </Modal>

      {/* Status Error Modal */}
      <Modal
        isOpen={!!statusErrorMessage}
        onClose={() => setStatusErrorMessage(null)}
        title="Status Update Blocked"
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setStatusErrorMessage(null)}>OK</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-700">{statusErrorMessage}</p>
      </Modal>

    </div>
  );
};

export default ProcurementDashboard;
