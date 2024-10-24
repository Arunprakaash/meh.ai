import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';
let model;
let modelLoading;
let languageModelSession;

// Ensure service worker stays active
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.tabs.onActivated.addListener(({ tabId }) => extractPageContent(tabId));
chrome.tabs.onUpdated.addListener(async (tabId) => extractPageContent(tabId));

async function extractPageContent(tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url.startsWith('http')) return;

    const injection = await chrome.scripting.executeScript({
        target: { tabId },
        files: ['src/scripts/extract_content.js']
    });
    chrome.storage.session.set({ pageContent: injection[0].result });
}

async function initializeEmbeddingModel() {
    if (model) return model;
    if (modelLoading) return modelLoading;

    modelLoading = (async () => {
        await tf.ready();
        const backends = ['webgl', 'wasm', 'cpu'];
        for (const backend of backends) {
            try {
                await tf.setBackend(backend);
                console.log(`Using ${backend.toUpperCase()} backend`);
                break;
            } catch (e) {
                console.warn(`Failed to set ${backend} backend`, e);
            }
        }

        try {
            model = await use.load({ 'modelUrl': 'indexeddb://use-model' });
            console.log('Loaded Universal Sentence Encoder model from cache');
        } catch (e) {
            console.log('Model not found in cache, loading from source...');
            model = await use.load();
            await model.model.save('indexeddb://use-model');
            console.log('Universal Sentence Encoder model loaded and cached');
        }

        return model;
    })();

    return modelLoading;
}

async function getEmbeddings(sentences) {
    const model = await initializeEmbeddingModel();
    return await model.embed(sentences);
}

async function initializeLanguageModel() {
    if (!languageModelSession) {
        languageModelSession = await ai.languageModel.create({
        });
    }
    languageModelSession = await languageModelSession.clone();
    return languageModelSession;
}

async function handleStreamingResponse(prompt, port) {
    try {
        const session = await initializeLanguageModel();
        const stream = session.promptStreaming(prompt);

        let previousLength = 0;

        for await (const chunk of stream) {
            const newContent = chunk.slice(previousLength);
            previousLength = chunk.length;

            // Check if port is still connected before sending
            if (port) {
                try {
                    port.postMessage({
                        type: 'chunk',
                        content: newContent
                    });
                } catch (e) {
                    console.error('Port disconnected:', e);
                    break;
                }
            } else {
                break;
            }
        }

        if (port) {
            port.postMessage({ type: 'done' });
        }
    } catch (error) {
        console.error('Error in language model:', error);
        if (port) {
            port.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }
}

// Initialize both models when service worker starts
Promise.all([initializeEmbeddingModel(), initializeLanguageModel()]).catch(console.error);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getEmbeddings') {
        getEmbeddings(request.text).then(async embeddings => {
            sendResponse({ embeddings: Array.from(await embeddings.array()) });
        });
        return true;
    }

    // Fallback for streaming if connection fails
    if (request.action === 'streamingFallback') {
        handleStreamingResponse(request.prompt, {
            postMessage: (msg) => {
                try {
                    sendResponse(msg);
                } catch (e) {
                    console.error('Failed to send response:', e);
                }
            }
        });
        return true;
    }
});

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'streamingResponse') {
        port.onMessage.addListener((request) => {
            if (request.action === 'startStreaming') {
                handleStreamingResponse(request.prompt, port);
            }
        });

        port.onDisconnect.addListener(() => {
            console.log('Port disconnected');
        });
    }
});