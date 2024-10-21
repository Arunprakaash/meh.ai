import * as use from '@tensorflow-models/universal-sentence-encoder';
import * as tf from '@tensorflow/tfjs';
let model;
let modelLoading;

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

async function initializeModel() {
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
    const model = await initializeModel();
    return await model.embed(sentences);
}

initializeModel();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getEmbeddings') {
        getEmbeddings(request.text).then(async embeddings => {
            sendResponse({ embeddings: Array.from(await embeddings.array()) });
        });
        return true;
    }
});