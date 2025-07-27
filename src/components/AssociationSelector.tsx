import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface AssociationSelectorProps {
  selectedAssociationId: Id<"associations"> | null;
  onAssociationChange: (associationId: Id<"associations"> | null) => void;
  compact?: boolean;
}

export function AssociationSelector({ selectedAssociationId, onAssociationChange, compact = false }: AssociationSelectorProps) {
  const associations = useQuery(api.associations.getUserAssociations);
  const isPaasAdmin = useQuery(api.paasAdmin.isPaasAdmin);
  const allAssociations = useQuery(api.paasAdmin.listAllAssociations, isPaasAdmin ? {} : "skip");
  const setSelectedAssociation = useMutation(api.userPreferences.setSelectedAssociation);

  const availableAssociations = isPaasAdmin ? allAssociations : associations;

  const handleAssociationChange = async (associationId: string) => {
    const id = associationId === "" ? undefined : (associationId as Id<"associations">);
    await setSelectedAssociation({ associationId: id });
    onAssociationChange(id || null);
  };

  if (!availableAssociations) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-slate-600">Loading...</span>
      </div>
    );
  }

  return (
    <div className={compact ? "w-full" : "flex items-center space-x-4"}>
      <div className={compact ? "w-full" : "flex items-center space-x-2"}>
        {!compact && (
          <label className="text-sm font-medium text-slate-700">
            {isPaasAdmin ? "View Association:" : "Current Association:"}
          </label>
        )}
        <select
          value={selectedAssociationId || ""}
          onChange={(e) => handleAssociationChange(e.target.value)}
          className={`border border-slate-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
            compact ? "w-full" : "min-w-[200px]"
          }`}
        >
          <option value="">
            {isPaasAdmin ? "Select Association" : "No Association Selected"}
          </option>
          {availableAssociations.map((association) => {
            if (!association) return null;
            return (
              <option key={association._id} value={association._id}>
                {association.name}
                {isPaasAdmin && (
                  <>
                    {" "}({association.subscriptionTier} - {association.subscriptionStatus})
                    {"memberCount" in association && association.memberCount !== undefined && ` - ${association.memberCount} members`}
                  </>
                )}
                {!isPaasAdmin && "role" in association && association.role && ` (${association.role})`}
              </option>
            );
          })}
        </select>
      </div>

      {isPaasAdmin && !compact && (
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            🔧 PaaS Admin
          </span>
        </div>
      )}
    </div>
  );
}
