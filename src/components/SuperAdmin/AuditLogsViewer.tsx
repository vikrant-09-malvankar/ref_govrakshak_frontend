import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  FileText,
  Activity,
  Lock,
  Crown,
  ExternalLink,
} from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { SECURITY_CONFIG } from '../../config/security';
import { themedAlert } from '../../utils/themedDialogs';

export type AuditLogsViewerVariant = 'audit' | 'security';

interface AuditStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  authenticationAttempts: number;
  authorizationFailures: number;
  adminActions: number;
  uniqueUsers: number;
  uniqueIPs: number;
  eventsByCategory: Record<string, number>;
  eventsByAction: Record<string, number>;
}

interface SecurityAlert {
  type: string;
  severity: string;
  ipAddress?: string;
  userId?: string;
  count: number;
  message: string;
}

interface AuditLogEntry {
  timestamp: string;
  level: string;
  category: string;
  action: string;
  userId?: string | number;
  userEmail?: string;
  userRole?: string;
  targetUserId?: string | number;
  targetUserEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  success: boolean;
  errorMessage?: string;
}

interface AuditLogsViewerProps {
  /** audit = full trail & analytics; security = alerts, policies, threat metrics */
  variant?: AuditLogsViewerVariant;
}

const AuditLogsViewer: React.FC<AuditLogsViewerProps> = ({ variant = 'audit' }) => {
  const isSecurityView = variant === 'security';
  const [timeRange, setTimeRange] = useState<number>(24);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadAuditData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAuditData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, alertsData] = await Promise.all([
        ApiService.get(`/admin/audit-logs/stats?hours=${timeRange}`),
        ApiService.get(`/admin/security-alerts?hours=${timeRange}`)
      ]);

      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      setError(ApiService.handleError(err));
      console.error('Failed to load audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-blue-600 bg-blue-100';
      case 'SECURITY':
        return 'text-red-600 bg-red-100';
      case 'ADMIN':
        return 'text-purple-600 bg-purple-100';
      case 'ERROR':
        return 'text-orange-600 bg-orange-100';
      case 'WARN':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'MEDIUM':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'LOW':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'INFO':
        return <Activity className="w-4 h-4" />;
      case 'SECURITY':
        return <Lock className="w-4 h-4" />;
      case 'ADMIN':
        return <Crown className="w-4 h-4" />;
      case 'ERROR':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const exportLogs = async () => {
    // Placeholder for export functionality
    await themedAlert('Export logs functionality - will download CSV/JSON file', 'Coming Soon');
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-96">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="ml-4 text-lg text-gray-600">Loading audit logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-600">
        <AlertTriangle className="w-16 h-16 mb-4" />
        <p className="text-lg">{error}</p>
        <button
          onClick={loadAuditData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {isSecurityView
              ? <Lock className="w-7 h-7 text-red-600" />
              : <FileText className="w-7 h-7 text-blue-600" />}
            {isSecurityView ? 'Security Monitoring' : 'Audit Logs'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isSecurityView
              ? 'Live security alerts, authentication threats, and platform policies'
              : 'Event statistics, activity breakdown, and server log access'}
            {' · '}
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={72}>Last 3 Days</option>
            <option value={168}>Last Week</option>
          </select>

          <button
            onClick={loadAuditData}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Security Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">
              Security Alerts Detected ({alerts.length})
            </h3>
          </div>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{alert.type.replace(/_/g, ' ')}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{alert.message}</p>
                    <div className="text-xs space-y-1">
                      {alert.ipAddress && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">IP:</span>
                          <span className="font-mono">{alert.ipAddress}</span>
                        </div>
                      )}
                      {alert.userId && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">User ID:</span>
                          <span className="font-mono">{alert.userId}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Attempts:</span>
                        <span className="font-semibold">{alert.count}</span>
                      </div>
                    </div>
                  </div>
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security policies (security view only) */}
      {isSecurityView && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Authentication</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>Max login attempts: <strong>{SECURITY_CONFIG.RATE_LIMITING.MAX_LOGIN_ATTEMPTS}</strong></li>
              <li>Lockout: <strong>{SECURITY_CONFIG.RATE_LIMITING.LOCKOUT_DURATION / 60000} min</strong></li>
              <li>JWT session: <strong>{SECURITY_CONFIG.SESSION.COOKIE_EXPIRES} days</strong></li>
            </ul>
          </div>
          <div className="bg-white p-5 rounded-xl shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Request Protection</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>CSRF protection: <strong>{SECURITY_CONFIG.CSRF.ENABLED ? 'Enabled' : 'Disabled'}</strong></li>
              <li>CSP: <strong>{SECURITY_CONFIG.CSP.ENABLED ? 'Enabled' : 'Disabled'}</strong></li>
              <li>Secure cookies: <strong>{SECURITY_CONFIG.SESSION.SECURE_COOKIES ? 'Production' : 'Dev mode'}</strong></li>
            </ul>
          </div>
          <div className="bg-white p-5 rounded-xl shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">HTTP Headers</h3>
            </div>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>X-Frame-Options: <strong>{SECURITY_CONFIG.HEADERS.X_FRAME_OPTIONS}</strong></li>
              <li>XSS Protection: <strong>On</strong></li>
              <li>Referrer: <strong className="text-xs">strict-origin</strong></li>
            </ul>
          </div>
        </div>
      )}

      {isSecurityView && (!alerts || alerts.length === 0) && stats && stats.failedEvents === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
          <p className="text-sm text-green-800">No active security alerts in the selected time range.</p>
        </div>
      )}

      {/* Statistics Overview */}
      {stats && (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isSecurityView ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
            {!isSecurityView && (
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Events</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEvents}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  {stats.successfulEvents} successful
                </span>
              </div>
            </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Failed Events</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.failedEvents}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-600">
                  {stats.authorizationFailures} unauthorized attempts
                </span>
              </div>
            </div>

            {!isSecurityView && (
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Admin Actions</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{stats.adminActions}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">
                  By {stats.uniqueUsers} user{stats.uniqueUsers !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Auth Attempts</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.authenticationAttempts}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">
                  From {stats.uniqueIPs} IP{stats.uniqueIPs !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {isSecurityView && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-indigo-900">Need the full audit trail?</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  Event categories, top actions, and server log paths are on the Audit Logs page.
                </p>
              </div>
              <Link
                to="/superadmin/audit"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shrink-0"
              >
                View Audit Logs
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Events by Category — audit view only */}
          {!isSecurityView && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Events by Category
              </h3>
              <div className="space-y-3">
                {Object.entries(stats.eventsByCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      {category === 'AUTHENTICATION' && <Lock className="w-4 h-4 text-green-600" />}
                      {category === 'AUTHORIZATION' && <Shield className="w-4 h-4 text-red-600" />}
                      {category === 'ADMIN_ACTION' && <Crown className="w-4 h-4 text-purple-600" />}
                      {category === 'ERROR' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                      {category === 'SECURITY_EVENT' && <Lock className="w-4 h-4 text-red-600" />}
                      <span className="font-medium text-gray-900">{category.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Top Actions
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {Object.entries(stats.eventsByAction)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 10)
                  .map(([action, count]) => {
                    const isSuccess = action.includes('SUCCESS');
                    const isFailed = action.includes('FAILED');
                    const isUnauthorized = action.includes('UNAUTHORIZED');
                    
                    return (
                      <div key={action} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isSuccess && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                          {isFailed && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                          {isUnauthorized && <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />}
                          {!isSuccess && !isFailed && !isUnauthorized && (
                            <Activity className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 ml-2">{count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          )}

          {/* Log Access Info — audit view only */}
          {!isSecurityView && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Access Full Audit Logs</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Complete audit logs are stored on the server in the <code className="bg-blue-100 px-2 py-1 rounded">logs/</code> directory. 
                  Use SSH to access detailed log files for forensic analysis.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-900">Audit Log</span>
                    </div>
                    <code className="text-xs text-gray-600 block">tail -f logs/audit.log</code>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Lock className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-semibold text-gray-900">Security Log</span>
                    </div>
                    <code className="text-xs text-gray-600 block">tail -f logs/security.log</code>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-900">Admin Log</span>
                    </div>
                    <code className="text-xs text-gray-600 block">tail -f logs/admin.log</code>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-semibold text-gray-900">Error Log</span>
                    </div>
                    <code className="text-xs text-gray-600 block">tail -f logs/error.log</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
};

export default AuditLogsViewer;

