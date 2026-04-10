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
			const words = currentWords.length > 0 ? currentWords : null;
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

let currentWords: string[] = [];

function getIndent(text: string): number {
	const match = text.match(/^(\s*)/);
	return match ? match[1].length : 0;
}

function buildDecorations(
	doc: { lines: number; line(n: number): { from: number; to: number; text: string } },
	words: string[]
): DecorationSet {
	currentWords = words;

	if (words.length === 0) {
		return Decoration.none;
	}

	const builder = new RangeSetBuilder<Decoration>();
	const lowerWords = words.map((w) => w.toLowerCase());

	let i = 1;
	while (i <= doc.lines) {
		const line = doc.line(i);
		const lowerLine = line.text.toLowerCase();

		if (lowerWords.some((w) => lowerLine.includes(w))) {
			const matchIndent = getIndent(line.text);
			let hideEnd = line.to;

			// Also hide child lines (greater indentation)
			let j = i + 1;
			while (j <= doc.lines) {
				const next = doc.line(j);
				if (next.text.trim() === "" || getIndent(next.text) > matchIndent) {
					hideEnd = next.to;
					j++;
				} else {
					break;
				}
			}

			builder.add(line.from, hideEnd, Decoration.replace({}));
			i = j;
		} else {
			i++;
		}
	}

	return builder.finish();
}
