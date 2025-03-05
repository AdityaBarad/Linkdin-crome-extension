let totalApplied = 0;
let isRunning = false;

function logToBackground(...messages) {
  chrome.runtime.sendMessage({ action: 'log', data: messages.join(' ') });
}

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
});

async function main(data) {
  logToBackground('Content: Starting main function');
  try {
    logToBackground('Content: Navigating to jobs');
    await navigateToJobs();
    
    logToBackground('Content: Searching for jobs');
    // Pass the entire data object to searchJobs
    await searchJobs(data);
    
    logToBackground('Content: Starting job applications');
    await applyToJobs(data);
  } catch (error) {
    logToBackground('Content: Error in main function:', error);
    throw error;
  }
}

async function navigateToJobs() {
  logToBackground('Content: Checking current page');
  try {
    // Don't navigate if already on jobs page
    if (window.location.href.includes('linkedin.com/jobs')) {
      logToBackground('Content: Already on jobs page');
      return;
    }

    logToBackground('Content: Navigating to jobs page');
    window.location.href = 'https://www.linkedin.com/jobs/';

  } catch (error) {
    logToBackground('Content: Navigation error:', error);
    throw error;
  }
}

// Update the searchJobs function signature to accept data object
async function searchJobs(data) {
  logToBackground('Content: Starting job search');
  try {
    // Update to use data.keywords and data.location
    const keywordSelectors = [
      '[id^="jobs-search-box-keyword-id"]'
    ];

    const locationSelectors = [
      '[id^="jobs-search-box-location-id"]'
    ];

    const keywordInput = await waitForAnyElement(keywordSelectors);
    const locationInput = await waitForAnyElement(locationSelectors);

    // Clear existing values
    await clearField(keywordInput);
    await clearField(locationInput);

    // Type with delay between characters
    await typeIntoField(keywordInput, data.keywords);
    
    await typeIntoField(locationInput, data.location);

    await simulateEnterKey(locationInput);
        await new Promise(r => setTimeout(r, 500));

    // // Updated selectors for job results list
    // const resultSelectors = [
    //   '.scaffold-layout__list'
    // ];

    // logToBackground('Content: Waiting for search results...');
    
    // // Wait for job list and first job card
    // const jobList = await waitForAnyElement(resultSelectors, 100);
    // await new Promise(r => setTimeout(r, 500));

    // Try to find and click the Easy Apply filter
    logToBackground('Content: Looking for Easy Apply filter');
    const easyApplySelectors = [
      'button[aria-label="Easy Apply filter."]'
    ];

    const easyApplyButton = await waitForAnyElement(easyApplySelectors, 5000);
    if (easyApplyButton) {
      logToBackground('Content: Clicking Easy Apply filter');
      await easyApplyButton.click();
      await new Promise(r => setTimeout(r, 3000));
    } else {
      logToBackground('Content: Easy Apply filter not found');
    }

    // After clicking Easy Apply filter, add date posted filter
    if (data.datePosted) {
      logToBackground('Content: Applying date posted filter');
      
      // Click the date posted filter button
      const dateFilterButton = await waitForAnyElement([
        '#searchFilter_timePostedRange',
        'button[aria-label*="Date posted filter"]'
      ]);
      
      if (dateFilterButton) {
        await dateFilterButton.click();
        logToBackground('Content: date button clicked');
        await new Promise(r => setTimeout(r, 1000));

        // Select the appropriate radio button
        const dateRadio = await waitForElement(`#timePostedRange-${data.datePosted}`);
        if (dateRadio) {
          await dateRadio.click();
          await new Promise(r => setTimeout(r, 1000));

          // Find and click the "Show results" button with valid selectors
          const showResultsSelectors = [
            'button[aria-label="Apply current filter to show results"]',
            '.artdeco-button--primary.ml2[type="button"]',
            '.artdeco-button--2.artdeco-button--primary',
            'button.artdeco-button--primary:not([aria-label*="filter"])'
          ];

          // Look for any button containing "Show results" text
          const allButtons = document.querySelectorAll('button');
          const showResultsButton = Array.from(allButtons).find(button => 
            button.textContent.trim().toLowerCase().includes('show results')
          ) || await waitForAnyElement(showResultsSelectors);

          if (showResultsButton) {
            logToBackground('Content: Clicking Show results button');
            await showResultsButton.click();
            await new Promise(r => setTimeout(r, 2000));
          } else {
            logToBackground('Content: Show results button not found');
          }
        } else {
          logToBackground('Content: Date filter option not found');
        }
      } else {
        logToBackground('Content: Date filter button not found');
      }
    }

    // Add workplace type filter
    if (data.workplaceTypes && data.workplaceTypes.length > 0) {
      logToBackground('Content: Applying workplace type filter');
      
      // Click the workplace type filter button
      const workplaceFilterButton = await waitForAnyElement([
        '#searchFilter_workplaceType',
        'button[aria-label*="Remote filter"]'
      ]);
      
      if (workplaceFilterButton) {
        await workplaceFilterButton.click();
        await new Promise(r => setTimeout(r, 1000));

        // Select the chosen workplace types
        for (const workplaceType of data.workplaceTypes) {
          const checkbox = await waitForElement(`#workplaceType-${workplaceType}`);
          if (checkbox && !checkbox.checked) {
            await checkbox.click();
            await new Promise(r => setTimeout(r, 500));
          }
        }

        // Click the "Show results" button
        const showResultsButton = await waitForAnyElement([
          'button[aria-label="Apply current filter to show results"]',
          '.artdeco-button--primary.ml2[type="button"]',
          'button.artdeco-button--primary:not([aria-label*="filter"])'
        ]);

        if (showResultsButton) {
          logToBackground('Content: Clicking Show results button for workplace filter');
          await showResultsButton.click();
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    // Add workplace type filter after date filter
    if (data.workplaceType) {
      logToBackground('Content: Applying workplace type filter');
      
      // Click the workplace type filter button
      const workplaceFilterButton = await waitForAnyElement([
        '#searchFilter_workplaceType',
        'button[aria-label*="Remote filter"]',
        'button[aria-label*="Workplace"]'
      ]);
      
      if (workplaceFilterButton) {
        await workplaceFilterButton.click();
        await new Promise(r => setTimeout(r, 2000)); // Increased delay

        // Try multiple selectors for the workplace options
        const workplaceSelectors = [
          `#workplaceType-${data.workplaceType}`,
          `input[name="remote-filter-value"][value="${data.workplaceType}"]`,
          `input[value="${data.workplaceType}"].search-reusables__select-input`
        ];

        let workplaceOption = null;
        for (const selector of workplaceSelectors) {
          workplaceOption = await waitForElement(selector, 5000).catch(() => null);
          if (workplaceOption) break;
        }

        if (workplaceOption) {
          logToBackground('Content: Found workplace option');
          await workplaceOption.click();
          await new Promise(r => setTimeout(r, 1000));

          // Use the new function to find and click the show results button
          const showResultsButton = await findShowResultsButton();
          
          if (showResultsButton) {
            logToBackground('Content: Clicking Show results button');
            await showResultsButton.click();
            await new Promise(r => setTimeout(r, 2000));
          } else {
            logToBackground('Content: Show results button not found, trying alternative approach');
            // Alternative approach: Press Enter key
            workplaceOption.focus();
            await simulateEnterKey(workplaceOption);
          }
        } else {
          logToBackground('Content: Workplace option not found');
        }
      }
    }

    // Wait for results with the updated filter
    logToBackground('Content: Waiting for filtered search results...');
    await new Promise(r => setTimeout(r, 5000));

    // Verify results by checking for job cards
    const jobCardSelectors = [
      '.job-card-container',
      '.jobs-search-results__list-item',
      '.ember-view.jobs-search-results__list-item'
    ];

    const hasJobCards = await waitForAnyElement(jobCardSelectors, 500);
    if (!hasJobCards) {
      throw new Error('No Easy Apply job cards found in results');
    }

    logToBackground('Content: Filtered search results found');
  } catch (error) {
    logToBackground('Content: Error in searchJobs:', error);
    throw error;
  }
}

async function applyToJobs(data) {
  let pageIndex = 1;
  totalApplied = 0;

  while (totalApplied < data.totalJobsToApply) {
    logToBackground('Content: Getting job cards');
    let jobCards = await getJobCards();
    logToBackground(`Content: Found ${jobCards.length} job cards`);
    
    // Process all visible job cards on the current page
    let cardIndex = 0;
    while (cardIndex < jobCards.length && totalApplied < data.totalJobsToApply) {
      try {
        const currentCard = jobCards[cardIndex];
        logToBackground(`Content: Processing job card ${cardIndex + 1}/${jobCards.length}`);
        
        // Scroll to the card to ensure it's in view
        await currentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(r => setTimeout(r, 1000));
        
        // Refresh job cards list after scrolling (in case of dynamic loading)
        jobCards = await getJobCards();
        
        await processJobCard(currentCard, data);
        totalApplied++;
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          total: totalApplied
        });
      } catch (error) {
        logToBackground('Content: Error processing job card:', error);
        // Continue to next card even if current one fails
      }
      cardIndex++;
    }

    // Only move to next page if we still need to apply to more jobs
    if (totalApplied < data.totalJobsToApply) {
      const hasNextPage = await goToNextPage(++pageIndex);
      if (!hasNextPage) {
        logToBackground('Content: No more pages available');
        break;
      }
      // Wait longer after page change to ensure content is loaded
      await new Promise(r => setTimeout(r, 5000));
    } else {
      break;
    }
  }
}

async function processJobCard(jobCard, data) {
  try {
    // Wait for any existing job details panel to close
    await new Promise(r => setTimeout(r, 1000));

    // Check if job is already applied
    const isApplied = await checkIfJobApplied(jobCard);
    if (isApplied) {
      logToBackground('Content: Job already applied, skipping');
      throw new Error('Job already applied');
    }

    // Find the clickable link or title within the job card
    const jobLink = await findClickableElement(jobCard);
    if (!jobLink) {
      throw new Error('No clickable element found in job card');
    }

    // Scroll into view smoothly
    await jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 500));

    // Click the job title/link
    logToBackground('Content: Clicking job card');
    await jobLink.click();
    
    // Increased wait time for initial load
    await new Promise(r => setTimeout(r, 1000));

    // // Wait for job details panel with multiple possible selectors
    // const detailsPanelSelectors = [
    //   '.jobs-unified-top-card',
    //   '.jobs-details',
    //   '[data-job-id]',
    //   '.jobs-details__main-content'
    // ];

    // let detailsPanel = null;
    // for (let attempt = 0; attempt < 3; attempt++) {
    //   logToBackground('Content: Attempting to find details panel, attempt', attempt + 1);
      
    //   for (const selector of detailsPanelSelectors) {
    //     const element = document.querySelector(selector);
    //     if (element && element.offsetParent !== null) {
    //       detailsPanel = element;
    //       break;
    //     }
    //   }

    //   if (detailsPanel) break;
      
    //   // If not found, wait and try again
    //   await new Promise(r => setTimeout(r, 2000));
    // }

    // if (!detailsPanel) {
    //   throw new Error('Job details panel not loaded after multiple attempts');
    // }

    // logToBackground('Content: Job details panel found, waiting for content to settle');
    // await new Promise(r => setTimeout(r, 2000));

    // Wait specifically for the Easy Apply button container
    // const easyApplyContainer = await waitForElement('.jobs-s-apply.jobs-s-apply--fadein');
    // if (!easyApplyContainer) {
    //   throw new Error('Easy Apply button container not found');
    // }

    // Find the Easy Apply button within the container
    const easyApplyButton = await waitForElement(
      '.jobs-s-apply .jobs-apply-button--top-card button.jobs-apply-button', 
      500
    );

    if (!easyApplyButton) {
      throw new Error('Easy Apply button not found');
    }

    // // Verify button state
    // const buttonText = easyApplyButton.textContent.trim().toLowerCase();
    // const ariaLabel = easyApplyButton.getAttribute('aria-label')?.toLowerCase() || '';
    
    // if (buttonText.includes('applied') || ariaLabel.includes('applied')) {
    //   logToBackground('Content: Job already applied (button state), skipping');
    //   throw new Error('Job already applied');
    // }

    logToBackground('Content: Clicking Easy Apply button');
    await easyApplyButton.click();
    // await new Promise(r => setTimeout(r, 1000));

    // // Wait for the application modal
    // const modalSelectors = [
    //   '.jobs-easy-apply-modal',
    //   '[data-test-modal-id="easy-apply-modal"]',
    //   '[role="dialog"][aria-label*="apply"]'
    // ];

    // const modal = await waitForAnyElement(modalSelectors, 5000);
    // if (!modal) {
    //   throw new Error('Application modal not found');
    // }

    // Start the application process
    logToBackground('Content: Starting application process');
    await processApplicationForm(data);

    // Additional wait after form processing
    await new Promise(r => setTimeout(r, 500));

    logToBackground('Content: Job application completed');
    return true;
  } catch (error) {
    logToBackground('Content: Error in processJobCard:', error.message);
    throw error;
  }
}

