import { isProbablyReaderable, Readability } from '@mozilla/readability';

function canBeParsed(document) {
    return isProbablyReaderable(document, { minContentLength: 100 });
}

function cleanNode(node) {
    const scriptsAndStyles = node.querySelectorAll('script, style');
    scriptsAndStyles.forEach(el => el.remove());
}

function processNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const fullContent = node.textContent.trim();
    const children = [];

    node.childNodes.forEach(child => {
        const processedChild = processNode(child);
        if (processedChild) children.push(processedChild);
    });

    if (fullContent || children.length) {
        return {
            tag: node.tagName.toLowerCase(),
            content: fullContent || undefined,
            ...(children.length > 0 && { children })
        };
    }
    return null;
}

function extractWithTags(document) {
    if (!canBeParsed(document)) return false;

    const documentClone = document.cloneNode(true);
    cleanNode(documentClone);

    const article = new Readability(documentClone, { keepClasses: true }).parse();
    const container = document.createElement('div');
    container.innerHTML = article.content;

    const processedNodes = Array.from(container.childNodes)
        .map(processNode)
        .filter(Boolean);

    return processedNodes.length ? processedNodes[0].children[0] : [];
}

extractWithTags(window.document);
