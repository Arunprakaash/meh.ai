import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 0,
});

export async function getChunks(content) {
    return await splitter.splitText(content);;
}
