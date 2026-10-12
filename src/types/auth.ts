export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Buyer' | 'Seller' | 'OEM' | 'End User' | 'Custodian';
  department: string;
  avatar?: string;
  permissions: Permission[];
  sellerRegistrationId?: string;
  buyerRegistrationId?: string;
  custodianRegistrationId?: string;
}

export interface Permission {
  module: string;
  actions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (module: string, action: string) => boolean;
  loading: boolean;
  loginError: string;
  clearLoginError: () => void;
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
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
  ],
  'Custodian': [
    { module: 'dashboard', actions: ['view'] },
    { module: 'deliveries', actions: ['view'] },
    { module: 'serials', actions: ['view', 'create'] }
  ]
};