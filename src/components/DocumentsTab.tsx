import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface DocumentsTabProps {
  associationId: Id<"associations">;
}

export function DocumentsTab({ associationId }: DocumentsTabProps) {
  const documents = useQuery(api.documents.list, { associationId });
  const buildings = useQuery(api.documents.getBuildings, { associationId });
  const documentCategories = useQuery(api.documents.getCategories, { associationId });
  const createDocument = useMutation(api.documents.create);
  const removeDocument = useMutation(api.documents.remove);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [documentForm, setDocumentForm] = useState({
    title: "",
    description: "",
    category: "",
    isPublic: false,
    visibilityType: "all" as "all" | "buildings" | "admin",
    visibleToBuildings: [] as string[],
  });

  const defaultCategories = [
    "Meeting Minutes",
    "Financial Reports",
    "By-laws",
    "Rules & Regulations",
    "Maintenance",
    "Insurance",
    "Legal Documents",
    "Newsletters",
    "Other"
  ];

  const categories = documentCategories || defaultCategories;

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl({ associationId });
      
      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Failed to upload file");
      }
      
      const { storageId } = await result.json();
      
      // Create document record
      await createDocument({
        associationId,
        title: documentForm.title,
        description: documentForm.description || undefined,
        category: documentForm.category,
        fileId: storageId,
        fileName: file.name,
        fileSize: file.size,
        isPublic: documentForm.isPublic,
        visibilityType: documentForm.visibilityType,
        visibleToBuildings: documentForm.visibilityType === "buildings" ? documentForm.visibleToBuildings : undefined,
      });
      
      toast.success("Document uploaded successfully");
      setDocumentForm({
        title: "",
        description: "",
        category: "",
        isPublic: false,
        visibilityType: "all",
        visibleToBuildings: [],
      });
      setShowUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Failed to upload document: " + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    handleFileUpload(file);
  };

  const handleRemove = async (documentId: Id<"documents">, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    
    try {
      await removeDocument({ id: documentId });
      toast.success("Document deleted successfully");
    } catch (error) {
      toast.error("Failed to delete document: " + (error as Error).message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getVisibilityLabel = (doc: any) => {
    if (doc.isPublic) return "Public";
    if (doc.visibilityType === "admin") return "Admin Only";
    if (doc.visibilityType === "all") return "All Buildings";
    if (doc.visibilityType === "buildings") {
      return `Specific Buildings (${doc.visibleToBuildings?.length || 0})`;
    }
    return "Unknown";
  };

  if (!documents || !buildings || !documentCategories) {
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

  const filteredDocuments = selectedCategory 
    ? documents.filter(doc => doc.category === selectedCategory)
    : documents;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Documents</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowUploadForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Upload Document
          </button>
        </div>
      </div>

      {/* Document Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{documents.length}</div>
          <div className="text-sm text-blue-700">Total Documents</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {documents.filter(doc => doc.isPublic).length}
          </div>
          <div className="text-sm text-green-700">Public Documents</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-slate-600">
            {documents.filter(doc => doc.visibilityType === "buildings").length}
          </div>
          <div className="text-sm text-slate-700">Building-Specific</div>
        </div>
      </div>

      {showUploadForm && (
        <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
          <h3 className="text-lg font-semibold mb-4">Upload New Document</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={documentForm.title}
                  onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter document title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={documentForm.category}
                  onChange={(e) => setDocumentForm({ ...documentForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={documentForm.description}
                onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Document description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                File *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={documentForm.isPublic}
                  onChange={(e) => setDocumentForm({ ...documentForm, isPublic: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-slate-700">
                  Make this document public (visible to all members)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Visibility Settings
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="all"
                      checked={documentForm.visibilityType === "all"}
                      onChange={(e) => setDocumentForm({ ...documentForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Visible to all buildings</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="buildings"
                      checked={documentForm.visibilityType === "buildings"}
                      onChange={(e) => setDocumentForm({ ...documentForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Visible to specific buildings</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="admin"
                      checked={documentForm.visibilityType === "admin"}
                      onChange={(e) => setDocumentForm({ ...documentForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Admin only</span>
                  </label>
                </div>
              </div>

              {documentForm.visibilityType === "buildings" && buildings && buildings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Buildings
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {buildings.map((building) => (
                      <label key={building} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={documentForm.visibleToBuildings.includes(building)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDocumentForm({
                                ...documentForm,
                                visibleToBuildings: [...documentForm.visibleToBuildings, building]
                              });
                            } else {
                              setDocumentForm({
                                ...documentForm,
                                visibleToBuildings: documentForm.visibleToBuildings.filter(b => b !== building)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <span className="ml-2 text-sm text-slate-700">{building}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredDocuments.map((doc) => (
          <div key={doc._id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">{doc.title}</h3>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {doc.category}
                  </span>
                  <span className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full">
                    {getVisibilityLabel(doc)}
                  </span>
                </div>
                
                {doc.description && (
                  <p className="text-sm text-slate-600 mb-2">{doc.description}</p>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-slate-500">
                  <span>📄 {doc.fileName}</span>
                  <span>📏 {formatFileSize(doc.fileSize)}</span>
                  <span>📅 {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                </div>

                {doc.visibilityType === "buildings" && doc.visibleToBuildings && (
                  <div className="mt-2">
                    <span className="text-xs text-slate-500">Visible to: </span>
                    <span className="text-xs text-slate-700">
                      {doc.visibleToBuildings.join(", ")}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2 ml-4">
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    View
                  </a>
                )}
                <button
                  onClick={() => handleRemove(doc._id, doc.title)}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredDocuments.length === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-400 text-4xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {documents.length === 0 ? "No documents yet" : "No documents match the current filters"}
          </h3>
          <p className="text-slate-600">
            {documents.length === 0 
              ? "Start by uploading your first document to the association."
              : "Try adjusting your filters to see more documents."
            }
          </p>
        </div>
      )}
    </div>
  );
}
