const BLOCK_SELECTORS = "p, li, h1, h2, h3, h4, h5, h6, blockquote, tr";

function getDirectText(el: HTMLElement): string {
	let text = "";
	for (const node of Array.from(el.childNodes)) {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent;
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			const tag = (node as HTMLElement).tagName.toLowerCase();
			// Include inline elements' text, skip nested block containers
			if (tag !== "ul" && tag !== "ol" && tag !== "li" && tag !== "div") {
				text += (node as HTMLElement).textContent;
			}
		}
	}
	return text;
}

export function createPostProcessor(getWords: () => string[], isEnabled: () => boolean) {
	return (element: HTMLElement): void => {
		if (!isEnabled()) return;

		const words = getWords();
		if (words.length === 0) return;

		const lowerWords = words.map((w) => w.toLowerCase());
		const blocks = element.querySelectorAll(BLOCK_SELECTORS);

		for (const block of Array.from(blocks)) {
			const text = getDirectText(block as HTMLElement).toLowerCase();
			if (lowerWords.some((w) => text.includes(w))) {
				// Hide only the direct content, preserve child lists
				for (const child of Array.from(block.childNodes)) {
					if (child.nodeType === Node.ELEMENT_NODE) {
						const tag = (child as HTMLElement).tagName.toLowerCase();
						if (tag === "ul" || tag === "ol") continue;
					}
					if (child.nodeType === Node.TEXT_NODE) {
						(child as Text).textContent = "";
					} else {
						(child as HTMLElement).style.display = "none";
					}
				}
			}
		}
	};
}
