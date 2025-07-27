import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface MembersTabProps {
  member: Doc<"members">;
}

export function MembersTab({ member }: MembersTabProps) {
  const members = useQuery(api.members.listMembers, member.role === "admin" ? {} : "skip");
  const availableUnits = useQuery(api.documents.getAvailableUnits, member.role === "admin" ? {} : "skip");
  const inviteMember = useMutation(api.members.inviteMember);
  const updateMemberRole = useMutation(api.members.updateMemberRole);
  const updateMemberStatus = useMutation(api.members.updateMemberStatus);
  const assignMemberToUnit = useMutation(api.units.assignMemberToUnit);
  const removeMemberFromUnit = useMutation(api.units.removeMemberFromUnit);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    unit: "",
  });

  const [showUnitAssignModal, setShowUnitAssignModal] = useState(false);
  const [selectedMemberForUnit, setSelectedMemberForUnit] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteMember({
        email: inviteForm.email,
        name: inviteForm.name,
        unit: inviteForm.unit,
      });
      toast.success("Invitation sent successfully");
      setInviteForm({ email: "", name: "", unit: "" });
      setShowInviteForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    }
  };

  const handleRoleChange = async (memberId: string, role: "admin" | "member") => {
    try {
      await updateMemberRole({ memberId: memberId as any, role });
      toast.success("Member role updated");
    } catch (error) {
      toast.error("Failed to update member role");
    }
  };

  const handleStatusChange = async (memberId: string, status: "active" | "inactive") => {
    try {
      await updateMemberStatus({ memberId: memberId as any, status });
      toast.success("Member status updated");
    } catch (error) {
      toast.error("Failed to update member status");
    }
  };

  const handleUnitAssignment = (memberItem: any) => {
    setSelectedMemberForUnit(memberItem);
    setSelectedUnit(memberItem.unit || "");
    setShowUnitAssignModal(true);
  };

  const handleAssignUnit = async () => {
    if (!selectedMemberForUnit) return;

    try {
      if (selectedUnit) {
        await assignMemberToUnit({
          memberId: selectedMemberForUnit._id,
          unitName: selectedUnit,
        });
        toast.success("Member assigned to unit successfully");
      } else {
        await removeMemberFromUnit({
          memberId: selectedMemberForUnit._id,
        });
        toast.success("Member removed from unit successfully");
      }
      setShowUnitAssignModal(false);
      setSelectedMemberForUnit(null);
      setSelectedUnit("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update unit assignment");
    }
  };

  if (member.role !== "admin") {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-6xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Admin Access Required</h3>
        <p className="text-slate-600">You need administrator privileges to manage members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Members</h2>
          <p className="text-slate-600">Manage association members and invitations</p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span className="mr-2">✉️</span>
          Invite Member
        </button>
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Invite New Member</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit/Apartment (Optional)
                </label>
                <select
                  value={inviteForm.unit}
                  onChange={(e) => setInviteForm({ ...inviteForm, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No unit assigned</option>
                  {availableUnits?.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Select from existing units or leave unassigned
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Assignment Modal */}
      {showUnitAssignModal && selectedMemberForUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              Assign Unit to {selectedMemberForUnit.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Unit
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No unit assigned</option>
                  {availableUnits?.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedMemberForUnit.unit 
                    ? `Currently assigned to: ${selectedMemberForUnit.unit}`
                    : "Currently not assigned to any unit"}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnitAssignModal(false);
                    setSelectedMemberForUnit(null);
                    setSelectedUnit("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignUnit}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {selectedUnit ? "Assign Unit" : "Remove Unit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">All Members</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {members?.map((memberItem) => (
            <div key={memberItem._id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{memberItem.name}</p>
                    <p className="text-sm text-slate-500">{memberItem.email}</p>
                    {memberItem.unit && (
                      <p className="text-xs text-slate-400">Unit: {memberItem.unit}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end space-y-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      memberItem.status === "active"
                        ? "bg-green-100 text-green-800"
                        : memberItem.status === "invited"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {memberItem.status}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      memberItem.role === "admin"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {memberItem.role}
                  </span>
                </div>
                {memberItem._id !== member._id && (
                  <div className="flex space-x-2">
                    <select
                      value={memberItem.role}
                      onChange={(e) => handleRoleChange(memberItem._id, e.target.value as any)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    {memberItem.status !== "invited" && (
                      <select
                        value={memberItem.status}
                        onChange={(e) => handleStatusChange(memberItem._id, e.target.value as any)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleUnitAssignment(memberItem)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {memberItem.unit ? "Change Unit" : "Assign Unit"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
