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
    new import_obsidian.Setting(containerEl).setName("Blacklist file").setDesc(
      "Blacklist words are stored in .hidden-text-blacklist.md at the vault root. Edit that file directly (one word per line). Changes sync across devices."
    );
    new import_obsidian.Setting(containerEl).setName("Edit blacklist").setDesc("Open the blacklist file for editing.").addButton(
      (btn) => btn.setButtonText("Open").onClick(async () => {
        const file = this.app.vault.getAbstractFileByPath(
          ".hidden-text-blacklist.md"
        );
        if (file) {
          await this.app.workspace.openLinkText(file.path, "", false);
        } else {
          await this.plugin.saveSettings();
          const created = this.app.vault.getAbstractFileByPath(
            ".hidden-text-blacklist.md"
          );
          if (created) {
            await this.app.workspace.openLinkText(created.path, "", false);
          }
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Quick edit").setDesc("Or edit here directly. One word per line.").addTextArea((text) => {
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
      const words = currentWords.length > 0 ? currentWords : null;
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
function getIndent(text) {
  const match = text.match(/^(\s*)/);
  return match ? match[1].length : 0;
}
function buildDecorations(doc, words) {
  currentWords = words;
  if (words.length === 0) {
    return import_view.Decoration.none;
  }
  const builder = new import_state.RangeSetBuilder();
  const lowerWords = words.map((w) => w.toLowerCase());
  let i = 1;
  while (i <= doc.lines) {
    const line = doc.line(i);
    const lowerLine = line.text.toLowerCase();
    if (lowerWords.some((w) => lowerLine.includes(w))) {
      const matchIndent = getIndent(line.text);
      let hideEnd = line.to;
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
      builder.add(line.from, hideEnd, import_view.Decoration.replace({}));
      i = j;
    } else {
      i++;
    }
  }
  return builder.finish();
}

// src/post-processor.ts
var BLOCK_SELECTORS = "p, li, h1, h2, h3, h4, h5, h6, blockquote, tr";
function getDirectText(el) {
  let text = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag !== "ul" && tag !== "ol" && tag !== "li" && tag !== "div") {
        text += node.textContent;
      }
    }
  }
  return text;
}
function createPostProcessor(getWords, isEnabled) {
  return (element) => {
    if (!isEnabled()) return;
    const words = getWords();
    if (words.length === 0) return;
    const lowerWords = words.map((w) => w.toLowerCase());
    const blocks = element.querySelectorAll(BLOCK_SELECTORS);
    for (const block of Array.from(blocks)) {
      const text = getDirectText(block).toLowerCase();
      if (lowerWords.some((w) => text.includes(w))) {
        block.style.display = "none";
      }
    }
  };
}

// src/main.ts
var CONFIG_FILE = ".hidden-text-blacklist.md";
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
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file.path === CONFIG_FILE) {
          await this.loadSettings();
          this.refreshEditors();
        }
      })
    );
    this.app.workspace.onLayoutReady(() => {
      this.refreshEditors();
    });
  }
  async loadSettings() {
    const file = this.app.vault.getAbstractFileByPath(CONFIG_FILE);
    if (file instanceof import_obsidian2.TFile) {
      const content = await this.app.vault.read(file);
      this.settings = parseConfigFile(content);
    } else {
      this.settings = Object.assign({}, DEFAULT_SETTINGS);
    }
  }
  async saveSettings() {
    const content = serializeConfigFile(this.settings);
    const file = this.app.vault.getAbstractFileByPath(CONFIG_FILE);
    if (file instanceof import_obsidian2.TFile) {
      await this.app.vault.modify(file, content);
    } else {
      await this.app.vault.create(CONFIG_FILE, content);
    }
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
function parseConfigFile(content) {
  let enabled = DEFAULT_SETTINGS.enabled;
  let body = content;
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (fmMatch) {
    const fm = fmMatch[1];
    body = fmMatch[2];
    const enabledMatch = fm.match(/^enabled:\s*(true|false)\s*$/m);
    if (enabledMatch) {
      enabled = enabledMatch[1] === "true";
    }
  }
  const blacklistWords = body.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return { enabled, blacklistWords };
}
function serializeConfigFile(settings) {
  const fm = `---
enabled: ${settings.enabled}
---
`;
  const body = settings.blacklistWords.join("\n");
  return fm + body + "\n";
}