// // Add new function to verify Easy Apply status
// async function verifyEasyApplyJob(detailsPanel) {
//   try {
//     // Multiple ways to detect Easy Apply
//     const easyApplyIndicators = [
//       // Direct Easy Apply button
//       'button.jobs-apply-button',
//       'button[aria-label*="Easy Apply"]',
//       // Easy Apply text indicators
//       '.jobs-unified-top-card__easy-apply-label',
//       '.jobs-apply-button--top-card',
//       '[data-test-job-card-easy-apply]'
//     ];

//     // Check each indicator
//     for (const selector of easyApplyIndicators) {
//       const indicator = detailsPanel.querySelector(selector);
//       if (indicator && indicator.offsetParent !== null) {
//         // Additional verification for buttons
//         if (indicator.tagName === 'BUTTON') {
//           const text = indicator.textContent.toLowerCase();
//           const ariaLabel = indicator.getAttribute('aria-label')?.toLowerCase() || '';
          
//           // Skip if it shows as already applied
//           if (text.includes('applied') || ariaLabel.includes('applied')) {
//             continue;
//           }
          
//           // Verify it's an Easy Apply button
//           if (text.includes('easy apply') || ariaLabel.includes('easy apply')) {
//             return true;
//           }
//         } else {
//           // For non-button indicators, just check visibility
//           return true;
//         }
//       }
//     }

