import { SignInButton, useUser, useClerk } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { ContactFormModal } from './ContactFormModal';
import { ProTierButton } from './ProTierButton';

export function LandingPage() {
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedAssociationId, setSelectedAssociationId] = useState<Id<"associations"> | null>(null);
  const [isAnnualPricing, setIsAnnualPricing] = useState(false);

  // Feature flags
  const ENABLE_CALCULATOR = false;
  const ENABLE_SOCIAL_PROOF = false;

  // Get user's associations if signed in
  const userAssociations = useQuery(
    api.associations.getUserAssociations,
    isSignedIn ? {} : "skip"
  );

  // Get user preferences to find selected association
  const userPreferences = useQuery(
    api.userPreferences.getUserPreferences,
    isSignedIn ? {} : "skip"
  );

  // Get subscription tiers
  const subscriptionTiers = useQuery(api.subscriptionTiers.list, {});

  // Set selected association from preferences or first available association
  useEffect(() => {
    if (isSignedIn && userPreferences?.selectedAssociationId) {
      setSelectedAssociationId(userPreferences.selectedAssociationId);
    } else if (isSignedIn && userAssociations && userAssociations.length > 0) {
      // Use first association if none is selected
      const firstAssociation = userAssociations[0];
      if (firstAssociation) {
        setSelectedAssociationId(firstAssociation._id);
      }
    }
  }, [isSignedIn, userPreferences, userAssociations]);

  const handleSignOut = () => {
    void signOut({ redirectUrl: "/" });
  };

  // Get plan-specific social proof
  const getSocialProof = (tierName: string) => {
    switch (tierName) {
      case 'free':
        return "Join 500+ small associations";
      case 'pro':
        return "Used by 200+ growing associations";
      case 'enterprise':
        return "Trusted by 50+ large associations";
      default:
        return "";
    }
  };

  // Get focused features (max 5-7 key differentiators)
  const getFocusedFeatures = (tierName: string) => {
    switch (tierName) {
      case 'free':
        return [
          "Up to 10 members",
          "Basic meeting management",
          "Simple voting system",
          "Document storage (1GB)",
          "Email support"
        ];
      case 'pro':
        return [
          "Up to 50 members",
          "Advanced meeting features",
          "Enhanced voting with analytics",
          "Unlimited document storage",
          "Priority support",
          "Custom branding",
          "API access"
        ];
      case 'enterprise':
        return [
          "Unlimited members",
          "Full meeting automation",
          "Advanced voting & governance",
          "Enterprise security",
          "Dedicated account manager",
          "Custom integrations",
          "SLA guarantees"
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-slate-900">LeaseholdConnect</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isSignedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <button className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignInButton mode="modal">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      Start Free Trial
                    </button>
                  </SignInButton>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
              Modern Association
              <span className="text-blue-600"> Management</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Streamline your leaseholders association with our comprehensive platform. 
              Manage meetings, voting, members, and documents all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <Link
                  to="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <SignInButton mode="modal">
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg hover:shadow-xl">
                    Start Free Trial
                  </button>
                </SignInButton>
              )}
              <button className="border border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 rounded-lg text-lg font-semibold transition-colors">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything you need to manage your association
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From meeting management to member communication, we've got you covered
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Meetings */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Meeting Management</h3>
              <p className="text-slate-600">
                Schedule, organize, and track all your association meetings with ease
              </p>
            </div>

            {/* Voting */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Voting Topics</h3>
              <p className="text-slate-600">
                Create and manage voting topics with secure, transparent results
              </p>
            </div>

            {/* Member Management */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Member Management</h3>
              <p className="text-slate-600">
                Keep track of all association members and their contact information
              </p>
            </div>

            {/* Document Upload */}
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
              <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Document Upload</h3>
              <p className="text-slate-600">
                Securely store and share important association documents
              </p>
            </div>
          </div>
                  </div>
        </section>

      {/* ROI Calculator Hook */}
      {ENABLE_CALCULATOR && (
        <section className="py-16 bg-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Calculate Your Savings
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              See how much time and money you'll save with LeaseholdConnect
            </p>
            <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
              <div className="text-center">
                <p className="text-slate-600 mb-4">Average time saved per month:</p>
                <p className="text-3xl font-bold text-blue-600 mb-2">8-12 hours</p>
                <p className="text-slate-600 mb-4">Estimated value:</p>
                <p className="text-2xl font-bold text-green-600">£200-400/month</p>
                <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors">
                  Try Our Calculator
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Choose the plan that works best for your association
            </p>
            
            {/* Pricing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className={`text-sm font-medium ${!isAnnualPricing ? 'text-slate-900' : 'text-slate-500'}`}>
                Monthly
              </span>
              <button
                onClick={() => setIsAnnualPricing(!isAnnualPricing)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAnnualPricing ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAnnualPricing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${isAnnualPricing ? 'text-slate-900' : 'text-slate-500'}`}>
                Annual
                {isAnnualPricing && (
                  <span className="ml-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    2 Months Free
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {subscriptionTiers?.map((tier) => {
              const isPopular = tier.name === "pro";
              const isEnterprise = tier.name === "enterprise";
              const focusedFeatures = getFocusedFeatures(tier.name);
              const socialProof = getSocialProof(tier.name);
              
              // Calculate pricing
              let displayPrice = tier.price || 0;
              let billingText = "/month";
              let savingsText = "";
              
              if (isAnnualPricing) {
                if (tier.yearlyPrice && tier.yearlyPrice > 0) {
                  // Use the stored yearly price
                  displayPrice = tier.yearlyPrice;
                  billingText = "/year";
                  // Calculate savings (2 months free = 10 months worth for 12 months)
                  const monthlyEquivalent = tier.price || 0;
                  const yearlyEquivalent = monthlyEquivalent * 12;
                  const savings = yearlyEquivalent - tier.yearlyPrice;
                  savingsText = `Save £${(savings / 100).toFixed(2)}/year`;
                } else if (tier.price && tier.price > 0) {
                  // Fallback: calculate yearly price (10 months worth for 12 months)
                  displayPrice = tier.price * 10; // 10 months worth
                  billingText = "/year";
                  const yearlyEquivalent = tier.price * 12;
                  const savings = yearlyEquivalent - displayPrice;
                  savingsText = `Save £${(savings / 100).toFixed(2)}/year`;
                }
              }
              
              return (
                                <div 
                  key={tier._id}
                  className={`bg-white rounded-2xl shadow-lg border border-slate-200 p-8 relative flex flex-col ${
                    isPopular ? 'shadow-xl border-2 border-blue-500 transform scale-105' : ''
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center flex flex-col h-full">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.displayName}</h3>
                      
                      {/* Social Proof */}
                      {ENABLE_SOCIAL_PROOF && socialProof && (
                        <p className="text-sm text-slate-500 mb-4">{socialProof}</p>
                      )}
                    
                    <div className="mb-6">
                      {tier.price !== undefined ? (
                        <>
                          <span className="text-4xl font-bold text-slate-900">
                            £{(displayPrice / 100).toFixed(2)}
                          </span>
                          <span className="text-slate-600">{billingText}</span>
                          {isAnnualPricing && savingsText && (
                            <div className="text-sm text-green-600 mt-1">
                              {savingsText}
                            </div>
                          )}
                          {tier.name === "pro" && (
                            <div className="text-sm text-blue-600 mt-1 font-medium">
                              ✨ 14-day free trial
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-slate-900">Contact Us</span>
                      )}
                    </div>
                    <p className="text-slate-600 mb-8">
                      {tier.description}
                    </p>
                    <ul className="text-left space-y-3 mb-8">
                      {focusedFeatures.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      {isEnterprise ? (
                        <button 
                          onClick={() => setShowContactForm(true)}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-6 rounded-lg font-semibold transition-colors h-12 flex items-center justify-center"
                        >
                          Schedule Demo
                        </button>
                      ) : tier.name === "free" ? (
                        // For free tier, use simple Link or SignInButton
                        isSignedIn ? (
                          <Link
                            to="/dashboard"
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-6 rounded-lg font-semibold transition-colors block text-center h-12 flex items-center justify-center"
                          >
                            Go to Dashboard
                          </Link>
                        ) : (
                          <SignInButton mode="modal">
                            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 px-6 rounded-lg font-semibold transition-colors h-12 flex items-center justify-center">
                              Start Free Trial
                            </button>
                          </SignInButton>
                        )
                      ) : (
                        // For paid tiers, use ProTierButton
                        <ProTierButton
                          selectedAssociationId={selectedAssociationId}
                          className="w-full h-12"
                          buttonText={tier.name === "pro" ? "Start 14-Day Free Trial" : "Start Free Trial"}
                          variant="primary"
                          billingInterval={isAnnualPricing ? 'yearly' : 'monthly'}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Objection Handling Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need to know about LeaseholdConnect
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Can I cancel anytime?
                </h3>
                <p className="text-slate-600">
                  Yes, you can cancel your subscription at any time. No long-term contracts or hidden fees.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Is there a free trial?
                </h3>
                <p className="text-slate-600">
                  Yes! Pro tier includes a 14-day free trial. Start with our free plan and upgrade when you're ready. No credit card required for the free plan.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  How long does setup take?
                </h3>
                <p className="text-slate-600">
                  Most associations are up and running in under 30 minutes. We provide step-by-step guidance.
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  What about data security?
                </h3>
                <p className="text-slate-600">
                  Your data is encrypted and stored securely.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Do you offer support?
                </h3>
                <p className="text-slate-600">
                  Yes! Free users get email support, Pro users get priority support, and Enterprise users get dedicated account management.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Can I import existing data?
                </h3>
                <p className="text-slate-600">
                  Absolutely! We provide tools to import member lists, documents, and meeting records from your existing systems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">LeaseholdConnect</h3>
              <p className="text-slate-400">
                Modern association management for the digital age.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>&copy; 2024 LeaseholdConnect. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Contact Form Modal */}
      <ContactFormModal 
        isOpen={showContactForm} 
        onClose={() => setShowContactForm(false)} 
      />
    </div>
  );
} 