import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UserPreferencesTabProps {
  onBack: () => void;
}

export function UserPreferencesTab({ onBack }: UserPreferencesTabProps) {
  const currentUser = useQuery(api.clerkAuth.loggedInUser);

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
        
        <div className="border-t pt-6">
          <p className="text-slate-600">
            Additional preference settings will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}
