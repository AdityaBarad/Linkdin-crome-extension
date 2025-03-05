let automationTab = null;
let windowId = null;

function log(...messages) {
  console.log('Background:', ...messages);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('Received', request.action, 'request');

  if (request.action === 'startAutomation') {
    handleStartAutomation(request.data, sendResponse);
    return true; // Keep message channel open
  }
});

async function handleStartAutomation(data, sendResponse) {
  try {
    const urls = {
      linkedin: 'https://www.linkedin.com/jobs',
      indeed: 'https://www.indeed.com',
      unstop: 'https://unstop.com'
    };

    automationTab = await chrome.tabs.create({
      url: urls[data.platform],
      active: true
    });

    log('Created new tab for', data.platform, ':', automationTab.id);

    await new Promise(r => setTimeout(r, 3000));
    await injectAutomationScript(automationTab.id, data.platform);

    const response = await chrome.tabs.sendMessage(automationTab.id, {
      action: 'startAutomation',
      data: data
    });

    log('Received response from content script:', response);
    sendResponse(response);
  } catch (error) {
    log('Error in handleStartAutomation:', error);
    sendResponse({ success: false, message: error.message });
  }
}

async function injectAutomationScript(tabId, platform) {
  try {
    log('Injecting automation scripts');
    
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
    
    log('Scripts injected successfully');
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