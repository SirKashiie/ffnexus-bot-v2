import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ComponentType } from 'discord.js';
import { config } from '../config.js';
import { t } from '../utils/i18n.js';
import * as drive from '../providers/drive.js';
import { generateDocSummary } from '../services/n8n.js';

const MAX_PICK = 5;
const PAGE_SIZE = 25;

function toSafeFilename(name = 'arquivo') {
  return String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._ -]/g, '').trim().slice(0, 100) || 'arquivo';
}

function getMimeEmoji(mime) {
  if (!mime) return '📄';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('word') || mime.includes('document')) return '📘';
  if (mime.includes('sheet') || mime.includes('excel')) return '📗';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return '📙';
  if (mime.includes('image')) return '🖼️';
  if (mime.includes('video')) return '🎬';
  return '📄';
}

export const data = new SlashCommandBuilder()
  .setName('doc')
  .setDescription('Buscar e acessar documentos do Google Drive')
  .setDescriptionLocalizations({ 'pt-BR': 'Buscar e acessar documentos do Google Drive', 'en-US': 'Search and access Google Drive documents' });

export async function execute(interaction) {
  const lang = interaction.locale?.startsWith('pt') ? 'pt' : 'en';
  
  const langEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(t(lang, 'chooseLang'))
    .setDescription(t(lang, 'chooseLangDesc'))
    .setThumbnail(config.theme.garenaIcon)
    .setFooter({ text: 'FFNexus • Documentos' });
  
  const langRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lang_pt').setLabel(t('pt', 'btnPT')).setEmoji('🇧🇷').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('lang_en').setLabel(t('en', 'btnEN')).setEmoji('🇺🇸').setStyle(ButtonStyle.Primary)
  );
  
  const reply = await interaction.reply({ embeds: [langEmbed], components: [langRow], ephemeral: true });
  
  const langCollector = reply.createMessageComponentCollector({ time: 60000 });
  
  langCollector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Este menu não é para você.', ephemeral: true });
    
    const selectedLang = i.customId === 'lang_pt' ? 'pt' : 'en';
    langCollector.stop();
    
    await showMainMenu(i, selectedLang);
  });
  
  langCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      await interaction.editReply({ content: t(lang, 'timeout'), components: [], embeds: [] }).catch(() => {});
    }
  });
}

async function showMainMenu(interaction, lang) {
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(t(lang, 'chooseAction'))
    .setDescription(t(lang, 'chooseActionDesc'))
    .setThumbnail(config.theme.garenaIcon)
    .setFooter({ text: 'FFNexus • Documentos' });
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('search').setLabel(t(lang, 'searchBtn')).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('all').setLabel(t(lang, 'allBtn')).setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.update({ embeds: [embed], components: [row] });
  
  const collector = interaction.message.createMessageComponentCollector({ time: 300000 });
  
  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Este menu não é para você.', ephemeral: true });
    
    if (i.customId === 'search') {
      await showSearchModal(i, lang);
    } else if (i.customId === 'all') {
      await showAllDocs(i, lang);
    }
  });
}

async function showSearchModal(interaction, lang) {
  const modal = new ModalBuilder()
    .setCustomId('search_modal')
    .setTitle(t(lang, 'modalTitle'));
  
  const input = new TextInputBuilder()
    .setCustomId('search_query')
    .setLabel(t(lang, 'modalLabel'))
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(100);
  
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  
  await interaction.showModal(modal);
  
  const submitted = await interaction.awaitModalSubmit({ time: 120000 }).catch(() => null);
  if (!submitted) return;
  
  const query = submitted.fields.getTextInputValue('search_query');
  await submitted.deferUpdate();
  
  const docs = await drive.searchDocs(query);
  await showDocSelection(submitted, lang, docs);
}

async function showAllDocs(interaction, lang) {
  await interaction.deferUpdate();
  const docs = await drive.listAllDocs();
  await showDocSelection(interaction, lang, docs);
}

