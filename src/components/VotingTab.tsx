import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface VotingTabProps {
  associationId: Id<"associations">;
}

export function VotingTab({ associationId }: VotingTabProps) {
  const topics = useQuery(api.voting.listTopics, { associationId });
  const userAssociations = useQuery(api.associations.getUserAssociations);
  const createTopic = useMutation(api.voting.createTopic);
  const proposeTopic = useMutation(api.voting.proposeTopic);
  const updateTopic = useMutation(api.voting.updateTopic);
  const vote = useMutation(api.voting.vote);
  const getUserVote = useQuery(api.voting.getUserVote, 
    topics && topics.length > 0 ? { topicId: topics[0]._id } : "skip"
  );
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState({
    title: "",
    description: "",
    options: ["", ""],
    startDate: "",
    endDate: "",
    allowMultipleVotes: false,
  });

  // Check if current user is an admin of this association
  const isAdmin = userAssociations?.some(
    (association) =>
      association?._id === associationId &&
      (association?.role === "owner" || association?.role === "admin"),
  );

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDate = new Date(topicForm.startDate).getTime();
      const endDate = new Date(topicForm.endDate).getTime();
      
      if (endDate <= startDate) {
        toast.error("End date must be after start date");
        return;
      }

      const validOptions = topicForm.options.filter(option => option.trim() !== "");
      if (validOptions.length < 2) {
        toast.error("At least 2 options are required");
        return;
      }
      if (isAdmin) {
        await createTopic({
          associationId,
          title: topicForm.title,
          description: topicForm.description,
          options: validOptions,
          startDate,
          endDate,
          allowMultipleVotes: topicForm.allowMultipleVotes,
        });
        toast.success("Voting topic created successfully");
      } else {
        await proposeTopic({
          associationId,
          title: topicForm.title,
          description: topicForm.description,
          options: validOptions,
          startDate,
          endDate,
          allowMultipleVotes: topicForm.allowMultipleVotes,
        });
        toast.success("Proposal submitted. Only you and admins can see it until activated.");
      }
      setTopicForm({
        title: "",
        description: "",
        options: ["", ""],
        startDate: "",
        endDate: "",
        allowMultipleVotes: false,
      });
      setShowCreateForm(false);
    } catch (error) {
      toast.error("Failed to create topic: " + (error as Error).message);
    }
  };

  const handleVote = async (topicId: Id<"votingTopics">, selectedOptions: string[]) => {
    try {
      await vote({ topicId, selectedOptions });
      toast.success("Vote submitted successfully");
    } catch (error) {
      toast.error("Failed to submit vote: " + (error as Error).message);
    }
  };

  const handleActivateTopic = async (topicId: Id<"votingTopics">) => {
    try {
      await updateTopic({ id: topicId, status: "active" });
      toast.success("Voting topic activated");
    } catch (error) {
      toast.error("Failed to activate topic: " + (error as Error).message);
    }
  };

  const addOption = () => {
    setTopicForm({
      ...topicForm,
      options: [...topicForm.options, ""]
    });
  };

  const removeOption = (index: number) => {
    if (topicForm.options.length > 2) {
      const newOptions = topicForm.options.filter((_, i) => i !== index);
      setTopicForm({ ...topicForm, options: newOptions });
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...topicForm.options];
    newOptions[index] = value;
    setTopicForm({ ...topicForm, options: newOptions });
  };

  if (!topics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Voting</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isAdmin ? "Create Vote" : "Propose Topic"}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="text-lg font-semibold mb-4">{isAdmin ? "Create New Vote" : "Propose New Topic"}</h3>
          <form onSubmit={handleCreateTopic} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={topicForm.title}
                onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Pool Renovation Proposal"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={topicForm.description}
                onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Provide details about what members are voting on..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Voting Options *
              </label>
              {topicForm.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  {topicForm.options.length > 2 && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={topicForm.startDate}
                  onChange={(e) => setTopicForm({ ...topicForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={topicForm.endDate}
                  onChange={(e) => setTopicForm({ ...topicForm, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowMultiple"
                checked={topicForm.allowMultipleVotes}
                onChange={(e) => setTopicForm({ ...topicForm, allowMultipleVotes: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
              />
              <label htmlFor="allowMultiple" className="ml-2 text-sm text-slate-700">
                Allow multiple selections
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {isAdmin ? "Create Vote" : "Submit Proposal"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {topics.map((topic) => (
          <VotingTopicCard
            key={topic._id}
            topic={topic}
            onVote={handleVote}
            onActivate={handleActivateTopic}
          />
        ))}
      </div>
      
      {topics.length === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-400 text-4xl mb-4">🗳️</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No votes yet</h3>
          <p className="text-slate-600">{isAdmin ? "Create your first voting topic to get started." : "Propose a topic to get started. Admins will review and activate it."}</p>
        </div>
      )}
    </div>
  );
}

function VotingTopicCard({ topic, onVote, onActivate }: {
  topic: any;
  onVote: (topicId: Id<"votingTopics">, selectedOptions: string[]) => void;
  onActivate: (topicId: Id<"votingTopics">) => void;
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const userVote = useQuery(api.voting.getUserVote, { topicId: topic._id });
  const userAssociations = useQuery(api.associations.getUserAssociations);

  const isAdmin = userAssociations?.some(
    (association: any) =>
      association?._id === topic.associationId &&
      (association?.role === "owner" || association?.role === "admin"),
  );

  const now = Date.now();
  const isActive = topic.status === "active" && now >= topic.startDate && now <= topic.endDate;
  const hasEnded = now > topic.endDate;
  const hasStarted = now >= topic.startDate;

  const handleOptionChange = (option: string, checked: boolean) => {
    if (topic.allowMultipleVotes) {
      if (checked) {
        setSelectedOptions([...selectedOptions, option]);
      } else {
        setSelectedOptions(selectedOptions.filter(o => o !== option));
      }
    } else {
      setSelectedOptions(checked ? [option] : []);
    }
  };

  const handleSubmitVote = () => {
    if (selectedOptions.length === 0) {
      toast.error("Please select at least one option");
      return;
    }
    onVote(topic._id, selectedOptions);
    setSelectedOptions([]);
  };

  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">{topic.title}</h3>
          {topic.description && (
            <p className="text-slate-600 mb-3">{topic.description}</p>
          )}
          <div className="flex items-center space-x-4 text-sm text-slate-500">
            <span>
              {new Date(topic.startDate).toLocaleDateString()} - {new Date(topic.endDate).toLocaleDateString()}
            </span>
            <span>{topic.totalVotes} votes</span>
            {typeof topic.unitsVoted === "number" && typeof topic.totalUnits === "number" && (
              <span>
                {topic.unitsVoted} of {topic.totalUnits} units ({(topic.unitsVotedPercent || 0).toFixed(1)}%) voted
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            topic.status === "active" 
              ? "bg-green-100 text-green-800" 
              : topic.status === "draft"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-slate-100 text-slate-800"
          }`}>
            {topic.status}
          </span>
          {isAdmin && topic.status === "draft" && (
            <button
              onClick={() => onActivate(topic._id)}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Activate
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {topic.options.map((option: string) => {
          const voteCount = topic.voteCounts[option] || 0;
          const percentage = topic.totalVotes > 0 ? (voteCount / topic.totalVotes) * 100 : 0;
          const isSelected = userVote?.selectedOptions?.includes(option);
          
          return (
            <div key={option} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type={topic.allowMultipleVotes ? "checkbox" : "radio"}
                    name={`vote-${topic._id}`}
                    checked={isActive ? selectedOptions.includes(option) : isSelected}
                    onChange={(e) => isActive && handleOptionChange(option, e.target.checked)}
                    disabled={!isActive}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-slate-900">{option}</span>
                </label>
                <span className="text-sm text-slate-600">
                  {voteCount} votes ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {isActive && !userVote && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button
            onClick={handleSubmitVote}
            disabled={selectedOptions.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Vote
          </button>
        </div>
      )}

      {userVote && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-green-600">
            ✓ You voted for: {userVote.selectedOptions.join(", ")}
          </p>
        </div>
      )}

      {!isActive && !hasEnded && topic.status === "active" && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Voting starts on {new Date(topic.startDate).toLocaleDateString()}
          </p>
        </div>
      )}

      {hasEnded && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Voting ended on {new Date(topic.endDate).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
