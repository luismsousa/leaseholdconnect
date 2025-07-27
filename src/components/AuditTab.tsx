import { Id } from "../../convex/_generated/dataModel";

interface AuditTabProps {
  associationId: Id<"associations">;
}

export function AuditTab({ associationId }: AuditTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Audit Log</h2>
      <p className="text-slate-600">
        Audit log functionality will be available soon.
      </p>
    </div>
  );
}
