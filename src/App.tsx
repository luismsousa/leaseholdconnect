import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { useEffect } from "react";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Authenticated>
        <AppContent />
      </Authenticated>
      <Unauthenticated>
        <LoginPage />
      </Unauthenticated>
      <Toaster />
    </div>
  );
}

function AppContent() {
  const currentMember = useQuery(api.members.getCurrentMember);
  const bootstrap = useMutation(api.members.bootstrap);
  
  useEffect(() => {
    if (currentMember === null) {
      bootstrap();
    }
  }, [currentMember, bootstrap]);
  
  if (currentMember === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm border">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Pending</h1>
            <p className="text-slate-600">
              Your account is being reviewed. Please contact an administrator for access.
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    );
  }

  return <Dashboard member={currentMember} />;
}

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Residents Association
          </h1>
          <p className="text-slate-600">
            Management portal for leaseholders and residents
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
