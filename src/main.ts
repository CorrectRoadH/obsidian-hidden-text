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

		// Editor extension for live preview / source mode
		this.registerEditorExtension([hiddenTextField]);

		// Reading view post processor
		this.registerMarkdownPostProcessor(
			createPostProcessor(
				() => this.settings.blacklistWords,
				() => this.settings.enabled
			)
		);

		// Command to toggle hidden text on/off
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

		// Initial dispatch after editor is ready
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
		const words = this.settings.enabled
			? this.settings.blacklistWords
			: [];

		// Dispatch the blacklist update to all editor instances
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
