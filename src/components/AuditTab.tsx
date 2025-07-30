import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import {
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  CogIcon,
  FunnelIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface AuditTabProps {
  associationId: Id<"associations">;
}

type FilterType = "all" | "entity" | "action";

// Type definition for audit log objects
type AuditLog = {
  _id: Id<"auditLogs">;
  _creationTime: number;
  associationId: Id<"associations">;
  userId: string;
  memberId?: Id<"members">;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  metadata?: any;
  timestamp: number;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  member?: {
    _id: Id<"members">;
    name: string;
    email: string;
    unit?: string;
  };
};

export function AuditTab({ associationId }: AuditTabProps) {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [action, setAction] = useState("");
  const [limit, setLimit] = useState(50);

  // Get audit logs with filters
  const auditLogs = useQuery(api.audit.list, {
    associationId,
    entityType: filterType === "entity" && entityType ? entityType : undefined,
    entityId: filterType === "entity" && entityId ? entityId : undefined,
    action: filterType === "action" && action ? action : undefined,
    limit,
  });

  // Get stats
  const stats = useQuery(api.audit.getStats, { associationId });

  // Get user's own activity
  const myActivity = useQuery(api.audit.getMyActivity, {
    associationId,
    limit: 20,
  });

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: "bg-green-100 text-green-800",
      update: "bg-blue-100 text-blue-800",
      delete: "bg-red-100 text-red-800",
      view: "bg-gray-100 text-gray-800",
      login: "bg-purple-100 text-purple-800",
      logout: "bg-gray-100 text-gray-800",
    };
    return colors[action.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const getEntityIcon = (entityType: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      member: UserIcon,
      meeting: CalendarIcon,
      document: DocumentTextIcon,
      unit: CogIcon,
      association: CogIcon,
    };
    return icons[entityType.toLowerCase()] || DocumentTextIcon;
  };

  if (
    auditLogs === undefined ||
    stats === undefined ||
    myActivity === undefined
  ) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
          <ChartBarIcon className="h-6 w-6 mr-2" />
          Audit Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalLogs}
            </div>
            <div className="text-sm text-blue-600">Total Logs</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {Object.keys(stats.actionCounts).length}
            </div>
            <div className="text-sm text-green-600">Action Types</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(stats.entityCounts).length}
            </div>
            <div className="text-sm text-purple-600">Entity Types</div>
          </div>
        </div>
      </div>

      {/* My Activity Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          My Recent Activity
        </h3>
        <div className="space-y-3">
          {myActivity.length === 0 ? (
            <p className="text-slate-500 text-center py-4">
              No recent activity found.
            </p>
          ) : (
            myActivity.slice(0, 5).map((log: AuditLog) => (
              <div
                key={log._id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
                  >
                    {log.action}
                  </span>
                  <span className="text-sm text-slate-600">
                    {log.description}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
          <FunnelIcon className="h-5 w-5 mr-2" />
          Filter Audit Logs
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Logs</option>
              <option value="entity">By Entity</option>
              <option value="action">By Action</option>
            </select>
          </div>

          {filterType === "entity" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entity Type
                </label>
                <input
                  type="text"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  placeholder="e.g., member, meeting"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entity ID
                </label>
                <input
                  type="text"
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  placeholder="Entity ID"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {filterType === "action" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Action
              </label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g., create, update"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">
          Audit Logs
        </h3>

        {auditLogs.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No audit logs found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {auditLogs.map((log: AuditLog) => {
                  const EntityIcon = getEntityIcon(log.entityType);
                  return (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <EntityIcon className="h-4 w-4 mr-2 text-slate-400" />
                          <span className="text-sm text-slate-900">
                            {log.entityType}
                            {log.entityId && (
                              <span className="text-slate-500 ml-1">
                                ({log.entityId})
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900 max-w-xs truncate">
                          {log.description || "No description"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">
                          {log.user.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {log.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.member ? (
                          <div>
                            <div className="text-sm text-slate-900">
                              {log.member.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {log.member.unit && `Unit ${log.member.unit}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatTimestamp(log.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
