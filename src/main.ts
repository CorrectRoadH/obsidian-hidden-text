import { Notice, Plugin } from "obsidian";
import {
	HiddenTextSettingTab,
	DEFAULT_SETTINGS,
	type HiddenTextSettings,
} from "./settings";
import { hiddenTextField, updateBlacklistEffect } from "./editor-extension";
import { createPostProcessor } from "./post-processor";

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

		this.app.workspace.onLayoutReady(() => {
			this.refreshEditors();
		});
	}

	// Called when data.json is modified externally (e.g. Obsidian Sync)
	async onExternalSettingsChange() {
		await this.loadSettings();
		this.refreshEditors();
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
