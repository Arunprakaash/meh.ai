chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(console.error);

chrome.tabs.onActivated.addListener(({ tabId }) => extractPageContent(tabId));
chrome.tabs.onUpdated.addListener((tabId) => extractPageContent(tabId));

async function extractPageContent(tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url.startsWith('http')) return;

    const [injection] = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/scripts/extract_content.js']
    });
    console.log(injection.result);
    chrome.storage.session.set({ pageContent: injection.result });
}