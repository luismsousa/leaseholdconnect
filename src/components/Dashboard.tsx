import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { UserDropdown } from "./UserDropdown";
import { MembersTab } from "./MembersTab";
import { UnitsTab } from "./UnitsTab";
import { DocumentsTab } from "./DocumentsTab";
import { MeetingsTab } from "./MeetingsTab";
import { VotingTab } from "./VotingTab";
import { AuditTab } from "./AuditTab";
import { UserPreferencesTab } from "./UserPreferencesTab";

type Tab =
  | "overview"
  | "members"
  | "units"
  | "documents"
  | "meetings"
  | "voting"
  | "audit"
  | "preferences";

export function Dashboard() {
  const userPreferences = useQuery(api.userPreferences.getUserPreferences);
  const isPaasAdmin = useQuery(api.paasAdmin.isPaasAdmin);
  const setSelectedAssociation = useMutation(
    api.userPreferences.setSelectedAssociation,
  );

  const [selectedAssociationId, setSelectedAssociationId] =
    useState<Id<"associations"> | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Get user's associations to auto-select first one if none selected
  const userAssociations = useQuery(api.associations.getUserAssociations);

  // Initialize selected association from user preferences or auto-select first one
  useEffect(() => {
    if (userPreferences?.selectedAssociationId) {
      setSelectedAssociationId(userPreferences.selectedAssociationId);
    } else if (
      !isPaasAdmin &&
      userAssociations &&
      userAssociations.length > 0 &&
      !selectedAssociationId
    ) {
      // Auto-select first association for non-PaaS admins if none is selected
      const firstAssociation = userAssociations[0];
      if (firstAssociation) {
        setSelectedAssociationId(firstAssociation._id);
        // Also update user preferences to persist this selection
        void setSelectedAssociation({ associationId: firstAssociation._id });
      }
    }
  }, [
    userPreferences,
    userAssociations,
    isPaasAdmin,
    selectedAssociationId,
    setSelectedAssociation,
  ]);

  const handleAssociationChange = async (
    associationId: Id<"associations"> | null,
  ) => {
    setSelectedAssociationId(associationId);
    setActiveTab("overview"); // Reset to overview when changing associations
  };

  const tabs = [
    { id: "overview", name: "Overview", icon: "🏠" },
    { id: "members", name: "Members", icon: "👥" },
    { id: "units", name: "Units", icon: "🏢" },
    { id: "documents", name: "Documents", icon: "📄" },
    { id: "meetings", name: "Meetings", icon: "📅" },
    { id: "voting", name: "Voting", icon: "🗳️" },
    { id: "audit", name: "Audit Log", icon: "📋" },
  ];

  const renderTabContent = () => {
    if (!selectedAssociationId) return null;

    switch (activeTab) {
      case "members":
        return <MembersTab associationId={selectedAssociationId} />;
      case "units":
        return <UnitsTab associationId={selectedAssociationId} />;
      case "documents":
        return <DocumentsTab associationId={selectedAssociationId} />;
      case "meetings":
        return <MeetingsTab associationId={selectedAssociationId} />;
      case "voting":
        return <VotingTab associationId={selectedAssociationId} />;
      case "audit":
        return <AuditTab associationId={selectedAssociationId} />;
      case "preferences":
        return <UserPreferencesTab onBack={() => setActiveTab("overview")} />;
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Welcome to your Association Dashboard
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabs.slice(1).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className="bg-blue-50 rounded-lg p-6 text-left hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="text-blue-600 text-3xl mr-4">
                      {tab.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {tab.name}
                      </h3>
                      <p className="text-slate-600">
                        {tab.id === "members" && "Manage association members"}
                        {tab.id === "units" && "Manage property units"}
                        {tab.id === "documents" && "Share and manage documents"}
                        {tab.id === "meetings" &&
                          "Schedule and manage meetings"}
                        {tab.id === "voting" &&
                          "Create and participate in votes"}
                        {tab.id === "audit" && "View activity history"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-slate-900">
                Association Management
              </h1>
              {isPaasAdmin && !selectedAssociationId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  🔧 PaaS Admin Mode
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <UserDropdown
                selectedAssociationId={selectedAssociationId}
                onAssociationChange={(associationId) => {
                  void handleAssociationChange(associationId);
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      {selectedAssociationId && (
        <nav className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
              <button
                onClick={() => setActiveTab("preferences")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "preferences"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="mr-2">⚙️</span>
                Preferences
              </button>
            </div>
          </div>
        </nav>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedAssociationId ? (
          renderTabContent()
        ) : (
          <div className="text-center">
            <div className="text-slate-400 text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {isPaasAdmin ? "PaaS Admin Dashboard" : "No Association Selected"}
            </h3>
            <p className="text-slate-600 mb-6">
              {isPaasAdmin
                ? "Select an association to manage, or use the PaaS admin features above."
                : "Please select an association from the dropdown above to get started."}
            </p>
            {isPaasAdmin && (
              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <span className="mr-2">🔧</span>
                Go to PaaS Admin Dashboard
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
