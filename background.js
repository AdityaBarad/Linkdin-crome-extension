chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.action === 'startAutomation') {
      handleStartAutomation(request.data, sendResponse);
      return true; // Keep the message channel open
    }
    return false;
  }
);

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
    // Always create a new tab for automation
    automationTab = await chrome.tabs.create({
      url: 'https://www.linkedin.com/jobs',
      active: true
    });

    log('Created new tab:', automationTab.id);

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