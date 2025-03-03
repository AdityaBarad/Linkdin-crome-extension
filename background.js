let automationTab = null;
let windowId = null;

function log(...messages) {
  console.log('Background:', ...messages);
}

// Update message listener to handle responses properly
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received', request.action, 'request');

  if (request.action === 'startAutomation') {
    handleStartAutomation(request.data, sendResponse);
    return true; // Keep message channel open
  }

  if (request.action === 'log') {
    console.log(request.data);
    return false;
  }

  if (request.action === 'keepAlive') {
    sendResponse({ success: true });
    return false;
  }
});

async function handleStartAutomation(data, sendResponse) {
  try {
    // Get or create tab
    automationTab = await getCurrentOrCreateTab();
    log('Using tab:', automationTab.id);

    // Navigate to LinkedIn Jobs if needed
    await navigateToLinkedInJobs(automationTab.id);

    // Wait for navigation to complete
    await new Promise(r => setTimeout(r, 3000));

    // Inject the automation script
    await injectAutomationScript(automationTab.id);

    // Send the automation data to the content script
    const response = await chrome.tabs.sendMessage(automationTab.id, {
      action: 'startAutomation',
      data: data
    });

    log('Received response from content script:', response);
    sendResponse(response);  // Make sure to call sendResponse
  } catch (error) {
    log('Error in handleStartAutomation:', error);
    sendResponse({ success: false, message: error.message });
  }
}

async function getCurrentOrCreateTab() {
  try {
    // First try to find an existing LinkedIn tab
    const linkedInTabs = await chrome.tabs.query({
      url: ["*://*.linkedin.com/*"]
    });

    if (linkedInTabs.length > 0) {
      // Use the first LinkedIn tab found
      const tab = linkedInTabs[0];
      await chrome.tabs.update(tab.id, { active: true });
      return tab;
    }

    // If no LinkedIn tab exists, check for active tab
    const [activeTab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    });

    if (activeTab) {
      return activeTab;
    }

    // If no suitable tab found, create a new one
    log('Creating new tab');
    return await chrome.tabs.create({
      url: 'https://www.linkedin.com/jobs',
      active: true
    });
  } catch (error) {
    log('Error getting/creating tab:', error);
    throw error;
  }
}

async function navigateToLinkedInJobs(tabId) {
  try {
    log('Navigating tab:', tabId, 'to LinkedIn Jobs');
    
    // First check if we're already on LinkedIn Jobs
    const tab = await chrome.tabs.get(tabId);
    if (tab.url.includes('linkedin.com/jobs')) {
      log('Already on LinkedIn Jobs');
      return;
    }

    // Navigate only if needed
    await chrome.tabs.update(tabId, {
      url: 'https://www.linkedin.com/jobs'
    });

    // Wait for the navigation to complete
    return new Promise((resolve) => {
      function listener(updatedTabId, info, updatedTab) {
        if (updatedTabId === tabId && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  } catch (error) {
    log('Navigation error:', error);
    throw error;
  }
}

async function injectAutomationScript(tabId) {
  try {
    log('Injecting automation script');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['automation.js']
    });
  } catch (error) {
    log('Injection error:', error);
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