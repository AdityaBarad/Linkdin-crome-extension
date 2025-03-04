// This script will be injected into the webpage to facilitate communication
window.addEventListener('message', async (event) => {
  // Ensure message is from our web app
  if (event.data.type === 'LINKEDIN_AUTOMATION_REQUEST') {
    try {
      const response = await chrome.runtime.sendMessage(event.data.message);
      window.postMessage({
        type: 'LINKEDIN_AUTOMATION_RESPONSE',
        response: response
      }, '*');
    } catch (error) {
      window.postMessage({
        type: 'LINKEDIN_AUTOMATION_RESPONSE',
        error: error.message
      }, '*');
    }
  }
});

// Notify webpage that extension is present
window.postMessage({
  type: 'LINKEDIN_AUTOMATION_EXTENSION_DETECTED',
  detected: true
}, '*');