//     return false;
//   } catch (error) {
//     logToBackground('Content: Error verifying Easy Apply status:', error);
//     return false;
//   }
// }

// Add new function to verify we're in the application flow
// async function verifyApplicationFlow(modal) {
//   try {
//     // Check for common elements in the application flow
//     const applicationFlowIndicators = [
//       // Form elements
//       'form.jobs-easy-apply-form',
//       '.jobs-easy-apply-content',
//       // Progress indicator
//       '.artdeco-completeness-meter-linear',
//       // Common form fields
//       'input[name*="apply"]',
//       'select[name*="apply"]',
//       // Submit/Next buttons
//       'button[aria-label*="Submit"]',
//       'button[aria-label*="Continue"]'
//     ];

//     for (const selector of applicationFlowIndicators) {
//       const indicator = modal.querySelector(selector);
//       if (indicator && indicator.offsetParent !== null) {
//         return true;
//       }
//     }

//     return false;
//   } catch (error) {
//     logToBackground('Content: Error verifying application flow:', error);
//     return false;
//   }
// }

// Add new function to check if job is already applied
async function checkIfJobApplied(jobCard) {
  try {
    // Check for "Applied" text or indicators within the job card
    const appliedIndicators = [
      '.jobs-applied-badge',
      '.artdeco-inline-feedback--success',
      '.jobs-search-results__list-item--applied',
      '[data-test-applied-indicator]'
    ];

    for (const selector of appliedIndicators) {
      const indicator = jobCard.querySelector(selector);
      if (indicator) return true;
    }

    // Check for "Applied" text in any element
    const cardText = jobCard.textContent.toLowerCase();
    if (cardText.includes('applied') || cardText.includes('you\'ve applied')) {
      return true;
    }

    return false;
  } catch (error) {
    logToBackground('Content: Error checking if job applied:', error);
    return false; // If error checking, assume not applied
  }
}

