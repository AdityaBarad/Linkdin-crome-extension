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
    await searchJobs(data.keywords, data.location);
    
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
      await new Promise(r => setTimeout(r, 2000));
      return;
    }

    logToBackground('Content: Navigating to jobs page');
    window.location.href = 'https://www.linkedin.com/jobs/';
    await new Promise(r => setTimeout(r, 5000));

    // Wait for either the modern or legacy search box
    const searchBox = await waitForAnyElement([
      '[id^="jobs-search-box-keyword-id"]',
      '.jobs-search-box__text-input',
      '#global-nav-search'
    ], 30000);

    logToBackground('Content: Found search box:', searchBox.id);
    await new Promise(r => setTimeout(r, 2000));
  } catch (error) {
    logToBackground('Content: Navigation error:', error);
    throw error;
  }
}

async function searchJobs(keywords, location) {
  logToBackground('Content: Starting job search');
  try {
    // Try different possible selectors for search inputs
    const keywordSelectors = [
      '[id^="jobs-search-box-keyword-id"]',
      '.jobs-search-box__text-input[aria-label*="Search"]',
      '#global-nav-search',
      'input[aria-label*="Search job titles"]',
      'input[placeholder*="Search job titles"]'
    ];

    const locationSelectors = [
      '[id^="jobs-search-box-location-id"]',
      '.jobs-search-box__text-input[aria-label*="location"]',
      '[aria-label="Location"]',
      'input[aria-label*="City, state, or zip code"]',
      'input[placeholder*="Location"]'
    ];

    const keywordInput = await waitForAnyElement(keywordSelectors);
    const locationInput = await waitForAnyElement(locationSelectors);

    // Clear existing values
    await clearField(keywordInput);
    await clearField(locationInput);

    // Type with delay between characters
    await typeSlowly(keywordInput, keywords);
    await new Promise(r => setTimeout(r, 2000));
    
    await typeSlowly(locationInput, location);
    await new Promise(r => setTimeout(r, 2000));

    // Try multiple ways to trigger the search
    const searchTriggers = [
      // Try search button first
      async () => {
        const searchButton = document.querySelector('button[type="submit"], button.jobs-search-box__submit-button');
        if (searchButton) {
          await searchButton.click();
          return true;
        }
        return false;
      },
      // Try Enter key on location input
      async () => {
        locationInput.focus();
        await simulateEnterKey(locationInput);
        return true;
      }
    ];

    // Try each search trigger method until one works
    for (const trigger of searchTriggers) {
      await trigger();
      await new Promise(r => setTimeout(r, 3000));
    }

    // Updated selectors for job results list
    const resultSelectors = [
      '.jobs-search-results-list',
      '.scaffold-layout__list',
      '.jobs-search-results__list',
      '.jobs-search-two-pane__wrapper',
      '.jobs-search-results-list__wrapper',
      'ul.AuahQyTsyfRUuEwdQzwgDcZuzoJLURSsXfs',
      '.jobs-search__results-list'
    ];

    logToBackground('Content: Waiting for search results...');
    
    // Wait for job list and first job card
    const jobList = await waitForAnyElement(resultSelectors, 60000);
    await new Promise(r => setTimeout(r, 5000));

    // Try to find and click the Easy Apply filter
    logToBackground('Content: Looking for Easy Apply filter');
    const easyApplySelectors = [
      'button[aria-label="Easy Apply filter."]',
      '#searchFilter_applyWithLinkedin',
      'button.search-reusables__filter-pill-button',
      '.search-reusables__filter-binary-toggle button'
    ];

    const easyApplyButton = await waitForAnyElement(easyApplySelectors, 10000);
    if (easyApplyButton) {
      logToBackground('Content: Clicking Easy Apply filter');
      await easyApplyButton.click();
      await new Promise(r => setTimeout(r, 3000));
    } else {
      logToBackground('Content: Easy Apply filter not found');
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

    const hasJobCards = await waitForAnyElement(jobCardSelectors, 10000);
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
    const jobCards = await getJobCards();
    logToBackground(`Content: Found ${jobCards.length} job cards`);
    
    for (const jobCard of jobCards) {
      if (totalApplied >= data.totalJobsToApply) break;
      
      try {
        logToBackground('Content: Processing job card');
        await processJobCard(jobCard, data);
        totalApplied++;
        chrome.runtime.sendMessage({
          action: 'updateProgress',
          total: totalApplied
        });
      } catch (error) {
        logToBackground('Content: Error processing job card:', error);
        continue; // Continue with next job card if current one fails
      }
    }

    if (totalApplied < data.totalJobsToApply) {
      const hasNextPage = await goToNextPage(++pageIndex);
      if (!hasNextPage) {
        logToBackground('Content: No more pages available');
        break;
      }
      await new Promise(r => setTimeout(r, 3000)); // Wait for new page to load
    }
  }
}

async function processJobCard(jobCard, data) {
  try {
    // Wait for any existing job details panel to close
    await new Promise(r => setTimeout(r, 1000));

    // Find the clickable link or title within the job card
    const jobLink = await findClickableElement(jobCard);
    if (!jobLink) {
      throw new Error('No clickable element found in job card');
    }

    // Scroll into view smoothly
    await jobCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 1500));

    // Click the job title/link
    logToBackground('Content: Clicking job card');
    await jobLink.click();
    await new Promise(r => setTimeout(r, 2000));

    // Wait for job details panel with multiple selectors
    const detailsSelectors = [
      '.jobs-unified-top-card',
      '.jobs-search__job-details',
      '.jobs-details',
      '[data-job-id]',
      '.jobs-details__main-content'
    ];

    logToBackground('Content: Waiting for job details panel');
    const detailsPanel = await waitForAnyElement(detailsSelectors, 15000);
    if (!detailsPanel) {
      throw new Error('Job details panel not loaded');
    }

    // Wait for apply button with multiple selectors
    const applyButtonSelectors = [
      '.jobs-apply-button',
      'button[aria-label*="Apply"]',
      'button[aria-label*="Easy Apply"]',
      '.jobs-s-apply button'
    ];

    logToBackground('Content: Waiting for apply button');
    const applyButton = await waitForAnyElement(applyButtonSelectors, 8000);
    if (!applyButton) {
      throw new Error('No apply button found');
    }

    // Click apply button
    logToBackground('Content: Clicking apply button');
    await applyButton.click();
    await new Promise(r => setTimeout(r, 2000));

    // Wait for application modal
    const modalSelectors = [
      '.jobs-easy-apply-modal',
      '[aria-label*="Apply"]',
      '[role="dialog"]'
    ];

    const modal = await waitForAnyElement(modalSelectors, 10000);
    if (!modal) {
      throw new Error('Application modal not opened');
    }

    // Process the application form
    await processApplicationForm(data);

  } catch (error) {
    logToBackground('Content: Error in processJobCard:', error.message);
    throw error;
  }
}

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
      await new Promise(r => setTimeout(r, 2000));
      
      logToBackground('Content: Filling form fields');
      await fillFormFields(data);
      
      logToBackground('Content: Looking for next/submit button');
      isCompleted = await clickNextOrSubmit();
      
      attempts++;
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      logToBackground('Content: Form processing error:', error.message);
      break;
    }
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
  // Skip if the field already has a value
  if (element.value) return;

  // Get complete element information
  const fullLabel = element.closest('label')?.textContent.trim() || 
                   document.querySelector(`label[for="${element.id}"]`)?.textContent.trim() || 
                   element.getAttribute('aria-label') || 
                   element.getAttribute('placeholder') || 
                   '';

  const elementId = element.id || '';
  const elementClasses = element.className || '';
  const formGroup = element.closest('form-group, .form-group, .input-group')?.textContent || '';
  
  // Log the field details for debugging
  logToBackground('Content: Field details:', {
    fullLabel,
    elementId,
    elementClasses,
    formGroup
  });

  // Specific pattern for LinkedIn skill experience questions
  const isLinkedInSkillExperience = elementId.includes('formElement') && 
                                   fullLabel.toLowerCase().includes('how many years') &&
                                   fullLabel.toLowerCase().includes('experience');

  if (isLinkedInSkillExperience) {
    logToBackground('Content: Found LinkedIn skill experience field:', fullLabel);
    await typeIntoField(element, data.experience.toString(), true);
    return;
  }

  // General experience patterns
  const experiencePatterns = [
    /how many years.+experience/i,
    /years of.+experience/i,
    /experience.+in years/i,
    /total.+experience/i,
    /work experience/i
  ];

  const isExperienceField = experiencePatterns.some(pattern => 
    pattern.test(fullLabel) || pattern.test(formGroup)
  );

  if (isExperienceField) {
    logToBackground('Content: Found experience field:', fullLabel);
    await typeIntoField(element, data.experience.toString(), true);
    return;
  }

  // Rest of the existing numeric input handling
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
  else if (labelText.includes('last name') || labelText.includes('lastname')) {
    await typeIntoField(element, "Doe");
  }
  else if (labelText.includes('email')) {
    await typeIntoField(element, "example@example.com");
  }
  else if (labelText.includes('address')) {
    await typeIntoField(element, "123 Main St");
  }
  else if (labelText.includes('city')) {
    await typeIntoField(element, "New York");
  }
  else if (labelText.includes('state')) {
    await typeIntoField(element, "NY");
  }
  else if (labelText.includes('country')) {
    await typeIntoField(element, "United States");
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

async function clickNextOrSubmit() {
  const buttonSelectors = [
    'button[aria-label="Submit application"]',
    'button[aria-label="Continue to next step"]',
    'button.artdeco-button--primary',
    'button[type="submit"]',
    '.jobs-easy-apply-content button:not([aria-label="Dismiss"])'
  ];

  for (const selector of buttonSelectors) {
    const buttons = document.querySelectorAll(selector);
    for (const button of buttons) {
      if (button.offsetParent !== null && 
          !button.disabled && 
          !button.getAttribute('aria-label')?.includes('Dismiss')) {
        logToBackground('Content: Clicking button:', button.textContent.trim());
        await button.click();
        await new Promise(r => setTimeout(r, 2000));
        
        // Check form status
        const modalClosed = !document.querySelector('.jobs-easy-apply-modal');
        const hasError = document.querySelector('.artdeco-inline-feedback--error');
        
        if (modalClosed) {
          logToBackground('Content: Application submitted');
          return true;
        }
        if (hasError) {
          logToBackground('Content: Form has errors');
          throw new Error('Application form has errors');
        }
        return false;
      }
    }
  }

  return true; // If no buttons found, assume completed
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

async function typeSlowly(element, text) {
  for (const char of text) {
    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
  }
  element.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
}

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
      return cards.filter(card => card.offsetParent !== null); // Only return visible cards
    }
  }
  
  throw new Error('No job cards found');
}

