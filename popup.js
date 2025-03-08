let isAutomationRunning = false;

document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  const progress = document.getElementById('progress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const formSection = document.getElementById('formSection');
  const totalJobsSpan = document.getElementById('totalJobs');

  // Check if automation is running
  chrome.storage.local.get(['isAutomationRunning', 'totalJobsToApply', 'jobsApplied'], (result) => {
    if (result.isAutomationRunning) {
      formSection.classList.add('hidden');
      progress.classList.remove('hidden');
      totalJobsSpan.textContent = result.totalJobsToApply || '0';
      updateProgress(result.jobsApplied || 0, result.totalJobsToApply);
      
      // Make the popup compact for progress-only view
      document.body.classList.add('progress-only');
      
      // Resize the window to fit only the progress section
      chrome.runtime.sendMessage({ 
        action: 'resizePopup',
        width: 320,
        height: 300
      });
    }
  });

  function updateProgress(applied, total) {
    if (!total || total <= 0) return;
    
    const percent = Math.min(Math.round((applied / total) * 100), 100);
    progressBar.style.width = `${percent}%`;
    progressText.innerHTML = `
      Applied: <span class="font-semibold text-indigo-600">${applied}</span>
      <span class="mx-1">/</span>
      <span class="font-semibold text-gray-700">${total}</span> jobs
    `;
    
    // Update the display
    formSection.classList.add('hidden');
    progress.classList.remove('hidden');
    totalJobsSpan.textContent = total;
    
    // Make the popup compact when showing progress
    document.body.classList.add('progress-only');
    
    // Resize the window to fit only the progress section
    chrome.runtime.sendMessage({ 
      action: 'resizePopup',
      width: 320,
      height: 300
    });
  }

  startButton.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent default button behavior
    
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
      
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ 
          action: 'startAutomation', 
          data: formData 
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
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
    if (request.action === 'updateProgress') {
      const total = request.totalJobsToApply || 
                    document.getElementById('totalJobsToApply').value || 
                    '5';
      
      updateProgress(request.total, total);
      isAutomationRunning = true;
      
      // Acknowledge the message
      sendResponse({ received: true });
    }
    return true;
  });
});