import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { ProTierButton } from "./ProTierButton";

interface UserPreferencesTabProps {
  onBack: () => void;
}

export function UserPreferencesTab({ onBack }: UserPreferencesTabProps) {
  const currentUser = useQuery(api.clerkAuth.loggedInUser);
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);
  const userAssociations = useQuery(api.associations.getUserAssociations);
  const createPortalSession = useMutation(api.stripe.createCustomerPortalSession);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  // Check if user is admin of the selected association
  const isAssociationAdmin = userPreferences?.selectedAssociationId && userAssociations
    ? userAssociations.some(association => 
        association?._id === userPreferences.selectedAssociationId && 
        (association?.role === "owner" || association?.role === "admin")
      )
    : false;

  const handleManageSubscription = async () => {
    if (!userPreferences?.selectedAssociation?._id) {
      alert("No association selected");
      return;
    }

    setIsLoadingPortal(true);
    try {
      const result = await createPortalSession({
        associationId: userPreferences.selectedAssociation._id,
      });
      window.open(result.url, "_blank");
    } catch (error) {
      console.error("Failed to create portal session:", error);
      alert("Failed to open subscription management. Please try again.");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const getSubscriptionTierDisplay = (tier: string) => {
    switch (tier) {
      case "free":
        return "Free";
      case "pro":
        return "Pro";
      case "enterprise":
        return "Enterprise";
      default:
        return tier;
    }
  };

  const getSubscriptionStatusDisplay = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "trial":
        return "Trial";
      case "suspended":
        return "Suspended";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "inactive":
        return "text-gray-600 bg-gray-100";
      case "trial":
        return "text-blue-600 bg-blue-100";
      case "suspended":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">User Preferences</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
        >
          Back
        </button>
      </div>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h3>
          <div className="space-y-2">
            <p><strong>Name:</strong> {currentUser?.name || "Not provided"}</p>
            <p><strong>Email:</strong> {currentUser?.email || "Not provided"}</p>
            <p><strong>User ID:</strong> {currentUser?._id}</p>
          </div>
        </div>

        {/* Association Subscription Section - Only visible to admins */}
        {userPreferences?.selectedAssociation && isAssociationAdmin && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Association Subscription</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              <div>
                <p><strong>Association:</strong> {userPreferences.selectedAssociation.name}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Subscription Tier</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {getSubscriptionTierDisplay(userPreferences.selectedAssociation.subscriptionTier)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(userPreferences.selectedAssociation.subscriptionStatus)}`}>
                    {getSubscriptionStatusDisplay(userPreferences.selectedAssociation.subscriptionStatus)}
                  </span>
                </div>
              </div>

              {userPreferences.selectedAssociation.subscriptionStatus === "active" ? (
                <div className="pt-4">
                  <button
                    onClick={() => void handleManageSubscription()}
                    disabled={isLoadingPortal}
                    className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoadingPortal ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Opening...
                      </>
                    ) : (
                      "Manage Subscription"
                    )}
                  </button>
                  <p className="text-xs text-slate-500 mt-2">
                    Opens Stripe Customer Portal in a new tab
                  </p>
                </div>
              ) : (
                <div className="pt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Upgrade to Pro</h4>
                    <p className="text-slate-600 mb-4">
                      Unlock unlimited members, advanced features, and priority support for your association.
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-slate-700">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Unlimited members
                      </div>
                      <div className="flex items-center text-sm text-slate-700">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Advanced meeting features
                      </div>
                      <div className="flex items-center text-sm text-slate-700">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Enhanced voting systems
                      </div>
                      <div className="flex items-center text-sm text-slate-700">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Priority support
                      </div>
                    </div>
                    <ProTierButton 
                      selectedAssociationId={userPreferences.selectedAssociation._id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show message for non-admin users */}
        {userPreferences?.selectedAssociation && !isAssociationAdmin && (
          <div className="border-t pt-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Association Management</h3>
              <p className="text-amber-700">
                Subscription management is only available to association administrators. 
                Please contact your association admin to manage subscription settings.
              </p>
            </div>
          </div>
        )}
        
        <div className="border-t pt-6">
          <p className="text-slate-600">
            Additional preference settings will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}
