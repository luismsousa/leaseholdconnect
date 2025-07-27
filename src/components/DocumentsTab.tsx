import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface DocumentsTabProps {
  member: Doc<"members">;
}

export function DocumentsTab({ member }: DocumentsTabProps) {
  const documents = useQuery(api.documents.listDocuments, {});
  const categories = useQuery(api.documents.getDocumentCategories, {});
  const availableUnits = useQuery(api.documents.getAvailableUnits, {});
  const currentUser = useQuery(api.auth.loggedInUser);
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const uploadDocument = useMutation(api.documents.uploadDocument);
  const deleteDocument = useMutation(api.documents.deleteDocument);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "",
    isPublic: true,
    visibilityType: "all" as "all" | "units" | "admin",
    visibleToUnits: [] as string[],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocuments = selectedCategory
    ? documents?.filter(doc => doc.category === selectedCategory)
    : documents;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.title) {
        setUploadForm(prev => ({ ...prev, title: file.name }));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Get upload URL
      const postUrl = await generateUploadUrl();

      // Upload file
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      const json = await result.json();
      if (!result.ok) {
        throw new Error(`Upload failed: ${JSON.stringify(json)}`);
      }

      const { storageId } = json;

      // Save document metadata
      await uploadDocument({
        title: uploadForm.title,
        description: uploadForm.description || undefined,
        category: uploadForm.category,
        fileId: storageId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        isPublic: uploadForm.isPublic,
        visibilityType: uploadForm.visibilityType,
        visibleToUnits: uploadForm.visibilityType === "units" ? uploadForm.visibleToUnits : undefined,
      });

      toast.success("Document uploaded successfully");
      setUploadForm({ 
        title: "", 
        description: "", 
        category: "", 
        isPublic: true, 
        visibilityType: "all",
        visibleToUnits: [],
      });
      setSelectedFile(null);
      setShowUploadForm(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await deleteDocument({ documentId: documentId as any });
      toast.success("Document deleted successfully");
    } catch (error) {
      toast.error("Failed to delete document");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleUnitToggle = (unit: string) => {
    setUploadForm(prev => ({
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
          <h2 className="text-2xl font-bold text-slate-900">Documents</h2>
          <p className="text-slate-600">
            {member.role === "admin" 
              ? "Manage association documents and files" 
              : `Access documents available to ${member.unit ? `unit ${member.unit} and ` : ""}all members`}
          </p>
        </div>
        {member.role === "admin" && (
          <button
            onClick={() => setShowUploadForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <span className="mr-2">📤</span>
            Upload Document
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-slate-700">Filter by category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories?.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Upload Document</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {selectedFile && (
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  placeholder="e.g., Meeting Minutes, Financial Reports, Policies"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
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
                      checked={uploadForm.visibilityType === "all"}
                      onChange={(e) => setUploadForm({ ...uploadForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">All members</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="units"
                      checked={uploadForm.visibilityType === "units"}
                      onChange={(e) => setUploadForm({ ...uploadForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Specific units only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibilityType"
                      value="admin"
                      checked={uploadForm.visibilityType === "admin"}
                      onChange={(e) => setUploadForm({ ...uploadForm, visibilityType: e.target.value as any })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Administrators only</span>
                  </label>
                </div>
              </div>
              {uploadForm.visibilityType === "units" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Units *
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-md p-2 space-y-1">
                    {availableUnits?.filter(unit => unit).map((unit) => (
                      <label key={unit} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={uploadForm.visibleToUnits.includes(unit!)}
                          onChange={() => handleUnitToggle(unit!)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                        />
                        <span className="ml-2 text-sm text-slate-700">{unit}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={uploadForm.isPublic}
                  onChange={(e) => setUploadForm({ ...uploadForm, isPublic: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-slate-700">
                  Public document (visible in search results)
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  disabled={uploading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || uploading || (uploadForm.visibilityType === "units" && uploadForm.visibleToUnits.length === 0)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white shadow-sm rounded-lg border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-medium text-slate-900">
            {selectedCategory ? `${selectedCategory} Documents` : "Available Documents"}
          </h3>
          {member.unit && member.role !== "admin" && (
            <p className="text-sm text-slate-500 mt-1">
              Showing documents for unit {member.unit} and all members
            </p>
          )}
        </div>
        <div className="divide-y divide-slate-200">
          {filteredDocuments?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-slate-400 text-6xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No documents found</h3>
              <p className="text-slate-600">
                {selectedCategory
                  ? `No documents in the "${selectedCategory}" category are available to you.`
                  : "No documents are currently available to you."}
              </p>
            </div>
          ) : (
            filteredDocuments?.map((doc) => (
              <div key={doc._id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                      {doc.description && (
                        <p className="text-sm text-slate-600">{doc.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                        <span>{doc.category}</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        {doc.visibilityType === "units" && doc.visibleToUnits && (
                          <span className="text-blue-600">
                            Units: {doc.visibleToUnits.join(", ")}
                          </span>
                        )}
                        {doc.visibilityType === "admin" && (
                          <span className="text-red-600">Admin only</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {doc.downloadUrl && (
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Download
                    </a>
                  )}
                  {(member.role === "admin" || doc.uploadedBy === currentUser?._id) && (
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
