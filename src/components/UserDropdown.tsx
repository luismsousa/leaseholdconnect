import { useState, useRef, useEffect } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface UserDropdownProps {
  selectedAssociationId: Id<"associations"> | null;
  onAssociationChange: (associationId: Id<"associations"> | null) => void;
}

export function UserDropdown({
  selectedAssociationId,
  onAssociationChange,
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { signOut } = useClerk();
  const { user } = useUser();
  const isPaasAdmin = useQuery(api.paasAdmin.isPaasAdmin);
  const associations = useQuery(api.associations.getUserAssociations);
  const allAssociations = useQuery(
    api.paasAdmin.listAllAssociations,
    isPaasAdmin ? {} : "skip",
  );
  const setSelectedAssociation = useMutation(
    api.userPreferences.setSelectedAssociation,
  );

  // Get current association details to show subscription tier
  const currentAssociation = useQuery(
    api.associations.getAssociation,
    selectedAssociationId ? { associationId: selectedAssociationId } : "skip"
  );

  const availableAssociations = isPaasAdmin ? allAssociations : associations;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
    setIsOpen(false);
  };

  const handleAssociationChange = async (associationId: string) => {
    const id =
      associationId === "" ? undefined : (associationId as Id<"associations">);
    await setSelectedAssociation({ associationId: id });
    onAssociationChange(id || null);
  };

  // Helper function to get subscription tier display
  const getSubscriptionTierDisplay = (tier: string, status: string) => {
    const tierColors = {
      free: "text-gray-600",
      pro: "text-blue-600",
      enterprise: "text-purple-600",
    };
    
    const statusColors = {
      active: "text-green-600",
      inactive: "text-red-600",
      trial: "text-orange-600",
      suspended: "text-red-600",
    };

    return (
      <span className={`text-xs font-medium ${tierColors[tier as keyof typeof tierColors] || tierColors.free}`}>
        {tier.toUpperCase()} - {status.toUpperCase()}
      </span>
    );
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
          {user?.firstName?.[0] ||
            user?.emailAddresses?.[0]?.emailAddress?.[0] ||
            "U"}
        </div>
        <div className="text-left">
          <div className="text-sm font-medium text-slate-900">
            {user?.fullName || user?.emailAddresses?.[0]?.emailAddress}
          </div>
          {isPaasAdmin && (
            <div className="text-xs text-purple-600 font-medium">
              PaaS Admin
            </div>
          )}
          {currentAssociation && (
            <div className="text-xs text-slate-500">
              {getSubscriptionTierDisplay(currentAssociation.subscriptionTier, currentAssociation.subscriptionStatus)}
            </div>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-slate-100">
            <div className="text-sm font-medium text-slate-900">
              {user?.fullName || "User"}
            </div>
            <div className="text-xs text-slate-500">
              {user?.emailAddresses?.[0]?.emailAddress}
            </div>
            {currentAssociation && (
              <div className="mt-1">
                {getSubscriptionTierDisplay(currentAssociation.subscriptionTier, currentAssociation.subscriptionStatus)}
              </div>
            )}
          </div>

          {/* Association Selector */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="text-xs font-medium text-slate-700 mb-2">
              {isPaasAdmin ? "View Association:" : "Current Association:"}
            </div>
            {!availableAssociations ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="text-xs text-slate-600">Loading...</span>
              </div>
            ) : (
              <select
                value={selectedAssociationId || ""}
                onChange={(e) => {
                  void handleAssociationChange(e.target.value);
                }}
                className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">
                  {isPaasAdmin
                    ? "Select Association"
                    : "No Association Selected"}
                </option>
                {availableAssociations.map((association) => {
                  if (!association) return null;
                  return (
                    <option key={association._id} value={association._id}>
                      {association.name}
                      {isPaasAdmin && (
                        <>
                          {" "}
                          ({association.subscriptionTier} -{" "}
                          {association.subscriptionStatus})
                          {"memberCount" in association &&
                            association.memberCount !== undefined &&
                            ` - ${association.memberCount} members`}
                        </>
                      )}
                      {!isPaasAdmin &&
                        "role" in association &&
                        association.role &&
                        ` (${association.role})`}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
