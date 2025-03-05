// Common utilities for all automation platforms
function logToBackground(...messages) {
  chrome.runtime.sendMessage({ action: 'log', data: messages.join(' ') });
}

// Common helper functions
async function waitForElement(selector, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) {
      return element;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Element "${selector}" not found within ${timeout}ms`);
}

// Export common utilities
window.automationUtils = {
  logToBackground,
  waitForElement,
};
