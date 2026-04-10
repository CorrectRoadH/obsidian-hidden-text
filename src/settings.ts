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
			.setName("Blacklist words")
			.setDesc("One word per line. Paragraphs containing any of these words will be hidden. Syncs via Obsidian Sync automatically.")
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
