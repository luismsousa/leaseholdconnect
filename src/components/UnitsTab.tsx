import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface UnitsTabProps {
  member: Doc<"members">;
}

export function UnitsTab({ member }: UnitsTabProps) {
  const units = useQuery(api.units.listUnits, {});
  const buildings = useQuery(api.units.getUnitBuildings, {});
  const unitTypes = useQuery(api.units.getUnitTypes, {});
  const unitStats = useQuery(api.units.getUnitStats, {});
  const createUnit = useMutation(api.units.createUnit);
  const updateUnit = useMutation(api.units.updateUnit);
  const deleteUnit = useMutation(api.units.deleteUnit);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  
  const [unitForm, setUnitForm] = useState({
    name: "",
    description: "",
    building: "",
    floor: "",
    type: "",
    size: "",
    status: "active" as "active" | "inactive" | "vacant",
  });

  const filteredUnits = units?.filter(unit => {
    if (selectedBuilding && unit.building !== selectedBuilding) return false;
    if (selectedStatus && unit.status !== selectedStatus) return false;
    return true;
  });

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUnit({
        name: unitForm.name,
        description: unitForm.description || undefined,
        building: unitForm.building || undefined,
        floor: unitForm.floor ? parseInt(unitForm.floor) : undefined,
        type: unitForm.type || undefined,
        size: unitForm.size || undefined,
        status: unitForm.status,
      });

      toast.success("Unit created successfully");
      setUnitForm({
        name: "",
        description: "",
        building: "",
        floor: "",
        type: "",
        size: "",
        status: "active",
      });
      setShowCreateForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create unit");
    }
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;

    try {
      await updateUnit({
        unitId: editingUnit._id,
        name: unitForm.name,
        description: unitForm.description || undefined,
        building: unitForm.building || undefined,
        floor: unitForm.floor ? parseInt(unitForm.floor) : undefined,
        type: unitForm.type || undefined,
        size: unitForm.size || undefined,
        status: unitForm.status,
      });

      toast.success("Unit updated successfully");
      setEditingUnit(null);
      setUnitForm({
        name: "",
        description: "",
        building: "",
        floor: "",
        type: "",
        size: "",
        status: "active",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update unit");
    }
  };

  const handleEditUnit = (unit: any) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      description: unit.description || "",
      building: unit.building || "",
      floor: unit.floor?.toString() || "",
      type: unit.type || "",
      size: unit.size || "",
      status: unit.status,
    });
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("Are you sure you want to delete this unit? This action cannot be undone.")) return;

    try {
      await deleteUnit({ unitId: unitId as any });
      toast.success("Unit deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete unit");
    }
  };

  const resetForm = () => {
    setUnitForm({
      name: "",
      description: "",
      building: "",
      floor: "",
      type: "",
      size: "",
      status: "active",
    });
    setEditingUnit(null);
    setShowCreateForm(false);
  };

  if (member.role !== "admin") {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 text-6xl mb-4">🔒</div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Admin Access Required</h3>
        <p className="text-slate-600">You need administrator privileges to manage units.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Units</h2>
          <p className="text-slate-600">Manage association units and assignments</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <span className="mr-2">🏠</span>
          Add Unit
        </button>
      </div>

      {/* Stats Cards */}
      {unitStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🏠</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Units</p>
                <p className="text-2xl font-bold text-slate-900">{unitStats.totalUnits}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">✅</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Occupied</p>
                <p className="text-2xl font-bold text-green-600">{unitStats.occupiedUnits}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🏚️</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Vacant</p>
                <p className="text-2xl font-bold text-yellow-600">{unitStats.vacantUnits}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <div className="text-2xl mr-3">👥</div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Members</p>
                <p className="text-2xl font-bold text-blue-600">{unitStats.totalMembers}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mr-2">Building:</label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Buildings</option>
            {buildings?.map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mr-2">Status:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="vacant">Vacant</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingUnit) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-slate-900 mb-4">
              {editingUnit ? "Edit Unit" : "Create New Unit"}
            </h3>
            <form onSubmit={editingUnit ? handleUpdateUnit : handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  placeholder="e.g., 101, A-1, Unit 5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={unitForm.description}
                  onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                  rows={2}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Building
                  </label>
                  <input
                    type="text"
                    value={unitForm.building}
                    onChange={(e) => setUnitForm({ ...unitForm, building: e.target.value })}
                    placeholder="e.g., Building A"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="number"
                    value={unitForm.floor}
                    onChange={(e) => setUnitForm({ ...unitForm, floor: e.target.value })}
                    placeholder="e.g., 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={unitForm.type}
                    onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value })}
                    placeholder="e.g., Apartment, Townhouse"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Size
                  </label>
                  <input
                    type="text"
                    value={unitForm.size}
                    onChange={(e) => setUnitForm({ ...unitForm, size: e.target.value })}
                    placeholder="e.g., 2BR/2BA, 1500 sq ft"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status *
                </label>
                <select
                  value={unitForm.status}
                  onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="vacant">Vacant</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingUnit ? "Update Unit" : "Create Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Units List */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">
            {selectedBuilding || selectedStatus ? "Filtered Units" : "All Units"}
          </h3>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredUnits?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-slate-400 text-6xl mb-4">🏠</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No units found</h3>
              <p className="text-slate-600">
                {selectedBuilding || selectedStatus
                  ? "No units match the selected filters."
                  : "Create your first unit to get started."}
              </p>
            </div>
          ) : (
            filteredUnits?.map((unit) => (
              <div key={unit._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">🏠</div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-slate-900">{unit.name}</p>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              unit.status === "active"
                                ? "bg-green-100 text-green-800"
                                : unit.status === "vacant"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {unit.status}
                          </span>
                        </div>
                        {unit.description && (
                          <p className="text-sm text-slate-600">{unit.description}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                          {unit.building && <span>Building: {unit.building}</span>}
                          {unit.floor && <span>Floor: {unit.floor}</span>}
                          {unit.type && <span>Type: {unit.type}</span>}
                          {unit.size && <span>Size: {unit.size}</span>}
                          <span>Members: {unit.memberCount}</span>
                        </div>
                        {unit.members.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500 mb-1">Residents:</p>
                            <div className="flex flex-wrap gap-1">
                              {unit.members.map((member, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    member.status === "active"
                                      ? "bg-blue-100 text-blue-800"
                                      : member.status === "invited"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {member.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditUnit(unit)}
                      className="inline-flex items-center px-3 py-1 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit._id)}
                      disabled={unit.memberCount > 0}
                      className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={unit.memberCount > 0 ? "Cannot delete unit with assigned members" : "Delete unit"}
                    >
                      Delete
                    </button>
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
