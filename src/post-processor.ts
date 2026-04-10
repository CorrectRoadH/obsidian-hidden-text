const BLOCK_SELECTORS = "p, li, h1, h2, h3, h4, h5, h6, blockquote, tr";

export function createPostProcessor(getWords: () => string[], isEnabled: () => boolean) {
	return (element: HTMLElement): void => {
		if (!isEnabled()) return;

		const words = getWords();
		if (words.length === 0) return;

		const lowerWords = words.map((w) => w.toLowerCase());
		const blocks = element.querySelectorAll(BLOCK_SELECTORS);

		for (const block of Array.from(blocks)) {
			const text = (block.textContent || "").toLowerCase();
			if (lowerWords.some((w) => text.includes(w))) {
				(block as HTMLElement).style.display = "none";
			}
		}
	};
}
