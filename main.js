var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => HiddenTextPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  enabled: true,
  blacklistWords: []
};
var HiddenTextSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("Enable hidden text").setDesc("Toggle hiding of paragraphs containing blacklisted words.").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
        this.plugin.settings.enabled = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Blacklist words").setDesc("One word per line. Paragraphs containing any of these words will be hidden.").addTextArea((text) => {
      text.setPlaceholder("secret\nconfidential\nprivate").setValue(this.plugin.settings.blacklistWords.join("\n")).onChange(async (value) => {
        this.plugin.settings.blacklistWords = value.split("\n").map((w) => w.trim()).filter((w) => w.length > 0);
        await this.plugin.saveSettings();
      });
      text.inputEl.rows = 10;
      text.inputEl.cols = 30;
    });
  }
};

// src/editor-extension.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var updateBlacklistEffect = import_state.StateEffect.define();
var hiddenTextField = import_state.StateField.define({
  create() {
    return import_view.Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(updateBlacklistEffect)) {
        return buildDecorations(tr.state.doc, effect.value);
      }
    }
    if (tr.docChanged) {
      const words = getWordsFromDecorations(decorations, tr.state.doc);
      if (words) {
        return buildDecorations(tr.state.doc, words);
      }
    }
    return decorations;
  },
  provide(field) {
    return import_view.EditorView.decorations.from(field);
  }
});
var currentWords = [];
function getWordsFromDecorations(_deco, _doc) {
  return currentWords.length > 0 ? currentWords : null;
}
function buildDecorations(doc, words) {
  currentWords = words;
  if (words.length === 0) {
    return import_view.Decoration.none;
  }
  const builder = new import_state.RangeSetBuilder();
  const lowerWords = words.map((w) => w.toLowerCase());
  let lineNum = 1;
  while (lineNum <= doc.lines) {
    const line = doc.line(lineNum);
    if (line.text.trim() === "") {
      lineNum++;
      continue;
    }
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
    const lowerPara = paraText.toLowerCase();
    const shouldHide = lowerWords.some((w) => lowerPara.includes(w));
    if (shouldHide) {
      builder.add(
        paraStart,
        paraEnd,
        import_view.Decoration.replace({})
      );
    }
    lineNum = endLineNum + 1;
  }
  return builder.finish();
}

// src/post-processor.ts
var BLOCK_SELECTORS = "p, li, h1, h2, h3, h4, h5, h6, blockquote, tr";
function createPostProcessor(getWords, isEnabled) {
  return (element) => {
    if (!isEnabled()) return;
    const words = getWords();
    if (words.length === 0) return;
    const lowerWords = words.map((w) => w.toLowerCase());
    const blocks = element.querySelectorAll(BLOCK_SELECTORS);
    for (const block of Array.from(blocks)) {
      const text = (block.textContent || "").toLowerCase();
      if (lowerWords.some((w) => text.includes(w))) {
        block.style.display = "none";
      }
    }
  };
}

// src/main.ts
var HiddenTextPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new HiddenTextSettingTab(this.app, this));
    this.registerEditorExtension([hiddenTextField]);
    this.registerMarkdownPostProcessor(
      createPostProcessor(
        () => this.settings.blacklistWords,
        () => this.settings.enabled
      )
    );
    this.addCommand({
      id: "toggle-hidden-text",
      name: "Toggle hidden text",
      callback: async () => {
        this.settings.enabled = !this.settings.enabled;
        await this.saveSettings();
        new import_obsidian2.Notice(
          `Hidden Text: ${this.settings.enabled ? "ON" : "OFF"}`
        );
      }
    });
    this.app.workspace.onLayoutReady(() => {
      this.refreshEditors();
    });
  }
  async loadSettings() {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshEditors();
  }
  refreshEditors() {
    const words = this.settings.enabled ? this.settings.blacklistWords : [];
    this.app.workspace.iterateAllLeaves((leaf) => {
      var _a, _b;
      const view = (_b = (_a = leaf.view) == null ? void 0 : _a.editor) == null ? void 0 : _b.cm;
      if (view) {
        view.dispatch({
          effects: updateBlacklistEffect.of(words)
        });
      }
    });
  }
};
