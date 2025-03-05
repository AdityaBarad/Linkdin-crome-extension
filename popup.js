let isAutomationRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  // Initialize logger
  Logger.init();
  Logger.log('Popup initialized');

  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  const progress = document.getElementById('progress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  startButton.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent default button behavior
    Logger.log('Start button clicked');
    
    const formData = {
      keywords: document.getElementById('keywords').value,
      location: document.getElementById('location').value,
      datePosted: document.getElementById('datePosted').value,
      workplaceType: document.getElementById('workplaceType').value, // Changed to single value
      experience: document.getElementById('experience').value || "0",
      currentSalary: document.getElementById('currentSalary').value || "0",
      expectedSalary: document.getElementById('expectedSalary').value || "0",
      totalJobsToApply: document.getElementById('totalJobsToApply').value || "5"
    };

    try {
      startButton.disabled = true;
      Logger.log('Sending automation request');
      
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ 
          action: 'startAutomation', 
          data: formData 
        }, (response) => {
          if (chrome.runtime.lastError) {
            Logger.log('Error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            Logger.log('Response received:', response);
            resolve(response);
          }
        });
      });

      if (response && response.success) {
        progress.classList.remove('hidden');
        isAutomationRunning = true;
      } else {
        alert('Failed to start automation: ' + (response?.message || 'Unknown error'));
      }
    } catch (error) {
      Logger.log('Error:', error.message);
      alert('Error: ' + (error.message || 'Unknown error occurred'));
    } finally {
      startButton.disabled = false;
    }
  });

  stopButton.addEventListener('click', async () => {
    chrome.runtime.sendMessage({ action: 'stopAutomation' }, (response) => {
      if (response && response.success) {
        progress.classList.add('hidden');
        isAutomationRunning = false;
      } else {
        alert('Failed to stop automation');
      }
    });
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateProgress' && isAutomationRunning) {
      const percent = (request.total / document.getElementById('totalJobsToApply').value) * 100;
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `Applied: ${request.total} jobs`;
    }
    sendResponse({ received: true });
    return false;
  });
});