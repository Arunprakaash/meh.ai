import { marked } from 'marked';
import { createIndex, searchIndex } from '../scripts/vector_store';

let pageContent = null;
let embeddingIndex = null;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const loadingSpinner = document.getElementById('loadingSpinner');

function createSourcesContainer(sources) {
    const sourcesContainer = document.createElement('div');
    sourcesContainer.classList.add('sources-container');

    const sourcesList = document.createElement('div');
    sourcesList.classList.add('sources-list');

    sources.forEach((source, index) => {
        const sourceButton = document.createElement('button');
        sourceButton.classList.add('source-button');
        sourceButton.textContent = index + 1;
        sourceButton.onclick = () => highlightSource(source);
        sourcesList.appendChild(sourceButton);
    });

    sourcesContainer.appendChild(sourcesList);
    return sourcesContainer;
}

function highlightSource(source) {
    console.log(source);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'highlight',
            chunks: source.object
        });
    });
}

function appendMessageElement(type = 'bot', clearPrevious = false) {
    if (clearPrevious) {
        chatMessages.innerHTML = '';
    }
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container');

    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', type);

    messageContainer.appendChild(messageElement);
    chatMessages.appendChild(messageContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return { container: messageContainer, message: messageElement };
}

function updateMessageContent(elements, content, sources = []) {
    const { container, message } = elements;
    message.innerHTML = marked(content);

    const existingSources = container.querySelector('.sources-container');
    if (existingSources) {
        container.removeChild(existingSources);
    }

    if (sources.length > 0) {
        const sourcesContainer = createSourcesContainer(sources);
        container.appendChild(sourcesContainer, message);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setLoadingState(isLoading) {
    chatInput.disabled = isLoading;
    sendButton.disabled = isLoading;
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
    sendButton.querySelector('svg').style.display = isLoading ? 'none' : 'block';
}

async function tryConnectToWorker(prompt, messageElements, context) {
    return new Promise((resolve, reject) => {
        try {
            const port = chrome.runtime.connect({ name: 'streamingResponse' });
            let result = '';

            port.onMessage.addListener(function messageHandler(message) {
                switch (message.type) {
                    case 'chunk':
                        result += message.content;
                        updateMessageContent(messageElements, result, context);
                        break;
                    case 'done':
                        port.disconnect();
                        resolve();
                        break;
                    case 'error':
                        port.disconnect();
                        reject(new Error(message.error));
                        break;
                }
            });

            port.onDisconnect.addListener(() => {
                console.log('Port disconnected');
            });

            port.postMessage({
                action: 'startStreaming',
                prompt: prompt
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function fallbackToMessagePassing(prompt, messageElements, context) {
    return new Promise((resolve, reject) => {
        let result = '';

        chrome.runtime.sendMessage({
            action: 'streamingFallback',
            prompt: prompt
        }, function messageHandler(message) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }

            switch (message.type) {
                case 'chunk':
                    result += message.content;
                    updateMessageContent(messageElements, result, context);
                    return true;
                case 'done':
                    resolve();
                    break;
                case 'error':
                    reject(new Error(message.error));
                    break;
            }
        });
    });
}

async function sendMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage || !embeddingIndex) {
        const errorMessage = !embeddingIndex
            ? "Sorry, the content hasn't been processed yet. Please wait a moment and try again."
            : "";
        const elements = appendMessageElement('bot');
        updateMessageContent(elements, errorMessage);
        return;
    }

    const userElements = appendMessageElement('user');
    updateMessageContent(userElements, userMessage);
    chatInput.value = '';
    setLoadingState(true);

    try {
        const results = await searchIndex(embeddingIndex, userMessage, 5);
        const prompt = `You are an assistant for question-answering tasks. 
Use the following pieces of retrieved context to answer the question. 
If you don't know the answer, just say that you don't know. 
keep the answer concise.

Question: ${userMessage}

Context: ${results.map(context => context.object.name).join('\n')}

Answer:`;

        const botElements = appendMessageElement('bot');

        try {
            await tryConnectToWorker(prompt, botElements, results);
        } catch (connectionError) {
            console.log('Connection failed, falling back to message passing:', connectionError);
            await fallbackToMessagePassing(prompt, botElements, results);
        }

    } catch (error) {
        console.error('Error processing query:', error);
        const errorElements = appendMessageElement('bot');
        updateMessageContent(errorElements, "I'm sorry, but I encountered an error while processing your query. Please try again.");
    } finally {
        setLoadingState(false);
    }
}

async function onContentChange(newContent) {
    if (pageContent === newContent?.content || !newContent) {
        if (!newContent) {
            const elements = appendMessageElement('bot', true);
            updateMessageContent(elements, "There's no content to process.");
        }
        return;
    }

    pageContent = newContent?.content;
    setLoadingState(true);
    const statusElements = appendMessageElement('bot', true);
    updateMessageContent(statusElements, 'Processing content...');

    try {
        embeddingIndex = await createIndex(newContent);
        updateMessageContent(statusElements, "Content processed and indexed. You can now ask questions about the page.");
    } catch (error) {
        console.error('Error processing content:', error);
        updateMessageContent(statusElements, "An error occurred while processing the content. Please try again.");
    } finally {
        setLoadingState(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') sendMessage();
    });
});

if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.session.get('pageContent', ({ pageContent: content }) => {
        onContentChange(content);
    });

    chrome.storage.session.onChanged.addListener(({ pageContent }) => {
        if (pageContent) onContentChange(pageContent.newValue);
    });
}