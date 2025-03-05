document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const button = document.querySelector('.button');
  
  // Function to update UI
  function updateUI(isLoggedIn) {
    if (isLoggedIn) {
      status.textContent = '✅ Logged in';
      status.style.color = 'green';
      button.textContent = 'Open Dashboard';
    } else {
      status.textContent = '❌ Not logged in';
      status.style.color = 'red';
      button.textContent = 'Login';
    }
  }

  // Check if we're in Chrome extension context and have storage permission
  if (chrome?.runtime?.id) {
    try {
      chrome.storage.local.get(['authToken'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
          status.textContent = '⚠️ Storage error';
          status.style.color = 'orange';
          return;
        }
        updateUI(!!result.authToken);
      });
    } catch (error) {
      console.error('Error accessing storage:', error);
      status.textContent = '⚠️ Storage access error';
      status.style.color = 'orange';
    }
  } else {
    status.textContent = '⚠️ Not in extension context';
    status.style.color = 'orange';
    console.warn('Not running in Chrome extension context');
  }

  // Add click handler for the button
  button.addEventListener('click', () => {
    const url = 'http://localhost:5173';
    chrome.tabs.create({ url });
  });
});
