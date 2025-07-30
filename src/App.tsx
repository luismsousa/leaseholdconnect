import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react'
import {
  AuthLoading,
  useQuery,
  useMutation,
} from "convex/react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthenticationForm } from "./components/AuthenticationForm";
import { LandingPage } from "./components/LandingPage";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { Dashboard } from "./components/Dashboard";
import { PaasAdminDashboard } from "./components/PaasAdminDashboard";
import { InitialSetupScreen } from "./components/InitialSetupScreen";
import { useEffect } from "react";

// Protected route component for PaaS admin dashboard
function ProtectedPaasAdminRoute() {
  const isPaasAdmin = useQuery(api.paasAdmin.isPaasAdmin);

  // Show loading while checking PaaS admin status
  if (isPaasAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect non-PaaS admins to regular dashboard
  if (!isPaasAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <PaasAdminDashboard />;
}

export default function App() {
  return (
    <Router>
      <main className="min-h-screen bg-slate-50">
        <Toaster position="top-right" />
        <AuthLoading>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </AuthLoading>
        <SignedOut>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={
              <div className="flex items-center justify-center min-h-screen py-8">
                <div className="max-w-lg w-full space-y-8 p-8">
                  <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                      Association Management Platform
                    </h1>
                    <p className="text-slate-600">
                      Manage your homeowners association with ease
                    </p>
                  </div>
                  <AuthenticationForm />
                </div>
              </div>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SignedOut>
        <SignedIn>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<AppContent />} />
            <Route path="/paasdashboard" element={<ProtectedPaasAdminRoute />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SignedIn>
      </main>
    </Router>
  );
}

function AppContent() {
  const currentUser = useQuery(api.clerkAuth.loggedInUser);
  const isPaasAdmin = useQuery(api.paasAdmin.isPaasAdmin);
  const anyPaasAdminsExist = useQuery(api.paasAdmin.anyPaasAdminsExist);
  const createUserIfNotExists = useMutation(
    api.clerkAuth.createUserIfNotExists,
  );
  const checkPendingInvitations = useMutation(
    api.clerkAuth.checkPendingInvitations,
  );

  // Create user and check for pending invitations when user logs in
  useEffect(() => {
    if (currentUser === null) {
      // User is authenticated but doesn't exist in our DB yet
      createUserIfNotExists()
        .then(() => {
          checkPendingInvitations().catch(console.error);
        })
        .catch(console.error);
    } else if (currentUser) {
      checkPendingInvitations().catch(console.error);
    }
  }, [currentUser, createUserIfNotExists, checkPendingInvitations]);

  // Show loading while checking user status
  if (
    currentUser === undefined ||
    isPaasAdmin === undefined ||
    anyPaasAdminsExist === undefined
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show setup screen if no PaaS admins exist and user is logged in
  if (currentUser && anyPaasAdminsExist === false) {
    return <InitialSetupScreen />;
  }

  // Redirect PaaS admins to their dedicated dashboard
  if (isPaasAdmin) {
    return <Navigate to="/paasdashboard" replace />;
  }

  return <Dashboard />;
}
