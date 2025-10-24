import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { config } from '../config.js';
import { t } from '../utils/i18n.js';
import * as drive from '../providers/drive.js';
import { generateDocSummary } from '../services/n8n.js';
import { getUserLanguage, setUserLanguage, detectLanguage } from '../services/userPreferences.js';

const MAX_PICK = 5;
const PAGE_SIZE = 25;

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
  .setDescriptionLocalizations({ 
    'pt-BR': 'Buscar e acessar documentos do Google Drive', 
    'en-US': 'Search and access Google Drive documents' 
  });

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const savedLang = getUserLanguage(interaction.user.id);
  
  if (savedLang) {
    await showAllDocs(interaction, savedLang);
  } else {
    await showLanguageSelection(interaction);
  }
}

async function showLanguageSelection(interaction) {
  const langEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle('🌐 Selecione o idioma / Select language')
    .setDescription('Escolha o idioma para continuar.\nChoose the language to continue.')
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const langRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lang_pt').setLabel('Português').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('lang_en').setLabel('English').setStyle(ButtonStyle.Primary)
  );
  
  await interaction.editReply({ embeds: [langEmbed], components: [langRow] });
  
  const langCollector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 60000 
  });
  
  langCollector.on('collect', async i => {
    const selectedLang = i.customId === 'lang_pt' ? 'pt' : 'en';
    setUserLanguage(interaction.user.id, selectedLang);
    langCollector.stop();
    
    await showAllDocs(i, selectedLang);
  });
  
  langCollector.on('end', async (collected) => {
    if (collected.size === 0) {
      const lang = detectLanguage(interaction);
      await interaction.editReply({ 
        content: t(lang, 'timeout'), 
        components: [], 
        embeds: [] 
      }).catch(() => {});
    }
  });
}

async function showAllDocs(interaction, lang, page = 0) {
  await interaction.deferUpdate().catch(() => {});
  
  const loadingEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(lang === 'pt' ? '🔍 Buscando documentos...' : '🔍 Searching documents...')
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  await interaction.editReply({ embeds: [loadingEmbed], components: [] }).catch(() => {});
  
  const docs = await drive.listAllDocs();
  
  if (!docs || docs.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(t(lang, 'noneFound'))
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
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
  
  const docsFoundText = lang === 'pt' ? 'documento(s) encontrado(s)' : 'document(s) found';
  const pageText = lang === 'pt' ? 'Página' : 'Page';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(t(lang, 'selectDocs'))
    .setDescription(`📚 ${docs.length} ${docsFoundText}\n📄 ${pageText} ${page + 1} ${lang === 'pt' ? 'de' : 'of'} ${totalPages}`)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const rows = [new ActionRowBuilder().addComponents(select)];
  
  if (totalPages > 1) {
    const prevText = lang === 'pt' ? '◀️ Anterior' : '◀️ Previous';
    const nextText = lang === 'pt' ? 'Próxima ▶️' : 'Next ▶️';
    
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`prev_${page}`).setLabel(prevText).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId(`next_${page}`).setLabel(nextText).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
    );
    rows.push(navRow);
  }
  
  await interaction.editReply({ embeds: [embed], components: rows });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  let selectedIds = [];
  
  collector.on('collect', async i => {
    if (i.customId === 'select_docs') {
      selectedIds = i.values;
      await i.deferUpdate().catch(() => {});
      collector.stop();
      await showConfirmActions(i, lang, selectedIds, docs);
    } else if (i.customId.startsWith('prev_')) {
      collector.stop();
      await showAllDocs(i, lang, page - 1);
    } else if (i.customId.startsWith('next_')) {
      collector.stop();
      await showAllDocs(i, lang, page + 1);
    }
  });
}

async function showConfirmActions(interaction, lang, docIds, allDocs) {
  await interaction.deferUpdate().catch(() => {});
  
  const selectedDocs = allDocs.filter(d => docIds.includes(d.id));
  const docNames = selectedDocs.map(d => `📄 ${d.name}`).join('\n');
  
  const titleText = lang === 'pt' ? '✅ Documentos Selecionados' : '✅ Selected Documents';
  const questionText = lang === 'pt' ? '**O que deseja fazer?**' : '**What would you like to do?**';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(titleText)
    .setDescription(`${docNames}\n\n${questionText}`)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const previewText = lang === 'pt' ? '🤖 Preview com IA' : '🤖 AI Preview';
  const downloadText = lang === 'pt' ? '📥 Link de Download' : '📥 Download Link';
  const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('preview').setLabel(previewText).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('download').setLabel(downloadText).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('back').setLabel(backText).setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    collector.stop();
    
    if (i.customId === 'preview') {
      await showPreview(i, lang, selectedDocs);
    } else if (i.customId === 'download') {
      await showDownloadLinks(i, lang, selectedDocs);
    } else if (i.customId === 'back') {
      await showAllDocs(i, lang, 0);
    }
  });
}

async function showPreview(interaction, lang, docs) {
  await interaction.deferUpdate().catch(() => {});
  
  const loadingText = lang === 'pt' ? '🤖 Gerando preview com IA...' : '🤖 Generating AI preview...';
  
  const loadingEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(loadingText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  await interaction.editReply({ embeds: [loadingEmbed], components: [] });
  
  try {
    const previews = await Promise.all(docs.map(async doc => {
      const summary = await generateDocSummary(doc.name, doc.webViewLink || doc.id);
      return `**📄 ${doc.name}**\n${summary}\n`;
    }));
    
    const titleText = lang === 'pt' ? '🤖 Preview Gerado por IA' : '🤖 AI Generated Preview';
    
    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(titleText)
      .setDescription(previews.join('\n'))
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    const downloadText = lang === 'pt' ? '📥 Baixar Documentos' : '📥 Download Documents';
    const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('download_after_preview').setLabel(downloadText).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('back_to_list').setLabel(backText).setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row] });
    
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter: i => i.user.id === interaction.user.id,
      time: 300000 
    });
    
    collector.on('collect', async i => {
      collector.stop();
      
      if (i.customId === 'download_after_preview') {
        await showDownloadLinks(i, lang, docs);
      } else if (i.customId === 'back_to_list') {
        await showAllDocs(i, lang, 0);
      }
    });
  } catch (error) {
    console.error('Erro ao gerar preview:', error);
    
    const errorText = lang === 'pt' ? '❌ Erro ao gerar preview. Tente novamente.' : '❌ Error generating preview. Try again.';
    
    const errorEmbed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(errorText)
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    await interaction.editReply({ embeds: [errorEmbed], components: [] });
  }
}

async function showDownloadLinks(interaction, lang, docs) {
  await interaction.deferUpdate().catch(() => {});
  
  const openDownloadText = lang === 'pt' ? 'Abrir/Baixar' : 'Open/Download';
  
  const links = docs.map(doc => {
    const link = doc.webViewLink || `https://drive.google.com/file/d/${doc.id}/view`;
    return `📄 **${doc.name}**\n🔗 [${openDownloadText}](${link})`;
  }).join('\n\n');
  
  const titleText = lang === 'pt' ? '📥 Links de Download' : '📥 Download Links';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(titleText)
    .setDescription(links)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('back_final').setLabel(backText).setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    collector.stop();
    await showAllDocs(i, lang, 0);
  });
}

