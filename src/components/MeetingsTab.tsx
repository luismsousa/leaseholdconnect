import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";

interface MeetingsTabProps {
  associationId: Id<"associations">;
}

interface MeetingFormData {
  title: string;
  description: string;
  type: "agm" | "egm" | "board" | "general";
  scheduledDate: string;
  location: string;
  inviteAllMembers: boolean;
  invitedUnits: string[];
  agenda: Array<{
    id: string;
    title: string;
    description?: string;
    type: "discussion" | "voting" | "presentation" | "other";
    estimatedDuration?: number;
    votingTopicId?: Id<"votingTopics">;
    documentIds?: Id<"documents">[];
  }>;
}

export function MeetingsTab({ associationId }: MeetingsTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Doc<"meetings"> | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const meetings = useQuery(api.meetings.list, { associationId });
  const userAssociations = useQuery(api.associations.getUserAssociations);
  const votingTopics = useQuery(api.voting.listTopics, { associationId });
  const documents = useQuery(api.documents.list, { associationId });
  const units = useQuery(api.units.listForMembers, { associationId });

  const createMeeting = useMutation(api.meetings.create);
  const updateMeeting = useMutation(api.meetings.update);
  const deleteMeeting = useMutation(api.meetings.remove);
  const scheduleMeeting = useMutation(api.meetings.schedule);
  const completeMeeting = useMutation(api.meetings.complete);
  const archiveMeeting = useMutation(api.meetings.archive);
  const cancelMeeting = useMutation(api.meetings.cancel);

  const [formData, setFormData] = useState<MeetingFormData>({
    title: "",
    description: "",
    type: "general",
    scheduledDate: "",
    location: "",
    inviteAllMembers: true,
    invitedUnits: [],
    agenda: [],
  });

  // Check if current user is an admin of this association
  const isAdmin = userAssociations?.some(
    (association) =>
      association?._id === associationId &&
      (association?.role === "owner" || association?.role === "admin"),
  );

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "general",
      scheduledDate: "",
      location: "",
      inviteAllMembers: true,
      invitedUnits: [],
      agenda: [],
    });
  };

  const handleCreateMeeting = () => {
    createMeeting({
      associationId,
      ...formData,
      scheduledDate: new Date(formData.scheduledDate).getTime(),
    })
      .then(() => {
        setIsCreateDialogOpen(false);
        resetForm();
      })
      .catch((error) => {
        console.error("Error creating meeting:", error);
      });
  };

  const handleUpdateMeeting = () => {
    if (!selectedMeeting) return;

    updateMeeting({
      id: selectedMeeting._id as Id<"meetings">,
      ...formData,
      scheduledDate: new Date(formData.scheduledDate).getTime(),
    })
      .then(() => {
        setIsEditDialogOpen(false);
        setSelectedMeeting(null);
        resetForm();
      })
      .catch((error) => {
        console.error("Error updating meeting:", error);
      });
  };

  const handleEditMeeting = (meeting: Doc<"meetings">) => {
    setSelectedMeeting(meeting);
    setFormData({
      title: meeting.title,
      description: meeting.description,
      type: meeting.type,
      scheduledDate: new Date(meeting.scheduledDate).toISOString().slice(0, 16),
      location: meeting.location,
      inviteAllMembers: meeting.inviteAllMembers || false,
      invitedUnits: meeting.invitedUnits || [],
      agenda: meeting.agenda || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteMeeting = (meetingId: Id<"meetings">) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      deleteMeeting({ id: meetingId }).catch((error) => {
        console.error("Error deleting meeting:", error);
      });
    }
  };

  const handleStatusChange = (meetingId: Id<"meetings">, action: string) => {
    switch (action) {
      case "schedule":
        scheduleMeeting({ meetingId }).catch((error) => {
          console.error("Error scheduling meeting:", error);
        });
        break;
      case "complete":
        completeMeeting({ meetingId }).catch((error) => {
          console.error("Error completing meeting:", error);
        });
        break;
      case "archive":
        archiveMeeting({ meetingId }).catch((error) => {
          console.error("Error archiving meeting:", error);
        });
        break;
      case "cancel": {
        const reason = prompt("Reason for cancellation (optional):");
        cancelMeeting({ meetingId, reason: reason || undefined }).catch(
          (error) => {
            console.error("Error cancelling meeting:", error);
          },
        );
        break;
      }
    }
  };

  const addAgendaItem = () => {
    setFormData((prev) => ({
      ...prev,
      agenda: [
        ...prev.agenda,
        {
          id: Date.now().toString(),
          title: "",
          description: "",
          type: "discussion",
          estimatedDuration: 15,
        },
      ],
    }));
  };

  const updateAgendaItem = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeAgendaItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((_, i) => i !== index),
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      scheduled: { color: "bg-blue-100 text-blue-800", label: "Scheduled" },
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      archived: { color: "bg-purple-100 text-purple-800", label: "Archived" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      agm: "Annual General Meeting",
      egm: "Extraordinary General Meeting",
      board: "Board Meeting",
      general: "General Meeting",
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const filteredMeetings =
    meetings?.filter((meeting) => {
      if (activeTab === "all") return true;
      return meeting.status === activeTab;
    }) || [];

  if (!meetings) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading meetings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Meetings</h2>
          <p className="text-slate-600">
            Manage association meetings and events
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <span className="mr-2">+</span>
            Create Meeting
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "all", label: "All Meetings" },
            { id: "draft", label: "Draft" },
            { id: "scheduled", label: "Scheduled" },
            { id: "completed", label: "Completed" },
            { id: "archived", label: "Archived" },
            { id: "cancelled", label: "Cancelled" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Meetings Grid */}
      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-500">No meetings found</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting._id}
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {meeting.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {getTypeLabel(meeting.type)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {isAdmin && meeting.status === "draft" && (
                        <>
                          <button
                            onClick={() => handleEditMeeting(meeting)}
                            className="p-1 text-gray-600 hover:text-gray-800"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(meeting._id as Id<"meetings">, "schedule")
                            }
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Schedule"
                          >
                            ✓
                          </button>
                        </>
                      )}
                      {isAdmin && meeting.status === "scheduled" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusChange(meeting._id as Id<"meetings">, "complete")
                            }
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Complete"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(meeting._id as Id<"meetings">, "cancel")
                            }
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {isAdmin && meeting.status === "completed" && (
                        <button
                          onClick={() =>
                            handleStatusChange(meeting._id as Id<"meetings">, "archive")
                          }
                          className="p-1 text-purple-600 hover:text-purple-800"
                          title="Archive"
                        >
                          📦
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteMeeting(meeting._id as Id<"meetings">)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(meeting.status)}

                  <div className="space-y-3 mt-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <span className="mr-2">📅</span>
                      {new Date(meeting.scheduledDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <span className="mr-2">🕐</span>
                      {new Date(meeting.scheduledDate).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <span className="mr-2">📍</span>
                      {meeting.location}
                    </div>
                    {meeting.agenda && meeting.agenda.length > 0 && (
                      <div className="flex items-center text-sm text-slate-600">
                        <span className="mr-2">📄</span>
                        {meeting.agenda.length} agenda item
                        {meeting.agenda.length !== 1 ? "s" : ""}
                      </div>
                    )}
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {meeting.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Meeting Modal */}
      {isAdmin && isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Create New Meeting</h3>
              <button
                onClick={() => setIsCreateDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <MeetingForm
              formData={formData}
              setFormData={setFormData}
              votingTopics={votingTopics}
              documents={documents}
              units={units}
              addAgendaItem={addAgendaItem}
              updateAgendaItem={updateAgendaItem}
              removeAgendaItem={removeAgendaItem}
              onSubmit={handleCreateMeeting}
              submitLabel="Create Meeting"
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Meeting Modal */}
      {isAdmin && isEditDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Edit Meeting</h3>
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <MeetingForm
              formData={formData}
              setFormData={setFormData}
              votingTopics={votingTopics}
              documents={documents}
              units={units}
              addAgendaItem={addAgendaItem}
              updateAgendaItem={updateAgendaItem}
              removeAgendaItem={removeAgendaItem}
              onSubmit={handleUpdateMeeting}
              submitLabel="Update Meeting"
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface MeetingFormProps {
  formData: MeetingFormData;
  setFormData: (data: MeetingFormData) => void;
  votingTopics: any;
  documents: any;
  units: any;
  addAgendaItem: () => void;
  updateAgendaItem: (index: number, field: string, value: any) => void;
  removeAgendaItem: (index: number) => void;
  onSubmit: () => void;
  submitLabel: string;
  onCancel: () => void;
}

function MeetingForm({
  formData,
  setFormData,
  votingTopics,
  documents,
  units,
  addAgendaItem,
  updateAgendaItem,
  removeAgendaItem,
  onSubmit,
  submitLabel,
  onCancel,
}: MeetingFormProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Meeting Title
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            placeholder="Enter meeting title"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Meeting Type
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">General Meeting</option>
            <option value="agm">Annual General Meeting</option>
            <option value="egm">Extraordinary General Meeting</option>
            <option value="board">Board Meeting</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Enter meeting description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="scheduledDate"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date & Time
          </label>
          <input
            id="scheduledDate"
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) =>
              setFormData({ ...formData, scheduledDate: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="Enter meeting location"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="inviteAllMembers"
            checked={formData.inviteAllMembers}
            onChange={(e) =>
              setFormData({ ...formData, inviteAllMembers: e.target.checked })
            }
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="inviteAllMembers"
            className="text-sm font-medium text-gray-700"
          >
            Invite all members
          </label>
        </div>

        {!formData.inviteAllMembers && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select specific units to invite
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
              {units?.map((unit: any) => (
                <label
                  key={unit._id}
                  className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded px-2"
                >
                  <input
                    type="checkbox"
                    checked={formData.invitedUnits.includes(unit.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          invitedUnits: [...formData.invitedUnits, unit.name],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          invitedUnits: formData.invitedUnits.filter(
                            (u) => u !== unit.name,
                          ),
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {unit.name}
                    {unit.building && (
                      <span className="text-gray-500 ml-1">
                        ({unit.building})
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {(!units || units.length === 0) && (
                <p className="text-sm text-gray-500 py-2 px-2">
                  No units available
                </p>
              )}
            </div>
            {formData.invitedUnits.length > 0 && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selected units:
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.invitedUnits.map((unitName, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {unitName}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            invitedUnits: formData.invitedUnits.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Agenda Items
          </label>
          <button
            type="button"
            onClick={addAgendaItem}
            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 text-sm"
          >
            + Add Item
          </button>
        </div>

        {formData.agenda.map((item, index) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) =>
                    updateAgendaItem(index, "title", e.target.value)
                  }
                  placeholder="Agenda item title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={item.type}
                  onChange={(e) =>
                    updateAgendaItem(index, "type", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="discussion">Discussion</option>
                  <option value="voting">Voting</option>
                  <option value="presentation">Presentation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={item.description || ""}
                onChange={(e) =>
                  updateAgendaItem(index, "description", e.target.value)
                }
                placeholder="Agenda item description"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={item.estimatedDuration || ""}
                  onChange={(e) =>
                    updateAgendaItem(
                      index,
                      "estimatedDuration",
                      parseInt(e.target.value) || undefined,
                    )
                  }
                  placeholder="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {item.type === "voting" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voting Topic
                  </label>
                  <select
                    value={item.votingTopicId || ""}
                    onChange={(e) =>
                      updateAgendaItem(index, "votingTopicId", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select voting topic</option>
                    {votingTopics?.map((topic: any) => (
                      <option key={topic._id} value={topic._id}>
                        {topic.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => removeAgendaItem(index)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() =>
            setFormData({
              title: "",
              description: "",
              type: "general",
              scheduledDate: "",
              location: "",
              inviteAllMembers: true,
              invitedUnits: [],
              agenda: [],
            })
          }
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
