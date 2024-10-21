async function getEmbeddingsForText(text) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            { action: 'getEmbeddings', text: text },
            (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response.embeddings);
                }
            }
        );
    });
}

async function handleGetEmbeddings() {
    const textInput = document.getElementById('textInput');
    const resultDiv = document.getElementById('result');
    const text = textInput.value.trim();

    if (!text) {
        resultDiv.textContent = 'Please enter some text.';
        return;
    }

    resultDiv.textContent = 'Getting embeddings...';

    try {
        const embeddings = await getEmbeddingsForText(text);
        resultDiv.textContent = 'Embeddings:\n' + JSON.stringify(embeddings, null, 2);
    } catch (error) {
        resultDiv.textContent = 'Error getting embeddings: ' + error.message;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('getEmbeddingsButton');
    button.addEventListener('click', handleGetEmbeddings);
});
