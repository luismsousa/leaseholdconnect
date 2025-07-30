import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import { ClerkConfigRequired } from "./components/ClerkConfigRequired";
import { PostHogProvider } from "posthog-js/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  console.error(
    "Missing Clerk Publishable Key. Please set VITE_CLERK_PUBLISHABLE_KEY in your environment variables.",
  );
}

createRoot(document.getElementById("root")!).render(
  <PostHogProvider
    apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
    options={{
      api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
      defaults: "2025-05-24",
      capture_exceptions: true,
      debug: import.meta.env.MODE === "development",
    }}
  >
    {clerkPublishableKey ? (
      <ClerkProvider 
        publishableKey={clerkPublishableKey} 
        afterSignOutUrl="/"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <App />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    ) : (
      <ClerkConfigRequired />
    )}
  </PostHogProvider>,
);
