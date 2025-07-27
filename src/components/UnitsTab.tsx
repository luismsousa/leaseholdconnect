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
  const createUnit = useMutation(api.units.create);
  const updateUnit = useMutation(api.units.update);
  const removeUnit = useMutation(api.units.remove);
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: "",
    description: "",
    building: "",
    floor: "",
    type: "",
    size: "",
    status: "active" as "active" | "vacant" | "inactive",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUnit({
        associationId,
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
      toast.error("Failed to create unit: " + (error as Error).message);
    }
  };

  const handleUpdate = async (unitId: Id<"units">, updates: any) => {
    try {
      await updateUnit({ id: unitId, ...updates });
      toast.success("Unit updated successfully");
      setEditingUnit(null);
    } catch (error) {
      toast.error("Failed to update unit: " + (error as Error).message);
    }
  };

  const handleRemove = async (unitId: Id<"units">) => {
    if (!confirm("Are you sure you want to remove this unit?")) return;
    
    try {
      await removeUnit({ id: unitId });
      toast.success("Unit removed");
    } catch (error) {
      toast.error("Failed to remove unit: " + (error as Error).message);
    }
  };

  if (!units) {
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
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add Unit
        </button>
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={unitForm.status}
                  onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value as "active" | "vacant" | "inactive" })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="vacant">Vacant</option>
                  <option value="inactive">Inactive</option>
                </select>
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
        {units.map((unit) => (
          <div key={unit._id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{unit.name}</h3>
                {unit.building && (
                  <p className="text-sm text-slate-600">{unit.building}</p>
                )}
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                unit.status === "active" 
                  ? "bg-green-100 text-green-800" 
                  : unit.status === "vacant"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {unit.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600 mb-4">
              {unit.floor && <p><strong>Floor:</strong> {unit.floor}</p>}
              {unit.type && <p><strong>Type:</strong> {unit.type}</p>}
              {unit.size && <p><strong>Size:</strong> {unit.size}</p>}
              {unit.description && <p><strong>Description:</strong> {unit.description}</p>}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setEditingUnit(unit._id)}
                className="flex-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleRemove(unit._id)}
                className="flex-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {units.length === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-400 text-4xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No units yet</h3>
          <p className="text-slate-600">Start by adding your first unit to the association.</p>
        </div>
      )}

      {editingUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Unit</h3>
            <p className="text-slate-600 mb-4">
              Unit editing functionality will be enhanced in the next update.
            </p>
            <button
              onClick={() => setEditingUnit(null)}
              className="w-full px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
