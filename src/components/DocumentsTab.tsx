import { Id } from "../../convex/_generated/dataModel";

interface DocumentsTabProps {
  associationId: Id<"associations">;
}

export function DocumentsTab({ associationId }: DocumentsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Documents</h2>
      <p className="text-slate-600">
        Document management functionality will be available soon.
      </p>
    </div>
  );
}
