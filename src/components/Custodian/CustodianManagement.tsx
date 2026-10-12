import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, KeyRound, RefreshCw, UserPlus } from 'lucide-react';
import { ApiService } from '../../services/apiService';

interface Custodian {
  id: number;
  buyer_registration_id: number;
  full_name: string;
  email_id: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  /** When set (Super Admin), API calls pass this buyerId. Buyer role omits it (uses token). */
  buyerId?: number | string;
  /** Optional title override. */
  title?: string;
}

const emptyForm = {
  fullName: '',
  emailId: '',
  phone: '',
  password: '',
  status: 'Approved' as 'Approved' | 'Suspended',
};

const CustodianManagement: React.FC<Props> = ({ buyerId, title }) => {
  const [items, setItems] = useState<Custodian[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.listCustodians(buyerId ? { buyerId } : undefined);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custodians');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [buyerId]);

  const startCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const startEdit = (c: Custodian) => {
    setEditingId(c.id);
    setForm({
      fullName: c.full_name,
      emailId: c.email_id,
      phone: c.phone,
      password: '',
      status: (c.status || 'Approved') as 'Approved' | 'Suspended',
    });
    setShowForm(true);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (editingId == null) {
        if (!form.password || form.password.length < 6) {
          setError('Password must be at least 6 characters');
          setSubmitting(false);
          return;
        }
        const res: any = await ApiService.createCustodian({
          ...(buyerId ? { buyerId } : {}),
          fullName: form.fullName,
          emailId: form.emailId,
          phone: form.phone,
          password: form.password,
        });
        const linked = Number(res?.linkedBatches || 0);
        setInfo(
          linked > 0
            ? `Custodian created. ${linked} pending delivery batch${linked === 1 ? '' : 'es'} linked automatically by phone.`
            : 'Custodian created.'
        );
      } else {
        const payload: any = {
          fullName: form.fullName,
          phone: form.phone,
          status: form.status,
        };
        if (form.password) payload.password = form.password;
        const res: any = await ApiService.updateCustodian(editingId, payload);
        const linked = Number(res?.linkedBatches || 0);
        setInfo(
          linked > 0
            ? `Custodian updated. ${linked} pending delivery batch${linked === 1 ? '' : 'es'} linked automatically by phone.`
            : 'Custodian updated.'
        );
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custodian');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this custodian? They will no longer be able to log in or receive batch OTPs.')) return;
    try {
      await ApiService.deleteCustodian(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete custodian');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title || 'Custodians'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Custodians receive batch OTPs and register UIFID serial numbers on delivery.
            Sellers can submit deliveries with just a custodian phone number — any matching custodian you add here (now or later) is linked automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={startCreate} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Custodian
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/60 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}
      {info && (
        <div className="mb-3 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/60 px-3 py-2 text-sm text-green-700 dark:text-green-300">{info}</div>
      )}

      {showForm && (
        <div className="mb-4 rounded-lg border border-gray-200 dark:border-slate-600 p-4 bg-gray-50 dark:bg-slate-700/50">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> {editingId == null ? 'New Custodian' : 'Edit Custodian'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
              <input className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 dark:[color-scheme:dark]" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" disabled={editingId != null} className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-gray-400 dark:[color-scheme:dark]" value={form.emailId} onChange={(e) => setForm((f) => ({ ...f, emailId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 dark:[color-scheme:dark]" placeholder="+91XXXXXXXXXX" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {editingId == null ? 'Password' : 'Reset password (leave blank to keep)'}
              </label>
              <input type="password" className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 dark:[color-scheme:dark]" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            {editingId != null && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select className="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white dark:[color-scheme:dark]" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'Approved' | 'Suspended' }))}>
                  <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="Approved">Approved</option>
                  <option className="bg-white dark:bg-slate-700 text-gray-900 dark:text-white" value="Suspended">Suspended</option>
                </select>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600">Cancel</button>
            <button onClick={submit} disabled={submitting} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Saving...' : (editingId == null ? 'Create' : 'Save changes')}</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Phone</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800">
            {loading && (
              <tr><td colSpan={5} className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">Loading...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                No custodians yet. Sellers can still submit deliveries using a custodian phone number; when you add a custodian with that same phone, any matching pending batches will be linked automatically.
              </td></tr>
            )}
            {!loading && items.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{c.full_name}</td>
                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{c.email_id}</td>
                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{c.phone}</td>
                <td className="px-3 py-2 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'Approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}`}>{c.status || 'Approved'}</span>
                </td>
                <td className="px-3 py-2 text-right text-sm">
                  <button onClick={() => startEdit(c)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3" title="Edit"><Pencil className="h-4 w-4 inline" /></button>
                  <button onClick={() => { startEdit(c); }} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 mr-3" title="Reset password"><KeyRound className="h-4 w-4 inline" /></button>
                  <button onClick={() => remove(c.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300" title="Delete"><Trash2 className="h-4 w-4 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustodianManagement;