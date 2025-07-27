import { useState } from "react";
import { Doc } from "../../convex/_generated/dataModel";
import { SignOutButton } from "../SignOutButton";
import { MembersTab } from "./MembersTab";
import { DocumentsTab } from "./DocumentsTab";
import { VotingTab } from "./VotingTab";
import { UnitsTab } from "./UnitsTab";
import { AuditTab } from "./AuditTab";

interface DashboardProps {
  member: Doc<"members">;
}

type Tab = "members" | "documents" | "voting" | "units" | "audit";

export function Dashboard({ member }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("members");

  const tabs = [
    { id: "members" as const, label: "Members", icon: "👥" },
    { id: "units" as const, label: "Units", icon: "🏠" },
    { id: "documents" as const, label: "Documents", icon: "📁" },
    { id: "voting" as const, label: "Voting", icon: "🗳️" },
    { id: "audit" as const, label: "Audit", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-slate-900">
                Residents Association
              </h1>
              {member.role === "admin" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Administrator
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">
                {member.name} {member.unit && `(${member.unit})`}
              </span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "members" && <MembersTab member={member} />}
        {activeTab === "units" && <UnitsTab member={member} />}
        {activeTab === "documents" && <DocumentsTab member={member} />}
        {activeTab === "voting" && <VotingTab member={member} />}
        {activeTab === "audit" && <AuditTab member={member} />}
      </main>
    </div>
  );
}
