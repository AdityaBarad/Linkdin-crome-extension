// Send extension detection message
window.postMessage({
  type: 'EXTENSION_READY',
  detected: true
}, '*');

window.addEventListener('message', async (event) => {
  // Ensure message is from our web app
  if (event.source !== window) return;
  if (event.origin !== window.location.origin) return;

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
