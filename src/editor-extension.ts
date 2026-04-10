import {
	RangeSetBuilder,
	StateField,
	StateEffect,
	type Extension,
} from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
} from "@codemirror/view";

export const updateBlacklistEffect = StateEffect.define<string[]>();

export const hiddenTextField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},

	update(decorations, tr) {
		for (const effect of tr.effects) {
			if (effect.is(updateBlacklistEffect)) {
				return buildDecorations(tr.state.doc, effect.value);
			}
		}
		if (tr.docChanged) {
			// Re-read blacklist from the last known value stored via facet
			// We rebuild from scratch on doc change using the current words
			const words = getWordsFromDecorations(decorations, tr.state.doc);
			if (words) {
				return buildDecorations(tr.state.doc, words);
			}
		}
		return decorations;
	},

	provide(field: StateField<DecorationSet>): Extension {
		return EditorView.decorations.from(field);
	},
});

// Store current words alongside decorations for rebuild on doc change
let currentWords: string[] = [];

function getWordsFromDecorations(
	_deco: DecorationSet,
	_doc: unknown
): string[] | null {
	return currentWords.length > 0 ? currentWords : null;
}

function buildDecorations(
	doc: { length: number; lineAt(pos: number): { number: number; from: number; to: number; text: string }; lines: number; line(n: number): { from: number; to: number; text: string } },
	words: string[]
): DecorationSet {
	currentWords = words;

	if (words.length === 0) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();
	const lowerWords = words.map((w) => w.toLowerCase());

	// Process by paragraphs (groups of non-empty lines)
	let lineNum = 1;
	while (lineNum <= doc.lines) {
		const line = doc.line(lineNum);

		// Skip empty lines
		if (line.text.trim() === "") {
			lineNum++;
			continue;
		}

		// Collect paragraph lines (consecutive non-empty lines)
		const paraStart = line.from;
		let paraEnd = line.to;
		let paraText = line.text;
		let endLineNum = lineNum;

		while (endLineNum + 1 <= doc.lines) {
			const nextLine = doc.line(endLineNum + 1);
			if (nextLine.text.trim() === "") break;
			paraText += "\n" + nextLine.text;
			paraEnd = nextLine.to;
			endLineNum++;
		}

		// Check if paragraph contains any blacklisted word
		const lowerPara = paraText.toLowerCase();
		const shouldHide = lowerWords.some((w) => lowerPara.includes(w));

		if (shouldHide) {
			builder.add(
				paraStart,
				paraEnd,
				Decoration.replace({})
			);
		}

		lineNum = endLineNum + 1;
	}

	return builder.finish();
}
