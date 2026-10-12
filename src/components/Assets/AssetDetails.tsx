import React, { useState } from 'react';
import { X, Printer, Share2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Asset } from '../../types';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../utils/dateFormatter';
import { themedAlert } from '../../utils/themedDialogs';

interface AssetDetailsProps {
  asset: Asset;
  onClose: () => void;
}

const AssetDetails: React.FC<AssetDetailsProps> = ({ asset, onClose }) => {
  const { t } = useTranslation();
  const [showShareMenu, setShowShareMenu] = useState(false);

  const printAsset = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${t('Asset Details')} - ${asset.name}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .section { margin-bottom: 20px; }
              .section h3 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .info-item { margin-bottom: 10px; }
              .label { font-weight: bold; color: #6b7280; }
              .value { color: #111827; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${t('Asset Details')}</h1>
              <h2>${asset.name}</h2>
            </div>
            <div class="section">
              <h3>${t('Basic Information')}</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">${t('Asset ID')}:</span>
                  <span class="value">${asset.id}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Asset UID')}:</span>
                  <span class="value">${asset.asset_uid || t('Not assigned')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Serial Number')}:</span>
                  <span class="value">${asset.serialNumber}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Name')}:</span>
                  <span class="value">${asset.name}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Category')}:</span>
                  <span class="value">${asset.category}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Department')}:</span>
                  <span class="value">${asset.department}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Status')}:</span>
                  <span class="value">${asset.status}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Value')}:</span>
                  <span class="value">₹${asset.value.toLocaleString()}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('QR Code')}:</span>
                  <span class="value">${asset.qrCode || t('Not generated')}</span>
                </div>
              </div>
            </div>
            <div class="section">
              <h3>${t('Technical Details')}</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">${t('Model')}:</span>
                  <span class="value">${(asset as any).model || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Manufacturer')}:</span>
                  <span class="value">${(asset as any).manufacturer || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Brand')}:</span>
                  <span class="value">${(asset as any).brand || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Condition')}:</span>
                  <span class="value">${(asset as any).condition || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Description')}:</span>
                  <span class="value">${(asset as any).description || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Last Movement')}:</span>
                  <span class="value">${asset.lastMovement || t('Not tracked')}</span>
                </div>
              </div>
            </div>
            <div class="section">
              <h3>${t('Procurement Information')}</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">${t('GEM Contract Number')}:</span>
                  <span class="value">${asset.gem_contract_number || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Procurement Status')}:</span>
                  <span class="value">${asset.procurementStatus || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Delivery Status')}:</span>
                  <span class="value">${asset.deliveryStatus || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Expected Delivery Date')}:</span>
                  <span class="value">${asset.expectedDeliveryDate || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Actual Delivery Date')}:</span>
                  <span class="value">${formatDate(asset.actualDeliveryDate, t('Not specified'))}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Invoice Number')}:</span>
                  <span class="value">${asset.invoiceNumber || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Payment Status')}:</span>
                  <span class="value">${asset.paymentStatus || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Purchase Date')}:</span>
                  <span class="value">${formatDate(asset.purchaseDate, t('Not specified'))}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Supplier')}:</span>
                  <span class="value">${asset.supplier || t('Not specified')}</span>
                </div>
              </div>
            </div>
            ${asset.endUserName || asset.buyerName ? `
            <div class="section">
              <h3>${t('Assignment Information')}</h3>
              <div class="info-grid">
                ${asset.endUserName ? `
                <div class="info-item">
                  <span class="label">${t('End User Name')}:</span>
                  <span class="value">${asset.endUserName}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('End User Designation')}:</span>
                  <span class="value">${asset.endUserDesignation || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('End User Email')}:</span>
                  <span class="value">${asset.endUserEmail || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Allocation Date')}:</span>
                  <span class="value">${asset.allocationDate || t('Not specified')}</span>
                </div>
                ` : ''}
                ${asset.buyerName ? `
                <div class="info-item">
                  <span class="label">${t('Buyer Name')}:</span>
                  <span class="value">${asset.buyerName}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Buyer Department')}:</span>
                  <span class="value">${asset.buyerDepartment || t('Not specified')}</span>
                </div>
                ` : ''}
              </div>
            </div>
            ` : ''}
            <div class="section">
              <h3>${t('Additional Details')}</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">${t('Warranty Expiry')}:</span>
                  <span class="value">${formatDate(asset.warrantyExpiry, t('Not specified'))}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('AMC Expiry')}:</span>
                  <span class="value">${formatDate(asset.amcExpiry, t('Not specified'))}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Location')}:</span>
                  <span class="value">${asset.location || t('Not specified')}</span>
                </div>
                <div class="info-item">
                  <span class="label">${t('Has AMC')}:</span>
                  <span class="value">${asset.hasAmc ? t('Yes') : t('No')}</span>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const shareAsset = async () => {
    const shareData = {
      title: `${t('Asset Details')} - ${asset.name}`,
      text: `${t('Asset ID')}: ${asset.id}\n${t('Asset UID')}: ${asset.asset_uid || t('Not assigned')}\n${t('Serial Number')}: ${asset.serialNumber}\n${t('Category')}: ${asset.category}\n${t('Department')}: ${asset.department}\n${t('Status')}: ${asset.status}\n${t('Value')}: ₹${asset.value.toLocaleString()}\n${t('Supplier')}: ${asset.supplier || t('Not specified')}\n${t('Location')}: ${asset.location || t('Not specified')}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.text);
        await themedAlert(t('Asset information copied to clipboard'), t('Copied'));
      }
    } catch (error) {
      // Error handling for sharing functionality
    }
    setShowShareMenu(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Under Repair':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'Disposed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{t('Asset Details')}</h2>
              <p className="text-gray-600">{asset.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={printAsset}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                title={t('Print Asset')}
              >
                <Printer size={20} />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                  title={t('Share Asset')}
                >
                  <Share2 size={20} />
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                    <button
                      onClick={shareAsset}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {t('Copy to Clipboard')}
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              {getStatusIcon(asset.status)}
              {t('Basic Information')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Asset ID')}</label>
                <p className="text-lg font-semibold text-gray-900">#{asset.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Asset UID')}</label>
                <p className="text-lg font-semibold text-gray-900">{asset.asset_uid || t('Not assigned')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Serial Number')}</label>
                <p className="text-lg font-semibold text-gray-900">{asset.serialNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Name')}</label>
                <p className="text-lg font-semibold text-gray-900">{asset.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Category')}</label>
                <p className="text-lg font-semibold text-gray-900">{asset.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Department')}</label>
                <p className="text-lg font-semibold text-gray-900">{asset.department}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Status')}</label>
                <p className="text-lg font-semibold text-gray-900">{t(asset.status)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Value')}</label>
                <p className="text-lg font-semibold text-green-600">₹{asset.value.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('QR Code')}</label>
                <p className="text-lg font-semibold text-gray-900">{asset.qrCode || t('Not generated')}</p>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Technical Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Model')}</label>
                <p className="text-gray-900">{(asset as any).model || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Manufacturer')}</label>
                <p className="text-gray-900">{(asset as any).manufacturer || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Brand')}</label>
                <p className="text-gray-900">{(asset as any).brand || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Condition')}</label>
                <p className="text-gray-900">{(asset as any).condition || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Description')}</label>
                <p className="text-gray-900">{(asset as any).description || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Last Movement')}</label>
                <p className="text-gray-900">{asset.lastMovement || t('Not tracked')}</p>
              </div>
            </div>
          </div>

          {/* Procurement Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Procurement Information')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('GEM Contract Number')}</label>
                <p className="text-gray-900">{asset.gem_contract_number || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Procurement Status')}</label>
                <p className="text-gray-900">{asset.procurementStatus || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Delivery Status')}</label>
                <p className="text-gray-900">{asset.deliveryStatus || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Expected Delivery Date')}</label>
                <p className="text-gray-900">{asset.expectedDeliveryDate || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Actual Delivery Date')}</label>
                <p className="text-gray-900">{formatDate(asset.actualDeliveryDate, t('Not specified'))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Invoice Number')}</label>
                <p className="text-gray-900">{asset.invoiceNumber || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Payment Status')}</label>
                <p className="text-gray-900">{asset.paymentStatus || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Purchase Date')}</label>
                <p className="text-gray-900">{formatDate(asset.purchaseDate, t('Not specified'))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Supplier')}</label>
                <p className="text-gray-900">{asset.supplier || t('Not specified')}</p>
              </div>
            </div>
            {asset.procurementNotes && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">{t('Procurement Notes')}</label>
                <p className="text-gray-900 mt-1 p-3 bg-white border border-gray-200 rounded-lg">{asset.procurementNotes}</p>
              </div>
            )}
          </div>

          {/* End User Information */}
          {(asset.endUserName || asset.buyerName) && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Assignment Information')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {asset.endUserName && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('End User Name')}</label>
                      <p className="text-gray-900">{asset.endUserName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('End User Designation')}</label>
                      <p className="text-gray-900">{asset.endUserDesignation || t('Not specified')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('End User Email')}</label>
                      <p className="text-gray-900">{asset.endUserEmail || t('Not specified')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('Allocation Date')}</label>
                      <p className="text-gray-900">{asset.allocationDate || t('Not specified')}</p>
                    </div>
                  </>
                )}
                {asset.buyerName && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('Buyer Name')}</label>
                      <p className="text-gray-900">{asset.buyerName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">{t('Buyer Department')}</label>
                      <p className="text-gray-900">{asset.buyerDepartment || t('Not specified')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Additional Details')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Warranty Expiry')}</label>
                <p className="text-gray-900">{formatDate(asset.warrantyExpiry, t('Not specified'))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('AMC Expiry')}</label>
                <p className="text-gray-900">{formatDate(asset.amcExpiry, t('Not specified'))}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Location')}</label>
                <p className="text-gray-900">{asset.location || t('Not specified')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">{t('Has AMC')}</label>
                <p className="text-gray-900">{asset.hasAmc ? t('Yes') : t('No')}</p>
              </div>
            </div>
            {(asset as any).notes && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">{t('Notes')}</label>
                <p className="text-gray-900 mt-1 p-3 bg-white border border-gray-200 rounded-lg">{(asset as any).notes}</p>
              </div>
            )}
          </div>

          {/* Asset Alerts */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Asset Alerts')}</h3>
            <div className="space-y-3">
              {asset.warrantyExpiry && new Date(asset.warrantyExpiry) > new Date() && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-900">{t('Under Warranty')}</p>
                    <p className="text-sm text-blue-700">{t('This asset is currently under warranty coverage')}</p>
                  </div>
                </div>
              )}
              {asset.status === 'Under Repair' && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-medium text-yellow-900">{t('Under Repair')}</p>
                    <p className="text-sm text-yellow-700">{t('This asset is currently being repaired')}</p>
                  </div>
                </div>
              )}
              {!asset.warrantyExpiry && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{t('No Warranty Information')}</p>
                    <p className="text-sm text-gray-700">{t('Warranty expiry date not specified')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Quick Actions')}</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={printAsset}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Printer size={16} />
                {t('Print Asset')}
              </button>
              <button
                onClick={shareAsset}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Share2 size={16} />
                {t('Share Asset')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
