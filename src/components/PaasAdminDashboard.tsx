import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { SignOutButton } from "../SignOutButton";

export function PaasAdminDashboard() {
  const paasAdmin = useQuery(api.paasAdmin.getCurrentPaasAdmin);
  const stats = useQuery(api.paasAdmin.getPlatformStats);
  const [filter, setFilter] = useState<{ 
    status?: "active" | "inactive" | "trial" | "suspended"; 
    tier?: "free" | "basic" | "premium"; 
  }>({});
  const associations = useQuery(api.paasAdmin.listAllAssociations, filter);
  const suspendAssociation = useMutation(api.paasAdmin.suspendAssociation);
  const reactivateAssociation = useMutation(api.paasAdmin.reactivateAssociation);
  const updateSubscription = useMutation(api.paasAdmin.updateAssociationSubscription);

  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [showCreateAssociationForm, setShowCreateAssociationForm] = useState(false);
  const [selectedAssociation, setSelectedAssociation] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const handleSuspend = async (associationId: string, reason: string) => {
    try {
      await suspendAssociation({ associationId: associationId as any, reason });
      toast.success("Association suspended successfully");
    } catch (error) {
      toast.error("Failed to suspend association");
    }
  };

  const handleReactivate = async (associationId: string) => {
    try {
      await reactivateAssociation({ associationId: associationId as any });
      toast.success("Association reactivated successfully");
    } catch (error) {
      toast.error("Failed to reactivate association");
    }
  };

  if (!paasAdmin) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-6xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Access Denied</h3>
        <p className="text-slate-600">You don't have PaaS admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">PaaS Admin Dashboard</h1>
          <p className="text-slate-600">
            Welcome back, {paasAdmin.user?.name || paasAdmin.user?.email} ({paasAdmin.role})
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-slate-600">
            {paasAdmin.user?.name || paasAdmin.user?.email}
          </span>
          <SignOutButton />
        </div>
      </div>

      {/* Platform Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <span className="text-blue-600 text-lg">🏢</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Total Associations</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.totalAssociations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <span className="text-green-600 text-lg">✅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Active Associations</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.activeAssociations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <span className="text-yellow-600 text-lg">⏳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Trial Associations</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.trialAssociations}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center">
                    <span className="text-slate-600 text-lg">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-slate-900">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Filter Associations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filter.status || ""}
              onChange={(e) => setFilter({ ...filter, status: (e.target.value || undefined) as any })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tier</label>
            <select
              value={filter.tier || ""}
              onChange={(e) => setFilter({ ...filter, tier: (e.target.value || undefined) as any })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>
        </div>
      </div>

      {/* Associations List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-slate-900">Associations</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCreateAssociationForm(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              🏢 Create Association
            </button>
            {paasAdmin.role === "super_admin" && (
              <button
                onClick={() => setShowCreateAdminForm(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
              >
                👤 Add Admin
              </button>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {associations?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-slate-400 text-6xl mb-4">🏢</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No associations found</h3>
              <p className="text-slate-600">No associations match your current filters.</p>
            </div>
          ) : (
            associations?.map((association) => (
              <div key={association._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-medium text-slate-900">{association.name}</h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          association.subscriptionStatus === "active"
                            ? "bg-green-100 text-green-800"
                            : association.subscriptionStatus === "trial"
                            ? "bg-yellow-100 text-yellow-800"
                            : association.subscriptionStatus === "suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {association.subscriptionStatus}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {association.subscriptionTier}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-slate-500">
                      <span>{association.memberCount} members</span>
                      <span>Created {new Date(association.createdAt).toLocaleDateString()}</span>
                      {association.owner && (
                        <span>Owner: {association.owner.name || association.owner.email}</span>
                      )}
                    </div>
                    {association.suspensionReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700">
                          <strong>Suspension reason:</strong> {association.suspensionReason}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedAssociation(association);
                        setShowSubscriptionModal(true);
                      }}
                      className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                    >
                      Edit Subscription
                    </button>
                    {association.subscriptionStatus === "suspended" ? (
                      <button
                        onClick={() => handleReactivate(association._id)}
                        className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const reason = prompt("Reason for suspension:");
                          if (reason) {
                            handleSuspend(association._id, reason);
                          }
                        }}
                        className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && selectedAssociation && (
        <SubscriptionModal
          association={selectedAssociation}
          onClose={() => {
            setShowSubscriptionModal(false);
            setSelectedAssociation(null);
          }}
          onUpdate={updateSubscription}
        />
      )}

      {/* Create Admin Modal */}
      {showCreateAdminForm && (
        <CreateAdminModal onClose={() => setShowCreateAdminForm(false)} />
      )}

      {/* Create Association Modal */}
      {showCreateAssociationForm && (
        <CreateAssociationModal onClose={() => setShowCreateAssociationForm(false)} />
      )}
    </div>
  );
}

function SubscriptionModal({ association, onClose, onUpdate }: any) {
  const [form, setForm] = useState({
    tier: association.subscriptionTier,
    status: association.subscriptionStatus,
  });
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await onUpdate({
        associationId: association._id,
        tier: form.tier,
        status: form.status,
      });
      toast.success("Subscription updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update subscription");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">
          Update Subscription - {association.name}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tier</label>
            <select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value as any })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {updating ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateAdminModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    email: "",
    role: "support" as "super_admin" | "support" | "billing",
    permissions: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  const createPaasAdmin = useMutation(api.paasAdmin.createPaasAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createPaasAdmin(form);
      toast.success("PaaS admin created successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to create PaaS admin");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Create PaaS Admin</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="support">Support</option>
              <option value="billing">Billing</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700"
            >
              {creating ? "Creating..." : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateAssociationModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    ownerEmail: "",
    subscriptionTier: "free" as "free" | "basic" | "premium",
    subscriptionStatus: "trial" as "active" | "trial" | "inactive",
  });
  const [creating, setCreating] = useState(false);
  const createAssociation = useMutation(api.paasAdmin.createAssociationAsAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createAssociation(form);
      toast.success("Association created successfully");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create association");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Create New Association</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Association Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Sunset Gardens HOA"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Owner Email *
              </label>
              <input
                type="email"
                required
                value={form.ownerEmail}
                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="owner@example.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                An invitation email will be sent. The user must sign up with this email to access the association.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subscription Tier
              </label>
              <select
                value={form.subscriptionTier}
                onChange={(e) => setForm({ ...form, subscriptionTier: e.target.value as any })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Subscription Status
              </label>
              <select
                value={form.subscriptionStatus}
                onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value as any })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the association"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Postal Code
              </label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Country
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Association"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