// // Add new function to find the correct apply button
// async function findApplyButton() {
//   const applyButtonSelectors = [
//     // Easy Apply specific selectors
//     'button.jobs-apply-button:not([disabled])',
//     'button[aria-label="Easy Apply to this job"]',
//     // General apply button selectors
//     'button.jobs-apply-button',
//     'button[aria-label*="Easy Apply"]',
//     '.jobs-s-apply button'
//   ];

//   try {
//     const buttons = document.querySelectorAll(
//       applyButtonSelectors.join(',')
//     );

//     for (const button of buttons) {
//       if (!button.offsetParent || button.disabled) continue;

//       const buttonText = button.textContent.toLowerCase();
//       const ariaLabel = button.getAttribute('aria-label')?.toLowerCase() || '';

//       // Skip if button indicates already applied
//       if (buttonText.includes('applied') || 
//           ariaLabel.includes('applied') ||
//           button.closest('[data-test-applied-indicator]')) {
//         continue;
//       }

//       // Check specifically for Easy Apply buttons
//       if ((buttonText.includes('easy apply') || ariaLabel.includes('easy apply')) &&
//           !buttonText.includes('applied') && 
//           !ariaLabel.includes('applied')) {
//         return button;
//       }
//     }

//     return null;
//   } catch (error) {
//     logToBackground('Content: Error finding apply button:', error);
//     return null;
//   }
// }

async function findClickableElement(jobCard) {
  const selectors = [
    'a.job-card-container__link',
    'a[data-control-id]',
    'a[href*="/jobs/view/"]',
    '.job-card-list__title',
    'a.disabled.ember-view.job-card-container__link'
  ];

  for (const selector of selectors) {
    const element = jobCard.querySelector(selector);
    if (element) {
      return element;
    }
  }

  // If no specific element found, return the job card itself
  return jobCard;
}

async function processApplicationForm(data) {
  logToBackground('Content: Starting form processing');
  let isCompleted = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isCompleted && attempts < maxAttempts) {
    try {
      // Wait for form fields to be visible
      // await new Promise(r => setTimeout(r, 1000));
    
      
      logToBackground('Content: Filling form fields');
      await fillFormFields(data);
      
      // // Wait for any animations to complete
      // await new Promise(r => setTimeout(r, 1000));

      logToBackground('Content: Looking for next/submit button');
      const result = await clickNextOrSubmit();
      
      if (result.modalClosed) {
        logToBackground('Content: Application completed');
        isCompleted = true;
        break;
      } else if (result.clicked) {
        logToBackground('Content: Proceeding to next step');
        // Wait longer after clicking next to ensure new form loads
        // await new Promise(r => setTimeout(r, 3000));
      } else {
        logToBackground('Content: No clickable next/submit button found');
        attempts++;
      }
      
    } catch (error) {
      logToBackground('Content: Form processing error:', error.message);
      break;
    }
  }
}

