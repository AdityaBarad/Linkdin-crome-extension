let logs = [];

function addLog(message, type = 'log') {
    const log = {
        timestamp: new Date().toISOString(),
        message: message,
        type: type
    };
    logs.push(log);
    displayLogs();
}

function displayLogs() {
    const logsDiv = document.getElementById('logs');
    logsDiv.innerHTML = logs.map(log => 
        `<div class="${log.type}">[${log.timestamp}] ${log.message}</div>`
    ).join('\n');
    logsDiv.scrollTop = logsDiv.scrollHeight;
}

// Listen for log messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'log') {
        addLog(message.data, 'info');
    } else if (message.action === 'error') {
        addLog(message.data, 'error');
    }
});
