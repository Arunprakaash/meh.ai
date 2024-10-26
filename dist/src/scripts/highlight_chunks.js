class TextChunkHighlighter {
    constructor() {
        this.highlightClass = 'ai-highlight';
        this.highlightBackgroundColor = '#F3973A';
        this.highlightColor = '#370E00';
        this.currentHighlights = [];
    }

    clearPreviousHighlights() {
        const highlights = document.querySelectorAll(`.${this.highlightClass}`);
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
        this.currentHighlights = [];
    }

    highlightChunk(chunk) {
        if (!chunk) return;

        if (chunk.metadata && Array.isArray(chunk.metadata)) {
            chunk.metadata.forEach(metadataItem => {
                this.highlightMetadataContent(metadataItem);
            });
        }
        else if (chunk.metadata && chunk.metadata.content) {
            this.highlightMetadataContent(chunk.metadata);
        }
        else if (chunk.name) {
            this.highlightText(chunk.name);
        }

        this.scrollToFirstHighlight();
    }

    highlightMetadataContent(metadata) {
        if (!metadata) return;

        if (metadata.content) {
            this.highlightText(metadata.content);
        }

        if (metadata.children && Array.isArray(metadata.children)) {
            metadata.children.forEach(child => {
                this.highlightMetadataContent(child);
            });
        }
    }

    highlightText(text) {
        if (!text || typeof text !== 'string') return;

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    const parent = node.parentElement;
                    if (parent && (
                        parent.tagName === 'SCRIPT' ||
                        parent.tagName === 'STYLE' ||
                        parent.classList.contains('ai-highlight')
                    )) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodesToHighlight = [];
        let currentNode;

        while (currentNode = walker.nextNode()) {
            if (currentNode.textContent.includes(text)) {
                nodesToHighlight.push(currentNode);
            }
        }

        nodesToHighlight.forEach(node => {
            const span = document.createElement('span');
            span.className = this.highlightClass;
            span.style.backgroundColor = this.highlightBackgroundColor;
            span.style.color = this.highlightColor;

            const regex = new RegExp(this.escapeRegExp(text), 'gi');
            const parts = node.textContent.split(regex);

            if (parts.length > 1) {
                const fragment = document.createDocumentFragment();

                for (let i = 0; i < parts.length; i++) {
                    fragment.appendChild(document.createTextNode(parts[i]));

                    if (i < parts.length - 1) {
                        const highlightSpan = span.cloneNode();
                        highlightSpan.textContent = text;
                        fragment.appendChild(highlightSpan);
                        this.currentHighlights.push(highlightSpan);
                    }
                }

                node.parentNode.replaceChild(fragment, node);
            }
        });
    }

    scrollToFirstHighlight() {
        setTimeout(() => {
            if (this.currentHighlights.length > 0) {
                const firstHighlight = this.currentHighlights[0];
                firstHighlight.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center'
                });
            }
        }, 100);
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

const highlighter = new TextChunkHighlighter();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'highlight') {
        highlighter.clearPreviousHighlights();
        if (message.chunks) {
            highlighter.highlightChunk(message.chunks);
        }
        sendResponse({ success: true });
    }
    return true;
});
