import React, { useEffect, useState } from 'react';
import { Download, X, QrCode, Loader2 } from 'lucide-react';
import { ApiService } from '../../services/apiService';

type BatchManifest = {
  index: number;
  batchNumber: string;
  productName: string;
  location: string;
  custodianName: string;
  quantity: number;
  hasUnits: boolean;
};

interface QrPdfDownloadModalProps {
  open: boolean;
  onClose: () => void;
  orderId: string | number | null;
  gemContractNumber?: string;
}

const QrPdfDownloadModal: React.FC<QrPdfDownloadModalProps> = ({ open, onClose, orderId, gemContractNumber }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchManifest[]>([]);
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [headerGem, setHeaderGem] = useState<string>('');

  useEffect(() => {
    if (!open || !orderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    ApiService.getQrPdfManifest(orderId)
      .then((data) => {
        if (cancelled) return;
        setBatches(Array.isArray(data?.batches) ? data.batches : []);
        setHeaderGem(data?.gemContractNumber || gemContractNumber || '');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load batches');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderId, gemContractNumber]);

  const handleDownload = async (idx: number, batchNumber: string) => {
    if (!orderId) return;
    setDownloadingIdx(idx);
    try {
      const blob = await ApiService.downloadQrPdf(orderId, idx);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safe = String(batchNumber || `batch-${idx + 1}`).replace(/[^a-z0-9_-]+/gi, '_');
      a.download = `qr-${safe}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download QR PDF');
    } finally {
      setDownloadingIdx(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 px-4">
      <div className="w-full max-w-xl rounded-lg bg-white dark:bg-slate-800 shadow-xl border border-transparent dark:border-slate-700">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-5 py-3">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Download Batch QR Codes</h3>
              {headerGem && (
                <p className="text-xs text-gray-500 dark:text-gray-400">GeM Order: {headerGem}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading batches...
            </div>
          )}
          {error && !loading && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
          )}
          {!loading && !error && batches.length === 0 && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300">
              No batches available. Save delivery information first to allocate UIFIDs.
            </div>
          )}
          {!loading && !error && batches.length > 0 && (
            <ul className="divide-y divide-gray-100 dark:divide-slate-700">
              {batches.map((b) => (
                <li key={b.index} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Batch {b.batchNumber}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {b.productName} • Qty {b.quantity} • {b.location || 'Location TBD'}
                    </p>
                    {b.custodianName && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">Custodian: {b.custodianName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownload(b.index, b.batchNumber)}
                    disabled={!b.hasUnits || downloadingIdx === b.index}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingIdx === b.index ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {downloadingIdx === b.index ? 'Generating...' : 'Download PDF'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-200 dark:border-slate-700 px-5 py-3">
          <button onClick={onClose} className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrPdfDownloadModal;
