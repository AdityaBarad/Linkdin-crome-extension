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

logToBackground('Naukri content script loaded');

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
  logToBackground('Content: Starting main function for Naukri');
  try {
    // Navigate to Naukri jobs
    await navigateToNaukriJobs();
    
    // Search for jobs with filters
    await searchJobs(data);
    
    // Send initial progress update
    chrome.runtime.sendMessage({
      action: 'updateProgress',
      total: 0,
      totalJobsToApply: data.totalJobsToApply,
      platform: 'naukri'
    });

    // Show the user a message that this is just a navigation demo
    showCompletionMessage('Naukri automation demonstration - navigation only');
    
    // Send completion message
    chrome.runtime.sendMessage({
      action: 'automationComplete',
      total: 0,
      platform: 'naukri'
    });

  } catch (error) {
    logToBackground('Content: Error in main function:', error);
    throw error;
  }
}

async function navigateToNaukriJobs() {
  logToBackground('Content: Navigating to Naukri jobs');
  
  // Check if we're already on Naukri
  if (window.location.hostname.includes('naukri.com')) {
    logToBackground('Content: Already on Naukri');
    return;
  }
  
  // Navigate to Naukri jobs page
  logToBackground('Content: Redirecting to Naukri');
  window.location.href = 'https://www.naukri.com/jobs-by-location';
  
  // Wait for navigation to complete
  await new Promise(resolve => {
    // Check every 500ms if we've navigated to Naukri
    const checkInterval = setInterval(() => {
      if (window.location.hostname.includes('naukri.com')) {
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

    // Find and fill keyword input - Naukri has multiple UI versions, so try various selectors
    const keywordInput = document.querySelector('#qsb-keyskill-sugg') || 
                        document.querySelector('input[name="qp"]') ||
                        document.querySelector('input[placeholder*="Skills, Designation"]') ||
                        document.querySelector('.keywordSugg');
    
    if (keywordInput) {
      await typeIntoField(keywordInput, data.keywords);
      logToBackground('Content: Entered job keywords');
    }
    
    // Find and fill location input
    const locationInput = document.querySelector('#qsb-location-sugg') ||
                         document.querySelector('input[name="ql"]') ||
                         document.querySelector('input[placeholder*="Location"]') ||
                         document.querySelector('.locationSugg');
    
    if (locationInput) {
      await clearField(locationInput);
      await typeIntoField(locationInput, data.location);
      logToBackground('Content: Entered location');
    }
    
    // Find and fill experience input if available
    const experienceSelector = document.querySelector('#experienceDD') ||
                              document.querySelector('select[name="exp"]') ||
                              document.querySelector('button[data-filter="experience"]');
    
    if (experienceSelector) {
      try {
        await experienceSelector.click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Try to select experience dropdown option
        const experienceValue = parseInt(data.experience);
        const expOption = document.querySelector(`.dropdownList li[title^="${experienceValue}"]`) ||
                         document.querySelector(`option[value="${experienceValue}"]`);
        
        if (expOption) {
          await expOption.click();
          logToBackground('Content: Selected experience');
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (error) {
        logToBackground('Content: Error setting experience:', error);
      }
    }
    
    // Find and click search button
    const searchButton = document.querySelector('button[type="submit"]') || 
                        document.querySelector('#qsbFormBtn') ||
                        document.querySelector('.search-btn');
    
    if (searchButton) {
      await searchButton.click();
      logToBackground('Content: Clicked search button');
    } else {
      // If no button found, try pressing Enter in the keyword field
      if (keywordInput) {
        await simulateEnterKey(keywordInput);
      }
    }
    
    // Wait for results to load
    await new Promise(r => setTimeout(r, 5000));
    logToBackground('Content: Search complete');
    
  } catch (error) {
    logToBackground('Content: Error searching jobs:', error);
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

async function clearField(element) {
  element.focus();
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
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
