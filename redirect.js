document.addEventListener('DOMContentLoaded', () => {
  const status = document.getElementById('status');
  const button = document.querySelector('.button');
  
  // Check for auth status from storage
  chrome.storage.local.get(['authToken'], (result) => {
    if (result.authToken) {
      status.textContent = '✅ Logged in';
      status.style.color = 'green';
      button.textContent = 'Open Dashboard';
    } else {
      status.textContent = '❌ Not logged in';
      status.style.color = 'red';
      button.textContent = 'Login';
    }
  });
});
