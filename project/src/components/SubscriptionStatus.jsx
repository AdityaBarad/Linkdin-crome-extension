import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiCalendar, FiClock, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionService } from '../lib/supabaseClient';

function SubscriptionStatus() {
  const { user, subscription, subscriptionLoading } = useAuth();
  const [usageData, setUsageData] = useState({ used: 0, limit: 30 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUsageData = async () => {
      try {
        const data = await subscriptionService.hasReachedLimit(user.id);
        setUsageData({
          used: data.used,
          limit: data.limit
        });
      } catch (error) {
        console.error('Error fetching usage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, [user, subscription]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate usage percentage
  const usagePercentage = Math.min(100, (usageData.used / usageData.limit) * 100);
  
  // Determine if user is close to or at limit
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  if (subscriptionLoading || loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-32">
        <FiLoader className="animate-spin text-blue-600 mr-2" />
        <span>Loading subscription data...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <FiPackage className="mr-2" />
          Subscription Status
        </h3>
      </div>
      
      <div className="px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-800">
              {subscription ? subscription.subscription_plans.name : 'Basic'} Plan
            </h4>
            <p className="text-sm text-gray-600">
              {subscription ? subscription.subscription_plans.description : 'Apply to up to 30 jobs per month'}
            </p>
          </div>
          
          {subscription && subscription.end_date && (
            <div className="mt-2 sm:mt-0 flex items-center text-sm text-gray-600">
              <FiCalendar className="mr-1" />
              Expires: {formatDate(subscription.end_date)}
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-medium text-gray-700">
              Monthly Usage: {usageData.used} / {usageData.limit} applications
            </div>
            <div className="text-sm font-medium text-gray-700">
              {Math.round(usagePercentage)}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                isAtLimit ? 'bg-red-600' : isNearLimit ? 'bg-yellow-500' : 'bg-green-600'
              }`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Warning message if near/at limit */}
        {isNearLimit && (
          <div className={`mt-4 p-3 rounded-md ${isAtLimit ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'} flex items-start`}>
            <FiAlertCircle className="mt-0.5 mr-2" />
            <div>
              {isAtLimit ? (
                <p>You've reached your monthly application limit. Upgrade your plan to apply to more jobs.</p>
              ) : (
                <p>You're approaching your monthly application limit. Consider upgrading your plan soon.</p>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-6">
          <Link 
            to="/pricing" 
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition duration-150"
          >
            {subscription ? 'Manage Subscription' : 'Upgrade Plan'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionStatus;
