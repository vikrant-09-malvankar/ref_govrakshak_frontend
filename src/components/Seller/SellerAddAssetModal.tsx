import React, { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  createAsset: (payload: any) => Promise<any>;
  sellerName?: string;
  sellerDepartment?: string;
  allowedGemContracts?: string[]; // normalized list (trimmed + lowercased)
};

const generateUifid13 = () =>
  Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');

const normalizeContract = (v: string) => String(v || '').trim().toLowerCase();

export default function SellerAddAssetModal({
  open,
  onClose,
  onCreated,
  createAsset,
  sellerName,
  sellerDepartment,
  allowedGemContracts = [],
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    gem_contract_number: '',
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    department: sellerDepartment || '',
    purchase_date: '',
    warranty_expiry: '',
    amc_expiry: '',
    price: '',
  });
  const [gemTouched, setGemTouched] = useState(false);
  const allowedSet = React.useMemo(
    () => new Set((allowedGemContracts || []).map(normalizeContract)),
    [allowedGemContracts]
  );
  const gemIsAllowed = allowedSet.size === 0
    ? true
    : allowedSet.has(normalizeContract(form.gem_contract_number));

  if (!open) return null;

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.gem_contract_number || !form.category || !form.model || !form.serial_number) return;
    if (!gemIsAllowed) {
      setGemTouched(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        asset_uid: generateUifid13(),
        gem_contract_number: form.gem_contract_number.trim(),
        category: form.category.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        serial_number: form.serial_number.trim(),
        location: form.location.trim(),
        department: form.department.trim(),
        purchase_date: form.purchase_date || null,
        warranty_expiry: form.warranty_expiry || null,
        amc_expiry: form.amc_expiry || null,
        price: form.price ? Number.parseFloat(form.price) : null,
        source: 'seller',
        seller_name: sellerName || undefined,
      };
      await createAsset(payload);
      await onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} />
      <div className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">Add Asset</h3>
          <button type="button" className="text-gray-500 hover:text-gray-700" onClick={onClose} disabled={submitting}>
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">GeM Contract Number</span>
              <input
                name="gem_contract_number"
                value={form.gem_contract_number}
                onChange={(e) => {
                  if (!gemTouched) setGemTouched(true);
                  onChange(e);
                }}
                className={`input input-bordered ${gemTouched && !gemIsAllowed ? 'input-error' : ''}`}
                required
                placeholder="e.g., GEM/2025/B/1234567"
              />
              {gemTouched && !gemIsAllowed ? (
                <span className="text-xs text-red-600">
                  Must match one of your approved seller orders.
                </span>
              ) : (
                <span className="text-xs text-gray-500">
                  Must match one of your approved seller orders.
                </span>
              )}
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Category</span>
              <input name="category" value={form.category} onChange={onChange} className="input input-bordered" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Brand</span>
              <input name="brand" value={form.brand} onChange={onChange} className="input input-bordered" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Model</span>
              <input name="model" value={form.model} onChange={onChange} className="input input-bordered" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Serial Number</span>
              <input name="serial_number" value={form.serial_number} onChange={onChange} className="input input-bordered" required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Location</span>
              <input name="location" value={form.location} onChange={onChange} className="input input-bordered" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Department</span>
              <input name="department" value={form.department} onChange={onChange} className="input input-bordered" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Price</span>
              <input
                name="price"
                value={form.price}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, '');
                  setForm((f) => ({ ...f, price: v }));
                }}
                inputMode="decimal"
                className="input input-bordered"
                placeholder="e.g., 49999.00"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Purchase Date</span>
              <input type="date" name="purchase_date" value={form.purchase_date} onChange={onChange} className="input input-bordered" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Warranty Expiry</span>
              <input type="date" name="warranty_expiry" value={form.warranty_expiry} onChange={onChange} className="input input-bordered" />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">AMC Expiry</span>
              <input type="date" name="amc_expiry" value={form.amc_expiry} onChange={onChange} className="input input-bordered" />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !gemIsAllowed}>
              {submitting ? 'Saving…' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}