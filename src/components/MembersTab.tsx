import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface MembersTabProps {
  associationId: Id<"associations">;
}

export function MembersTab({ associationId }: MembersTabProps) {
  const members = useQuery(api.members.list, { associationId });
  const units = useQuery(api.units.listForMembers, { associationId });
  const inviteMember = useMutation(api.members.create);
  const updateMember = useMutation(api.members.update);
  const removeMember = useMutation(api.members.remove);
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("");
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "member" as "member" | "admin",
    unitId: "",
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Find the unit name by unitId
      const selectedUnit = units?.find(unit => unit._id === inviteForm.unitId);
      
      await inviteMember({
        associationId,
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role,
        unit: selectedUnit?.name || undefined,
      });
      toast.success("Member invited successfully");
      setInviteForm({ email: "", name: "", role: "member", unitId: "" });
      setShowInviteForm(false);
    } catch (error) {
      const errorMessage = (error as Error).message;
      
      // Provide more specific error messages for email-related issues
      if (errorMessage.includes("email") || errorMessage.includes("domain") || errorMessage.includes("Resend")) {
        toast.error("Email sending failed. The member was created but the invitation email could not be sent. Please check your email configuration.");
      } else {
        toast.error("Failed to invite member: " + errorMessage);
      }
    }
  };

  const handleUpdateRole = async (memberId: Id<"members">, newRole: "member" | "admin") => {
    try {
      await updateMember({ id: memberId, role: newRole });
      toast.success("Member role updated");
      setEditingMember(null);
    } catch (error) {
      toast.error("Failed to update member: " + (error as Error).message);
    }
  };

  const handleUpdateUnit = async (memberId: Id<"members">, newUnit: string) => {
    try {
      await updateMember({ id: memberId, unit: newUnit || undefined });
      toast.success("Member unit updated");
      setEditingMember(null);
    } catch (error) {
      toast.error("Failed to update member: " + (error as Error).message);
    }
  };

  const handleRemoveMember = async (memberId: Id<"members">) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    try {
      await removeMember({ id: memberId });
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member: " + (error as Error).message);
    }
  };

  if (!members || !units) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Members</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedUnitFilter}
            onChange={(e) => setSelectedUnitFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Units</option>
            {units?.map((unit) => (
              <option key={unit._id} value={unit.name}>
                {unit.name} {unit.building ? `(${unit.building})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowInviteForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Invite Member
          </button>
        </div>
      </div>

      {showInviteForm && (
        <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="text-lg font-semibold mb-4">Invite New Member</h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as "member" | "admin" })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit
                </label>
                <select
                  value={inviteForm.unitId}
                  onChange={(e) => setInviteForm({ ...inviteForm, unitId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a unit (optional)</option>
                  {units?.map((unit) => (
                    <option key={unit._id} value={unit._id}>
                      {unit.name} {unit.building ? `(${unit.building})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Send Invitation
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {members
              .filter(member => !selectedUnitFilter || member.unit === selectedUnitFilter)
              .map((member) => (
              <tr key={member._id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-slate-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-700">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{member.name}</div>
                      <div className="text-sm text-slate-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {editingMember === member._id ? (
                    <select
                      value={member.unit || ""}
                      onChange={(e) => handleUpdateUnit(member._id, e.target.value)}
                      className="text-sm border border-slate-300 rounded px-2 py-1"
                    >
                      <option value="">No unit</option>
                      {units?.map((unit) => (
                        <option key={unit._id} value={unit.name}>
                          {unit.name} {unit.building ? `(${unit.building})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    member.unit || "—"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingMember === member._id ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member._id, e.target.value as "member" | "admin")}
                      className="text-sm border border-slate-300 rounded px-2 py-1"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.role === "admin" 
                        ? "bg-purple-100 text-purple-800" 
                        : "bg-green-100 text-green-800"
                    }`}>
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    member.status === "active" 
                      ? "bg-green-100 text-green-800" 
                      : member.status === "invited"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "Invited"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {editingMember === member._id ? (
                      <button
                        onClick={() => setEditingMember(null)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingMember(member._id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {members.filter(member => !selectedUnitFilter || member.unit === selectedUnitFilter).length === 0 && (
          <div className="text-center py-8">
            <div className="text-slate-400 text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {selectedUnitFilter ? `No members in ${selectedUnitFilter}` : "No members yet"}
            </h3>
            <p className="text-slate-600">
              {selectedUnitFilter 
                ? "No members are currently assigned to this unit." 
                : "Start by inviting your first member to the association."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
