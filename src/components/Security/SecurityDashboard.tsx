/**
 * SecurityDashboard — modernized with shared UI system.
 * Uses PageHeader, Card/SectionCard for consistent layout.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Activity, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AuditLogsViewer from '../SuperAdmin/AuditLogsViewer';
import { PageHeader } from '../ui/PageHeader';
import { Card, SectionCard } from '../ui/Card';

const SecurityDashboard: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  return (
    <div className="space-y-6">

      <PageHeader
        title="Security"
        subtitle={isSuperAdmin
          ? 'Security alerts, authentication threats, and platform policies'
          : 'Your session security and compliance guidelines'}
        icon={<Shield className="w-5 h-5 text-indigo-600" />}
      />

      {isSuperAdmin ? (
        <SectionCard
          title="Security Monitoring"
          subtitle="Live alerts and threat metrics — not the full audit trail"
          actions={
            <Link
              to="/superadmin/audit"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <FileText className="w-4 h-4" />
              Audit Logs
            </Link>
          }
        >
          <AuditLogsViewer variant="security" />
        </SectionCard>
      ) : (
        /* Read-only security info for other roles */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-success-100 rounded-lg shrink-0">
                  <Lock className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Session Security</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Your session is protected with JWT authentication and CSRF tokens.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-info-100 rounded-lg shrink-0">
                  <Activity className="h-5 w-5 text-info-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Activity Monitoring</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    All actions in this system are logged and monitored for security compliance.
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-warning-100 rounded-lg shrink-0">
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Report Issues</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Contact your system administrator to report any security concerns.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="bg-indigo-50 border border-indigo-200/60 rounded-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-indigo-900">Security Best Practices</h3>
            </div>
            <ul className="text-sm text-indigo-700 space-y-2 list-disc list-inside">
              <li>Never share your login credentials with anyone.</li>
              <li>Always log out when you are done using the system.</li>
              <li>Report any suspicious activity to your administrator immediately.</li>
              <li>Use a strong, unique password for your account.</li>
              <li>Do not access the system from public or unsecured networks.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;
