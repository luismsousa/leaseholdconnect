import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";

interface AuditTabProps {
  member: Doc<"members">;
}

export function AuditTab({ member }: AuditTabProps) {
  const [filters, setFilters] = useState({
    action: "",
    entityType: "",
    startDate: "",
    endDate: "",
    limit: 100,
  });

  const auditLogs = useQuery(api.audit.getAuditLogs, {
    action: filters.action || undefined,
    entityType: filters.entityType || undefined,
    startDate: filters.startDate ? new Date(filters.startDate).getTime() : undefined,
    endDate: filters.endDate ? new Date(filters.endDate).getTime() : undefined,
    limit: filters.limit,
  });

  const auditStats = useQuery(
    api.audit.getAuditStats, 
    member.role === "admin" ? { days: 30 } : "skip"
  );

  const auditFilters = useQuery(api.audit.getAuditFilters, {});

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionIcon = (action: string) => {
    const iconMap: Record<string, string> = {
      member_invited: "✉️",
      member_role_updated: "👤",
      member_status_updated: "🔄",
      member_unit_assigned: "🏠",
      member_unit_removed: "🏚️",
      unit_created: "🏗️",
      unit_updated: "✏️",
      unit_deleted: "🗑️",
      document_uploaded: "📄",
      document_deleted: "🗑️",
      voting_topic_created: "🗳️",
      voting_topic_activated: "✅",
      voting_topic_closed: "🔒",
      vote_cast: "☑️",
      user_login: "🔑",
      user_logout: "🚪",
    };
    return iconMap[action] || "📝";
  };

  const getEntityTypeColor = (entityType: string) => {
    const colorMap: Record<string, string> = {
      member: "bg-blue-100 text-blue-800",
      unit: "bg-green-100 text-green-800",
      document: "bg-purple-100 text-purple-800",
      vote: "bg-orange-100 text-orange-800",
      voting_topic: "bg-red-100 text-red-800",
      auth: "bg-gray-100 text-gray-800",
    };
    return colorMap[entityType] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Log</h2>
          <p className="text-slate-600">
            {member.role === "admin" 
              ? "View all system activities and user actions" 
              : "View your activity history"}
          </p>
        </div>
      </div>

      {/* Statistics (Admin Only) */}
      {member.role === "admin" && auditStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Events</p>
                <p className="text-2xl font-bold text-slate-900">{auditStats.totalEvents}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">👥</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">{auditStats.uniqueUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🔥</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Top Action</p>
                <p className="text-sm font-bold text-green-600">
                  {Object.entries(auditStats.eventsByAction).sort(([,a], [,b]) => b - a)[0]?.[0] || "None"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📈</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Avg/Day</p>
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(auditStats.totalEvents / 30)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Actions</option>
              {auditFilters?.actions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type</label>
            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Types</option>
              {auditFilters?.entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value={50}>50 events</option>
              <option value={100}>100 events</option>
              <option value={250}>250 events</option>
              <option value={500}>500 events</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setFilters({
              action: "",
              entityType: "",
              startDate: "",
              endDate: "",
              limit: 100,
            })}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">Activity Log</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {auditLogs?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-slate-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No audit logs found</h3>
              <p className="text-slate-600">
                {filters.action || filters.entityType || filters.startDate || filters.endDate
                  ? "No activities match the selected filters."
                  : "No activities have been recorded yet."}
              </p>
            </div>
          ) : (
            auditLogs?.map((log) => (
              <div key={log._id} className="px-6 py-4">
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{getActionIcon(log.action)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityTypeColor(log.entityType)}`}
                      >
                        {log.entityType.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {log.action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{log.details.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500">
                      <span>{formatTimestamp(log.timestamp)}</span>
                      {log.user && (
                        <span>
                          by {log.user.name} ({log.user.email})
                        </span>
                      )}
                      {log.member && log.member.unit && (
                        <span>Unit: {log.member.unit}</span>
                      )}
                      {log.entityId && (
                        <span>ID: {log.entityId.slice(-8)}</span>
                      )}
                    </div>
                    {log.details.metadata && Object.keys(log.details.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                          View Details
                        </summary>
                        <pre className="mt-1 text-xs text-slate-600 bg-slate-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
