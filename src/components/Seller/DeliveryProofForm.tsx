import React, { useMemo, useState } from 'react';
import { X, Plus, Trash2, CheckCircle } from 'lucide-react';
import { PurchaseOrder } from '../../types';

interface DeliveryProofFormProps {
  purchaseOrder: PurchaseOrder & { sellerOrderId?: number | string; buyerId?: number | string };
  onSubmit: (deliveryData: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface BatchDeliveryInfo {
  batchNumber: string;
  custodianName: string;
  custodianPhone: string;
  custodianEmail: string;
  location: string;
  productName: string;
  quantity: number;
}

const emptyBatch = (): BatchDeliveryInfo => ({
  batchNumber: '',
  custodianName: '',
  custodianPhone: '',
  custodianEmail: '',
  location: '',
  productName: '',
  quantity: 1,
});

const DeliveryProofForm: React.FC<DeliveryProofFormProps> = ({ 
  purchaseOrder, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [batches, setBatches] = useState<BatchDeliveryInfo[]>([emptyBatch()]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deliveryReceipt, setDeliveryReceipt] = useState<File | null>(null);
  const [invoice, setInvoice] = useState<File | null>(null);
  const [warrantyCard, setWarrantyCard] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const productOptions = useMemo(() => {
    const names = (purchaseOrder.items || [])
      .map((item: any) => item?.assetName || item?.productName || '')
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [purchaseOrder.items]);

  const orderedByProduct = useMemo(() => {
    const map = new Map<string, number>();
    (purchaseOrder.items || []).forEach((item: any) => {
      const name = String(item?.assetName || item?.productName || '').trim();
      if (!name) return;
      map.set(name, (map.get(name) || 0) + (Number(item?.quantity) || 0));
    });
    return map;
  }, [purchaseOrder.items]);

  const validateBatches = () => {
    const newErrors: Record<string, string> = {};
    const deliveredByProduct = new Map<string, number>();

    if (batches.length === 0) {
      newErrors.batches = 'At least one batch entry is required';
    }

    batches.forEach((batch, idx) => {
      if (!batch.batchNumber.trim()) newErrors[`batchNumber-${idx}`] = 'Batch Number is required';
      if (!batch.custodianName.trim()) newErrors[`custodianName-${idx}`] = 'Custodian Name is required';
      const phoneDigits = batch.custodianPhone.replace(/\D+/g, '');
      if (!batch.custodianPhone.trim()) {
        newErrors[`custodianPhone-${idx}`] = 'Custodian Phone is required';
      } else if (phoneDigits.length < 10) {
        newErrors[`custodianPhone-${idx}`] = 'Custodian Phone must contain at least 10 digits';
      }
      if (batch.custodianEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(batch.custodianEmail.trim())) {
        newErrors[`custodianEmail-${idx}`] = 'Enter a valid email or leave blank';
      }
      if (!batch.location.trim()) newErrors[`location-${idx}`] = 'Location is required';
      if (!batch.productName.trim()) newErrors[`productName-${idx}`] = 'Product Name is required';
      if (!Number.isInteger(batch.quantity) || batch.quantity <= 0) {
        newErrors[`quantity-${idx}`] = 'Quantity must be a positive whole number';
      }
      if (batch.productName.trim()) {
        deliveredByProduct.set(
          batch.productName.trim(),
          (deliveredByProduct.get(batch.productName.trim()) || 0) + (Number(batch.quantity) || 0)
        );
      }
    });

    let totalOrdered = 0;
    let totalDelivered = 0;
    orderedByProduct.forEach((orderedQty, product) => {
      totalOrdered += orderedQty;
      const deliveredQty = deliveredByProduct.get(product) || 0;
      totalDelivered += deliveredQty;
      if (deliveredQty !== orderedQty) {
        newErrors[`qtyMismatch-${product}`] = `${product}: ordered ${orderedQty}, entered ${deliveredQty}`;
      }
    });
    deliveredByProduct.forEach((deliveredQty, product) => {
      if (!orderedByProduct.has(product)) {
        newErrors[`qtyMismatch-${product}`] = `${product}: not present in GeM order`;
      }
    });
    if (totalDelivered !== totalOrdered) {
      newErrors.totalMismatch = `Total quantity mismatch: ordered ${totalOrdered}, entered ${totalDelivered}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateBatch = (index: number, field: keyof BatchDeliveryInfo, value: string | number) => {
    setBatches(prev => prev.map((batch, idx) => (idx === index ? { ...batch, [field]: value } : batch)));
  };

  const addBatch = () => {
    setBatches(prev => [...prev, emptyBatch()]);
  };

  const removeBatch = (index: number) => {
    if (batches.length === 1) return;
    setBatches(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateBatches()) {
      return;
    }

    const payloadBatches = batches.map(b => ({
      batchNumber: b.batchNumber.trim(),
      custodianName: b.custodianName.trim(),
      custodianPhone: b.custodianPhone.trim(),
      contactNumber: b.custodianPhone.trim(),
      custodianEmail: b.custodianEmail.trim() || undefined,
      location: b.location.trim(),
      productName: b.productName.trim(),
      quantity: b.quantity,
    }));
    onSubmit({
      batches: payloadBatches,
      notes,
      proofFiles: {
        deliveryReceipt: deliveryReceipt || undefined,
        invoice: invoice || undefined,
        warrantyCard: warrantyCard || undefined,
        photos: photos.length ? photos : undefined,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-surface-border dark:border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Delivery Information</h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Purchase Order: {purchaseOrder.poNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Section 1: Batch Delivery Information</h3>
            <div className="space-y-4">
              {batches.map((batch, index) => (
                <div key={index} className="border border-surface-border dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-700">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">Batch #{index + 1}</h4>
                    {batches.length > 1 && (
                      <button type="button" onClick={() => removeBatch(index)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number *</label>
                      <input
                        type="text"
                        value={batch.batchNumber}
                        onChange={(e) => updateBatch(index, 'batchNumber', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 ${errors[`batchNumber-${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custodian Name *</label>
                      <input
                        type="text"
                        value={batch.custodianName}
                        onChange={(e) => updateBatch(index, 'custodianName', e.target.value)}
                        placeholder="Person who will receive this batch"
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 ${errors[`custodianName-${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                      {errors[`custodianName-${index}`] && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[`custodianName-${index}`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custodian Phone *</label>
                      <input
                        type="tel"
                        value={batch.custodianPhone}
                        onChange={(e) => updateBatch(index, 'custodianPhone', e.target.value)}
                        placeholder="+91XXXXXXXXXX"
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 ${errors[`custodianPhone-${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        If the buyer adds a custodian with this phone later, this batch links automatically.
                      </p>
                      {errors[`custodianPhone-${index}`] && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[`custodianPhone-${index}`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custodian Email (optional)</label>
                      <input
                        type="email"
                        value={batch.custodianEmail}
                        onChange={(e) => updateBatch(index, 'custodianEmail', e.target.value)}
                        placeholder="custodian@example.com"
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 ${errors[`custodianEmail-${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                      {errors[`custodianEmail-${index}`] && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[`custodianEmail-${index}`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location *</label>
                      <input
                        type="text"
                        value={batch.location}
                        onChange={(e) => updateBatch(index, 'location', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 ${errors[`location-${index}`] ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                      <select
                        value={batch.productName}
                        onChange={(e) => updateBatch(index, 'productName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:border-slate-600 ${errors[`productName-${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option className="dark:bg-slate-800 dark:text-white" value="">Select product</option>
                        {productOptions.map((product) => (
                          <option className="dark:bg-slate-800 dark:text-white" key={product} value={product}>{product}</option>
                        ))}
                      </select>
                      {errors[`productName-${index}`] && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[`productName-${index}`]}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={batch.quantity}
                        onChange={(e) => updateBatch(index, 'quantity', parseInt(e.target.value || '0', 10))}
                        className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:text-white dark:border-slate-600 dark:placeholder-gray-500 ${errors[`quantity-${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors[`quantity-${index}`] && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[`quantity-${index}`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addBatch}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Batch
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional delivery notes"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Section 2: Delivery Proof Documents</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Upload delivery receipt, invoice, warranty card, or photos (optional).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Receipt</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setDeliveryReceipt(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-slate-700 cursor-pointer"
                />
                {deliveryReceipt && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{deliveryReceipt.name}</p>}
              </div>
              <div className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setInvoice(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-slate-700 cursor-pointer"
                />
                {invoice && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{invoice.name}</p>}
              </div>
              <div className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warranty Card</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setWarrantyCard(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-slate-700 cursor-pointer"
                />
                {warrantyCard && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{warrantyCard.name}</p>}
              </div>
              <div className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotos(Array.from(e.target.files || []))}
                  className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-slate-800 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-slate-700 cursor-pointer"
                />
                {photos.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{photos.length} file(s) selected</p>
                )}
              </div>
            </div>
          </div>

          {(errors.totalMismatch || Object.keys(errors).some((k) => k.startsWith('qtyMismatch-'))) && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-1">Quantity validation failed</p>
              {errors.totalMismatch && <p className="text-red-600 dark:text-red-400 text-sm">{errors.totalMismatch}</p>}
              {Object.entries(errors)
                .filter(([k]) => k.startsWith('qtyMismatch-'))
                .map(([k, v]) => <p key={k} className="text-red-600 dark:text-red-400 text-sm">{v}</p>)}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Delivery Information
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeliveryProofForm; 

