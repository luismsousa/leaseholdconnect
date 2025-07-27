import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface VotingTabProps {
  member: Doc<"members">;
}

export function VotingTab({ member }: VotingTabProps) {
  const votingTopics = useQuery(api.voting.listVotingTopics, {});
  const availableUnits = useQuery(api.documents.getAvailableUnits, {});
  const createVotingTopic = useMutation(api.voting.createVotingTopic);
  const activateVotingTopic = useMutation(api.voting.activateVotingTopic);
  const closeVotingTopic = useMutation(api.voting.closeVotingTopic);
  const castVote = useMutation(api.voting.castVote);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    startDate: "",
    endDate: "",
    allowMultipleVotes: false,
    visibilityType: "all" as "all" | "units" | "admin",
    visibleToUnits: [] as string[],
  });

  const [selectedVotes, setSelectedVotes] = useState<Record<string, string[]>>({});

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDate = new Date(createForm.startDate).getTime();
      const endDate = new Date(createForm.endDate).getTime();
      
      if (endDate <= startDate) {
        toast.error("End date must be after start date");
        return;
      }

      const validOptions = createForm.options.filter(option => option.trim());
      if (validOptions.length < 2) {
        toast.error("At least 2 options are required");
        return;
      }

      await createVotingTopic({
        title: createForm.title,
        description: createForm.description,
        options: validOptions,
        startDate,
        endDate,
        allowMultipleVotes: createForm.allowMultipleVotes,
        visibilityType: createForm.visibilityType,
        visibleToUnits: createForm.visibilityType === "units" ? createForm.visibleToUnits : undefined,
      });

      toast.success("Voting topic created successfully");
      setCreateForm({
        title: "",
        description: "",
        options: ["", ""],
        startDate: "",
        endDate: "",
        allowMultipleVotes: false,
        visibilityType: "all",
        visibleToUnits: [],
      });
      setShowCreateForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create voting topic");
    }
  };

  const handleActivate = async (topicId: string) => {
    try {
      await activateVotingTopic({ topicId: topicId as any });
      toast.success("Voting topic activated");
    } catch (error) {
      toast.error("Failed to activate voting topic");
    }
  };

  const handleClose = async (topicId: string) => {
    try {
      await closeVotingTopic({ topicId: topicId as any });
      toast.success("Voting topic closed");
    } catch (error) {
      toast.error("Failed to close voting topic");
    }
  };

  const handleVote = async (topicId: string) => {
    const selectedOptions = selectedVotes[topicId] || [];
    if (selectedOptions.length === 0) {
      toast.error("Please select at least one option");
      return;
    }

    try {
      await castVote({ topicId: topicId as any, selectedOptions });
      toast.success("Vote cast successfully");
      setSelectedVotes(prev => ({ ...prev, [topicId]: [] }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cast vote");
    }
  };

  const handleOptionChange = (topicId: string, option: string, checked: boolean, allowMultiple: boolean) => {
    setSelectedVotes(prev => {
      const current = prev[topicId] || [];
      if (allowMultiple) {
        return {
          ...prev,
          [topicId]: checked
            ? [...current, option]
            : current.filter(o => o !== option)
        };
      } else {
        return {
          ...prev,
          [topicId]: checked ? [option] : []
        };
      }
    });
  };

  const addOption = () => {
    setCreateForm(prev => ({
      ...prev,
      options: [...prev.options, ""]
    }));
  };

  const removeOption = (index: number) => {
    setCreateForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index: number, value: string) => {
    setCreateForm(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));
  };

  const handleUnitToggle = (unit: string) => {
    setCreateForm(prev => ({
      ...prev,
      visibleToUnits: prev.visibleToUnits.includes(unit)
        ? prev.visibleToUnits.filter(u => u !== unit)
        : [...prev.visibleToUnits, unit]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Voting</h2>
          <p className="text-slate-600">
            {member.role === "admin" 
              ? "Manage voting topics and view results" 
              : `Vote on topics available to ${member.unit ? `unit ${member.unit} and ` : ""}all members`}
          </p>
        </div>
        {member.role === "admin" && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">🗳️</span>
            Create Voting Topic
          </button>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Create Voting Topic</h3>
            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Voting Options *
                </label>
                {createForm.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    {createForm.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="px-2 py-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOption}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Option
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Visibility *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="all"
                      checked={createForm.visibilityType === "all"}
                      onChange={(e) => setCreateForm({ ...createForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">All members</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="units"
                      checked={createForm.visibilityType === "units"}
                      onChange={(e) => setCreateForm({ ...createForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Specific units only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="admin"
                      checked={createForm.visibilityType === "admin"}
                      onChange={(e) => setCreateForm({ ...createForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Administrators only</span>
                  </label>
                </div>
              </div>
              {createForm.visibilityType === "units" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Units *
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-md p-2 space-y-1">
                    {availableUnits?.filter(unit => unit).map((unit) => (
                      <label key={unit} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={createForm.visibleToUnits.includes(unit!)}
                          onChange={() => handleUnitToggle(unit!)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <span className="ml-2 text-sm text-slate-700">{unit}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowMultiple"
                  checked={createForm.allowMultipleVotes}
                  onChange={(e) => setCreateForm({ ...createForm, allowMultipleVotes: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="allowMultiple" className="ml-2 block text-sm text-slate-700">
                  Allow multiple vote selections
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createForm.visibilityType === "units" && createForm.visibleToUnits.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Create Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voting Topics */}
      <div className="space-y-4">
        {votingTopics?.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <div className="text-slate-400 text-6xl mb-4">🗳️</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No voting topics</h3>
            <p className="text-slate-600">
              {member.role === "admin"
                ? "Create your first voting topic to get started."
                : "No voting topics are currently available to you."}
            </p>
          </div>
        ) : (
          votingTopics?.map((topic) => (
            <div key={topic._id} className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-slate-900 mb-2">{topic.title}</h3>
                  <p className="text-slate-600 mb-3">{topic.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-500">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        topic.status === "active"
                          ? "bg-green-100 text-green-800"
                          : topic.status === "draft"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {topic.status}
                    </span>
                    <span>
                      {new Date(topic.startDate).toLocaleDateString()} - {new Date(topic.endDate).toLocaleDateString()}
                    </span>
                    {topic.allowMultipleVotes && (
                      <span className="text-blue-600">Multiple selections allowed</span>
                    )}
                    {topic.visibilityType === "units" && topic.visibleToUnits && (
                      <span className="text-blue-600">
                        Units: {topic.visibleToUnits.join(", ")}
                      </span>
                    )}
                    {topic.visibilityType === "admin" && (
                      <span className="text-red-600">Admin only</span>
                    )}
                  </div>
                </div>
                {member.role === "admin" && (
                  <div className="flex space-x-2">
                    {topic.status === "draft" && (
                      <button
                        onClick={() => handleActivate(topic._id)}
                        className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                      >
                        Activate
                      </button>
                    )}
                    {topic.status === "active" && (
                      <button
                        onClick={() => handleClose(topic._id)}
                        className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                      >
                        Close
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Voting Options */}
              {topic.status === "active" && member.status === "active" && (
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-900">Cast your vote:</h4>
                  {topic.options.map((option) => (
                    <label key={option} className="flex items-center space-x-3">
                      <input
                        type={topic.allowMultipleVotes ? "checkbox" : "radio"}
                        name={`vote-${topic._id}`}
                        checked={(selectedVotes[topic._id] || []).includes(option)}
                        onChange={(e) => handleOptionChange(topic._id, option, e.target.checked, topic.allowMultipleVotes)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-slate-700">{option}</span>
                    </label>
                  ))}
                  <button
                    onClick={() => handleVote(topic._id)}
                    disabled={!selectedVotes[topic._id]?.length}
                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Vote
                  </button>
                </div>
              )}

              {topic.status === "closed" && (
                <div className="mt-4 p-4 bg-slate-50 rounded-md">
                  <h4 className="font-medium text-slate-900 mb-2">Voting Results:</h4>
                  <VotingResults topicId={topic._id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function VotingResults({ topicId }: { topicId: string }) {
  const results = useQuery(api.voting.getVotingResults, { topicId: topicId as any });

  if (!results) {
    return <div className="text-slate-500">Loading results...</div>;
  }

  const maxVotes = Math.max(...Object.values(results.results));

  return (
    <div className="space-y-2">
      {Object.entries(results.results).map(([option, votes]) => (
        <div key={option} className="flex items-center justify-between">
          <span className="text-slate-700">{option}</span>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${maxVotes > 0 ? (votes / maxVotes) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm text-slate-600 w-8 text-right">{votes}</span>
          </div>
        </div>
      ))}
      <div className="text-sm text-slate-500 mt-2">
        Total votes: {results.totalVotes}
      </div>
    </div>
  );
}
