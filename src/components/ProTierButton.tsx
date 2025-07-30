import { SignInButton, useUser } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { StripePaymentButton } from './StripePaymentButton';
import { Id } from '../../convex/_generated/dataModel';

interface ProTierButtonProps {
  className?: string;
  selectedAssociationId?: Id<"associations"> | null;
}

export function ProTierButton({ className, selectedAssociationId }: ProTierButtonProps) {
  const { isSignedIn } = useUser();
  const [showPayment, setShowPayment] = useState(false);

  // Check if user just signed up for Pro (detected from URL params or localStorage)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const proSignUpFromUrl = urlParams.get('pro_signup') === 'true';
    const proSignUpFromStorage = localStorage.getItem('pro_signup') === 'true';
    
    if (proSignUpFromUrl || proSignUpFromStorage) {
      setShowPayment(true);
      // Clean up
      window.history.replaceState({}, document.title, window.location.pathname);
      localStorage.removeItem('pro_signup');
    }
  }, []);

  // If user is signed in and we should show payment, show the Stripe button
  if (isSignedIn && showPayment) {
    return (
      <StripePaymentButton 
        className={className} 
        isSignedIn={true}
        selectedAssociationId={selectedAssociationId}
      />
    );
  }

  // If user is signed in but not showing payment, show regular Stripe button
  if (isSignedIn) {
    return (
      <StripePaymentButton 
        className={className} 
        isSignedIn={true}
        selectedAssociationId={selectedAssociationId}
      />
    );
  }

  // If user is not signed in, show sign-up button
  // We'll handle the redirect manually by setting a flag in localStorage
  const handleProSignUp = () => {
    // Set a flag to indicate this is a Pro sign-up
    localStorage.setItem('pro_signup', 'true');
  };

  return (
    <SignInButton mode="modal">
      <button className={className} onClick={handleProSignUp}>
        Sign up for Pro
      </button>
    </SignInButton>
  );
} 