async function clickNextOrSubmit() {
  const buttonSelectors = [
    // Submit-specific selectors
    'button[aria-label="Submit application"]',
    'button[aria-label="Review your application"]',
    // Next-specific selectors
    'button[data-easy-apply-next-button]',
    'button[data-live-test-easy-apply-next-button]',
    'button[aria-label="Continue to next step"]',
    // Backup selectors
    'button.artdeco-button--primary[type="button"]',
    'button.artdeco-button--2.artdeco-button--primary'
  ];

  try {
    // Check if modal is still open
    const modal = document.querySelector('.jobs-easy-apply-modal');
    if (!modal) {
      return { modalClosed: true, clicked: false };
    }

    // Try each button selector
    for (const selector of buttonSelectors) {
      const buttons = document.querySelectorAll(selector);
      for (const button of buttons) {
        if (button.offsetParent !== null && 
            !button.disabled && 
            !button.getAttribute('aria-label')?.includes('Dismiss')) {
          
          const buttonText = button.textContent.trim().toLowerCase();
          const buttonSpan = button.querySelector('.artdeco-button__text');
          const spanText = buttonSpan ? buttonSpan.textContent.trim().toLowerCase() : '';
          
          const isSubmitButton = buttonText.includes('submit') || spanText.includes('submit');

          if (isSubmitButton || buttonText.includes('next') || spanText.includes('review') || buttonText.includes('review') ||
              spanText.includes('next') || buttonText.includes('continue')) {
            
            try {
              await button.click();
              await new Promise(r => setTimeout(r, 500));

              if (isSubmitButton) {
                // Wait for and handle the post-submit dialog
                await handlePostSubmitDialog();
              }

              // Check if the apply modal is still open
              const modalStillOpen = document.querySelector('.jobs-easy-apply-modal');
              if (!modalStillOpen) {
                return { modalClosed: true, clicked: true };
              }

              // Check if we moved to a new step (success)
              const hasError = document.querySelector('.artdeco-inline-feedback--error');
              if (!hasError) {
                return { modalClosed: false, clicked: true };
              }
            } catch (err) {
              logToBackground('Content: Error clicking button:', err);
              continue;
            }
          }
        }
      }
    }

    return { modalClosed: false, clicked: false };
  } catch (error) {
    logToBackground('Content: Error in clickNextOrSubmit:', error);
    return { modalClosed: false, clicked: false };
  }
}

async function fillFormFields(data) {
  logToBackground('Content: Starting to fill form fields');
  
  // Get all form fields
  const formElements = document.querySelectorAll('input, select, textarea');
  
  for (const element of formElements) {
    try {
      // Skip hidden or disabled fields
      if (!element.offsetParent || element.disabled) continue;
      
      // Get field label text from multiple possible sources
      const label = element.getAttribute('aria-label') || 
                   element.closest('label')?.textContent.trim() || 
                   element.placeholder || 
                   element.name || '';
                   
      const labelText = label.toLowerCase();
      
      // Enhanced numeric field detection
      const isNumericField = isNumericInput(element, labelText);
      
      logToBackground('Content: Processing field:', labelText, isNumericField ? '(numeric)' : '(text)');

      // Handle field based on its type
      if (element.type === 'radio') {
        handleRadioButton(element, labelText);
      } 
      else if (element.tagName === 'SELECT') {
        handleSelectField(element, labelText, isNumericField, data);
      } 
      else if (element.type === 'checkbox') {
        handleCheckbox(element, labelText);
      } 
      else {
        if (isNumericField) {
          await handleNumericInput(element, labelText, data);
        } else {
          await handleTextInput(element, labelText, data);
        }
      }
      
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      logToBackground('Content: Error filling field:', error.message);
    }
  }
}

