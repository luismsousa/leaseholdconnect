export function ClerkConfigRequired() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Configuration Required
          </h1>
          <p className="text-slate-600 mb-4">
            Please configure your Clerk authentication keys to continue.
          </p>
          <div className="text-left bg-slate-100 p-4 rounded-md">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Required Environment Variables:
            </p>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• VITE_CLERK_PUBLISHABLE_KEY</li>
              <li>• CLERK_JWT_ISSUER_DOMAIN</li>
            </ul>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            <p>
              Set these variables in your Convex dashboard under Settings → Environment Variables
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
