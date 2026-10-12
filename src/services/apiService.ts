// Types for fetch API - using built-in HeadersInit type
// type HeadersInit = Headers | string[][] | Record<string, string>;

// Determine API base URL based on environment
export const getApiBaseUrl = () => {
  // If we have an explicit API URL from environment, use it (highest priority)
  if (import.meta.env['VITE_API_URL']) {
    return import.meta.env['VITE_API_URL'];
  }

  // In production, use the current domain with /api
  if (import.meta.env.PROD) {
    return `${window.location.origin}/api`;
  }

  // In development, use /api (relative to current domain)
  return '/api';
};

/** Origin hosting the API (for static uploads served from the same host as /api). */
export const getApiOrigin = (): string => {
  const base = getApiBaseUrl();
  if (base.startsWith('http')) {
    return base.replace(/\/api\/?$/i, '');
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

/** Build a fetchable URL for a stored upload path (or return absolute URLs as-is). */
export const resolveUploadUrl = (path: string | null | undefined): string | null => {
  if (path == null || typeof path !== 'string') return null;
  const p = path.trim();
  if (!p) return null;
  if (/^(https?:\/\/|data:|blob:)/i.test(p)) return p;
  const normalized = p.replace(/\\/g, '/');
  const rel = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const base = getApiBaseUrl();
  if (base.startsWith('http')) {
    return `${getApiOrigin()}${rel}`;
  }
  return rel;
};

const API_BASE_URL = getApiBaseUrl();

export class ApiService {
  private static getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {

    if (!response.ok) {

      // 401 = missing token; 403 from auth middleware = invalid/expired JWT (e.g. after JWT_SECRET rotate on redeploy)
      if (response.status === 401 || response.status === 403) {
        let authError = response.status === 401 ? 'Unauthorized access' : 'Invalid or expired token';
        try {
          const errBody = await response.clone().json();
          if (errBody?.error) authError = errBody.error;
        } catch { /* ignore */ }
        // Only force re-login when auth failed — keep other 403s (role Forbidden) as-is
        if (response.status === 401 || /invalid|expired|token|unauthorized|access token/i.test(authError)) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error(authError);
        }
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const retrySeconds = retryAfter ? parseInt(retryAfter) : 60;
        const retryMinutes = Math.ceil(retrySeconds / 60);

        try {
          const errorData = await response.json();
          throw new Error(`Rate limit exceeded. Please try again in ${retryMinutes} minute(s). ${errorData.message || ''}`);
        } catch {
          throw new Error(`Rate limit exceeded. Please try again in ${retryMinutes} minute(s).`);
        }
      }

      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.details && typeof errorData.details === 'string') {
          errorMessage = `${errorMessage}: ${errorData.details}`;
        }
      } catch {
        // JSON parse failed, keep default HTTP error message
      }

      throw new Error(errorMessage);
    }
  
    return response.json();
  }

  // Generic HTTP methods
  static async get<T = any>(url: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<T>(response);
  }

  // Asset Management
  static async getAllAssets() {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getAssetById(id: string) {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createAsset(assetData: any) {
    const response = await fetch(`${API_BASE_URL}/assets`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(assetData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateAsset(id: string, assetData: any) {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(assetData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async deleteAsset(id: string) {
    const response = await fetch(`${API_BASE_URL}/assets/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async searchAssets(query: string) {
    const response = await fetch(`${API_BASE_URL}/search/assets?q=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Purchase Order Management
  static async getAllPurchaseOrders() {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getPurchaseOrdersBySeller(sellerId: string) {
    const response = await fetch(`${API_BASE_URL}/orders/seller/${sellerId}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getPurchaseOrdersByBuyer(buyerId: string) {
    const response = await fetch(`${API_BASE_URL}/orders/buyer/${buyerId}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getPurchaseOrderById(id: string) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createPurchaseOrder(orderData: any) {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(orderData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updatePurchaseOrder(id: string, orderData: any) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(orderData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async deletePurchaseOrder(id: string) {
    const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async confirmBuyerOrderDelivery(orderId: string) {
    const rawId = String(orderId).startsWith('SO-') ? String(orderId).slice(3) : orderId;
    const response = await fetch(`${API_BASE_URL}/orders/${rawId}/confirm-delivery`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Reports and Analytics
  static async getProcurementStats(filters: {
    period?: string;
    department?: string;
    vendor?: string;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.department) queryParams.append('department', filters.department);
    if (filters.vendor) queryParams.append('vendor', filters.vendor);
    if (filters.category) queryParams.append('category', filters.category);

    const response = await fetch(`${API_BASE_URL}/reports/procurement-stats?${queryParams}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getAssetStats(filters: {
    period?: string;
    department?: string;
    category?: string;
    status?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.department) queryParams.append('department', filters.department);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.status) queryParams.append('status', filters.status);

    const response = await fetch(`${API_BASE_URL}/reports/asset-stats?${queryParams}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getVendorPerformanceStats(filters: {
    period?: string;
    department?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.department) queryParams.append('department', filters.department);

    const response = await fetch(`${API_BASE_URL}/reports/vendor-performance?${queryParams}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getDeliveryAnalytics(filters: {
    period?: string;
    department?: string;
    vendor?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.department) queryParams.append('department', filters.department);
    if (filters.vendor) queryParams.append('vendor', filters.vendor);

    const response = await fetch(`${API_BASE_URL}/reports/delivery-analytics?${queryParams}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getFinancialSummary(filters: {
    period?: string;
    department?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters.period) queryParams.append('period', filters.period);
    if (filters.department) queryParams.append('department', filters.department);

    const response = await fetch(`${API_BASE_URL}/reports/financial-summary?${queryParams}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Complaint Management
  static async getAllComplaints() {
    const response = await fetch(`${API_BASE_URL}/complaints`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getComplaintById(id: string) {
    const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getComplaintsForAsset(assetId: string | number) {
    const response = await fetch(`${API_BASE_URL}/assets/${assetId}/complaints`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createComplaint(complaintData: any) {
    const response = await fetch(`${API_BASE_URL}/complaints`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(complaintData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateComplaint(id: string, complaintData: any) {
    const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(complaintData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }


  // User Management
  static async getAllUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getApprovedBuyers() {
    const response = await fetch(`${API_BASE_URL}/users?role=Buyer`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getApprovedSellers() {
    const response = await fetch(`${API_BASE_URL}/users?role=Seller`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getCurrentSellerProfile() {
    const response = await fetch(`${API_BASE_URL}/seller/profile`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getCurrentBuyerProfile() {
    const response = await fetch(`${API_BASE_URL}/buyer/profile`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getUserById(id: string) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createUser(userData: any) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateUser(id: string, userData: any) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async resetUserPassword(userId: string, userType: 'buyer' | 'seller' | 'enduser') {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userType }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateBuyer(userId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/buyer`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateSeller(userId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/seller`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateEndUser(userId: string, data: any) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/enduser`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // User Management - Delete methods
  static async deleteBuyer(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/buyer`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async deleteSeller(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/seller`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async deleteEndUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/enduser`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Delete approved user (from core users table)
  static async deleteApprovedUser(userId: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Approve user status
  static async approveUserStatus(userId: string, userType: 'buyer' | 'seller' | 'enduser') {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userType, approvedBy: '1' }), // Default superadmin ID
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Update user status (for suspend/activate operations)
  static async updateUserStatus(userId: string | number, userType: 'buyer' | 'seller' | 'enduser' | 'user', status: 'active' | 'suspended') {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userType, status }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Registration Management
  static async getPendingBuyerRegistrations() {
    const response = await fetch(`${API_BASE_URL}/registrations/buyer/pending`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createBuyerRegistration(registrationData: any) {
    const response = await fetch(`${API_BASE_URL}/registrations/buyer`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(registrationData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getBuyerRegistrations() {
    const response = await fetch(`${API_BASE_URL}/registrations/buyer`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<Array<{ id: number; organization_name?: string; contact_person_name?: string; email_id?: string; status?: string }>>(response);
  }

  static async createSellerRegistration(registrationData: any) {
    const response = await fetch(`${API_BASE_URL}/registrations/seller`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(registrationData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createEndUserDeviceRegistration(registrationData: any) {
    const response = await fetch(`${API_BASE_URL}/registrations/enduser`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(registrationData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async uploadLogo(logoFile: File): Promise<{ logoPath: string }> {
    const formData = new FormData();
    formData.append('logo', logoFile);

    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload/logo`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    return this.handleResponse<{ logoPath: string }>(response);
  }

  static async uploadLogoPublic(logoFile: File): Promise<{ logoPath: string }> {
    const formData = new FormData();
    formData.append('logo', logoFile);

    const response = await fetch(`${API_BASE_URL}/upload/logo/public`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    return this.handleResponse<{ logoPath: string }>(response);
  }

  static async getPendingSellerRegistrations() {
    const response = await fetch(`${API_BASE_URL}/registrations/seller/pending`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getPendingEndUserRegistrations() {
    const response = await fetch(`${API_BASE_URL}/registrations/enduser/pending`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateRegistrationStatus(registrationId: string, status: string, reason?: string) {
    const response = await fetch(`${API_BASE_URL}/registrations/${registrationId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, reason }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Seller Order Management
  static async getAllSellerOrders() {
    const response = await fetch(`${API_BASE_URL}/seller-orders`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getSellerOrderById(id: string) {
    const response = await fetch(`${API_BASE_URL}/seller-orders/${id}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getSellerOrderByGemContract(gemContractNumber: string) {
    const response = await fetch(`${API_BASE_URL}/seller-orders/gem/${encodeURIComponent(gemContractNumber)}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createSellerOrder(orderData: any) {
    const hasFiles =
      typeof FormData !== 'undefined' && (
        orderData instanceof FormData ||
        orderData?.gemOrderFile instanceof File ||
        orderData?.oemAuthorizationLetter instanceof File ||
        orderData?.workOrderFile instanceof File ||
        orderData?.purchaseOrderFile instanceof File
      );
    if (hasFiles) {
      const formData = orderData instanceof FormData ? orderData : new FormData();
      if (!(orderData instanceof FormData)) {
        Object.entries(orderData || {}).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          if (value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        });
      }
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE_URL}/seller-orders`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });
      return this.handleResponse(response);
    }
    const response = await fetch(`${API_BASE_URL}/seller-orders`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(orderData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateSellerOrder(id: string, orderData: any) {
    const hasFiles =
      typeof FormData !== 'undefined' && (
        orderData instanceof FormData ||
        orderData?.gemOrderFile instanceof File ||
        orderData?.oemAuthorizationLetter instanceof File ||
        orderData?.workOrderFile instanceof File ||
        orderData?.purchaseOrderFile instanceof File
      );
    if (hasFiles) {
      const formData = orderData instanceof FormData ? orderData : new FormData();
      if (!(orderData instanceof FormData)) {
        Object.entries(orderData || {}).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          if (value instanceof File) {
            formData.append(key, value);
          } else if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        });
      }
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE_URL}/seller-orders/${id}`, {
        method: 'PUT',
        headers,
        body: formData,
        credentials: 'include',
      });
      return this.handleResponse(response);
    }
    const response = await fetch(`${API_BASE_URL}/seller-orders/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(orderData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Seller Order Capacity
  static async getSellerOrderCapacity(orderId: string, category?: string): Promise<{ ordered: number; registered: number; remaining: number; category?: string; }> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await fetch(`${API_BASE_URL}/seller-orders/${orderId}/capacity${q}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async uploadSellerDeliveryProof(id: string, data: {
    deliveryDate: string;
    purchaseOrderNumber?: string;
    otpVerified: boolean;
    notes?: string;
    deliveryReceipt?: File;
    invoice?: File;
    warrantyCard?: File;
    photos?: File[];
  }) {
    const form = new FormData();
    form.append('deliveryDate', data.deliveryDate);
    if (data.purchaseOrderNumber) form.append('purchaseOrderNumber', String(data.purchaseOrderNumber));
    form.append('otpVerified', String(data.otpVerified));
    if (data.notes) form.append('notes', data.notes);
    if (data.deliveryReceipt) form.append('deliveryReceipt', data.deliveryReceipt);
    if (data.invoice) form.append('invoice', data.invoice);
    if (data.warrantyCard) form.append('warrantyCard', data.warrantyCard);
    (data.photos || []).forEach((p) => form.append('photos', p));

    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(`${API_BASE_URL}/seller-orders/${id}/delivery-proof`, {
      method: 'POST',
      headers,
      body: form,
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Enhanced delivery proof upload with quantity validation
  static async uploadDeliveryProof(formData: FormData) {
    const token = localStorage.getItem('authToken');
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
    const response = await fetch(`${API_BASE_URL}/delivery-proof/upload`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateSellerDeliveryInformation(orderId: string, data: {
    batches: Array<{
      batchNumber: string;
      custodianName: string;
      custodianPhone?: string;
      custodianEmail?: string;
      custodianRegistrationId?: number | string;
      inventoryManagerName?: string;
      contactNumber: string;
      location: string;
      productName: string;
      quantity: number;
    }>;
    notes?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/seller-orders/${orderId}/delivery-information`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async sendSellerBatchOtp(orderId: string, batchIndex: number) {
    const response = await fetch(`${API_BASE_URL}/seller-orders/${orderId}/delivery-batches/${batchIndex}/send-otp`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async verifySellerBatchOtp(orderId: string, batchIndex: number, otp: string) {
    const response = await fetch(`${API_BASE_URL}/seller-orders/${orderId}/delivery-batches/${batchIndex}/verify-otp`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ otp }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getQrPdfManifest(orderId: string | number) {
    const response = await fetch(`${API_BASE_URL}/seller-orders/${orderId}/qr-pdf-manifest`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<{
      orderId: number;
      gemContractNumber: string;
      batches: Array<{ index: number; batchNumber: string; productName: string; location: string; custodianName: string; quantity: number; hasUnits: boolean }>;
    }>(response);
  }

  static async downloadQrPdf(orderId: string | number, batchIndex: number): Promise<Blob> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/seller-orders/${orderId}/delivery-batches/${batchIndex}/qr-pdf`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    if (!response.ok) {
      let message = `Failed to download QR PDF (${response.status})`;
      try {
        const data = await response.json();
        if (data?.error) message = data.error;
      } catch { /* binary, no body */ }
      throw new Error(message);
    }
    return response.blob();
  }

  // Custodian management (Buyer + Super Admin)
  static async listCustodians(params?: { buyerId?: string | number }) {
    const qs = params?.buyerId ? `?buyerId=${encodeURIComponent(String(params.buyerId))}` : '';
    const response = await fetch(`${API_BASE_URL}/custodians${qs}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<Array<{
      id: number;
      buyer_registration_id: number;
      full_name: string;
      email_id: string;
      phone: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>>(response);
  }

  static async getCustodiansForOrder(orderId: string | number) {
    const response = await fetch(`${API_BASE_URL}/seller-orders/${orderId}/custodians`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<Array<{
      id: number;
      full_name: string;
      email_id: string;
      phone: string;
    }>>(response);
  }

  static async createCustodian(data: { buyerId?: string | number; fullName: string; emailId: string; phone: string; password: string; }) {
    const response = await fetch(`${API_BASE_URL}/custodians`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateCustodian(id: string | number, data: { fullName?: string; phone?: string; status?: string; password?: string; }) {
    const response = await fetch(`${API_BASE_URL}/custodians/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async deleteCustodian(id: string | number) {
    const response = await fetch(`${API_BASE_URL}/custodians/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Custodian (logged in) operations
  static async getCustodianDeliveries() {
    const response = await fetch(`${API_BASE_URL}/custodian/deliveries`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<{ orders: Array<{
      id: number;
      gemContractNumber: string;
      productSummary?: string;
      batches: Array<{
        index: number;
        batchNumber: string;
        productName: string;
        location: string;
        status: string;
        deliveredAt?: string | null;
        otpVerified?: boolean;
        units: Array<{
          uifid: string;
          serial_number: string | null;
          status?: string;
          registeredAt?: string | null;
          asset?: {
            id: number;
            status: string | null;
            acknowledgmentStatus: string | null;
            verificationStatus: string | null;
            verifiedAt?: string | null;
            verificationMetadata?: Record<string, unknown> | null;
          } | null;
        }>;
      }>;
    }> }>(response);
  }

  static async registerCustodianSerial(orderId: string | number, batchIndex: number, uifid: string, serialNumber: string) {
    const response = await fetch(`${API_BASE_URL}/custodian/seller-orders/${orderId}/batches/${batchIndex}/units/${encodeURIComponent(uifid)}/serial`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ serial_number: serialNumber }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async uploadCustodianSerialsCsv(orderId: string | number, batchIndex: number, csvFile: File) {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('file', csvFile);
    const response = await fetch(`${API_BASE_URL}/custodian/seller-orders/${orderId}/batches/${batchIndex}/serials`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Server-Sent Events stream for a seller order's live progress
  static subscribeToSellerOrder(orderId: string | number, onEvent: (event: { type: string; payload: any }) => void): () => void {
    const token = localStorage.getItem('authToken');
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const es = new EventSource(`${API_BASE_URL}/events/seller-orders/${orderId}${qs}`, { withCredentials: true });
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        onEvent(data);
      } catch { /* ignore */ }
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }

  // Dashboard Statistics
  static async getDashboardStats() {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Bulk upload assets (CSV)
  static async bulkUploadAssets(file: File) {
    const token = localStorage.getItem('authToken');
    const form = new FormData();
    form.append('file', file);
    const response = await fetch(`${API_BASE_URL}/assets/bulk-upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } as HeadersInit : {} as HeadersInit,
      body: form,
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Quote Management
  static async getAllQuotes() {
    const response = await fetch(`${API_BASE_URL}/quotes`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async getQuoteById(id: string) {
    const response = await fetch(`${API_BASE_URL}/quotes/${id}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async createQuote(quoteData: any) {
    const response = await fetch(`${API_BASE_URL}/quotes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(quoteData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async updateQuote(id: string, quoteData: any) {
    const response = await fetch(`${API_BASE_URL}/quotes/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(quoteData),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // Error handling utility
  static handleError(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  // User approval methods
  static async approveUser(userId: string, userType: 'buyer' | 'seller' | 'enduser', approvedBy: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userType, approvedBy }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async bulkApproveUsers(registrationIds: string[], userType: 'buyer' | 'seller' | 'enduser', approvedBy: string) {
    const response = await fetch(`${API_BASE_URL}/users/bulk-approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ registrationIds, userType, approvedBy }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async rejectUser(userId: string, userType: 'buyer' | 'seller' | 'enduser', rejectedBy: string, reason: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ userType, rejectedBy, reason }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  static async bulkRejectUsers(registrationIds: string[], userType: 'buyer' | 'seller' | 'enduser', rejectedBy: string, reason: string) {
    const response = await fetch(`${API_BASE_URL}/users/bulk-reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ registrationIds, userType, rejectedBy, reason }),
      credentials: 'include',
    });
    return this.handleResponse(response);
  }

  // End User Device Management Methods
  static async getEndUserDevices(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/enduser/devices`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse<any[]>(response);
    } catch (error) {
      console.error('Error fetching end user devices:', error);
      throw error;
    }
  }

  static async addDeviceBySerialNumber(serialNumber: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/enduser/devices/add`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ serialNumber }),
    });
    return this.handleResponse<any>(response);
  }

  static async verifyEndUserDevice(deviceId: string, payload: {
    verificationPhoto: File;
    latitude: number;
    longitude: number;
    accuracy?: number;
    clientTimestamp?: string;
  }): Promise<any> {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('verificationPhoto', payload.verificationPhoto);
    formData.append('latitude', String(payload.latitude));
    formData.append('longitude', String(payload.longitude));
    if (typeof payload.accuracy === 'number') {
      formData.append('accuracy', String(payload.accuracy));
    }
    if (payload.clientTimestamp) {
      formData.append('clientTimestamp', payload.clientTimestamp);
    }

    const response = await fetch(`${API_BASE_URL}/enduser/devices/${deviceId}/verify`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
      credentials: 'include',
    });

    return this.handleResponse<any>(response);
  }

  static async updateWarrantyStatus(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/update-warranty-status`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error updating warranty status:', error);
      throw error;
    }
  }

  static async updateDeviceRepairStatus(deviceId: string, status: 'Active' | 'Disposed'): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${deviceId}/repair-status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error updating device repair status:', error);
      throw error;
    }
  }

  static async getEndUserDeviceById(deviceId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/enduser/devices/${deviceId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error fetching device details:', error);
      throw error;
    }
  }

  // Dashboard methods
  static async getRecentActivity(limit: number = 10): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/dashboard/recent-activity?limit=${limit}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<any[]>(response);
  }

  // PDF Parsing methods
  static async parseGeMContractPDF(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('pdf', file);

    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/parse-gem-contract`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    return this.handleResponse<any>(response);
  }

  // Escalation Management Methods
  static async getAllEscalations(filters?: {
    buyerId?: string;
    status?: string;
    priority?: string;
    type?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (filters?.buyerId) queryParams.append('buyerId', filters.buyerId);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.priority) queryParams.append('priority', filters.priority);
    if (filters?.type) queryParams.append('type', filters.type);

    const queryString = queryParams.toString();
    const url = `${API_BASE_URL}/escalations${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<any[]>(response);
  }

  static async getEscalationById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/escalations/${id}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error fetching escalation:', error);
      throw error;
    }
  }

  static async createEscalation(escalationData: {
    title: string;
    description: string;
    type: string;
    priority: string;
    purchaseOrderId?: string;
    purchaseOrderNumber?: string;
    vendorName?: string;
    notes?: any[];
    attachments?: string[];
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/escalations`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(escalationData),
        credentials: 'include',
      });
      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error creating escalation:', error);
      throw error;
    }
  }

  static async updateEscalation(id: string, escalationData: {
    title?: string;
    description?: string;
    status?: string;
    assignedTo?: string;
    resolution?: string;
    notes?: any[];
    attachments?: string[];
  }) {
    try {
      const response = await fetch(`${API_BASE_URL}/escalations/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(escalationData),
        credentials: 'include',
      });
      return await this.handleResponse<any>(response);
    } catch (error) {
      console.error('Error updating escalation:', error);
      throw error;
    }
  }

  // OTP Management Methods
  static async generateOTP(purchaseOrderId: string, contactNumber: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/otp/generate`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ purchaseOrderId, contactNumber }),
        credentials: 'include',
      });
      return await this.handleResponse<{ message: string; expiresAt: string }>(response);
    } catch (error) {
      console.error('Error generating OTP:', error);
      throw error;
    }
  }

  static async verifyOTP(purchaseOrderId: string, contactNumber: string, otp: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/otp/verify`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ purchaseOrderId, contactNumber, otp }),
        credentials: 'include',
      });
      return await this.handleResponse<{ valid: boolean; message: string }>(response);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  static async resendOTP(purchaseOrderId: string, contactNumber: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/otp/resend`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ purchaseOrderId, contactNumber }),
        credentials: 'include',
      });
      return await this.handleResponse<{ message: string; expiresAt: string }>(response);
    } catch (error) {
      console.error('Error resending OTP:', error);
      throw error;
    }
  }

  // Product/Brand Management Methods
  static async getProductNames() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/names`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      return await this.handleResponse<string[]>(response);
    } catch (error) {
      console.error('Error fetching product names:', error);
      // Return default values on error
      return ['Laptop', 'Desktop', 'Printer', 'Scanner', 'Server', 'Network Equipment'];
    }
  }

  static async getBrands() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/brands`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      return await this.handleResponse<string[]>(response);
    } catch (error) {
      console.error('Error fetching brands:', error);
      // Return default values on error
      return ['Dell', 'HP', 'Lenovo', 'Cisco', 'IBM', 'Apple'];
    }
  }
}
