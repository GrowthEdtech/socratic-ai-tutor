import { generateSocraticResponse } from './engine.js';

console.log('Socratic AI Tutor Service Worker v1.1.0 starting...');

/**
 * Configure Extension Side Panel 
 */
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('SidePanel behavior error:', error));

chrome.runtime.onInstalled.addListener(() => {
    console.log('Socratic AI Tutor installed/updated.');
    chrome.storage.local.set({
        preferredLevel: 'University',
        dailyEnergy: 50
    });
});

/**
 * Handle communications
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SOCRATIC_QUERY') {
        console.log('Received query:', request.payload.text);
        handleQuery(request.payload, sendResponse);
        return true;
    }
    if (request.type === 'SCREENSHOT_CAPTURE') {
        handleCapture(sendResponse);
        return true;
    }
});

async function handleCapture(sendResponse) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        sendResponse({ success: true, dataUrl });
    } catch (error) {
        console.error('Capture error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function handleQuery(payload, sendResponse) {
    try {
        const { text, context } = payload;
        const response = await generateSocraticResponse(text, context);
        sendResponse({ success: true, data: response });
    } catch (error) {
        console.error('Error in handleQuery:', error);
        sendResponse({ success: false, error: error.message });
    }
}
