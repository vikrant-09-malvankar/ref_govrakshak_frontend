import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield } from 'lucide-react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredModule?: string;
  requiredAction?: string;
  requiredRole?: string | string[];
  fallback?: React.ReactNode;
}

// Define role-based access control for routes
const getRoleForPath = (pathname: string): string => {
  // Super Admin routes
  if (pathname.startsWith('/superadmin') || pathname.startsWith('/super-admin')) {
    return 'Super Admin';
  }
  // Buyer routes
  if (pathname.startsWith('/buyer')) {
    return 'Buyer';
  }
  // Seller routes
  if (pathname.startsWith('/seller')) {
    return 'Seller';
  }
  // OEM routes (if exists)
  if (pathname.startsWith('/oem')) {
    return 'OEM';
  }
  // End User routes
  if (pathname.startsWith('/enduser') || pathname.startsWith('/end-user')) {
    return 'End User';
  }
  // Custodian routes
  if (pathname.startsWith('/custodian')) {
    return 'Custodian';
  }
  // Default dashboard for all authenticated users
  return 'default';
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredModule, 
  requiredAction = 'view',
  requiredRole,
  fallback 
}) => {
  const { isAuthenticated, hasPermission, user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h2>
            <p className="text-gray-600">
              Verifying your access permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based access control
  const requiredPathRole = getRoleForPath(location.pathname);
  
  // Check if the user has access to this path based on their role
  if (requiredPathRole !== 'default' && user?.role !== requiredPathRole) {
    // Super Admin can access everything
    if (user?.role !== 'Super Admin') {
      return fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">
                You don't have permission to access this page.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">
                  Your role: <span className="font-medium text-gray-700">{user?.role}</span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This page is restricted to: <span className="font-medium text-gray-700">{requiredPathRole}</span>
                </p>
              </div>
              <button
                onClick={() => window.history.back()}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check explicit requiredRole prop
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (user && !allowedRoles.includes(user.role)) {
      return fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">
                You don't have the required role to access this page.
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">
                  Your role: <span className="font-medium text-gray-700">{user?.role}</span>
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Required role: <span className="font-medium text-gray-700">{allowedRoles.join(' or ')}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check specific permissions if required
  if (requiredModule && !hasPermission(requiredModule, requiredAction)) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this section.
            </p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">
                Your role: <span className="font-medium text-gray-700">{user?.role}</span>
              </p>
              <p className="text-sm text-gray-500">
                Required permission: <span className="font-medium text-gray-700">{requiredModule}:{requiredAction}</span>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Available permissions:
              </p>
              <div className="text-xs text-gray-400 mt-1">
                {user?.permissions.map((perm, index) => (
                  <div key={index}>
                    {perm.module}: {perm.actions.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;