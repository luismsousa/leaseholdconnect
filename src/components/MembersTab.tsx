import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MembersTabProps {
  associationId: Id<"associations">;
}

export function MembersTab({ associationId }: MembersTabProps) {
  const members = useQuery(api.members.listWithUnits, { associationId });
  const units = useQuery(api.units.listForMembers, { associationId });
  const memberStats = useQuery(api.members.getMemberStats, { associationId });
  const userAssociations = useQuery(api.associations.getUserAssociations);
  const inviteMember = useMutation(api.members.create);
  const updateMember = useMutation(api.members.update);
  const removeMember = useMutation(api.members.remove);
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("");
  const [editingUnitIds, setEditingUnitIds] = useState<string[]>([]);
  const [openUnitMenuMemberId, setOpenUnitMenuMemberId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "member" as "member" | "admin",
    unitIds: [] as string[],
  });

  // Check if current user is an admin of this association
  const isAdmin = userAssociations?.some(association => 
    association?._id === associationId && 
    (association?.role === "owner" || association?.role === "admin")
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteMember({
        associationId,
        email: inviteForm.email,
        name: inviteForm.name,
        role: inviteForm.role,
        unitIds: inviteForm.unitIds.length ? inviteForm.unitIds as any : undefined,
      });
      toast.success("Member invited successfully");
      setInviteForm({ email: "", name: "", role: "member", unitIds: [] });
      setShowInviteForm(false);
    } catch (error) {
      const errorMessage = (error as Error).message || "";
      const assignmentMatch = /^(.*) is already assigned to another member/i.exec(errorMessage) ||
        (errorMessage.toLowerCase().includes("assigned to another member") ? ["", "This unit"] : null);
      
      // Provide more specific error messages for email-related issues
      if (errorMessage.includes("email") || errorMessage.includes("domain") || errorMessage.includes("Resend")) {
        toast.error("Email sending failed. The member was created but the invitation email could not be sent. Please check your email configuration.");
      } else if (assignmentMatch) {
        const unitName = assignmentMatch[1]?.trim() || "This unit";
        toast.error(`${unitName} is already assigned to another member. Deselect it or reassign from that member first.`);
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

  const handleUpdateUnits = async (memberId: Id<"members">, newUnitIds: string[]) => {
    try {
      await updateMember({ id: memberId, unitIds: newUnitIds as any });
      toast.success("Member units updated");
      setEditingMember(null);
    } catch (error) {
      const msg = (error as Error).message || "";
      const assignmentMatch = /^(.*) is already assigned to another member/i.exec(msg) ||
        (msg.toLowerCase().includes("assigned to another member") ? ["", "This unit"] : null);
      if (assignmentMatch) {
        const unitName = assignmentMatch[1]?.trim() || "This unit";
        toast.error(`${unitName} is already assigned to another member. Deselect it or reassign from that member first.`);
      } else {
        toast.error("Failed to update member: " + msg);
      }
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
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-slate-900">Members</h2>
          {isAdmin && memberStats && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-slate-100 rounded-lg">
              <span className="text-sm font-medium text-slate-700">
                {memberStats.currentCount}
                {memberStats.maxMembers && ` / ${memberStats.maxMembers}`}
              </span>
              <span className="text-xs text-slate-500">
                ({memberStats.subscriptionTier} tier)
              </span>
              {memberStats.isAtLimit && (
                <span className="text-xs text-red-600 font-medium">
                  • Limit reached
                </span>
              )}
            </div>
          )}
        </div>
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
          {isAdmin && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Invite Member
            </button>
          )}
        </div>
      </div>

      {isAdmin && showInviteForm && (
        <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="text-lg font-semibold mb-4">Invite New Member</h3>
          <form onSubmit={(e) => void handleInvite(e)} className="space-y-4">
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
                  Units
                </label>
                <select
                  multiple
                  value={inviteForm.unitIds}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions).map(o => o.value);
                    setInviteForm({ ...inviteForm, unitIds: options });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-28"
                >
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
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
            <tbody className="bg-white divide-y divide-slate-200">
            {members
              .filter(member => {
                if (!selectedUnitFilter) return true;
                return member.units?.some(u => u.name === selectedUnitFilter);
              })
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
                  {isAdmin && editingMember === member._id ? (
                    <DropdownMenu
                      open={openUnitMenuMemberId === member._id}
                      onOpenChange={(open) =>
                        setOpenUnitMenuMemberId(open ? member._id : null)
                      }
                    >
                      <DropdownMenuTrigger asChild>
                        <Button className="text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                          {editingUnitIds.length > 0
                            ? `${editingUnitIds.length} selected`
                            : "Select units"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-72" align="start">
                        <DropdownMenuLabel>Select Units</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {units?.map((unit) => {
                          const id = unit._id as unknown as string;
                          const checked = editingUnitIds.includes(id);
                          return (
                            <DropdownMenuCheckboxItem
                              key={unit._id}
                              checked={checked}
                              onCheckedChange={(value) => {
                                if (value) {
                                  setEditingUnitIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
                                } else {
                                  setEditingUnitIds((prev) => prev.filter((x) => x !== id));
                                }
                              }}
                            >
                              {unit.name}
                              {unit.building && (
                                <span className="text-slate-500"> ({unit.building})</span>
                              )}
                            </DropdownMenuCheckboxItem>
                          );
                        })}
                        {!units?.length && (
                          <div className="px-2 py-1.5 text-sm text-slate-500">No units</div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    (member.units && member.units.length > 0)
                      ? member.units.map(u => `${u.name}${u.building ? ` (${u.building})` : ""}`).join(", ")
                      : "—"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isAdmin && editingMember === member._id ? (
                    <select
                      value={member.role}
                      onChange={(e) => void handleUpdateRole(member._id, e.target.value as "member" | "admin")}
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
                {isAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {editingMember === member._id ? (
                        <>
                          <button
                            onClick={() => {
                              setOpenUnitMenuMemberId(null);
                              void handleUpdateUnits(member._id, editingUnitIds);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => { setEditingMember(null); setEditingUnitIds([]); setOpenUnitMenuMemberId(null); }}
                            className="text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setEditingMember(member._id); setEditingUnitIds((member.units || []).map(u => u._id as unknown as string)); }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => void handleRemoveMember(member._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        
        {members.filter(member => !selectedUnitFilter || member.units?.some(u => u.name === selectedUnitFilter)).length === 0 && (
          <div className="text-center py-8">
            <div className="text-slate-400 text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {selectedUnitFilter ? `No members in ${selectedUnitFilter}` : "No members yet"}
            </h3>
            <p className="text-slate-600">
              {selectedUnitFilter 
                ? "No members are currently assigned to this unit." 
                : "Start by inviting your first member to the association."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
