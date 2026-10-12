import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Smartphone,
  Laptop,
  Monitor,
  Printer,
  FileText,
  Video,
  Camera,
  MapPin,
  Loader2
} from 'lucide-react';
import { AllocatedDevice } from '../../types';
import { ApiService } from '../../services/apiService';

interface DeviceVerificationProps {
  device: AllocatedDevice;
  onVerificationComplete: (deviceId: string, status: 'Completed' | 'Failed') => void;
  onClose: () => void;
}

const DeviceVerification: React.FC<DeviceVerificationProps> = ({
  device,
  onVerificationComplete,
  onClose
}) => {
  const { user } = useAuth();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoData, setGeoData] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);

  const isMobileDevice = useMemo(() => {
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  }, []);

  const captureFreshGeolocation = (): Promise<{ latitude: number; longitude: number; accuracy?: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not available on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        () => reject(new Error('Location permission is required to verify your device.')),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchGeolocation = async () => {
      if (!navigator.geolocation) {
        if (isMounted) {
          setError('Geolocation is not available on this device.');
          setGeoLoading(false);
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          setGeoData({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          setGeoLoading(false);
        },
        () => {
          if (!isMounted) return;
          setError('Location permission is required to verify your device.');
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    };

    fetchGeolocation();
    return () => {
      isMounted = false;
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'Laptop':
        return <Laptop className="w-6 h-6" />;
      case 'Desktop':
        return <Monitor className="w-6 h-6" />;
      case 'Printer':
        return <Printer className="w-6 h-6" />;
      case 'Scanner':
        return <FileText className="w-6 h-6" />;
      case 'Webcam':
        return <Video className="w-6 h-6" />;
      default:
        return <Smartphone className="w-6 h-6" />;
    }
  };

  const onPhotoChange = (file?: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview('');
      return;
    }
    setPhotoFile(file);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSecureVerify = async () => {
    try {
      setError('');
      if (!isMobileDevice) {
        setError('Verification can only be completed from a mobile device.');
        return;
      }
      if (!photoFile) {
        setError('Please capture a geotagged photo to continue.');
        return;
      }

      setIsSubmitting(true);
      const fresh = await captureFreshGeolocation();
      setGeoData(fresh);

      await ApiService.verifyEndUserDevice(device.id, {
        verificationPhoto: photoFile,
        latitude: fresh.latitude,
        longitude: fresh.longitude,
        accuracy: fresh.accuracy,
        clientTimestamp: new Date().toISOString(),
      });

      onVerificationComplete(device.id, 'Completed');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify device');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {getDeviceIcon(device.deviceType)}
              <div className="ml-3">
                <h2 className="text-xl font-semibold text-gray-900">Secure Device Verification</h2>
                <p className="text-sm text-gray-600">{device.deviceName} - {device.serialNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-5">
            {!isMobileDevice && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                Verification is restricted to mobile devices only. Please open this screen on your phone.
              </div>
            )}

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-blue-700 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Capture from your phone camera</p>
                  <p className="mt-1">
                    When you complete verification, your GPS position is captured again at submit time for accuracy. The
                    server also resolves a readable address where possible. Your photo, coordinates, IP, and timestamp are
                    recorded.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4" />
                Current Location
              </div>
              {geoLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching precise location...
                </div>
              ) : geoData ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <p>Latitude: {geoData.latitude.toFixed(6)}</p>
                  <p>Longitude: {geoData.longitude.toFixed(6)}</p>
                  <p>Accuracy: {Math.round(geoData.accuracy ?? 0)} meters</p>
                </div>
              ) : (
                <p className="text-sm text-red-700">Location unavailable. Enable location permission to continue.</p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer text-sm font-medium">
                <Camera className="h-4 w-4" />
                Capture Verification Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPhotoChange(e.target.files?.[0] || null)}
                />
              </label>
              {photoPreview && (
                <div className="mt-4">
                  <img src={photoPreview} alt="Verification preview" className="max-h-56 rounded-lg border" />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSecureVerify}
                disabled={!isMobileDevice || geoLoading || !photoFile || isSubmitting}
                className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {isSubmitting ? 'Verifying...' : 'Complete Verification'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceVerification; 