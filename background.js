importScripts(chrome.runtime.getURL('lib/dbHandler.js'));

let automationTab = null;
let windowId = null;
let lastLogTimestamp = 0;
const LOG_THROTTLE_MS = 500; // Throttle logs to once per 500ms

function log(...messages) {
  const now = Date.now();
  // Throttle frequent logs
  if (now - lastLogTimestamp < LOG_THROTTLE_MS) {
    return;
  }
  lastLogTimestamp = now;

  // Simple log format
  console.log('Background:', ...messages);
  
  // Only forward important logs to content script
  if (automationTab && !messages[0].includes('Received log request')) {
    try {
      chrome.tabs.sendMessage(automationTab.id, {
        action: 'log',
        message: messages.join(' ')
      });
    } catch (error) {
      console.error('Error sending log to content script:', error);
    }
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Only log non-routine messages
  if (request.action !== 'log' && request.action !== 'keepAlive') {
    log('Received', request.action, 'request');
  }

  if (request.action === 'log') {
    // Forward important content script logs
    if (!request.data.includes('Processing field')) {
      console.log('Content:', request.data);
    }
    sendResponse({ received: true });
    return false;
  }

  if (request.action === 'startAutomation') {
    log('Starting automation with data:', request.data);
    handleStartAutomation(request.data, sendResponse);
    return true; // Keep message channel open
  }

  if (request.action === 'saveJobDetails') {
    log('Received saveJobDetails request:', request.data);
    saveJobDetailsToSupabase(request.data)
      .then(() => {
        log('Job details saved successfully');
        sendResponse({ success: true });
      })
      .catch((error) => {
        log('Error saving job details:', error);
        sendResponse({ success: false, message: error.message });
      });
    return true; // Keep message channel open
  }

  if (request.action === 'resizePopup') {
    if (windowId) {
      chrome.windows.update(windowId, {
        width: request.width,
        height: request.height
      });
    }
    sendResponse({ success: true });
    return false;
  }

  if (request.action === 'navigateToUrl') {
    log('Handling navigation request to:', request.url);
    handleNavigation(sender.tab.id, request.url, request.data);
    sendResponse({ success: true });
    return false;
  }
});

// Update the progress tracking and completion notification
function broadcastProgressUpdate(data) {
  log('Broadcasting progress update:', data.total, '/', data.totalJobsToApply);
  
  // Update extension storage
  chrome.storage.local.set({
    jobsApplied: data.total
  });
  
  // Check if automation is complete
  const isComplete = data.total >= data.totalJobsToApply;
  
  // Send to popup if open
  chrome.runtime.sendMessage(data).catch(err => {
    // Ignore errors when popup is not open
  });
  
  // Send to content script
  if (automationTab) {
    // Find and notify the web page bridge
    chrome.tabs.query({url: "http://localhost:*/*"}, function(tabs) {
      if (tabs.length > 0) {
        tabs.forEach(tab => {
          try {
            // Include platform in the message
            chrome.tabs.sendMessage(tab.id, {
              ...data,
              platform: data.platform || chrome.storage.local.get(['platform'], (result) => result.platform)
            });
            
            // If this is a completion update, also send the completion message
            if (isComplete) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'automationComplete',
                total: data.total,
                platform: data.platform || chrome.storage.local.get(['platform'], (result) => result.platform)
              });
            }
          } catch (error) {
            log('Error sending to tab:', tab.id, error);
          }
        });
      }
    });
  }
  
  // If automation is complete, create a notification
  if (isComplete) {
    log('Automation complete! Applied to', data.total, 'jobs');
    
    // Show a system notification if possible
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Automation Complete',
        message: `Successfully applied to ${data.total} jobs!`,
        priority: 2
      });
    } catch (error) {
      log('Failed to create notification:', error);
    }
  }
}

// Add a dedicated listener for progress updates
chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'updateProgress') {
    // Add totalJobsToApply if it's missing
    if (!request.totalJobsToApply) {
      chrome.storage.local.get(['totalJobsToApply', 'platform'], (result) => {
        if (result.totalJobsToApply) {
          request.totalJobsToApply = result.totalJobsToApply;
          request.platform = result.platform;
        }
        broadcastProgressUpdate(request);
      });
    } else {
      broadcastProgressUpdate(request);
    }
  }
});

