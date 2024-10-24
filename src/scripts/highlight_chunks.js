class TextChunkHighlighter {
    constructor() {
        this.highlights = [];
    }

    // Clear previous highlights before highlighting new chunks
    clearPreviousHighlights() {
        this.removeHighlights();
    }

    // Find and highlight all occurrences of a text chunk
    highlightChunk(chunk) {
        if (!chunk || typeof chunk !== 'string') return;

        try {
            const textNodes = this.findTextNodes(document.body);
            const ranges = this.findTextInNodes(textNodes, chunk);

            ranges.forEach(range => {
                const highlightEl = document.createElement('mark');
                highlightEl.style.backgroundColor = 'yellow';
                highlightEl.style.color = 'black';
                highlightEl.dataset.chunk = chunk; // Add data attribute for tracking

                try {
                    range.surroundContents(highlightEl);
                    this.highlights.push(highlightEl);
                } catch (e) {
                    console.warn('Failed to highlight range:', e);
                }
            });
        } catch (e) {
            console.warn('Failed to process chunk:', e);
        }
    }

    // Find all text nodes in the document
    findTextNodes(rootNode) {
        const textNodes = [];
        const walk = document.createTreeWalker(
            rootNode,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (currentNode) => {
                    // Skip style, script, and chat interface content
                    const parent = currentNode.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;

                    if (parent.tagName === 'SCRIPT' ||
                        parent.tagName === 'STYLE' ||
                        parent.closest('#chatMessages') || // Skip chat interface
                        parent.closest('mark')) { // Skip already highlighted content
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let currentNode = walk.nextNode();
        while (currentNode) {
            textNodes.push(currentNode);
            currentNode = walk.nextNode();
        }
        return textNodes;
    }

    // Find ranges where the text chunk appears
    findTextInNodes(textNodes, searchText) {
        const ranges = [];
        const searchTextLower = searchText.toLowerCase().trim();

        if (!searchTextLower) return ranges;

        textNodes.forEach(node => {
            const nodeText = node.textContent;
            let pos = nodeText.toLowerCase().indexOf(searchTextLower);

            while (pos !== -1) {
                try {
                    const range = document.createRange();
                    range.setStart(node, pos);
                    range.setEnd(node, pos + searchText.length);
                    ranges.push(range);
                } catch (e) {
                    console.warn('Failed to create range:', e);
                }

                pos = nodeText.toLowerCase().indexOf(searchTextLower, pos + 1);
            }
        });

        return ranges;
    }

    // Remove all highlights
    removeHighlights() {
        this.highlights.forEach(highlight => {
            if (highlight && highlight.parentNode) {
                try {
                    highlight.parentNode.replaceChild(
                        document.createTextNode(highlight.textContent),
                        highlight
                    );
                } catch (e) {
                    console.warn('Failed to remove highlight:', e);
                }
            }
        });
        this.highlights = [];
    }
}

const highlighter = new TextChunkHighlighter();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'highlight') {
        highlighter.clearPreviousHighlights();
        message.chunks.forEach(chunk => highlighter.highlightChunk(chunk));
        sendResponse({ success: true });
    }
    return true;
});