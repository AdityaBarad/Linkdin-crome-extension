const Logger = {
  logQueue: [],
  lastLogTime: 0,
  THROTTLE_MS: 500,

  init() {
    if (!document.getElementById('extension-logs')) {
      const logsDiv = document.createElement('div');
      logsDiv.id = 'extension-logs';
      logsDiv.style.cssText = `
        position: fixed;
        bottom: 0;
        right: 0;
        width: 300px;
        height: 200px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        overflow-y: auto;
        z-index: 9999;
      `;
      document.body.appendChild(logsDiv);
    }
  },

  log(...args) {
    const now = Date.now();
    // Throttle frequent logs
    if (now - this.lastLogTime < this.THROTTLE_MS) {
      return;
    }
    this.lastLogTime = now;

    // Filter out noisy logs
    const message = args.join(' ');
    if (message.includes('Processing field') || 
        message.includes('Received log request') ||
        message.includes('keepAlive')) {
      return;
    }

    const logsDiv = document.getElementById('extension-logs');
    if (logsDiv) {
      const logEntry = document.createElement('div');
      logEntry.textContent = `${args.join(' ')}`;
      logsDiv.appendChild(logEntry);
      logsDiv.scrollTop = logsDiv.scrollHeight;

      // Keep only last 100 log entries
      while (logsDiv.children.length > 100) {
        logsDiv.removeChild(logsDiv.firstChild);
      }
    }
    console.log(...args);
  },

  clear() {
    const logsDiv = document.getElementById('extension-logs');
    if (logsDiv) {
      logsDiv.innerHTML = '';
    }
  }
};

// Export for both Chrome extension and web contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
} else if (typeof window !== 'undefined') {
  window.Logger = Logger;
}