// New function to detect numeric inputs
function isNumericInput(element, labelText) {
  // HTML attributes that indicate numeric input
  const numericAttributes = 
    element.type === 'number' || 
    element.inputMode === 'numeric' ||
    element.pattern === '[0-9]*' ||
    element.getAttribute('type') === 'tel';

  // Common numeric-only input names/ids
  const numericNames = /(?:^|\W)(number|amount|count|quantity|value|digit|numeric)(?:$|\W)/i.test(element.name || element.id || '');

  // Keywords in label that indicate numeric input
  const numericKeywords = [
    'year', 'years', 'yrs',
    'salary', 'ctc', 'compensation', 'pay', 'package',
    'phone', 'mobile', 'contact',
    'zip', 'postal', 'pincode',
    'age', 'duration', 'period',
    'digit', 'numeric', 'number',
    'amount', 'quantity', 'count',
    'gpa', 'score', 'percentage',
    'experience', 'exp'
  ];

  // Check if any numeric keywords are in the label
  const hasNumericKeywords = numericKeywords.some(keyword => labelText.includes(keyword));

  // Additional check for common numeric patterns
  const hasNumericPattern = element.getAttribute('pattern')?.includes('[0-9]');

  // Check if the field has numeric-only validation
  const hasNumericValidation = element.getAttribute('min') !== null || 
                              element.getAttribute('max') !== null ||
                              element.getAttribute('step') !== null;

  return numericAttributes || 
         numericNames || 
         hasNumericKeywords || 
         hasNumericPattern || 
         hasNumericValidation;
}

