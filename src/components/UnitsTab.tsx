import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface UnitsTabProps {
  associationId: Id<"associations">;
}

export function UnitsTab({ associationId }: UnitsTabProps) {
  const units = useQuery(api.units.list, { associationId });
  const members = useQuery(api.members.list, { associationId });
  const createUnit = useMutation(api.units.create);
  const updateUnit = useMutation(api.units.update);
  const removeUnit = useMutation(api.units.remove);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>("");
  const [editingUnit, setEditingUnit] = useState<{
    id: Id<"units">;
    name: string;
    description: string;
    building: string;
    floor: string;
    type: string;
    size: string;
  } | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: "",
    description: "",
    building: "",
    floor: "",
    type: "",
    size: "",
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUnit({
      associationId,
      name: unitForm.name,
      description: unitForm.description || undefined,
      building: unitForm.building || undefined,
      floor: unitForm.floor ? parseInt(unitForm.floor) : undefined,
      type: unitForm.type || undefined,
      size: unitForm.size || undefined,
    }).then(() => {
      toast.success("Unit created successfully");
      setUnitForm({
        name: "",
        description: "",
        building: "",
        floor: "",
        type: "",
        size: "",
      });
      setShowCreateForm(false);
    }).catch((error) => {
      toast.error("Failed to create unit: " + (error as Error).message);
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    
    updateUnit({
      id: editingUnit.id,
      name: editingUnit.name,
      description: editingUnit.description || undefined,
      building: editingUnit.building || undefined,
      floor: editingUnit.floor ? parseInt(editingUnit.floor) : undefined,
      type: editingUnit.type || undefined,
      size: editingUnit.size || undefined,
    }).then(() => {
      toast.success("Unit updated successfully");
      setEditingUnit(null);
    }).catch((error) => {
      toast.error("Failed to update unit: " + (error as Error).message);
    });
  };

  const handleRemove = (unitId: Id<"units">, unitName: string) => {
    // Check if unit has members assigned
    const unitMembers = members?.filter(member => member.unit === unitName) || [];
    
    if (unitMembers.length > 0) {
      const memberNames = unitMembers.map(m => m.name).join(", ");
      if (!confirm(`This unit has ${unitMembers.length} member(s) assigned: ${memberNames}. Are you sure you want to remove it?`)) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to remove this unit?")) return;
    }
    
    removeUnit({ id: unitId }).then(() => {
      toast.success("Unit removed");
    }).catch((error) => {
      toast.error("Failed to remove unit: " + (error as Error).message);
    });
  };

  if (!units || !members) {
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
        <h2 className="text-2xl font-bold text-slate-900">Units</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedBuildingFilter}
            onChange={(e) => setSelectedBuildingFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Buildings</option>
            {Array.from(new Set(units.map(unit => unit.building).filter(Boolean))).map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Unit
          </button>
        </div>
      </div>

      {/* Unit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{units.length}</div>
          <div className="text-sm text-blue-700">Total Units</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-600">
            {members.filter(member => member.unit && member.status === "active").length}
          </div>
          <div className="text-sm text-slate-700">Occupied Units</div>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="text-lg font-semibold mb-4">Add New Unit</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  required
                  value={unitForm.name}
                  onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 101, A-1, Unit 5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Building
                </label>
                <input
                  type="text"
                  value={unitForm.building}
                  onChange={(e) => setUnitForm({ ...unitForm, building: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Building A, Main"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1, 2, 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value={unitForm.type}
                  onChange={(e) => setUnitForm({ ...unitForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Apartment, Townhouse, Condo"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1200 sq ft, 2BR/2BA"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={unitForm.description}
                onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Additional details about the unit..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create Unit
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {units
          .filter(unit => !selectedBuildingFilter || unit.building === selectedBuildingFilter)
          .map((unit) => (
          <div key={unit._id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{unit.name}</h3>
                {unit.building && (
                  <p className="text-sm text-slate-600">{unit.building}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600 mb-4">
              {unit.floor && <p><strong>Floor:</strong> {unit.floor}</p>}
              {unit.type && <p><strong>Type:</strong> {unit.type}</p>}
              {unit.size && <p><strong>Size:</strong> {unit.size}</p>}
              {unit.description && <p><strong>Description:</strong> {unit.description}</p>}
              {members && (
                <div>
                  <strong>Members:</strong>
                  {members.filter(member => member.unit === unit.name).length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {members
                        .filter(member => member.unit === unit.name)
                        .map(member => (
                          <li key={member._id} className="text-xs text-slate-500">
                            • {member.name} ({member.email})
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-slate-400 ml-1">No members assigned</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setEditingUnit({
                  id: unit._id,
                  name: unit.name,
                  description: unit.description || "",
                  building: unit.building || "",
                  floor: unit.floor?.toString() || "",
                  type: unit.type || "",
                  size: unit.size || "",
                })}
                className="flex-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleRemove(unit._id, unit.name)}
                className="flex-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {units.filter(unit => 
        (!selectedBuildingFilter || unit.building === selectedBuildingFilter)
      ).length === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-400 text-4xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {units.length === 0 ? "No units yet" : "No units match the current filters"}
          </h3>
          <p className="text-slate-600">
            {units.length === 0 
              ? "Start by adding your first unit to the association."
              : "Try adjusting your filters to see more units."
            }
          </p>
        </div>
      )}

      {editingUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Unit</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Unit Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUnit.name}
                    onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 101, A-1, Unit 5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Building
                  </label>
                  <input
                    type="text"
                    value={editingUnit.building}
                    onChange={(e) => setEditingUnit({ ...editingUnit, building: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Building A, Main"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Floor
                  </label>
                  <input
                    type="number"
                    value={editingUnit.floor}
                    onChange={(e) => setEditingUnit({ ...editingUnit, floor: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1, 2, 3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <input
                    type="text"
                    value={editingUnit.type}
                    onChange={(e) => setEditingUnit({ ...editingUnit, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Apartment, Townhouse, Condo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Size
                  </label>
                  <input
                    type="text"
                    value={editingUnit.size}
                    onChange={(e) => setEditingUnit({ ...editingUnit, size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1200 sq ft, 2BR/2BA"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editingUnit.description}
                  onChange={(e) => setEditingUnit({ ...editingUnit, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional details about the unit..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Update Unit
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
