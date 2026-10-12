import React, { useState, useEffect } from 'react';
import { Asset } from '../../types';
import { ApiService } from '../../services/apiService';

interface AssetListProps {
  // eslint-disable-next-line no-unused-vars
  onAssetSelect: (asset: Asset) => void;
}

const AssetList: React.FC<AssetListProps> = ({ onAssetSelect }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ApiService.getAllAssets();
      setAssets(data);
    } catch (err) {
      setError(ApiService.handleError(err));
      // Failed to load assets
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error loading assets: {error}</p>
        <button
          onClick={loadAssets}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No assets found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assets.map((asset) => (
        <div
          key={asset.id}
          className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
          onClick={() => onAssetSelect(asset)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{asset.name}</h3>
              <p className="text-sm text-gray-600">
                {asset.category} • {asset.department}
              </p>
              <p className="text-sm text-gray-500">
                Serial: {asset.serialNumber} • Location: {asset.location}
              </p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 text-xs rounded-full ${
                asset.status === 'Active' ? 'bg-green-100 text-green-800' :
                asset.status === 'Under Repair' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {asset.status}
              </span>
              <p className="text-sm text-gray-600 mt-1">
                ₹{asset.value?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetList;