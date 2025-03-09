import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, subscriptionService } from '../lib/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch subscription data if user is logged in
      if (session?.user) {
        fetchUserSubscription(session.user.id);
      } else {
        setSubscriptionLoading(false);
      }
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // Fetch subscription data if user is logged in
      if (session?.user) {
        fetchUserSubscription(session.user.id);
      } else {
        setSubscription(null);
        setSubscriptionLoading(false);
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const fetchUserSubscription = async (userId) => {
    try {
      setSubscriptionLoading(true);
      const userSubscription = await subscriptionService.getUserSubscription(userId);
      setSubscription(userSubscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const register = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          email_confirmed: true
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Add subscription to user
  const subscribeToPlan = async (planId) => {
    if (!user) throw new Error('User must be logged in');
    
    try {
      await subscriptionService.subscribeUser(user.id, planId);
      await fetchUserSubscription(user.id);
      return true;
    } catch (error) {
      console.error('Error subscribing to plan:', error);
      throw error;
    }
  };

  // Start an automation session
  const startAutomationSession = async (automationData) => {
    if (!user) throw new Error('User must be logged in');
    
    try {
      const session = await subscriptionService.createAutomationSession(user.id, automationData);
      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error('Error starting automation session:', error);
      throw error;
    }
  };

  // Update an automation session when it completes
  const completeAutomationSession = async (jobsApplied) => {
    if (!currentSession?.id) {
      console.error("No active session found to complete");
      return null;
    }
    
    try {
      console.log(`Completing session ${currentSession.id} with ${jobsApplied} jobs applied`);
      const updatedSession = await subscriptionService.updateAutomationSession(
        currentSession.id, 
        jobsApplied
      );
      
      // Clear the current session reference
      setCurrentSession(null);
      
      // Update UI by refreshing the subscription data
      if (user) {
        await fetchUserSubscription(user.id);
      }
      
      return updatedSession;
    } catch (error) {
      console.error('Error completing automation session:', error);
      throw error;
    }
  };

  // Check if user can apply to more jobs
  const checkJobApplicationLimit = async () => {
    if (!user) {
      return { canApply: false, message: 'You must be logged in' };
    }
    
    try {
      const { hasReached, limit, used } = await subscriptionService.hasReachedLimit(user.id);
      
      if (hasReached) {
        return {
          canApply: false,
          message: `You've reached your monthly limit of ${limit} job applications`,
          limit,
          used
        };
      }
      
      return {
        canApply: true, 
        message: `You've used ${used} of ${limit} job applications this month`,
        limit,
        used
      };
    } catch (error) {
      console.error('Error checking job application limit:', error);
      return { canApply: false, message: 'Error checking your subscription' };
    }
  };

  // Get application statistics for different time periods
  const getApplicationStats = async (period = 'month') => {
    if (!user) return null;
    
    try {
      return await subscriptionService.getApplicationStats(user.id, period);
    } catch (error) {
      console.error('Error getting application statistics:', error);
      return null;
    }
  };

  // Increment job application count
  const incrementJobApplicationCount = async (count = 1) => {
    if (!user) return;
    
    try {
      await subscriptionService.incrementApplicationCount(user.id, count);
      // Refresh subscription data
      await fetchUserSubscription(user.id);
    } catch (error) {
      console.error('Error incrementing job application count:', error);
    }
  };

  // Process a subscription payment (mock for now)
  const processSubscriptionPayment = async (planId, paymentDetails) => {
    if (!user) throw new Error('User must be logged in');
    
    try {
      // Process the payment first (mock for now)
      const transaction = await subscriptionService.processPayment(user.id, planId, paymentDetails);
      
      // Then subscribe the user to the plan
      await subscribeToPlan(planId);
      
      return transaction;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      register, 
      loading, 
      subscription,
      subscriptionLoading,
      subscribeToPlan,
      checkJobApplicationLimit,
      startAutomationSession,
      completeAutomationSession,
      currentSession,
      getApplicationStats,
      processSubscriptionPayment,
      incrementJobApplicationCount
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
