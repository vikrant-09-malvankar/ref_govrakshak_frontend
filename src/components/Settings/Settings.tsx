import React, { useState } from 'react';
import { Settings as SettingsIcon, User, Shield, Bell, Globe, Database, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiService } from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import { themedAlert } from '../../utils/themedDialogs';

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [buyerDetails, setBuyerDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    warranty: true,
    amc: true,
    maintenance: true
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Fetch buyer details if user is a buyer
  React.useEffect(() => {
    const fetchBuyerDetails = async () => {
      if (user?.role === 'Buyer' && user?.id) {
        try {
          setLoadingDetails(true);
          // Try to get user details from API
          const userDetails = await ApiService.get(user?.id ? `/users/${user.id}` : '');
          if (userDetails) {
            setBuyerDetails(userDetails);
          }
        } catch (error) {
          console.error('Failed to fetch buyer details:', error);
        } finally {
          setLoadingDetails(false);
        }
      }
    };
    fetchBuyerDetails();
  }, [user]);

  const tabs = [
    { id: 'profile', label: t('Profile'), icon: User },
    { id: 'security', label: t('Security'), icon: Shield },
    { id: 'notifications', label: t('Notifications'), icon: Bell },
    { id: 'language', label: t('Language'), icon: Globe },
    { id: 'data', label: t('Data Management'), icon: Database }
  ];

  const handleNotificationChange = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const exportData = async () => {
    try {
      setExportLoading(true);
      
      // Fetch all user-related data
      const [assets, complaints, purchaseOrders] = await Promise.all([
        ApiService.getAllAssets().catch(() => []),
        ApiService.getAllComplaints().catch(() => []),
        user ? (user.role === 'Buyer' ? ApiService.getPurchaseOrdersByBuyer(user.id).catch(() => []) : ApiService.getAllPurchaseOrders().catch(() => [])) : []
      ]);

      // Prepare export data
      const exportData = {
        exportDate: new Date().toISOString(),
        user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null,
        data: {
          assets: assets as any[],
          complaints: complaints as any[],
          purchaseOrders: Array.isArray(purchaseOrders) ? purchaseOrders : (purchaseOrders as any)?.orders || []
        }
      };

      // Convert to JSON
      const jsonContent = JSON.stringify(exportData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `gov-raksha-data-export-${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      await themedAlert(t('Failed to export data. Please try again.'), t('Export Failed'));
    } finally {
      setExportLoading(false);
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setImportLoading(true);
        const fileContent = await file.text();
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(fileContent);
          
          // Validate import data structure
          if (!data.data || !data.exportDate) {
            throw new Error('Invalid import file format');
          }

          // Process imported data
          let importedCount = 0;
          
          // Import assets if available
          if (data.data.assets && Array.isArray(data.data.assets)) {
            for (const asset of data.data.assets) {
              try {
                await ApiService.createAsset(asset);
                importedCount++;
              } catch (err) {
                console.warn('Failed to import asset:', err);
              }
            }
          }

          await themedAlert(
            t('Import completed. {{count}} items imported.', { count: importedCount }),
            t('Import Complete')
          );
        } else if (file.name.endsWith('.csv')) {
          // CSV import for assets
          const lines = fileContent.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            throw new Error('CSV file must have a header row and at least one data row');
          }

          const headers = lines[0].split(',').map(h => h.trim());
          let importedCount = 0;

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const assetData: any = {};
            
            headers.forEach((header, index) => {
              assetData[header] = values[index] || '';
            });

            try {
              await ApiService.createAsset(assetData);
              importedCount++;
            } catch (err) {
              console.warn('Failed to import asset from CSV:', err);
            }
          }

          await themedAlert(
            t('Import completed. {{count}} items imported from CSV.', { count: importedCount }),
            t('Import Complete')
          );
        }
      } catch (error) {
        console.error('Import error:', error);
        await themedAlert(
          t('Failed to import data: {{error}}', { error: error instanceof Error ? error.message : 'Unknown error' }),
          t('Import Failed')
        );
      } finally {
        setImportLoading(false);
      }
    };
    input.click();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('Settings')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                {t('Settings')}
              </h2>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow border">
            {/* Profile Settings */}
            {activeTab === 'profile' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Profile Settings')}</h3>
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user?.role === 'Buyer' ? (
                      // Buyer-specific profile fields
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Organization Name')}</label>
                          <input
                            type="text"
                            value={buyerDetails?.organization_name || user?.name || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Ministry/Department')}</label>
                          <input
                            type="text"
                            value={buyerDetails?.ministry_department || user?.department || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Contact Person Name')}</label>
                          <input
                            type="text"
                            value={buyerDetails?.contact_person_name || user?.name || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Designation')}</label>
                          <input
                            type="text"
                            value={buyerDetails?.buyer_designation || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Email')}</label>
                          <input
                            type="email"
                            value={buyerDetails?.email_id || user?.email || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Contact Number')}</label>
                          <input
                            type="tel"
                            value={buyerDetails?.contact_number || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Organization Type')}</label>
                          <input
                            type="text"
                            value={buyerDetails?.organization_type || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        {buyerDetails?.gstin && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('GSTIN')}</label>
                            <input
                              type="text"
                              value={buyerDetails.gstin}
                              readOnly
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      // Generic profile fields for other roles
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Full Name')}</label>
                          <input
                            type="text"
                            value={user?.name || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Email')}</label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Role')}</label>
                          <input
                            type="text"
                            value={user?.role || ''}
                            readOnly
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                          />
                        </div>
                        {user?.department && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('Department')}</label>
                            <input
                              type="text"
                              value={user.department}
                              readOnly
                              disabled
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-700">
                        {t('Profile information is managed by your organization. Contact your administrator for updates.')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Security Settings')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Current Password')}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('New Password')}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Confirm New Password')}</label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="two-factor" className="rounded border-gray-300" />
                    <label htmlFor="two-factor" className="text-sm text-gray-700">
                      {t('Enable Two-Factor Authentication')}
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {t('Update Password')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Notification Settings')}</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">{t('Notification Channels')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('Email Notifications')}</span>
                        <input
                          type="checkbox"
                          checked={notifications.email}
                          onChange={() => handleNotificationChange('email')}
                          className="rounded border-gray-300"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('Push Notifications')}</span>
                        <input
                          type="checkbox"
                          checked={notifications.push}
                          onChange={() => handleNotificationChange('push')}
                          className="rounded border-gray-300"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('SMS Notifications')}</span>
                        <input
                          type="checkbox"
                          checked={notifications.sms}
                          onChange={() => handleNotificationChange('sms')}
                          className="rounded border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">{t('Asset Alerts')}</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('Warranty Expiry Alerts')}</span>
                        <input
                          type="checkbox"
                          checked={notifications.warranty}
                          onChange={() => handleNotificationChange('warranty')}
                          className="rounded border-gray-300"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('AMC Expiry Alerts')}</span>
                        <input
                          type="checkbox"
                          checked={notifications.amc}
                          onChange={() => handleNotificationChange('amc')}
                          className="rounded border-gray-300"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{t('Maintenance Reminders')}</span>
                        <input
                          type="checkbox"
                          checked={notifications.maintenance}
                          onChange={() => handleNotificationChange('maintenance')}
                          className="rounded border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      {t('Save Preferences')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Language Settings */}
            {activeTab === 'language' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Language Settings')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('Select Language')}</label>
                    <select
                      value={(i18n.language || 'en').split('-')[0]}
                      onChange={(e) => { void i18n.changeLanguage(e.target.value); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="mr">मराठी (Marathi)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Data Management */}
            {activeTab === 'data' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('Data Management')}</h3>
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-blue-900 mb-2">{t('Export Data')}</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      {t('Download all your data in CSV format for backup or analysis purposes.')}
                    </p>
                    <button
                      onClick={exportData}
                      disabled={exportLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      {exportLoading ? t('Exporting...') : t('Export Data')}
                    </button>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-green-900 mb-2">{t('Import Data')}</h4>
                    <p className="text-sm text-green-700 mb-3">
                      {t('Import data from CSV files. Make sure the file format matches the expected structure.')}
                    </p>
                    <button
                      onClick={importData}
                      disabled={importLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      {importLoading ? t('Importing...') : t('Import Data')}
                    </button>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-md font-medium text-red-900 mb-2">{t('Danger Zone')}</h4>
                    <p className="text-sm text-red-700 mb-3">
                      {t('Permanently delete your account and all associated data. This action cannot be undone.')}
                    </p>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      {t('Delete Account')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;