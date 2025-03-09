const CONFIG = {
  DEFAULT_VALUES: {
    phone: '1234567890',
    zipCode: '10001'
  }
};

let totalApplied = 0;
let isRunning = false;

function logToBackground(...messages) {
  chrome.runtime.sendMessage({ action: 'log', data: messages.join(' ') });
}

logToBackground('Unstop content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logToBackground('Content: Received message:', request.action);
  
  if (request.action === 'startAutomation') {
    if (isRunning) {
      logToBackground('Content: Automation already running');
      sendResponse({ success: false, message: 'Automation already running' });
      return false;
    }

    logToBackground('Content: Starting automation');
    isRunning = true;

    // Start the automation process
    (async () => {
      try {
        sendResponse({ success: true, message: 'Automation started' });
        
        logToBackground('Content: Running main automation');
        await main(request.data);
        
        logToBackground('Content: Automation completed successfully');
      } catch (error) {
        logToBackground('Content: Automation error:', error);
        chrome.runtime.sendMessage({
          action: 'automationError',
          error: error.message
        });
      } finally {
        isRunning = false;
      }
    })();
    return true; // Keep the message channel open
  }

  return false;
});

async function main(data) {
  logToBackground('Content: Starting main function for Unstop');
  try {
    // Navigate to Unstop jobs
    await navigateToUnstopJobs();
    
    // Search for jobs with filters
    await searchJobs(data);
    
    // Send initial progress update
    chrome.runtime.sendMessage({
      action: 'updateProgress',
      total: 0,
      totalJobsToApply: data.totalJobsToApply,
      platform: 'unstop'
    });

    // Show the user a message that this is just a navigation demo
    showCompletionMessage('Unstop automation demonstration - navigation only');
    
    // Send completion message
    chrome.runtime.sendMessage({
      action: 'automationComplete',
      total: 0,
      platform: 'unstop'
    });

  } catch (error) {
    logToBackground('Content: Error in main function:', error);
    throw error;
  }
}

async function navigateToUnstopJobs() {
  logToBackground('Content: Navigating to Unstop jobs');
  
  // Check if we're already on Unstop
  if (window.location.hostname.includes('unstop.com')) {
    logToBackground('Content: Already on Unstop');
    return;
  }
  
  // Navigate to Unstop jobs page
  logToBackground('Content: Redirecting to Unstop');
  window.location.href = 'https://unstop.com/jobs';
  
  // Wait for navigation to complete
  await new Promise(resolve => {
    // Check every 500ms if we've navigated to Unstop
    const checkInterval = setInterval(() => {
      if (window.location.hostname.includes('unstop.com')) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
    
    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 10000);
  });
  
  // Wait additional time for page to load
  await new Promise(r => setTimeout(r, 3000));
  logToBackground('Content: Navigation complete');
}

async function searchJobs(data) {
  logToBackground('Content: Searching for jobs');
  try {
    // Wait for search form
    await new Promise(r => setTimeout(r, 2000));

    // Try to find and fill keyword input
    const keywordInput = document.querySelector('input[placeholder*="Search Jobs"]') || 
                         document.querySelector('input[name="keyword"]') ||
                         document.querySelector('.search-input');
                         
    if (keywordInput) {
      await typeIntoField(keywordInput, data.keywords);
      logToBackground('Content: Entered job keywords');
      
      // Try to submit the search form
      const searchButton = document.querySelector('button[type="submit"]') ||
                           document.querySelector('.search-button') ||
                           keywordInput.closest('form')?.querySelector('button');
                           
      if (searchButton) {
        await searchButton.click();
        logToBackground('Content: Clicked search button');
      } else {
        // If no button is found, try pressing Enter
        await simulateEnterKey(keywordInput);
        logToBackground('Content: Pressed Enter to search');
      }
    }
    
    // Try to apply filters if available
    await applyFilters(data);
    
    // Wait for results to load
    await new Promise(r => setTimeout(r, 5000));
    logToBackground('Content: Search complete');
    
  } catch (error) {
    logToBackground('Content: Error searching jobs:', error);
  }
}

async function applyFilters(data) {
  try {
    // Apply experience filter if available
    if (data.experience) {
      const expFilters = document.querySelectorAll('.filter-item[data-filter="experience"], .filter-option:contains("Experience")');
      if (expFilters.length > 0) {
        await expFilters[0].click();
        logToBackground('Content: Clicked experience filter');
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    // Apply location filter if available
    if (data.location) {
      const locationFilters = document.querySelectorAll('.filter-item[data-filter="location"], .filter-option:contains("Location")');
      if (locationFilters.length > 0) {
        await locationFilters[0].click();
        logToBackground('Content: Clicked location filter');
        await new Promise(r => setTimeout(r, 1000));
        
        const locationInput = document.querySelector('input[placeholder*="location"], input[placeholder*="Location"]');
        if (locationInput) {
          await typeIntoField(locationInput, data.location);
          await simulateEnterKey(locationInput);
          logToBackground('Content: Entered location filter');
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  } catch (error) {
    logToBackground('Content: Error applying filters:', error);
  }
}

async function typeIntoField(element, text) {
  try {
    element.focus();
    element.value = '';
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));
  } catch (error) {
    logToBackground('Content: Error typing into field:', error);
    throw error;
  }
}

async function simulateEnterKey(element) {
  try {
    const events = [
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
      new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
      new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
    ];
    
    for (const event of events) {
      element.dispatchEvent(event);
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (error) {
    logToBackground('Content: Error simulating Enter key:', error);
  }
}

function showCompletionMessage(message) {
  try {
    const completionDiv = document.createElement('div');
    completionDiv.style.position = 'fixed';
    completionDiv.style.top = '20px';
    completionDiv.style.left = '50%';
    completionDiv.style.transform = 'translateX(-50%)';
    completionDiv.style.padding = '15px 20px';
    completionDiv.style.backgroundColor = '#d1fae5';
    completionDiv.style.border = '1px solid #34d399';
    completionDiv.style.borderRadius = '5px';
    completionDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    completionDiv.style.zIndex = '9999';
    completionDiv.style.display = 'flex';
    completionDiv.style.alignItems = 'center';
    completionDiv.style.justifyContent = 'center';
    completionDiv.innerHTML = `
      <div style="margin-right: 10px; color: #059669;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/>
        </svg>
      </div>
      <div>
        <p style="margin: 0; font-weight: 600; color: #065f46;">Automation Demo</p>
        <p style="margin: 0; font-size: 14px; color: #047857;">${message}</p>
      </div>
    `;
    document.body.appendChild(completionDiv);
    
    setTimeout(() => {
      completionDiv.style.opacity = '0';
      completionDiv.style.transition = 'opacity 0.5s ease';
      setTimeout(() => document.body.removeChild(completionDiv), 500);
    }, 10000);
  } catch (error) {
    logToBackground('Error showing completion notification:', error);
  }
}
