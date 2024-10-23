import { marked } from 'marked';
import { getChunks } from '../scripts/splitter';
import { createIndex, searchIndex } from '../scripts/vector_store';

let pageContent = '';
let embeddingIndex = null;

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const loadingSpinner = document.getElementById('loadingSpinner');

function displayMessage(message, type = 'bot', clearPrevious = false) {
    if (clearPrevious) {
        chatMessages.innerHTML = '';
    }
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', type);
    messageElement.innerHTML = marked(message);
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setLoadingState(isLoading) {
    chatInput.disabled = isLoading;
    sendButton.disabled = isLoading;
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
    sendButton.querySelector('svg').style.display = isLoading ? 'none' : 'block';
}

async function tryConnectToWorker(prompt, botMessageElement) {
    return new Promise((resolve, reject) => {
        try {
            const port = chrome.runtime.connect({ name: 'streamingResponse' });
            let result = '';

            port.onMessage.addListener(function messageHandler(message) {
                switch (message.type) {
                    case 'chunk':
                        result += message.content;
                        botMessageElement.innerHTML = marked(result);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
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

            // Start streaming
            port.postMessage({
                action: 'startStreaming',
                prompt: prompt
            });
        } catch (error) {
            reject(error);
        }
    });
}

async function fallbackToMessagePassing(prompt, botMessageElement) {
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
                    botMessageElement.innerHTML = marked(result);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    // Keep listening for more messages
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
        displayMessage(!embeddingIndex ? "Sorry, the content hasn't been processed yet. Please wait a moment and try again." : "");
        return;
    }

    displayMessage(userMessage, 'user');
    chatInput.value = '';
    setLoadingState(true);

    try {
        const context = await searchIndex(embeddingIndex, userMessage, 2);
        const prompt = `You are an assistant for question-answering tasks. 
        Use the following pieces of retrieved context to answer the question. 
        If you don't know the answer, just say that you don't know. 
        Keep the answer concise.
        Question: ${userMessage}
        Context: ${context}
        Answer:`;

        // Create a new message element for the bot's response
        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('chat-message', 'bot');
        chatMessages.appendChild(botMessageElement);

        try {
            // Try connection-based streaming first
            await tryConnectToWorker(prompt, botMessageElement);
        } catch (connectionError) {
            console.log('Connection failed, falling back to message passing:', connectionError);
            // Fall back to message-based communication
            await fallbackToMessagePassing(prompt, botMessageElement);
        }

    } catch (error) {
        console.error('Error processing query:', error);
        displayMessage("I'm sorry, but I encountered an error while processing your query. Please try again.");
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

async function onContentChange(newContent) {
    if (pageContent === newContent || !newContent) {
        !newContent && displayMessage("There's no content to process.");
        return;
    }

    pageContent = newContent;
    setLoadingState(true);
    displayMessage('Processing content...', 'bot', true);

    try {
        const chunks = await getChunks(newContent);
        embeddingIndex = await createIndex(chunks);
        displayMessage("Content processed and indexed. You can now ask questions about the page.", 'bot', true);
    } catch (error) {
        console.error('Error processing content:', error);
        displayMessage("An error occurred while processing the content. Please try again.", 'bot', true);
    } finally {
        setLoadingState(false);
    }
}