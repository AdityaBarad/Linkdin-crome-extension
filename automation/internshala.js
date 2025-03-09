const CONFIG = {
  DEFAULT_VALUES: {
    phone: '1234567890',
    zipCode: '10001'
  },
  CATEGORY_FILTERS: {
    'Engineering': 'Engineering',
    'Marketing': 'Marketing',
    'Management': 'Management',
    'Design': 'Design',
    'Content': 'Content Writing',
    'Finance': 'Finance',
    'HR': 'Human Resources'
  }
};

let totalApplied = 0;
let isRunning = false;

function logToBackground(...messages) {
  chrome.runtime.sendMessage({ action: 'log', data: messages.join(' ') });
}

logToBackground('Internshala content script loaded');

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

  // Handle navigation completion message
  if (request.action === 'navigationComplete') {
    logToBackground('Content: Navigation completed, continuing automation');
    continueAfterNavigation(request.data);
    sendResponse({ success: true });
    return false;
  }

  return false;
});

async function main(data) {
  logToBackground('Content: Starting main function for Internshala');
  try {
    // Skip login check - assume user is already logged in
    logToBackground('Content: Assuming user is already logged in');
    
    // Store data in extension storage for use after navigation
    await chrome.storage.local.set({
      internshalaData: data,
      automationStep: 'initial'
    });
    
    logToBackground('Content: Navigating to internship listings');
    await navigateToInternshalaPage(data);
    
    // Note: The rest of the automation will continue in continueAfterNavigation()
    // after the background script detects page load and re-injects content script
  } catch (error) {
    logToBackground('Content: Error in main function:', error);
    throw error;
  }
}

// New function to navigate using background script instead of directly changing location
async function navigateToInternshalaPage(data) {
  try {
    // First check if we're already on an internship page
    if (window.location.href.includes('internshala.com/internships') ||
        window.location.href.includes('the-grand-summer-internship-fair')) {
      logToBackground('Content: Already on an internship page, continuing');
      await continueAfterNavigation(data);
      return;
    }
    
    // Request navigation via background script
    chrome.runtime.sendMessage({
      action: 'navigateToUrl',
      url: 'https://internshala.com/internships/',
      data: data
    });
    
    // NOTE: Script execution will stop here due to page navigation
    // It will continue from continueAfterNavigation() function after
    // the background script detects page load and sends navigationComplete
  } catch (error) {
    logToBackground('Content: Navigation error:', error);
    throw error;
  }
}

// This function will be called after navigation completes
async function continueAfterNavigation(data) {
  try {
    // Get stored data if not provided directly
    if (!data) {
      const result = await chrome.storage.local.get(['internshalaData', 'automationStep']);
      data = result.internshalaData;
      const step = result.automationStep || 'initial';
      
      // Skip if no data available
      if (!data) {
        throw new Error('No automation data found after navigation');
      }
      
      logToBackground(`Content: Continuing automation at step: ${step}`);
    } else {
      logToBackground('Content: Continuing with provided data');
    }
    
    logToBackground('Content: Applying filters');
    await applyFilters(data);
    
    logToBackground('Content: Starting internship applications');
    await applyToInternships(data);
  } catch (error) {
    logToBackground('Content: Error after navigation:', error);
    throw error;
  }
}

async function goToInternshipListings() {
  try {
    // Navigate to the fair page as mentioned in the puppeteer script
    window.location.href = "https://internshala.com/the-grand-summer-internship-fair";
    await new Promise(r => setTimeout(r, 5000));
    
    // If the targeted page isn't available, fall back to regular internship listings
    if (!document.querySelector('.internship_list_container')) {
      window.location.href = "https://internshala.com/internships/";
      await new Promise(r => setTimeout(r, 5000));
    }
    
    logToBackground('Content: Navigated to internship listings');
  } catch (error) {
    logToBackground('Content: Navigation error:', error);
    throw error;
  }
}

