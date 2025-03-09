// Bridge script that allows communication between the extension and web page

console.log('Webpage bridge loaded');

// Send extension detection message
window.postMessage({
  type: 'EXTENSION_READY',
  detected: true
}, '*');

// Listen for messages from the web page
window.addEventListener('message', function(event) {
  // Only accept messages from the same frame
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  // Handle all automation requests by looking for *_AUTOMATION_REQUEST pattern
  if (message.type && message.type.endsWith('_AUTOMATION_REQUEST')) {
    console.log('Bridge received automation request:', message.message);
    
    const platform = message.type.split('_')[0].toLowerCase();
    
    // Ensure platform is specified in the data
    if (message.message && message.message.data) {
      message.message.data.platform = platform;
    }
    
    // Forward to background script
    chrome.runtime.sendMessage(message.message, function(response) {
      console.log('Received response from extension:', response);
      
      // Forward response back to web page using the same platform prefix
      window.postMessage({
        type: `${platform.toUpperCase()}_AUTOMATION_RESPONSE`, 
        response: response
      }, '*');
    });
  }
});

// Listen for messages from the extension background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Bridge received message from background:', request);
  
  // Determine which platform the message is for
  const platform = request.platform || 'linkedin'; // Default to LinkedIn if not specified
  const platformUpper = platform.toUpperCase();
  
  // Forward progress updates to web page
  if (request.action === 'updateProgress') {
    window.postMessage({
      type: `${platformUpper}_AUTOMATION_PROGRESS`,
      data: {
        total: request.total,
        totalJobsToApply: request.totalJobsToApply,
        platform: platform
      }
    }, '*');
  }
  
  // Forward completion notifications to web page
  else if (request.action === 'automationComplete') {
    window.postMessage({
      type: `${platformUpper}_AUTOMATION_COMPLETE`,
      data: {
        totalApplied: request.total || 0,
        platform: platform,
        success: true,
        message: `Successfully applied to ${request.total || 0} jobs!`
      }
    }, '*');
  }

  // Always send a response to keep the message channel alive if needed
  sendResponse({ received: true });
});

// Let the background script know the bridge is active
chrome.runtime.sendMessage({ action: 'bridgeReady' });

// Send periodic keepalive messages to prevent the service worker from going inactive
setInterval(() => {
  chrome.runtime.sendMessage({ action: 'keepAlive' })
    .catch(err => console.log('Keepalive error (expected if background disconnected):', err));
}, 15000);
