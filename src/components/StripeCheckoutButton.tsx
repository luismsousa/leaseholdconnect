import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface StripeCheckoutButtonProps {
  className?: string;
  isSignedIn: boolean;
  selectedAssociationId?: Id<"associations"> | null;
  tier: 'pro' | 'enterprise';
  billingInterval?: 'monthly' | 'yearly';
  buttonText?: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function StripeCheckoutButton({ 
  className, 
  isSignedIn, 
  selectedAssociationId,
  tier,
  billingInterval = 'monthly',
  buttonText = "Start Free Trial",
  variant = 'primary'
}: StripeCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();
  const createCheckoutSession = useAction(api.stripe.createCheckoutSession);

  const handleSubscribe = async () => {
    if (!isSignedIn || !selectedAssociationId || !user) {
      console.error('User must be signed in and have a selected association');
      return;
    }

    setIsLoading(true);
    try {
      const successUrl = `${window.location.origin}/dashboard?subscription=success`;
      const cancelUrl = `${window.location.origin}/dashboard?subscription=cancelled`;
      
      const result = await createCheckoutSession({
        associationId: selectedAssociationId,
        tier: tier,
        billingInterval: billingInterval,
        successUrl,
        cancelUrl,
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress || "",
      });

      // Redirect to Stripe Checkout
      window.location.href = result.url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start subscription process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className={className}>
        <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-semibold cursor-not-allowed h-12 flex items-center justify-center">
          Sign in to subscribe
        </div>
      </div>
    );
  }

  if (!selectedAssociationId) {
    return (
      <div className={className}>
        <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-semibold cursor-not-allowed h-12 flex items-center justify-center">
          Please select an association first
        </div>
      </div>
    );
  }

  const getButtonClasses = () => {
    const baseClasses = "w-full py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12";
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white`;
      case 'secondary':
        return `${baseClasses} bg-slate-900 hover:bg-slate-800 text-white`;
      case 'outline':
        return `${baseClasses} border border-slate-300 text-slate-700 hover:bg-slate-50`;
      default:
        return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white`;
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleSubscribe}
        disabled={isLoading}
        className={getButtonClasses()}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </div>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
} 