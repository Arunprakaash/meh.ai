import { EmbeddingIndex } from 'client-vector-search';

async function getEmbeddings(chunks) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getEmbeddings', text: chunks }, response => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response.embeddings);
            }
        });
    });
}

async function createIndex(items) {
    try {
        const embeddings = await getEmbeddings(items);
        const data = items.map((chunk, index) => ({
            id: index,
            name: chunk,
            embedding: embeddings[index]
        }));

        return new EmbeddingIndex(data);
    } catch (error) {
        console.error('Error in createIndex:', error);
        throw error;
    }
}

async function searchIndex(index, query, topK = 3) {
    const queryEmbedding = await getEmbeddings(query);
    const results = await index.search(queryEmbedding[0], { topK: topK });
    return results;
}

export { createIndex, searchIndex };
