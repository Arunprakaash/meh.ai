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

        const session = await ai.languageModel.create();
        const response = await session.prompt(prompt);

        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('chat-message', 'bot');
        chatMessages.appendChild(botMessageElement);

        let displayedResponse = '';
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
            displayedResponse += words[i] + ' ';
            botMessageElement.innerHTML = marked(displayedResponse);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            await new Promise(resolve => setTimeout(resolve, 10));
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