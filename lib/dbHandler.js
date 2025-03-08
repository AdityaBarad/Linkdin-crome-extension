const dbHandler = {
  async saveJob(jobDetails) {
    try {
      // First save to local storage
      await this.saveToLocal(jobDetails);
      
      // Then save to Supabase
      await this.saveToSupabase(jobDetails);
      
      return { data: jobDetails, error: null };
    } catch (error) {
      console.error('Error saving job:', error);
      return { data: null, error };
    }
  },

  async saveToLocal(jobDetails) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(['appliedJobs'], function(result) {
          const appliedJobs = result.appliedJobs || [];
          appliedJobs.push({
            ...jobDetails,
            timestamp: new Date().toISOString()
          });
          
          chrome.storage.local.set({ appliedJobs }, function() {
            resolve({ data: jobDetails, error: null });
          });
        });
      } catch (error) {
        reject({ data: null, error });
      }
    });
  },

  async saveToSupabase(jobDetails) {
    try {
      // Make API call to Supabase
      const response = await fetch('https://oxidjnzvndeynvwgobzg.supabase.co/rest/v1/applied_jobs', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aWRqbnp2bmRleW52d2dvYnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwODIzMjcsImV4cCI6MjA1NjY1ODMyN30.g5Y1HdZMrsECbKfVr-2JkBWRQEgfIFW4TlCuzu9OFvc',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aWRqbnp2bmRleW52d2dvYnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwODIzMjcsImV4cCI6MjA1NjY1ODMyN30.g5Y1HdZMrsECbKfVr-2JkBWRQEgfIFW4TlCuzu9OFvc',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(jobDetails)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { data: jobDetails, error: null };
    } catch (error) {
      console.error('Supabase save error:', error);
      throw error;
    }
  },

  async getJobs() {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(['appliedJobs'], function(result) {
          resolve({ data: result.appliedJobs || [], error: null });
        });
      } catch (error) {
        reject({ data: null, error });
      }
    });
  }
};

self.dbHandler = dbHandler;
