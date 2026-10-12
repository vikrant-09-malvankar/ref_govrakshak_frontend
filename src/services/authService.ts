import { User, LoginCredentials, LoginResult } from '../types/auth';

// Determine API base URL based on environment (consistent with apiService.ts)
const getApiBaseUrl = () => {
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

const API_BASE_URL = getApiBaseUrl();

export class AuthService {
  static async authenticateUser(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          return { success: false, error: errorData.error || 'Authentication failed' };
        } catch {
          return { success: false, error: `Server error: ${response.status} ${response.statusText}` };
        }
      }

      const data = await response.json();
      
      if (data.success && data.token) {
        // Store token in localStorage or secure storage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: `Network error: ${errorMessage}` };
    }
  }

  // Note: These methods are not available on the client side
  // They are only implemented on the server
  static generateToken(_user: User): string {
    throw new Error('Token generation is not available on the client side');
  }

  static verifyToken(_token: string): any {
    throw new Error('Token verification is not available on the client side');
  }

  static async hashPassword(_password: string): Promise<string> {
    throw new Error('Password hashing is not available on the client side');
  }

  static async verifyPassword(_password: string, _hash: string): Promise<boolean> {
    throw new Error('Password verification is not available on the client side');
  }

  static async createUser(userData: Omit<User, 'id' | 'permissions'> & { password: string }): Promise<User> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      return await response.json();
    } catch {
      throw new Error('Failed to create user');
    }
  }

  static async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
        credentials: 'include',
      });

      return response.ok;
    } catch {
      throw new Error('Failed to update user password');
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      throw new Error('Failed to fetch user');
    }
  }

  static getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }

  static logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  static async refreshToken(): Promise<boolean> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('authToken', data.token);
        return true;
      }

      return false;
    } catch {
      throw new Error('Token refresh failed');
    }
  }

  private static getPermissionsForRole(role: 'Super Admin' | 'Buyer' | 'Seller' | 'OEM' | 'End User'): any[] {
    const rolePermissions = {
      'Super Admin': [
        { module: 'dashboard', actions: ['view', 'export', 'manage'] },
        { module: 'assets', actions: ['view', 'create', 'edit', 'delete', 'export', 'bulk_upload', 'approve', 'dispose'] },
        { module: 'procurement', actions: ['view', 'create', 'edit', 'delete', 'export', 'approve', 'manage'] },
        { module: 'reports', actions: ['view', 'generate', 'export', 'schedule'] },
        { module: 'settings', actions: ['view', 'edit', 'configure'] },
        { module: 'users', actions: ['view', 'create', 'edit', 'delete', 'assign_roles'] },
        { module: 'system', actions: ['view', 'configure', 'maintain'] },
        { module: 'superadmin', actions: ['view', 'manage'] },
        { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] },
        { module: 'devices', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] },
        { module: 'tutorials', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] },
        { module: 'tickets', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] },
        { module: 'warranty', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] },
        { module: 'amc', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] },
        { module: 'checklist', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] },
        { module: 'support', actions: ['view', 'create', 'edit', 'delete', 'export', 'manage'] }
      ],
      'Buyer': [
        { module: 'dashboard', actions: ['view', 'export'] },
        { module: 'assets', actions: ['view', 'create', 'edit', 'export', 'request_approval'] },
        { module: 'complaints', actions: ['view', 'create', 'edit', 'track'] },
        { module: 'reports', actions: ['view', 'generate', 'export'] },
        { module: 'settings', actions: ['view'] },
        { module: 'procurement', actions: ['view', 'create', 'edit', 'track'] }
      ],
      'Seller': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'assets', actions: ['view', 'create', 'edit', 'export'] },
        { module: 'complaints', actions: ['view', 'create', 'edit', 'resolve'] },
        { module: 'procurement', actions: ['view', 'create', 'edit', 'track'] },
        { module: 'reports', actions: ['view', 'generate'] },
        { module: 'settings', actions: ['view'] },
        { module: 'sales', actions: ['view', 'create', 'edit', 'track'] },
        { module: 'support', actions: ['view', 'create', 'edit', 'resolve', 'assign'] }
      ],
      'OEM': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'assets', actions: ['view', 'create', 'edit', 'export'] },
        { module: 'complaints', actions: ['view', 'create', 'edit', 'resolve', 'warranty_claims'] },
        { module: 'procurement', actions: ['view', 'create', 'edit', 'track'] },
        { module: 'reports', actions: ['view', 'generate'] },
        { module: 'settings', actions: ['view'] },
        { module: 'warranty', actions: ['view', 'create', 'edit', 'approve'] },
        { module: 'maintenance', actions: ['view', 'create', 'edit', 'schedule'] }
      ],
      'End User': [
        { module: 'dashboard', actions: ['view'] },
        { module: 'devices', actions: ['view', 'acknowledge', 'verify'] },
        { module: 'amc', actions: ['view', 'contact'] },
        { module: 'tickets', actions: ['view', 'create', 'track'] },
        { module: 'checklist', actions: ['view', 'complete'] },
        { module: 'support', actions: ['view', 'contact'] }
      ]
    };

    return rolePermissions[role] || [];
  }
}
