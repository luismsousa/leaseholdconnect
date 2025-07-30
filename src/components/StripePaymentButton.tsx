import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface StripePaymentButtonProps {
  className?: string;
  isSignedIn: boolean;
  selectedAssociationId?: Id<"associations"> | null;
}

export function StripePaymentButton({ 
  className, 
  isSignedIn, 
  selectedAssociationId 
}: StripePaymentButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useUser();

  // Get current association details to check subscription status
  const currentAssociation = useQuery(
    api.associations.getAssociation,
    selectedAssociationId ? { associationId: selectedAssociationId } : "skip"
  );

  useEffect(() => {
    // Listen for Stripe payment success events
    const handleStripeSuccess = (event: CustomEvent) => {
      if (event.detail && event.detail.type === 'checkout.session.completed') {
        // Payment was successful, redirect to dashboard
        navigate('/dashboard');
      }
    };

    // Listen for the custom event that Stripe might emit
    window.addEventListener('stripe-payment-success', handleStripeSuccess as EventListener);
    
    // Also listen for URL changes that might indicate successful payment
    const handleUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment_intent') || urlParams.get('session_id')) {
        // Payment was successful, redirect to dashboard
        navigate('/dashboard');
      }
    };

    handleUrlChange();

    return () => {
      window.removeEventListener('stripe-payment-success', handleStripeSuccess as EventListener);
    };
  }, [navigate]);

  if (!isSignedIn) {
    return (
      <div className={className}>
        <div className="w-full bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-semibold cursor-not-allowed">
          Sign in to subscribe
        </div>
      </div>
    );
  }

  // Check if association already has an active subscription
  if (currentAssociation && currentAssociation.subscriptionStatus === "active") {
    return (
      <div className={className}>
        <div className="w-full bg-green-100 text-green-800 py-3 px-6 rounded-lg font-semibold">
          ✓ Active {currentAssociation.subscriptionTier.toUpperCase()} Subscription
        </div>
      </div>
    );
  }

  // Check if required environment variables are set
  const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  const stripeBuyButtonId = import.meta.env.VITE_STRIPE_BUY_BUTTON_ID;

  if (!stripePublishableKey || !stripeBuyButtonId) {
    console.error('Missing Stripe environment variables. Please ensure VITE_STRIPE_PUBLISHABLE_KEY and VITE_STRIPE_BUY_BUTTON_ID are set in your .env.local file.');
    return (
      <div className={className}>
        <div className="w-full bg-red-100 text-red-800 py-3 px-6 rounded-lg font-semibold">
          Error: Stripe configuration missing
        </div>
      </div>
    );
  }

  // Generate a unique client reference ID for tracking this subscription attempt
  // Format: ${userId}_${associationId}_${timestamp}
  // user.id from Clerk already contains "user_" prefix, so we don't need to add it again
  const clientReferenceId = user && selectedAssociationId 
    ? `${user.id}_${selectedAssociationId}_${Date.now()}` 
    : user 
    ? `${user.id}_${Date.now()}` 
    : `anonymous_${Date.now()}`;
  
  // Get user's email for pre-filling the payment form
  const customerEmail = user?.emailAddresses?.[0]?.emailAddress || '';

  return (
    <div className={className}>
      <div ref={buttonRef} className="w-full stripe-button-container">
        {React.createElement('stripe-buy-button', {
          'buy-button-id': stripeBuyButtonId,
          'publishable-key': stripePublishableKey,
          'client-reference-id': clientReferenceId,
          'customer-email': customerEmail,
          style: {
            width: '100%',
            display: 'block',
            maxWidth: '100%'
          }
        })}
      </div>
    </div>
  );
}

// Add Stripe to the global window object type
declare global {
  interface Window {
    Stripe?: any;
  }
}

// Extend JSX namespace for stripe-buy-button
declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    'buy-button-id'?: string;
    'publishable-key'?: string;
    'client-reference-id'?: string;
    'customer-email'?: string;
  }
} 
