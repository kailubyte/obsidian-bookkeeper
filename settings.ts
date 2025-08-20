import { App, PluginSettingTab, Setting } from 'obsidian';
import BookTrackerPlugin from './main';
import { BookTrackerSettings } from './types';

export const DEFAULT_SETTINGS: BookTrackerSettings = {
  baseFilePath: 'Books.base',
  coversFolder: 'covers',
  noteTemplate: `# {{title}}

![Book Cover|200]({{cover_path}})

**Author:** {{author}}
**Published:** {{year_published}}
**Pages:** {{pages}}
**Genre:** {{genre}}
**Publisher:** {{publisher}}
**ISBN:** {{isbn}}
**Status:** {{status}}

## Description

{{description}}

## My Notes

## Quotes

## Rating: {{rating}}/5
`,
  createLinkedNotes: true,
  defaultStatus: 'to-read'
};

export class BookTrackerSettingTab extends PluginSettingTab {
  plugin: BookTrackerPlugin;

  constructor(app: App, plugin: BookTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();
    containerEl.createEl('h2', { text: 'Bookkeeper Settings' });

    new Setting(containerEl)
      .setName('Base file path')
      .setDesc('Path to the Books.base file (relative to vault root)')
      .addText(text => text
        .setPlaceholder('Books.base')
        .setValue(this.plugin.settings.baseFilePath)
        .onChange(async (value) => {
          this.plugin.settings.baseFilePath = value || 'Books.base';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Covers folder')
      .setDesc('Folder for storing book cover images (relative to vault root)')
      .addText(text => text
        .setPlaceholder('covers')
        .setValue(this.plugin.settings.coversFolder)
        .onChange(async (value) => {
          this.plugin.settings.coversFolder = value || 'covers';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Create linked notes')
      .setDesc('Automatically create book notes when adding books')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.createLinkedNotes)
        .onChange(async (value) => {
          this.plugin.settings.createLinkedNotes = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Default status')
      .setDesc('Default status for newly added books')
      .addDropdown(dropdown => dropdown
        .addOption('to-read', 'To Read')
        .addOption('reading', 'Reading')
        .addOption('completed', 'Completed')
        .setValue(this.plugin.settings.defaultStatus)
        .onChange(async (value) => {
          this.plugin.settings.defaultStatus = value as 'to-read' | 'reading' | 'completed';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Note template')
      .setDesc('Template for book notes. Use {{field}} placeholders.')
      .addTextArea(text => {
        text.setPlaceholder('Enter note template...')
        .setValue(this.plugin.settings.noteTemplate)
        .onChange(async (value) => {
          this.plugin.settings.noteTemplate = value;
          await this.plugin.saveSettings();
        });
        // Make the textarea much larger
        text.inputEl.rows = 15;
        text.inputEl.style.width = '100%';
        text.inputEl.style.minHeight = '300px';
        text.inputEl.style.resize = 'vertical';
      });

    containerEl.createEl('div', { 
      text: 'Available template variables: {{title}}, {{author}}, {{isbn}}, {{status}}, {{pages}}, {{publisher}}, {{year_published}}, {{genre}}, {{rating}}, {{description}}, {{cover_path}}',
      cls: 'setting-item-description'
    });
  }
}