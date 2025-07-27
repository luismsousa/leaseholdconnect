import { SignIn, SignUp } from "@clerk/clerk-react";
import { useState } from "react";

export function AuthenticationForm() {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">
          {isSignUp ? "Create Account" : "Welcome"}
        </h2>
        <p className="text-slate-600 mt-2">
          {isSignUp 
            ? "Create your account to get started" 
            : "Sign in to access your association dashboard"
          }
        </p>
      </div>

      <div className="flex flex-col items-center w-full">
        {isSignUp ? (
          <SignUp 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "auth-button mb-2",
                formButtonPrimary: "auth-button",
                formFieldInput: "auth-input-field",
                footerActionLink: "hidden",
                footer: "hidden",
                identityPreviewText: "text-slate-600",
                formFieldLabel: "text-sm font-medium text-slate-700 mb-2",
                dividerLine: "bg-slate-200",
                dividerText: "text-slate-500 text-sm",
                formFieldWarning: "text-red-600 text-sm mt-1",
                formFieldSuccessText: "text-green-600 text-sm mt-1",
                formResendCodeLink: "text-blue-600 hover:text-blue-800 text-sm",
                otpCodeFieldInput: "auth-input-field text-center",
                formFieldInputShowPasswordButton: "text-slate-500 hover:text-slate-700"
              },
              layout: {
                socialButtonsPlacement: "top",
                showOptionalFields: false
              }
            }}
            forceRedirectUrl="/dashboard"
          />
        ) : (
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 bg-transparent w-full",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "auth-button mb-2",
                formButtonPrimary: "auth-button",
                formFieldInput: "auth-input-field",
                footerActionLink: "hidden",
                footer: "hidden",
                identityPreviewText: "text-slate-600",
                formFieldLabel: "text-sm font-medium text-slate-700 mb-2",
                dividerLine: "bg-slate-200",
                dividerText: "text-slate-500 text-sm",
                formFieldWarning: "text-red-600 text-sm mt-1",
                formFieldSuccessText: "text-green-600 text-sm mt-1",
                formResendCodeLink: "text-blue-600 hover:text-blue-800 text-sm",
                otpCodeFieldInput: "auth-input-field text-center",
                formFieldInputShowPasswordButton: "text-slate-500 hover:text-slate-700"
              },
              layout: {
                socialButtonsPlacement: "top",
                showOptionalFields: false
              }
            }}
            forceRedirectUrl="/dashboard"
          />
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            {isSignUp 
              ? "Already have an account? Sign in" 
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
