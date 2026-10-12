import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider }         from './contexts/ThemeContext';
import { ToastProvider }         from './components/ui/Toast';
import ProtectedRoute            from './components/Auth/ProtectedRoute';
import { AppShell }              from './components/Layout/AppShell';
import { Skeleton }              from './components/ui/Skeleton';
import './index.css';

// ─── Lazy-loaded pages (code splitting per route) ────────────────────────────
const LoginPage                     = React.lazy(() => import('./components/Auth/LoginPage'));
const BuyerRegistrationPage         = React.lazy(() => import('./components/Auth/BuyerRegistration'));
const SellerRegistrationPage        = React.lazy(() => import('./components/Auth/SellerRegistrationPage'));
const EndUserDeviceRegistrationPage = React.lazy(() => import('./components/Auth/EndUserDeviceRegistrationPage'));

const DashboardOverview             = React.lazy(() => import('./components/Dashboard/DashboardOverview'));
const SuperAdminDashboard           = React.lazy(() => import('./components/SuperAdmin/SuperAdminDashboard'));
const BuyerDashboard                = React.lazy(() => import('./components/Buyer/BuyerDashboard'));
const SellerDashboard               = React.lazy(() => import('./components/Seller/SellerDashboard'));
const EndUserDashboard              = React.lazy(() => import('./components/EndUser/EndUserDashboard'));
const CustodianDashboard            = React.lazy(() => import('./components/Custodian/CustodianDashboard'));
const AssetManagementDashboard      = React.lazy(() => import('./components/Assets/AssetManagementDashboard'));
const ProcurementDashboard          = React.lazy(() => import('./components/Procurement/ProcurementDashboard'));
const ReportsDashboard              = React.lazy(() => import('./components/Reports/ReportsDashboard'));
const ComplaintsDashboard           = React.lazy(() => import('./components/Complaints/ComplaintsDashboard'));
const SecurityDashboard             = React.lazy(() => import('./components/Security/SecurityDashboard'));
const APIStatusDashboard            = React.lazy(() => import('./components/APIStatusDashboard'));

// ─── Page skeleton (shown during lazy load) ───────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="p-6 space-y-4 animate-fade-in">
    <Skeleton className="h-8 w-56 mb-6" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-card" />)}
    </div>
    <Skeleton className="h-72 rounded-card mt-4" />
  </div>
);

// ─── Role-based root redirect ──────────────────────────────────────────────────
const RoleHomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'Buyer')       return <Navigate to="/buyer"      replace />;
  if (user?.role === 'Seller')      return <Navigate to="/seller"     replace />;
  if (user?.role === 'End User')    return <Navigate to="/enduser"    replace />;
  if (user?.role === 'Custodian')   return <Navigate to="/custodian"  replace />;
  if (user?.role === 'Super Admin') return <Navigate to="/superadmin" replace />;
  return <DashboardOverview />;
};

// ─── 404 page ────────────────────────────────────────────────────────────────
const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const home =
    user?.role === 'Buyer'       ? '/buyer'      :
    user?.role === 'Seller'      ? '/seller'     :
    user?.role === 'End User'    ? '/enduser'    :
    user?.role === 'Custodian'   ? '/custodian'  :
    user?.role === 'Super Admin' ? '/superadmin' : '/';
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="text-8xl font-bold text-surface-border mb-4 select-none">404</div>
      <h1 className="text-heading-1 text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-body text-gray-500 mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href={home}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white font-medium rounded-btn shadow-sm hover:bg-primary-700 transition-colors"
      >
        ← Back to Dashboard
      </a>
    </div>
  );
};