async function applyFilters(data) {
  try {
    logToBackground('Content: Applying filters');
    
    // Wait longer for filters to be available
    await new Promise(r => setTimeout(r, 5000));
    
    // Apply category filters if provided
    if (data.filters && data.filters.length) {
      for (const filter of data.filters) {
        try {
          // Click on the category dropdown - using expanded selectors
          const categorySelectors = [
            '#select_category_chosen', 
            '.chosen-container-single',
            '.category-filter',
            '.filter-item[data-filter="category"]',
            '.internship-filter select[name="category"]',
            'select#category'
          ];
          
          let categoryDropdown = null;
          for (const selector of categorySelectors) {
            try {
              const element = document.querySelector(selector);
              if (element && element.offsetParent !== null) {
                categoryDropdown = element;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!categoryDropdown) {
            logToBackground('Content: Category dropdown not found, skipping filters');
            break;
          }
          
          await categoryDropdown.click();
          await new Promise(r => setTimeout(r, 2000));
          
          // Check if dropdown is activated by looking for any search input
          const searchInputSelectors = [
            '.chosen-container-active .chosen-search input',
            '.chosen-container.chosen-with-drop .chosen-search input',
            '.chosen-search-input',
            'input.search-field',
            'input[type="text"][placeholder*="search"]'
          ];
          
          let searchInput = null;
          for (const selector of searchInputSelectors) {
            try {
              const element = document.querySelector(selector);
              if (element && element.offsetParent !== null) {
                searchInput = element;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!searchInput) {
            // If search input not found, try direct category selection
            const directCategorySelector = `.filter-option:contains("${filter}")`;
            const directCategory = document.evaluate(
              `//*[contains(text(), "${filter}")]`,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE
            ).singleNodeValue;
            
            if (directCategory) {
              await directCategory.click();
              logToBackground('Content: Directly selected category:', filter);
              await new Promise(r => setTimeout(r, 3000));
              continue;
            } else {
              logToBackground('Content: Search input and direct category not found for:', filter);
              continue;
            }
          }
          
          // Type the filter text
          await typeIntoField(searchInput, filter);
          await new Promise(r => setTimeout(r, 1000));
          
          // Try both Enter key and clicking the first result
          try {
            await simulateEnterKey(searchInput);
          } catch (e) {
            // If Enter key fails, try to find and click the first result
            const firstResult = document.querySelector('.chosen-results .active-result');
            if (firstResult) {
              await firstResult.click();
            }
          }
          
          // Wait for the filter to apply
          await new Promise(r => setTimeout(r, 3000));
          
          logToBackground('Content: Applied filter:', filter);
        } catch (error) {
          logToBackground('Content: Error applying filter:', filter, error);
          // Continue with next filter even if this one fails
        }
      }
    }
    
    // Apply "Work From Home" filter if specified
    if (data.workplaceType === 'remote') {
      try {
        const wfhSelectors = [
          '#work-from-home', 
          '#work_from_home_check',
          'input[name="workFromHome"]',
          'label:contains("Work from home")',
          '.filter-item[data-filter="work_from_home"]'
        ];
        
        let wfhCheckbox = null;
        for (const selector of wfhSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              wfhCheckbox = element;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (wfhCheckbox && !wfhCheckbox.checked) {
          await wfhCheckbox.click();
          await new Promise(r => setTimeout(r, 3000));
          logToBackground('Content: Applied WFH filter');
        } else if (!wfhCheckbox) {
          logToBackground('Content: WFH checkbox not found, trying alternative methods');
          
          // Try XPath to find elements containing "work from home" text
          const wfhLabel = document.evaluate(
            '//*[contains(text(), "Work from home") or contains(text(), "WFH")]',
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE
          ).singleNodeValue;
          
          if (wfhLabel) {
            await wfhLabel.click();
            logToBackground('Content: Applied WFH filter through label');
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      } catch (error) {
        logToBackground('Content: Error applying WFH filter:', error);
        // Continue even if WFH filter fails
      }
    }
    
    // Apply "Easy Apply" filter if available - MAKE THIS OPTIONAL
    try {
      const easyApplySelectors = [
        '#easy-apply',
        '#easy_apply_check',
        'input[name="easyApply"]',
        'label:contains("Easy apply")',
        '.filter-item[data-filter="easy_apply"]'
      ];
      
      let easyApplyCheckbox = null;
      for (const selector of easyApplySelectors) {
        try {
          const element = document.querySelector(selector);
          if (element) {
            easyApplyCheckbox = element;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (easyApplyCheckbox && !easyApplyCheckbox.checked) {
        await easyApplyCheckbox.click();
        await new Promise(r => setTimeout(r, 3000));
        logToBackground('Content: Applied Easy Apply filter');
      } else if (!easyApplyCheckbox) {
        // Try XPath to find elements containing "easy apply" text
        const easyApplyLabel = document.evaluate(
          '//*[contains(text(), "Easy apply")]',
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE
        ).singleNodeValue;
        
        if (easyApplyLabel) {
          await easyApplyLabel.click();
          logToBackground('Content: Applied Easy Apply filter through label');
          await new Promise(r => setTimeout(r, 3000));
        } else {
          logToBackground('Content: Easy Apply filter not found, proceeding anyway');
        }
      }
    } catch (error) {
      logToBackground('Content: Easy Apply filter not available, continuing without it:', error);
      // Continue even if Easy Apply filter fails
    }
    
    logToBackground('Content: All filters applied');
  } catch (error) {
    logToBackground('Content: Error in applyFilters, continuing with application:', error);
    // Continue with job applications even if filters fail
  }
}

async function applyToInternships(data) {
  totalApplied = 0;
  
  while (totalApplied < data.totalJobsToApply) {
    try {
      logToBackground(`Content: Looking for internships to apply (${totalApplied}/${data.totalJobsToApply})`);
      
      // Wait for internship listings to load with more flexible selector
      const internshipSelectors = [
        '.individual_internship.easy_apply',
        '.individual_internship',  // Fallback to any internship if easy_apply class is not found
        '.internship-container',
        '.internship_list_item'
      ];
      
      let internships = [];
      for (const selector of internshipSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements && elements.length > 0) {
          internships = Array.from(elements);
          break;
        }
      }
      
      logToBackground(`Content: Found ${internships.length} internships to try`);
      
      if (internships.length === 0) {
        logToBackground('Content: No more internships found, trying to load more');
        
        // Try to find and click "Load More" button if available
        const loadMoreSelectors = [
          'button:contains("Load More")',
          'a:contains("Load More")',
          '.load_more_internships',
          '#load_more_internships'
        ];
        
        let loadMoreButton = null;
        for (const selector of loadMoreSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element && element.offsetParent !== null) {
              loadMoreButton = element;
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (loadMoreButton) {
          await loadMoreButton.click();
          await new Promise(r => setTimeout(r, 5000));
          continue;
        } else {
          logToBackground('Content: No more internships and no load more button, stopping');
          break;
        }
      }
      
      // Click the first internship
      await internships[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 1000));
      await internships[0].click();
      await new Promise(r => setTimeout(r, 3000));
      
      // Process the application
      const success = await processInternshipApplication(data);
      
      if (success) {
        totalApplied++;
        
        // Report progress
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          total: totalApplied,
          totalJobsToApply: data.totalJobsToApply,
          platform: 'internshala' // Add platform explicitly
        });
        
        logToBackground(`Content: Successfully applied to internship (${totalApplied}/${data.totalJobsToApply})`);
      }
      
      // Go back to listings - use navigateToInternshalaPage instead of old function
      if (totalApplied < data.totalJobsToApply) {
        await navigateToInternshalaPage(data);
        await new Promise(r => setTimeout(r, 5000));
      }
      
    } catch (error) {
      logToBackground('Content: Error applying to internship:', error);
      // Try to go back to listings
      await navigateToInternshalaPage(data);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  logToBackground(`Content: Completed internship applications. Applied to ${totalApplied} internships.`);
  
  // Send completion message
  chrome.runtime.sendMessage({
    action: 'automationComplete',
    total: totalApplied,
    platform: 'internshala'
  });
  
  // Show completion notification on page
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
        <p style="margin: 0; font-weight: 600; color: #065f46;">Automation Complete!</p>
        <p style="margin: 0; font-size: 14px; color: #047857;">Successfully applied to ${totalApplied} internships.</p>
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

async function processInternshipApplication(data) {
  try {
    logToBackground('Content: Processing internship application');
    
    // Find and click the continue button
    const continueButton = await waitForElement('#continue_button, button.continue_button');
    if (continueButton) {
      await continueButton.click();
      await new Promise(r => setTimeout(r, 3000));
    } else {
      throw new Error('Continue button not found');
    }
    
    // Handle cover letter - either copy from previous or enter new one
    const copyCoverLetterButton = document.querySelector('.copyCoverLetterTitle');
    if (copyCoverLetterButton) {
      await copyCoverLetterButton.click();
      logToBackground('Content: Used previous cover letter');
    } else {
      // Fill in cover letter if textarea exists
      const textAreas = document.querySelectorAll('textarea.textarea.form-control');
      if (textAreas.length > 0) {
        for (let textArea of textAreas) {
          await typeIntoField(textArea, data.coverLetter || "I am writing to express my interest in this internship opportunity. My skills and experience align well with the requirements you've outlined, and I'm excited about the possibility of contributing to your team.");
        }
        logToBackground('Content: Entered cover letter');
      }
    }
    
    // Check all checkboxes (terms, conditions, etc.)
    const checkboxes = document.querySelectorAll("input[type='checkbox']");
    if (checkboxes.length > 0) {
      for (let checkbox of checkboxes) {
        if (!checkbox.checked && checkbox.offsetParent !== null) {
          await checkbox.click();
          await new Promise(r => setTimeout(r, 500));
        }
      }
      logToBackground('Content: Checked all required checkboxes');
    }
    
    // Handle location dropdown if present
    const locationDropdown = document.querySelector("select#locations");
    if (locationDropdown) {
      // Make dropdown visible and selectable
      await executeScript(() => {
        const select = document.querySelector("select#locations");
        if (select) select.style.display = 'block';
      });
      
      // Select first option
      await executeScript(() => {
        const select = document.querySelector("select#locations");
        if (select && select.options.length > 0) {
          select.selectedIndex = 0;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      logToBackground('Content: Selected location from dropdown');
    }
    
    // Find and click submit button
    const submitButton = await waitForElement("#submit, button[type='submit']", 5000);
    if (submitButton) {
      await submitButton.click();
      await new Promise(r => setTimeout(r, 5000));
      
      // Handle "Continue applying" dialog if it appears
      const continueApplyingButton = document.querySelector("#dismiss_similar_job_modal, button.continue-applying");
      if (continueApplyingButton) {
        await continueApplyingButton.click();
        logToBackground('Content: Clicked continue applying');
      }
      
      return true;
    } else {
      logToBackground('Content: Submit button not found');
      return false;
    }
    
  } catch (error) {
    logToBackground('Content: Error in processInternshipApplication:', error);
    return false;
  }
}

async function executeScript(fn) {
  return new Promise(resolve => {
    try {
      const result = fn();
      resolve(result);
    } catch (error) {
      logToBackground('Content: Error executing script:', error);
      resolve(null);
    }
  });
}

async function waitForElement(selector, timeout = 10000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    // Handle multiple selectors separated by commas
    if (selector.includes(',')) {
      const selectors = selector.split(',').map(s => s.trim());
      for (const singleSelector of selectors) {
        const element = document.querySelector(singleSelector);
        if (element && element.offsetParent !== null) {
          return element;
        }
      }
    } else {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        return element;
      }
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
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
      new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }),
      new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }),
      new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true })
    ];
    
    for (const event of events) {
      element.dispatchEvent(event);
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (error) {
    logToBackground('Content: Error simulating Enter key:', error);
  }
}
