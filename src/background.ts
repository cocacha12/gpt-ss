chrome.commands.onCommand.addListener((command) => {
  if (command === 'take_screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'takeScreenshot' });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'screenshotTaken') {
    chrome.runtime.sendMessage({ action: 'screenshotTaken', screenshot: request.screenshot });
  }
});