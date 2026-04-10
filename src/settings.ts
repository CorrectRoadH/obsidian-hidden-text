import { App, PluginSettingTab, Setting } from "obsidian";
import type HiddenTextPlugin from "./main";

export interface HiddenTextSettings {
	enabled: boolean;
	blacklistWords: string[];
}

export const DEFAULT_SETTINGS: HiddenTextSettings = {
	enabled: true,
	blacklistWords: [],
};

export class HiddenTextSettingTab extends PluginSettingTab {
	plugin: HiddenTextPlugin;

	constructor(app: App, plugin: HiddenTextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable hidden text")
			.setDesc("Toggle hiding of paragraphs containing blacklisted words.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enabled)
					.onChange(async (value) => {
						this.plugin.settings.enabled = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Blacklist file")
			.setDesc(
				"Blacklist words are stored in .hidden-text-blacklist.md at the vault root. " +
				"Edit that file directly (one word per line). Changes sync across devices."
			);

		new Setting(containerEl)
			.setName("Edit blacklist")
			.setDesc("Open the blacklist file for editing.")
			.addButton((btn) =>
				btn.setButtonText("Open").onClick(async () => {
					const file = this.app.vault.getAbstractFileByPath(
						".hidden-text-blacklist.md"
					);
					if (file) {
						await this.app.workspace.openLinkText(file.path, "", false);
					} else {
						// Create the file first
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

		new Setting(containerEl)
			.setName("Quick edit")
			.setDesc("Or edit here directly. One word per line.")
			.addTextArea((text) => {
				text.setPlaceholder("secret\nconfidential\nprivate")
					.setValue(this.plugin.settings.blacklistWords.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.blacklistWords = value
							.split("\n")
							.map((w) => w.trim())
							.filter((w) => w.length > 0);
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 10;
				text.inputEl.cols = 30;
			});
	}
}