// Updated function to handle select fields with numeric awareness
function handleSelectField(element, labelText, isNumericField, data) {
  if (!element.value || 
      element.value === 'Select an option' || 
      element.value === '--' ||
      element.value === 'Please select') {
    
    let selectedValue = null;
    const options = Array.from(element.options);

    if (isNumericField) {
      // For numeric selects, try to match the closest numeric value
      if (labelText.includes('experience')) {
        selectedValue = findClosestNumericOption(options, data.experience);
      } else if (labelText.includes('salary')) {
        selectedValue = findClosestNumericOption(options, data.expectedSalary);
      } else {
        selectedValue = findClosestNumericOption(options, 0);
      }
    } else {
      // For non-numeric selects, find first valid option
      const firstValidOption = options.find(opt => {
        const optValue = opt.value;
        return optValue && 
               optValue !== 'Select an option' && 
               optValue !== '--' && 
               optValue !== 'Please select';
      });
      if (firstValidOption) {
        selectedValue = firstValidOption.value;
      }
    }

    if (selectedValue) {
      element.value = selectedValue;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// New helper function to find closest numeric option
function findClosestNumericOption(options, targetValue) {
  const target = parseInt(targetValue);
  let closest = null;
  let closestDiff = Infinity;

  for (const option of options) {
    const optionText = option.text.toLowerCase();
    const optionValue = option.value;
    
    // Skip empty or default options
    if (!optionValue || optionValue === 'Select an option' || optionValue === '--') {
      continue;
    }

    // Try to extract number from option text
    const numbers = optionText.match(/\d+/g);
    if (numbers) {
      const optionNumber = parseInt(numbers[0]);
      const diff = Math.abs(optionNumber - target);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = optionValue;
      }
    }
  }

  return closest;
}

async function handleRadioButton(element, labelText) {
  // For Yes/No questions, select Yes
  if (labelText.includes('yes') || element.value.toLowerCase() === 'yes') {
    element.click();
  }
  // For agreement/terms radio buttons, select them
  else if (labelText.includes('agree') || labelText.includes('accept') || labelText.includes('confirm')) {
    element.click();
  }
}

async function handleCheckbox(element, labelText) {
  // For terms of service or agreement checkboxes, check them
  if (labelText.includes('agree') || labelText.includes('terms') || 
      labelText.includes('consent') || labelText.includes('privacy')) {
    if (!element.checked) {
      element.click();
    }
  }
  // For notification preferences, don't check by default
  else if (labelText.includes('notification') || labelText.includes('subscribe') || 
           labelText.includes('email') || labelText.includes('contact')) {
    // Leave as is
  }
  // For other checkboxes, check them if they seem important
  else if (!element.checked) {
    element.click();
  }
}

// New function specifically for numeric inputs
async function handleNumericInput(element, labelText, data) {
  if (element.value) return;

  const fullLabel = element.closest('label')?.textContent.trim() || 
                   document.querySelector(`label[for="${element.id}"]`)?.textContent.trim() || 
                   element.getAttribute('aria-label') || 
                   element.getAttribute('placeholder') || 
                   '';

  const labelLower = fullLabel.toLowerCase();
  
  // Enhanced salary field detection and handling
  const currentSalaryPatterns = [
    /current.+salary/i,
    /present.+salary/i,
    /current.+ctc/i,
    /present.+ctc/i,
    /current.+compensation/i,
    /current.+package/i,
    /salary.+drawing/i,
    /current.+annual/i
  ];

  const expectedSalaryPatterns = [
    /expected.+salary/i,
    /desired.+salary/i,
    /expected.+ctc/i,
    /expected.+compensation/i,
    /expected.+package/i,
    /salary.+expectation/i,
    /expected.+annual/i
  ];

  // Check for salary-related field
  if (labelLower.includes('salary') || labelLower.includes('ctc') || 
      labelLower.includes('compensation') || labelLower.includes('package') ||
      labelLower.includes('annual')) {
    
    // Check for current salary patterns
    if (currentSalaryPatterns.some(pattern => pattern.test(fullLabel))) {
      logToBackground('Content: Found current salary field:', fullLabel);
      await typeIntoField(element, data.currentSalary.toString(), true);
      return;
    }
    
    // Check for expected salary patterns
    if (expectedSalaryPatterns.some(pattern => pattern.test(fullLabel))) {
      logToBackground('Content: Found expected salary field:', fullLabel);
      await typeIntoField(element, data.expectedSalary.toString(), true);
      return;
    }

    // If it's a salary field but pattern doesn't match, use context to decide
    const formContext = element.closest('form')?.textContent.toLowerCase() || '';
    if (formContext.includes('current') || formContext.includes('present')) {
      await typeIntoField(element, data.currentSalary.toString(), true);
    } else if (formContext.includes('expected') || formContext.includes('desired')) {
      await typeIntoField(element, data.expectedSalary.toString(), true);
    } else {
      // If can't determine, use expected salary as default
      await typeIntoField(element, data.expectedSalary.toString(), true);
    }
    return;
  }

  // Enhanced experience field detection
  const experiencePatterns = [
    /total.+experience/i,
    /years?.+experience/i,
    /experience.+years?/i,
    /work.+experience/i,
    /professional.+experience/i,
    /(ml|ai|machine learning|artificial intelligence).+experience/i,
    /relevant.+experience/i,
    /overall.+experience/i
  ];

  // Check for experience-related field first
  if (experiencePatterns.some(pattern => pattern.test(fullLabel)) ||
      (labelLower.includes('experience') && 
       (labelLower.includes('year') || labelLower.includes('yr')))) {
    logToBackground('Content: Found experience field:', fullLabel);
    await typeIntoField(element, data.experience.toString(), true);
    return;
  }

  // Rest of existing handleNumericInput logic...
  if (labelText.includes('salary') || 
      labelText.includes('ctc') || 
      labelText.includes('compensation') || 
      labelText.includes('package') ||
      labelText.includes('pay')) {
    await typeIntoField(element, data.expectedSalary.toString(), true);
  }
  else if (labelText.includes('phone') || 
           labelText.includes('mobile') || 
           labelText.includes('contact')) {
    await typeIntoField(element, CONFIG.DEFAULT_VALUES.phone, true);
  }
  else if (labelText.includes('zip') || 
           labelText.includes('postal') || 
           labelText.includes('pincode')) {
    await typeIntoField(element, CONFIG.DEFAULT_VALUES.zipCode, true);
  }
  else {
    const expKeywords = ['exp', 'year', 'duration', 'period'];
    const salaryKeywords = ['income', 'annual', 'monthly', 'expected', 'current'];
    
    if (expKeywords.some(keyword => labelText.includes(keyword))) {
      await typeIntoField(element, data.experience.toString(), true);
    }
    else if (salaryKeywords.some(keyword => labelText.includes(keyword))) {
      await typeIntoField(element, data.expectedSalary.toString(), true);
    }
    else {
      // Default to 1 for any unrecognized experience questions
      // This is more reasonable than 0 for most cases
      await typeIntoField(element, "1", true);
    }
  }
}

// Modified function for text inputs (no numeric checks needed)
async function handleTextInput(element, labelText, data) {
  // Skip if the field already has a value
  if (element.value) return;
  
  // Check for common text field types
  if (labelText.includes('first name') || labelText.includes('firstname')) {
    await typeIntoField(element, "John");
  }
  else {
    // Default to "Yes" for any other text field
    await typeIntoField(element, "Yes");
  }
}

// Updated typeIntoField to ensure numeric values are properly handled
async function typeIntoField(target, text, isNumeric = false) {
  try {
    // If target is a string selector, get the element
    const element = typeof target === 'string' ? 
      await waitForElement(target) : target;
    
    logToBackground(`Content: Typing into ${isNumeric ? 'numeric' : 'text'} field:`, text);
    
    // Clear the field first
    element.focus();
    element.value = '';
    
    if (isNumeric) {
      // Preserve the exact numeric value provided
      element.value = text;
    } else {
      // For text fields
      element.value = text;
    }
    
    // Dispatch events
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    
    await new Promise(r => setTimeout(r, 500));
  } catch (error) {
    logToBackground('Content: Error typing into field:', error);
    throw error;
  }
}

async function goToNextPage(pageIndex) {
  const nextButton = document.querySelector(`button[aria-label="Page ${pageIndex}"]`);
  if (!nextButton) return false;
  
  await nextButton.click();
  await new Promise(r => setTimeout(r, 3000));
  return true;
}

async function waitForAnyElement(selectors, timeout = 30000) {
  logToBackground('Content: Waiting for any element:', selectors);
  const start = Date.now();

  while (Date.now() - start < timeout) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        logToBackground('Content: Found element:', selector);
        return element;
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`None of the elements ${selectors.join(', ')} found within ${timeout}ms`);
}

async function waitForElement(selector, timeout = 30000) {
  logToBackground(`Content: Waiting for element: ${selector}`);
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const element = typeof selector === 'string' ? 
      document.querySelector(selector) : selector;
    
    if (element && element.offsetParent !== null) { // Check if element is visible
      logToBackground(`Content: Found element: ${selector}`);
      // Add a small delay to ensure the element is interactive
      await new Promise(r => setTimeout(r, 1000));
      return element;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Element "${selector}" not found or not visible within ${timeout}ms`);
}

async function clearField(element) {
  element.focus();
  element.value = '';
  element.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
}

// async function typeSlowly(element, text) {
//   for (const char of text) {
//     element.value += char;
//     element.dispatchEvent(new Event('input', { bubbles: true }));
//     await new Promise(r => setTimeout(r, 100));
//   }
//   element.dispatchEvent(new Event('change', { bubbles: true }));
//   await new Promise(r => setTimeout(r, 500));
// }

async function simulateEnterKey(element) {
  const events = [
    new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
    new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
    new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
    new Event('input', { bubbles: true }),
    new Event('change', { bubbles: true })
  ];

  for (const event of events) {
    element.dispatchEvent(event);
    await new Promise(r => setTimeout(r, 100));
  }
}

async function getJobCards() {
  const selectors = [
    '.job-card-container',
    '.jobs-search-results__list-item',
    'li[data-occludable-job-id]',
    '.scaffold-layout__list-item'
  ];
  
  for (const selector of selectors) {
    const cards = Array.from(document.querySelectorAll(selector));
    if (cards.length > 0) {
      // Only return visible and non-applied cards
      const visibleCards = cards.filter(card => {
        const isVisible = card.offsetParent !== null;
        const isApplied = card.querySelector('.jobs-applied-badge') !== null;
        return isVisible && !isApplied;
      });
      return visibleCards;
    }
  }
  
  throw new Error('No job cards found');
}

async function findShowResultsButton() {
  try {
    logToBackground('Content: Looking for show results button');
    
    // First try the most specific selector that matches the example
    const specificSelectors = [
      'button[aria-label^="Apply current filter to show"][aria-live="polite"]',
      'button.artdeco-button--2.artdeco-button--primary.ml2[type="button"]'
    ];

    // Try to find the button using specific selectors first
    for (const selector of specificSelectors) {
      const button = document.querySelector(selector);
      if (button && 
          button.offsetParent !== null && 
          button.querySelector('.artdeco-button__text')?.textContent.trim().toLowerCase().includes('show')) {
        logToBackground('Content: Found show results button by selector');
        return button;
      }
    }

    // If not found, try finding by aria-label pattern
    const allButtons = Array.from(document.querySelectorAll('button.artdeco-button--primary'));
    const resultButton = allButtons.find(button => {
      const ariaLabel = button.getAttribute('aria-label') || '';
      const buttonText = button.textContent.trim().toLowerCase();
      const hasShowResults = buttonText.includes('show') && buttonText.includes('results');
      const hasCorrectAriaLabel = ariaLabel.toLowerCase().includes('apply current filter to show');
      
      return (hasShowResults || hasCorrectAriaLabel) && button.offsetParent !== null;
    });

    if (resultButton) {
      logToBackground('Content: Found show results button by text content');
      return resultButton;
    }

    logToBackground('Content: Show results button not found');
    return null;
  } catch (error) {
    logToBackground('Content: Error finding show results button:', error);
    return null;
  }
}

async function handlePostSubmitDialog() {
  try {
    // Wait for the post-submit dialog to appear
    const dialog = await waitForElement('[data-test-modal][role="dialog"][aria-labelledby="post-apply-modal"]');
    if (!dialog) {
      logToBackground('Content: Post-submit dialog not found');
      return;
    }

    // Wait a moment for animations
    await new Promise(r => setTimeout(r, 100));

    // Try to click the "Done" button first
    const doneButton = dialog.querySelector('.artdeco-modal__actionbar button.artdeco-button--primary');
    if (doneButton) {
      logToBackground('Content: Clicking Done button');
      await doneButton.click();
      await new Promise(r => setTimeout(r, 100));
      return;
    }

    // If Done button not found, try the dismiss (X) button
    const dismissButton = dialog.querySelector('button[data-test-modal-close-btn]');
    if (dismissButton) {
      logToBackground('Content: Clicking dismiss button');
      await dismissButton.click();
      await new Promise(r => setTimeout(r, 100));
      return;
    }

    logToBackground('Content: No clickable buttons found in post-submit dialog');
  } catch (error) {
    logToBackground('Content: Error handling post-submit dialog:', error);
  }
}
