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

	for (let i = 1; i <= doc.lines; i++) {
		const line = doc.line(i);
		const lowerLine = line.text.toLowerCase();
		if (lowerWords.some((w) => lowerLine.includes(w))) {
			builder.add(line.from, line.to, Decoration.replace({}));
		}
	}

	return builder.finish();
}
