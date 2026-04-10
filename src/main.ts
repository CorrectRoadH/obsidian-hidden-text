import { Notice, Plugin, TFile } from "obsidian";
import {
	HiddenTextSettingTab,
	DEFAULT_SETTINGS,
	type HiddenTextSettings,
} from "./settings";
import { hiddenTextField, updateBlacklistEffect } from "./editor-extension";
import { createPostProcessor } from "./post-processor";

const CONFIG_FILE = ".hidden-text-blacklist.md";

export default class HiddenTextPlugin extends Plugin {
	settings: HiddenTextSettings;

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
				new Notice(
					`Hidden Text: ${this.settings.enabled ? "ON" : "OFF"}`
				);
			},
		});

		// Watch for config file changes (e.g. synced from another device)
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
		if (file instanceof TFile) {
			const content = await this.app.vault.read(file);
			this.settings = parseConfigFile(content);
		} else {
			this.settings = Object.assign({}, DEFAULT_SETTINGS);
		}
	}

	async saveSettings() {
		const content = serializeConfigFile(this.settings);
		const file = this.app.vault.getAbstractFileByPath(CONFIG_FILE);
		if (file instanceof TFile) {
			await this.app.vault.modify(file, content);
		} else {
			await this.app.vault.create(CONFIG_FILE, content);
		}
		this.refreshEditors();
	}

	refreshEditors() {
		const words = this.settings.enabled
			? this.settings.blacklistWords
			: [];

		this.app.workspace.iterateAllLeaves((leaf) => {
			const view = (leaf.view as any)?.editor?.cm as
				| import("@codemirror/view").EditorView
				| undefined;
			if (view) {
				view.dispatch({
					effects: updateBlacklistEffect.of(words),
				});
			}
		});
	}
}

function parseConfigFile(content: string): HiddenTextSettings {
	let enabled = DEFAULT_SETTINGS.enabled;
	let body = content;

	// Parse frontmatter
	const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (fmMatch) {
		const fm = fmMatch[1];
		body = fmMatch[2];
		const enabledMatch = fm.match(/^enabled:\s*(true|false)\s*$/m);
		if (enabledMatch) {
			enabled = enabledMatch[1] === "true";
		}
	}

	const blacklistWords = body
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	return { enabled, blacklistWords };
}

function serializeConfigFile(settings: HiddenTextSettings): string {
	const fm = `---\nenabled: ${settings.enabled}\n---\n`;
	const body = settings.blacklistWords.join("\n");
	return fm + body + "\n";
}
