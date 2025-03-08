// Send extension detection message
window.postMessage({
  type: 'EXTENSION_READY',
  detected: true
}, '*');

// Listen for messages from the webpage
window.addEventListener('message', async (event) => {
  // Ensure message is from our web app
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

  if (event.data.type === 'LINKEDIN_AUTOMATION_REQUEST') {
    try {
      // Validate and sanitize data before sending to extension
      const data = event.data.message.data;
      const validatedData = {
        platform: 'linkedin',
        profile_id: data.profile_id,
        keywords: String(data.keywords || '').trim(),
        location: String(data.location || '').trim(),
        datePosted: String(data.datePosted || '').trim(),
        workplaceType: String(data.workplaceType || '').trim(),
        experience: parseInt(data.experience) || 0,
        currentSalary: parseInt(data.currentSalary) || 0,
        expectedSalary: parseInt(data.expectedSalary) || 0,
        totalJobsToApply: Math.min(Math.max(parseInt(data.totalJobsToApply) || 5, 1), 50)
      };

      console.log('Sending data to extension:', validatedData);

      const response = await chrome.runtime.sendMessage({
        action: 'startAutomation',
        data: validatedData
      });

      window.postMessage({
        type: 'LINKEDIN_AUTOMATION_RESPONSE',
        response: response
      }, '*');
    } catch (error) {
      console.error('Bridge error:', error);
      window.postMessage({
        type: 'LINKEDIN_AUTOMATION_RESPONSE',
        error: error.message
      }, '*');
    }
  }
});

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message) => {
  console.log('Bridge received message from extension:', message);
  
  // Forward progress updates to the webpage
  if (message.action === 'updateProgress') {
    window.postMessage({
      type: 'LINKEDIN_AUTOMATION_PROGRESS',
      data: {
        total: message.total,
        totalJobsToApply: message.totalJobsToApply
      }
    }, '*');
    return true;
  }
  
  // Forward completion messages to the webpage
  if (message.action === 'automationComplete') {
    window.postMessage({
      type: 'LINKEDIN_AUTOMATION_COMPLETE',
      data: {
        totalApplied: message.total
      }
    }, '*');
    return true;
  }
  
  return false;
});
