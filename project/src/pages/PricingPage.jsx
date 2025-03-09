import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiLoader, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { subscriptionService } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const { user, subscription, subscribeToPlan } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await subscriptionService.getSubscriptionPlans();
        setPlans(data);
      } catch (error) {
        console.error('Error fetching plans:', error);
        toast.error('Failed to load subscription plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSubscribe = async (planId) => {
    if (!user) {
      toast.error('Please login to subscribe');
      navigate('/login', { state: { returnTo: '/pricing' } });
      return;
    }

    setSelectedPlanId(planId);
    setSubscribing(true);

    try {
      await subscribeToPlan(planId);
      toast.success('Successfully subscribed to plan!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setSubscribing(false);
      setSelectedPlanId(null);
    }
  };

  // Check if user has active subscription for this plan
  const isCurrentPlan = (planId) => {
    return subscription && subscription.plan_id === planId;
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isPopular = (plan) => {
    return plan.name === 'Standard';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <FiLoader className="animate-spin text-blue-600 text-2xl" />
          <span className="text-gray-700">Loading plans...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Select the perfect plan for your job application needs
          </p>
          
          {/* Show current subscription info if user has one */}
          {subscription && (
            <div className="mt-6 inline-block bg-blue-100 border border-blue-200 rounded-lg px-6 py-3">
              <p className="text-blue-800">
                You're currently on the <span className="font-bold">{subscription.subscription_plans.name}</span> plan
                {subscription.end_date && (
                  <span> (expires {formatDate(subscription.end_date)})</span>
                )}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                You can upgrade or change your plan at any time
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all ${
                isPopular(plan) ? 'md:-translate-y-4 ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Popular badge */}
              {isPopular(plan) && (
                <div className="bg-blue-500 text-white text-center py-2 font-medium text-sm">
                  MOST POPULAR
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <p className="mt-6">
                  <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
                  <span className="text-base font-medium text-gray-500">/month</span>
                </p>

                <ul className="mt-8 space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700">
                      Apply to up to <span className="font-bold">{plan.monthly_limit}</span> jobs per month
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700">
                      Access to all job platforms
                    </p>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0">
                      <FiCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="ml-3 text-sm text-gray-700">
                      Email notifications
                    </p>
                  </li>
                  {(plan.name === 'Standard' || plan.name === 'Premium') && (
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <FiCheck className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="ml-3 text-sm text-gray-700">
                        Priority support
                      </p>
                    </li>
                  )}
                  {plan.name === 'Premium' && (
                    <li className="flex items-start">
                      <div className="flex-shrink-0">
                        <FiCheck className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="ml-3 text-sm text-gray-700">
                        Advanced filtering options
                      </p>
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing && selectedPlanId === plan.id || isCurrentPlan(plan.id)}
                  className={`w-full mt-8 ${
                    isCurrentPlan(plan.id)
                      ? 'bg-gray-300 cursor-not-allowed'
                      : isPopular(plan)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-800 hover:bg-gray-900'
                  } text-white py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
                >
                  {subscribing && selectedPlanId === plan.id ? (
                    <div className="flex items-center justify-center">
                      <FiLoader className="animate-spin mr-2" />
                      Processing...
                    </div>
                  ) : isCurrentPlan(plan.id) ? (
                    'Current Plan'
                  ) : (
                    `Subscribe to ${plan.name}`
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Have questions about our pricing? <button className="text-blue-600 hover:text-blue-500 font-medium">Contact us</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
