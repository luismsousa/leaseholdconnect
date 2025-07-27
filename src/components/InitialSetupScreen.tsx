import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function InitialSetupScreen() {
  const currentUser = useQuery(api.clerkAuth.loggedInUser);
  const setupInitialPaasAdmin = useMutation(api.setupPaasAdmin.setupInitialPaasAdmin);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            🚀 Initial Setup Required
          </h2>
          <p className="text-slate-600 mb-6">
            No PaaS administrators exist yet. Click below to make yourself the first super admin.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Logged in as: <strong>{currentUser?.email}</strong>
          </p>
          <button
            onClick={async () => {
              try {
                await setupInitialPaasAdmin();
                toast.success("You are now a PaaS super admin!");
              } catch (error) {
                toast.error("Failed to setup admin: " + (error as Error).message);
              }
            }}
            className="w-full px-4 py-3 text-white bg-purple-600 rounded-md hover:bg-purple-700 font-medium"
          >
            Make Me Super Admin
          </button>
        </div>
      </div>
    </div>
  );
}
