import { useClerk, useUser } from "@clerk/clerk-react";

export function SignOutButton() {
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();

  if (!isSignedIn) {
    return null;
  }

  return (
    <button
      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