async function handleStartAutomation(data, sendResponse) {
  try {
    // Save automation state
    await chrome.storage.local.set({
      isAutomationRunning: true,
      totalJobsToApply: data.totalJobsToApply,
      jobsApplied: 0,
      platform: data.platform
    });

    // Create automation tab first
    const urls = {
      linkedin: 'https://www.linkedin.com/jobs',
      indeed: 'https://www.indeed.com',
      unstop: 'https://unstop.com',
      internshala: 'https://internshala.com'
    };

    automationTab = await chrome.tabs.create({
      url: urls[data.platform],
      active: true
    });

    // Wait for tab to load
    await new Promise(r => setTimeout(r, 3000));

    // Create popup window after tab with compact size for progress view
    const popup = await chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 320,
      height: 300,
      focused: true
    });
    
    windowId = popup.id;

    // Set up listener for progress updates
    const progressListener = (request, sender) => {
      if (request.action === 'updateProgress' && sender.tab?.id === automationTab.id) {
        // Forward to popup
        try {
          chrome.runtime.sendMessage(request);
        } catch (error) {
          log('Error forwarding progress:', error);
        }

        // Update storage
        chrome.storage.local.set({
          jobsApplied: request.total
        });
      }
    };

    chrome.runtime.onMessage.addListener(progressListener);

    // Inject scripts
    await injectAutomationScript(automationTab.id, data.platform);

    // Start automation
    const response = await chrome.tabs.sendMessage(automationTab.id, {
      action: 'startAutomation',
      data: data
    });

    log('Received response from content script:', response);
    sendResponse(response);

    // At the end, add this log
    log('Automation started and settings saved to storage');
  } catch (error) {
    log('Error in handleStartAutomation:', error);
    sendResponse({ success: false, message: error.message });
  }
}

async function injectAutomationScript(tabId, platform) {
  try {
    log('Injecting automation scripts into tab:', tabId);
    
    // First inject common utilities
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['automation/common.js']
    });

    // Then inject platform-specific script
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: [`automation/${platform}.js`]
    });
    
    log('Scripts injected successfully into tab:', tabId);
  } catch (error) {
    log('Injection error:', error);
    throw error;
  }
}

async function saveJobDetailsToSupabase(jobDetails) {
  log('Saving job details:', jobDetails);
  try {
    const { data, error } = await dbHandler.saveJob(jobDetails);

    if (error) {
      log('Error saving job details:', error);
      throw error;
    }

    log('Job details saved:', data);
  } catch (error) {
    log('Error in saveJobDetails:', error);
    throw error;
  }
}

// Handle tab closure
chrome.tabs.onRemoved.addListener((tabId) => {
  if (automationTab && automationTab.id === tabId) {
    automationTab = null;
  }
});

chrome.action.onClicked.addListener(() => {
  if (windowId === null) {
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 600,
      focused: true
    }, (window) => {
      windowId = window.id;
    });
  } else {
    chrome.windows.update(windowId, { focused: true });
  }
});

chrome.windows.onRemoved.addListener((removedWindowId) => {
  if (removedWindowId === windowId) {
    windowId = null;
  }
});

async function handleNavigation(tabId, url, data) {
  try {
    log('Updating tab to navigate to:', url);
    
    // First update the tab URL
    await chrome.tabs.update(tabId, { url: url });
    
    // Set up an event listener for when navigation completes
    chrome.tabs.onUpdated.addListener(function navigationListener(updatedTabId, changeInfo, tab) {
      if (updatedTabId === tabId && changeInfo.status === 'complete' && tab.url.includes('internshala.com')) {
        log('Navigation completed, re-injecting scripts');
        
        // Remove this listener once we've handled the navigation
        chrome.tabs.onUpdated.removeListener(navigationListener);
        
        // Wait a bit for page to fully initialize - reduced time for faster response
        setTimeout(async () => {
          try {
            // Re-inject scripts
            await injectAutomationScript(tabId, 'internshala');
            
            // Send a message to continue automation
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, {
                action: 'navigationComplete',
                data: data
              }).catch(err => {
                log('Error sending navigationComplete message:', err);
                
                // If message send fails, try again after a short delay
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabId, {
                    action: 'navigationComplete',
                    data: data
                  }).catch(err => {
                    log('Error sending navigationComplete message (retry):', err);
                  });
                }, 2000);
              });
            }, 2000); // Reduced delay for faster response
          } catch (error) {
            log('Error re-injecting scripts after navigation:', error);
            
            // Try to recover with a second attempt
            setTimeout(async () => {
              try {
                await injectAutomationScript(tabId, 'internshala');
                chrome.tabs.sendMessage(tabId, {
                  action: 'navigationComplete',
                  data: data
                }).catch(err => {
                  log('Recovery attempt failed:', err);
                });
              } catch (retryError) {
                log('Recovery attempt failed:', retryError);
              }
            }, 5000);
          }
        }, 1500); // Reduced time to be more responsive
      }
    });
  } catch (error) {
    log('Error in handleNavigation:', error);
  }
}