import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { posthog } from "posthog-js";

export function LeadsTab() {
  const [filter, setFilter] = useState<{ 
    status?: "new" | "contacted" | "qualified" | "converted" | "lost"; 
  }>({});
  
  const leads = useQuery(api.leads.listLeads, filter);
  const stats = useQuery(api.leads.getLeadStats);
  const updateLeadStatus = useMutation(api.leads.updateLeadStatus);
  const assignLead = useMutation(api.leads.assignLead);

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showLeadModal, setShowLeadModal] = useState(false);

  const handleUpdateStatus = async (leadId: string, status: string, notes?: string) => {
    try {
      await updateLeadStatus({ 
        leadId: leadId as any, 
        status: status as any,
        notes 
      });
      toast.success("Lead status updated successfully");
    } catch (error) {
      toast.error("Failed to update lead status");
      posthog.captureException(error);
    }
  };

  const handleAssignLead = async (leadId: string, assignedTo: string) => {
    try {
      await assignLead({ 
        leadId: leadId as any, 
        assignedTo 
      });
      toast.success("Lead assigned successfully");
    } catch (error) {
      toast.error("Failed to assign lead");
      posthog.captureException(error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-yellow-100 text-yellow-800";
      case "qualified":
        return "bg-green-100 text-green-800";
      case "converted":
        return "bg-purple-100 text-purple-800";
      case "lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Enterprise Leads</h2>
          <p className="text-slate-600">Manage and track enterprise inquiries</p>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-blue-600 text-lg">📊</span>
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Total Leads</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-blue-600 text-lg">🆕</span>
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">New</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.new}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <span className="text-yellow-600 text-lg">📞</span>
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Contacted</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.contacted}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-green-600 text-lg">✅</span>
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Qualified</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.qualified}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <span className="text-purple-600 text-lg">💰</span>
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Converted</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.converted}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                    <span className="text-red-600 text-lg">❌</span>
                  </div>
                </div>
                <div className="ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Lost</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.lost}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Filter Leads</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filter.status || ""}
              onChange={(e) => setFilter({ ...filter, status: (e.target.value || undefined) as any })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">Leads</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {leads?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-slate-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No leads found</h3>
              <p className="text-slate-600">No leads match your current filters.</p>
            </div>
          ) : (
            leads?.map((lead) => (
              <div key={lead._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-slate-900">{lead.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-slate-500">
                      <span>{lead.email}</span>
                      <span>{lead.companyName}</span>
                      <span>{lead.phoneNumber}</span>
                      <span>Submitted {new Date(lead.createdAt).toLocaleDateString()}</span>
                    </div>
                    {lead.notes && (
                      <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md">
                        <p className="text-sm text-slate-700">
                          <strong>Notes:</strong> {lead.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowLeadModal(true);
                      }}
                      className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      View Details
                    </button>
                    <select
                      value={lead.status}
                      onChange={(e) => handleUpdateStatus(lead._id, e.target.value)}
                      className="px-3 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lead Details Modal */}
      {showLeadModal && selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          onClose={() => {
            setShowLeadModal(false);
            setSelectedLead(null);
          }}
          onUpdateStatus={handleUpdateStatus}
          onAssignLead={handleAssignLead}
        />
      )}
    </div>
  );
}

function LeadDetailsModal({ lead, onClose, onUpdateStatus, onAssignLead }: any) {
  const [form, setForm] = useState({
    status: lead.status,
    notes: lead.notes || "",
    assignedTo: lead.assignedTo || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStatus(lead._id, form.status, form.notes);
    if (form.assignedTo) {
      onAssignLead(lead._id, form.assignedTo);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-slate-900">
            Lead Details - {lead.name}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <p className="text-sm text-slate-900">{lead.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <p className="text-sm text-slate-900">{lead.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Company</label>
              <p className="text-sm text-slate-900">{lead.companyName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <p className="text-sm text-slate-900">{lead.phoneNumber}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Message</label>
            <div className="mt-1 p-3 bg-slate-50 rounded-md">
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{lead.message}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Submitted</label>
            <p className="text-sm text-slate-900">
              {new Date(lead.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this lead..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
            <input
              type="text"
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="User ID or email"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Update Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 