async function showDocSelection(interaction, lang, docs, page = 0) {
  if (!docs || docs.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(t(lang, 'noneFound'))
      .setFooter({ text: 'FFNexus • Documentos' });
    
    return interaction.editReply({ embeds: [embed], components: [] });
  }
  
  const totalPages = Math.ceil(docs.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageDocs = docs.slice(start, end);
  
  const options = pageDocs.map(doc => ({
    label: doc.name.slice(0, 100),
    value: doc.id,
    description: `${getMimeEmoji(doc.mimeType)} ${doc.size || ''}`.slice(0, 100),
    emoji: getMimeEmoji(doc.mimeType)
  }));
  
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_docs')
    .setPlaceholder(t(lang, 'selectPlaceholder'))
    .setMinValues(1)
    .setMaxValues(Math.min(options.length, MAX_PICK))
    .addOptions(options);
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(t(lang, 'selectDocs'))
    .setDescription(t(lang, 'pageInfo', page + 1, docs.length))
    .setThumbnail(config.theme.garenaIcon)
    .setFooter({ text: 'FFNexus • Documentos' });
  
  const rows = [new ActionRowBuilder().addComponents(select)];
  
  if (totalPages > 1) {
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev').setLabel(t(lang, 'navPrev')).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId('next').setLabel(t(lang, 'navNext')).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
    );
    rows.push(navRow);
  }
  
  await interaction.editReply({ embeds: [embed], components: rows });
  
  const collector = interaction.message.createMessageComponentCollector({ time: 300000 });
  let selectedIds = [];
  
  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Este menu não é para você.', ephemeral: true });
    
    if (i.customId === 'select_docs') {
      selectedIds = i.values;
      await i.deferUpdate();
      await showConfirmActions(i, lang, selectedIds);
    } else if (i.customId === 'prev') {
      await showDocSelection(i, lang, docs, page - 1);
    } else if (i.customId === 'next') {
      await showDocSelection(i, lang, docs, page + 1);
    }
  });
}

async function showConfirmActions(interaction, lang, docIds) {
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(t(lang, 'confirmAction'))
    .setDescription(`${docIds.length} documento(s) selecionado(s)`)
    .setFooter({ text: 'FFNexus • Documentos' });
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('preview').setLabel(t(lang, 'previewBtn')).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('download').setLabel(t(lang, 'downloadBtn')).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('back').setLabel(t(lang, 'backBtn')).setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.message.createMessageComponentCollector({ time: 300000 });
  
  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Este menu não é para você.', ephemeral: true });
    
    if (i.customId === 'preview') {
      await showPreview(i, lang, docIds);
    } else if (i.customId === 'download') {
      await downloadDocs(i, lang, docIds);
    } else if (i.customId === 'back') {
      await showAllDocs(i, lang);
    }
  });
}

async function showPreview(interaction, lang, docIds) {
  await interaction.deferUpdate();
  
  const loadEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(t(lang, 'buildingSummary'))
    .setFooter({ text: 'FFNexus • Documentos' });
  
  await interaction.editReply({ embeds: [loadEmbed], components: [] });
  
  const previews = [];
  for (const docId of docIds) {
    const doc = await drive.getDocById(docId);
    if (!doc) continue;
    
    const summary = await generateDocSummary(doc.name);
    previews.push({ name: doc.name, summary: summary || 'Resumo não disponível', url: doc.webViewLink });
  }
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(t(lang, 'previewTitle'))
    .setThumbnail(config.theme.garenaIcon)
    .setFooter({ text: 'FFNexus • Documentos' });
  
  previews.forEach(p => {
    embed.addFields({ name: `📄 ${p.name}`, value: p.summary.slice(0, 1024) });
  });
  
  const linksText = previews.map(p => `[${p.name}](${p.url})`).join('\n');
  embed.addFields({ name: t(lang, 'linksTitle'), value: linksText.slice(0, 1024) });
  
  await interaction.editReply({ embeds: [embed], components: [] });
}

async function downloadDocs(interaction, lang, docIds) {
  await interaction.deferUpdate();
  
  const docs = [];
  for (const docId of docIds) {
    const doc = await drive.getDocById(docId);
    if (doc) docs.push(doc);
  }
  
  const links = docs.map(d => `[${d.name}](${d.webViewLink})`).join('\n');
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.accent)
    .setTitle(t(lang, 'downloadBtn'))
    .setDescription(links.slice(0, 4000))
    .setFooter({ text: 'FFNexus • Documentos' });
  
  await interaction.editReply({ embeds: [embed], components: [] });
}

