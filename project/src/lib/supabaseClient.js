import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true
  }
});

// Subscription related functions
export const subscriptionService = {
  // Get all available subscription plans
  async getSubscriptionPlans() {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Get user's current subscription
  async getUserSubscription(userId) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('profile_id', userId)  // Changed from user_id to profile_id
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // No rows returned is not an error for us
      throw error;
    }
    
    return data;
  },

  // Add a new subscription for user
  async subscribeUser(userId, planId) {
    // First deactivate any existing subscription
    await this.deactivateCurrentSubscription(userId);
    
    // Create end date (1 month from now)
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    // Create new subscription
    const { data, error } = await supabase
      .from('user_subscriptions')
      .insert({
        profile_id: userId,  // Changed from user_id to profile_id
        plan_id: planId,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        is_active: true
      })
      .select();
    
    if (error) throw error;
    return data;
  },

  // Deactivate current subscription
  async deactivateCurrentSubscription(userId) {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ is_active: false })
      .eq('profile_id', userId)  // Changed from user_id to profile_id
      .eq('is_active', true);
    
    if (error) throw error;
    return true;
  },

  // Create a new automation session
  async createAutomationSession(userId, data) {
    const { 
      platform, 
      totalJobsToApply,
      keywords,
      location,
      datePosted,
      workplaceType,
      experience,
      currentSalary,
      expectedSalary,
      filters
    } = data;
    
    // Store search parameters in a structured way
    const searchQuery = {
      keywords,
      location,
      datePosted,
      workplaceType,
      experience,
      currentSalary,
      expectedSalary,
      filters
    };
    
    const { data: session, error } = await supabase
      .from('automation_sessions')
      .insert({
        profile_id: userId,  // Changed from user_id to profile_id
        platform,
        jobs_requested: totalJobsToApply,
        search_query: searchQuery,
        session_start: new Date().toISOString(),
        status: 'started'
      })
      .select();
    
    if (error) throw error;
    return session?.[0] || null;
  },

  // Update an automation session with completed data
  async updateAutomationSession(sessionId, jobsApplied) {
    const { data, error } = await supabase
      .from('automation_sessions')
      .update({
        jobs_applied: jobsApplied,
        session_end: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select();
    
    if (error) throw error;
    return data?.[0] || null;
  },

  // Get current month's application count
  async getCurrentMonthApplicationCount(userId) {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const { data, error } = await supabase
      .from('automation_sessions')
      .select('jobs_applied')
      .eq('profile_id', userId)  // Changed from user_id to profile_id
      .gte('session_start', firstDayOfMonth.toISOString())
      .lte('session_start', lastDayOfMonth.toISOString());
    
    if (error) throw error;
    
    // Sum up all jobs applied from all sessions this month
    const totalApplied = data?.reduce((sum, session) => sum + (session.jobs_applied || 0), 0) || 0;
    return totalApplied;
  },

  // Get application statistics for analytics
  async getApplicationStats(userId, period = 'month') {
    const today = new Date();
    let startDate;
    
    // Calculate the start date based on the requested period
    switch(period) {
      case 'day':
        startDate = new Date(today.setHours(0, 0, 0, 0));
        break;
      case 'week':
        const dayOfWeek = today.getDay();
        startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    // Get all sessions in the date range
    const { data, error } = await supabase
      .from('automation_sessions')
      .select('*')
      .eq('profile_id', userId)  // Changed from user_id to profile_id
      .gte('session_start', startDate.toISOString())
      .lte('session_start', today.toISOString())
      .order('session_start', { ascending: false });
    
    if (error) throw error;
    
    // Calculate statistics
    const totalSessions = data?.length || 0;
    const totalJobsApplied = data?.reduce((sum, session) => sum + (session.jobs_applied || 0), 0) || 0;
    const sessionsByPlatform = data?.reduce((acc, session) => {
      const platform = session.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + 1;
      return acc;
    }, {});
    
    const applicationsByPlatform = data?.reduce((acc, session) => {
      const platform = session.platform || 'unknown';
      acc[platform] = (acc[platform] || 0) + (session.jobs_applied || 0);
      return acc;
    }, {});
    
    return {
      totalSessions,
      totalJobsApplied,
      sessionsByPlatform,
      applicationsByPlatform,
      recentSessions: data || []
    };
  },

  // Check if user has reached their subscription limit
  async hasReachedLimit(userId) {
    // Get current subscription
    const subscription = await this.getUserSubscription(userId);
    
    // Get current month's total applications
    const totalApplied = await this.getCurrentMonthApplicationCount(userId);
    
    if (!subscription) {
      // No subscription, assign default Basic plan limit of 30
      return { hasReached: totalApplied >= 30, limit: 30, used: totalApplied };
    }
    
    // Use subscription plan limit
    const limit = subscription.subscription_plans.monthly_limit;
    
    return { 
      hasReached: totalApplied >= limit, 
      limit, 
      used: totalApplied,
      subscription
    };
  },
  
  // Mock function for payment processing (to be implemented later)
  async processPayment(userId, planId, paymentDetails) {
    // This would connect to a payment gateway in the future
    // For now, we'll just create a mock transaction record
    
    // Get the plan price
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('price')
      .eq('id', planId)
      .single();
    
    if (!plan) throw new Error('Plan not found');
    
    // Get the subscription
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('profile_id', userId)  // Changed from user_id to profile_id
      .eq('plan_id', planId)
      .eq('is_active', true)
      .limit(1);
    
    const subscriptionId = subscriptions?.[0]?.id;
    
    // Create a mock transaction
    const { data: transaction, error } = await supabase
      .from('payment_transactions')
      .insert({
        profile_id: userId,  // Changed from user_id to profile_id
        subscription_id: subscriptionId,
        amount: plan.price,
        currency: 'INR',
        payment_method: paymentDetails.paymentMethod || 'card',
        payment_gateway: 'mock_gateway',
        transaction_id: `mock_${Date.now()}`,
        transaction_status: 'completed',
        payment_date: new Date().toISOString(),
        metadata: { 
          gateway_response: 'Successful mock payment', 
          card_last4: '4242'
        },
        receipt_url: 'https://example.com/receipt',
        invoice_id: `INV-${Date.now()}`,
        billing_address: paymentDetails.billingAddress || {}
      })
      .select();
    
    if (error) throw error;
    return transaction?.[0];
  },

  // Get automation sessions for a user
  async getAutomationSessions(userId, limit = 50) {
    const { data, error } = await supabase
      .from('automation_sessions')
      .select('*')
      .eq('profile_id', userId)  // Changed from user_id to profile_id
      .order('session_start', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return { data, error: null };
  },

  // Get applied jobs for a user
  async getAppliedJobs(userId, limit = 100) {
    const { data, error } = await supabase
      .from('applied_jobs')
      .select('*')
      .eq('profile_id', userId)
      .order('date_applied', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return { data, error: null };
  },
};