// ─── Authenticated wrapper: ProtectedRoute + AppShell + Suspense ─────────────
const AuthPage: React.FC<{ children: React.ReactNode; requiredModule?: string }> = ({
  children,
  requiredModule,
}) => (
  <ProtectedRoute requiredModule={requiredModule}>
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </AppShell>
  </ProtectedRoute>
);

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
          <Routes>

            {/* ════════════════════════════════════════
                PUBLIC — no AppShell, no auth required
                ════════════════════════════════════════ */}
            <Route path="/login"            element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
            <Route path="/register"         element={<Suspense fallback={<PageLoader />}><BuyerRegistrationPage /></Suspense>} />
            <Route path="/seller-register"  element={<Suspense fallback={<PageLoader />}><SellerRegistrationPage /></Suspense>} />
            <Route path="/enduser-register" element={<Suspense fallback={<PageLoader />}><EndUserDeviceRegistrationPage /></Suspense>} />

            {/* ════════════════════════════════════════
                ROOT — role-based redirect
                ════════════════════════════════════════ */}
            <Route path="/" element={<AuthPage><RoleHomeRedirect /></AuthPage>} />

            {/* ════════════════════════════════════════
                SUPER ADMIN
                ════════════════════════════════════════ */}
            <Route path="/superadmin"                  element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/buyers"           element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/sellers"          element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/endusers"         element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/custodians"       element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/registrations"    element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/audit"            element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/settings"         element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/system"           element={<AuthPage><SuperAdminDashboard /></AuthPage>} />
            <Route path="/superadmin/reports"          element={<AuthPage><ReportsDashboard /></AuthPage>} />
            <Route path="/superadmin/assets"           element={<AuthPage requiredModule="assets"><AssetManagementDashboard /></AuthPage>} />
            <Route path="/superadmin/assets/*"         element={<AuthPage requiredModule="assets"><AssetManagementDashboard /></AuthPage>} />
            <Route path="/superadmin/orders"           element={<AuthPage requiredModule="procurement"><ProcurementDashboard /></AuthPage>} />
            <Route path="/superadmin/orders/*"         element={<AuthPage requiredModule="procurement"><ProcurementDashboard /></AuthPage>} />
            {/* Legacy URL redirects — preserve bookmarks */}
            <Route path="/super-admin"                 element={<Navigate to="/superadmin" replace />} />
            <Route path="/super-admin/*"               element={<Navigate to="/superadmin" replace />} />
            <Route path="/superadmin/order-management" element={<Navigate to="/superadmin/orders" replace />} />
            <Route path="/superadmin/order-management/*" element={<Navigate to="/superadmin/orders" replace />} />
            <Route path="/superadmin/buyer-management" element={<Navigate to="/superadmin/buyers" replace />} />
            <Route path="/superadmin/seller-management" element={<Navigate to="/superadmin/sellers" replace />} />
            <Route path="/superadmin/enduser-management" element={<Navigate to="/superadmin/endusers" replace />} />
            <Route path="/superadmin/custodian-management" element={<Navigate to="/superadmin/custodians" replace />} />

            {/* ════════════════════════════════════════
                BUYER
                ════════════════════════════════════════ */}
            <Route path="/buyer"             element={<AuthPage><BuyerDashboard /></AuthPage>} />
            <Route path="/buyer/orders"      element={<AuthPage><BuyerDashboard /></AuthPage>} />
            <Route path="/buyer/assets"      element={<AuthPage><BuyerDashboard /></AuthPage>} />
            <Route path="/buyer/custodians"  element={<AuthPage><BuyerDashboard /></AuthPage>} />
            <Route path="/buyer/escalations" element={<AuthPage><BuyerDashboard /></AuthPage>} />
            <Route path="/buyer/reports"     element={<AuthPage><BuyerDashboard /></AuthPage>} />
            <Route path="/buyer/profile"     element={<AuthPage><BuyerDashboard /></AuthPage>} />
            <Route path="/buyer/*"           element={<AuthPage><BuyerDashboard /></AuthPage>} />

            {/* ════════════════════════════════════════
                SELLER
                ════════════════════════════════════════ */}
            <Route path="/seller"            element={<AuthPage><SellerDashboard /></AuthPage>} />
            <Route path="/seller/orders"     element={<AuthPage><SellerDashboard /></AuthPage>} />
            <Route path="/seller/delivery"   element={<AuthPage><SellerDashboard /></AuthPage>} />
            <Route path="/seller/reports"    element={<AuthPage><SellerDashboard /></AuthPage>} />
            <Route path="/seller/profile"    element={<AuthPage><SellerDashboard /></AuthPage>} />
            <Route path="/seller/*"          element={<AuthPage><SellerDashboard /></AuthPage>} />

            {/* ════════════════════════════════════════
                END USER
                ════════════════════════════════════════ */}
            <Route path="/enduser"           element={<AuthPage><EndUserDashboard /></AuthPage>} />
            <Route path="/enduser/devices"   element={<AuthPage><EndUserDashboard /></AuthPage>} />
            <Route path="/enduser/*"         element={<AuthPage><EndUserDashboard /></AuthPage>} />
            <Route path="/end-user"          element={<Navigate to="/enduser" replace />} />
            <Route path="/end-user/*"        element={<Navigate to="/enduser" replace />} />

            {/* ════════════════════════════════════════
                CUSTODIAN
                ════════════════════════════════════════ */}
            <Route path="/custodian"             element={<AuthPage><CustodianDashboard /></AuthPage>} />
            <Route path="/custodian/deliveries"  element={<AuthPage><CustodianDashboard /></AuthPage>} />
            <Route path="/custodian/assets"      element={<AuthPage><CustodianDashboard /></AuthPage>} />
            <Route path="/custodian/*"           element={<AuthPage><CustodianDashboard /></AuthPage>} />

            {/* ════════════════════════════════════════
                SHARED MODULES
                ════════════════════════════════════════ */}
            <Route path="/reports"           element={<AuthPage><ReportsDashboard /></AuthPage>} />
            <Route path="/reports/*"         element={<AuthPage><ReportsDashboard /></AuthPage>} />
            <Route path="/complaints"        element={<AuthPage><ComplaintsDashboard /></AuthPage>} />
            <Route path="/complaints/*"      element={<AuthPage><ComplaintsDashboard /></AuthPage>} />
            <Route path="/security"          element={<AuthPage><SecurityDashboard /></AuthPage>} />
            <Route path="/security/*"        element={<AuthPage><SecurityDashboard /></AuthPage>} />
            <Route path="/api-status"        element={<AuthPage><APIStatusDashboard /></AuthPage>} />

            {/* ════════════════════════════════════════
                404
                ════════════════════════════════════════ */}
            <Route path="*" element={<AuthPage><NotFoundPage /></AuthPage>} />

          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
