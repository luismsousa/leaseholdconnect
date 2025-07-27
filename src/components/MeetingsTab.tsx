import { Id } from "../../convex/_generated/dataModel";

interface MeetingsTabProps {
  associationId: Id<"associations">;
}

export function MeetingsTab({ associationId }: MeetingsTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Meetings</h2>
      <p className="text-slate-600">
        Meeting management functionality will be available soon.
      </p>
    </div>
  );
}
