import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
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
    await showSearchOptions(interaction, savedLang);
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
    
    await showSearchOptions(i, selectedLang);
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

async function showSearchOptions(interaction, lang) {
  await interaction.deferUpdate().catch(() => {});
  
  const titleText = lang === 'pt' ? '📄 Documentos' : '📄 Documents';
  const descText = lang === 'pt' 
    ? 'Como deseja buscar os documentos?' 
    : 'How would you like to search for documents?';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(titleText)
    .setDescription(descText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const searchText = lang === 'pt' ? '🔍 Pesquisar' : '🔍 Search';
  const viewAllText = lang === 'pt' ? '📚 Ver Todos' : '📚 View All';
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('search_docs').setLabel(searchText).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('view_all').setLabel(viewAllText).setStyle(ButtonStyle.Success)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    collector.stop();
    
    if (i.customId === 'search_docs') {
      await showSearchModal(i, lang);
    } else if (i.customId === 'view_all') {
      await showAllDocs(i, lang);
    }
  });
}

async function showSearchModal(interaction, lang) {
  const titleText = lang === 'pt' ? 'Pesquisar Documentos' : 'Search Documents';
  const labelText = lang === 'pt' ? 'Termos de busca' : 'Search terms';
  const placeholderText = lang === 'pt' ? 'Digite palavras-chave...' : 'Enter keywords...';
  
  const modal = new ModalBuilder()
    .setCustomId('search_modal')
    .setTitle(titleText);
  
  const searchInput = new TextInputBuilder()
    .setCustomId('search_terms')
    .setLabel(labelText)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholderText)
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(100);
  
  const row = new ActionRowBuilder().addComponents(searchInput);
  modal.addComponents(row);
  
  await interaction.showModal(modal);
  
  const filter = i => i.customId === 'search_modal' && i.user.id === interaction.user.id;
  
  try {
    const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 120000 });
    const searchTerms = modalSubmit.fields.getTextInputValue('search_terms');
    
    await modalSubmit.deferUpdate();
    await searchDocs(modalSubmit, lang, searchTerms);
  } catch (error) {
    console.error('Modal timeout:', error);
  }
}

async function searchDocs(interaction, lang, searchTerms) {
  const loadingText = lang === 'pt' ? '🔍 Pesquisando...' : '🔍 Searching...';
  
  const loadingEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(loadingText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  await interaction.editReply({ embeds: [loadingEmbed], components: [] });
  
  const allDocs = await drive.listAllDocs();
  const terms = searchTerms.toLowerCase().split(/\s+/);
  
  const filteredDocs = allDocs.filter(doc => {
    const docName = doc.name.toLowerCase();
    return terms.some(term => docName.includes(term));
  });
  
  if (filteredDocs.length === 0) {
    const notFoundText = lang === 'pt' 
      ? `Nenhum documento encontrado para "${searchTerms}"` 
      : `No documents found for "${searchTerms}"`;
    
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(notFoundText)
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('back_search').setLabel(backText).setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row] });
    
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter: i => i.user.id === interaction.user.id,
      time: 300000 
    });
    
    collector.on('collect', async i => {
      collector.stop();
      await showSearchOptions(i, lang);
    });
    
    return;
  }
  
  await showDocSelection(interaction, lang, filteredDocs, 0);
}

async function showAllDocs(interaction, lang, page = 0) {
  try {
    await interaction.deferUpdate().catch(() => {});
    
    const loadingText = lang === 'pt' ? '🔍 Buscando documentos...' : '🔍 Fetching documents...';
    
    const loadingEmbed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setDescription(loadingText)
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    await interaction.editReply({ embeds: [loadingEmbed], components: [] });
    
    console.log('[doc] Iniciando busca no Google Drive...');
    console.log('[doc] User:', interaction.user.tag);
    
    const docs = await drive.listAllDocs();
    
    console.log(`[doc] ✅ ${docs?.length || 0} documentos encontrados`);
    
    if (!docs || docs.length === 0) {
      const noneFoundText = lang === 'pt' ? 'Nenhum documento encontrado.' : 'No documents found.';
      
      const embed = new EmbedBuilder()
        .setColor(config.theme.accent)
        .setDescription(noneFoundText)
        .setThumbnail(config.theme.ffBadge)
        .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
      
      return interaction.editReply({ embeds: [embed], components: [] });
    }
    
    await showDocSelection(interaction, lang, docs, page);
  } catch (error) {
    console.error('[doc] ❌ Erro ao buscar documentos:', error);
    console.error('[doc] Stack:', error.stack);
    
    const errorText = lang === 'pt' 
      ? '❌ Erro ao buscar documentos. Tente novamente mais tarde.' 
      : '❌ Error fetching documents. Please try again later.';
    
    const errorEmbed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(errorText)
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(console.error);
  }
}

async function showDocSelection(interaction, lang, docs, page = 0) {
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
  
  const selectText = lang === 'pt' ? 'Selecione até 5 documentos' : 'Select up to 5 documents';
  
  const select = new StringSelectMenuBuilder()
    .setCustomId('select_docs')
    .setPlaceholder(selectText)
    .setMinValues(1)
    .setMaxValues(Math.min(options.length, MAX_PICK))
    .addOptions(options);
  
  const docsFoundText = lang === 'pt' ? 'documento(s) encontrado(s)' : 'document(s) found';
  const pageText = lang === 'pt' ? 'Página' : 'Page';
  const selectDocsText = lang === 'pt' ? '📄 Selecione os Documentos' : '📄 Select Documents';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(selectDocsText)
    .setDescription(`📚 ${docs.length} ${docsFoundText}\n📄 ${pageText} ${page + 1} ${lang === 'pt' ? 'de' : 'of'} ${totalPages}`)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const rows = [new ActionRowBuilder().addComponents(select)];
  
  const navButtons = [];
  
  if (totalPages > 1) {
    const prevText = lang === 'pt' ? '◀️ Anterior' : '◀️ Previous';
    const nextText = lang === 'pt' ? 'Próxima ▶️' : 'Next ▶️';
    
    navButtons.push(
      new ButtonBuilder().setCustomId(`prev_${page}`).setLabel(prevText).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId(`next_${page}`).setLabel(nextText).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
    );
  }
  
  const categoriesText = lang === 'pt' ? '📁 Categorias (em breve)' : '📁 Categories (coming soon)';
  const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
  
  navButtons.push(
    new ButtonBuilder().setCustomId('categories').setLabel(categoriesText).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('back_to_search').setLabel(backText).setStyle(ButtonStyle.Secondary)
  );
  
  const navRow = new ActionRowBuilder().addComponents(navButtons.slice(0, 5));
  if (navButtons.length > 0) rows.push(navRow);
  
  await interaction.editReply({ embeds: [embed], components: rows });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    if (i.customId === 'select_docs') {
      const selectedIds = i.values;
      await i.deferUpdate().catch(() => {});
      collector.stop();
      await showPreview(i, lang, selectedIds, docs);
    } else if (i.customId.startsWith('prev_')) {
      collector.stop();
      await showDocSelection(i, lang, docs, page - 1);
    } else if (i.customId.startsWith('next_')) {
      collector.stop();
      await showDocSelection(i, lang, docs, page + 1);
    } else if (i.customId === 'categories') {
      const comingSoonText = lang === 'pt' 
        ? '🚧 Essa função está sendo construída. Volte em breve!' 
        : '🚧 This feature is under construction. Come back soon!';
      
      await i.reply({ content: comingSoonText, ephemeral: true });
    } else if (i.customId === 'back_to_search') {
      collector.stop();
      await showSearchOptions(i, lang);
    }
  });
}

async function showPreview(interaction, lang, docIds, allDocs) {
  await interaction.deferUpdate().catch(() => {});
  
  const selectedDocs = allDocs.filter(d => docIds.includes(d.id));
  
  const generatingText = lang === 'pt' ? '🤖 Gerando preview com IA...' : '🤖 Generating AI preview...';
  
  const loadingEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(generatingText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  await interaction.editReply({ embeds: [loadingEmbed], components: [] });
  
  try {
    const previews = await Promise.all(selectedDocs.map(async doc => {
      const summary = await generateDocSummary(doc.name, doc.webViewLink || doc.id);
      return `**📄 ${doc.name}**\n${summary}\n`;
    }));
    
    const previewTitle = lang === 'pt' ? '🤖 Preview IA' : '🤖 AI Preview';
    
    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(previewTitle)
      .setDescription(previews.join('\n').slice(0, 4000))
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    const confirmText = lang === 'pt' ? '✅ Confirmar' : '✅ Confirm';
    const cancelText = lang === 'pt' ? '❌ Cancelar' : '❌ Cancel';
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('confirm_docs').setLabel(confirmText).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel_preview').setLabel(cancelText).setStyle(ButtonStyle.Danger)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row] });
    
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter: i => i.user.id === interaction.user.id,
      time: 300000 
    });
    
    collector.on('collect', async i => {
      collector.stop();
      
      if (i.customId === 'confirm_docs') {
        await showDownloadOptions(i, lang, selectedDocs);
      } else if (i.customId === 'cancel_preview') {
        await showSearchOptions(i, lang);
      }
    });
  } catch (error) {
    console.error('Preview error:', error);
    const errorText = lang === 'pt' ? '❌ Erro ao gerar preview.' : '❌ Error generating preview.';
    
    const errorEmbed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(errorText)
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    await interaction.editReply({ embeds: [errorEmbed], components: [] });
  }
}

async function showDownloadOptions(interaction, lang, docs) {
  await interaction.deferUpdate().catch(() => {});
  
  const titleText = lang === 'pt' ? '📥 Opções de Download' : '📥 Download Options';
  const descText = lang === 'pt' ? 'Como deseja receber os documentos?' : 'How would you like to receive the documents?';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(titleText)
    .setDescription(descText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const linkText = lang === 'pt' ? '🔗 Link de Download' : '🔗 Download Link';
  const attachText = lang === 'pt' ? '📎 Anexar no Chat' : '📎 Attach in Chat';
  const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('download_link').setLabel(linkText).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('attach_chat').setLabel(attachText).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('back_options').setLabel(backText).setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    collector.stop();
    
    if (i.customId === 'download_link') {
      await showDownloadLinks(i, lang, docs);
    } else if (i.customId === 'attach_chat') {
      const comingSoonText = lang === 'pt' 
        ? '🚧 Função de anexar em desenvolvimento. Use os links por enquanto!' 
        : '🚧 Attach feature under development. Use links for now!';
      
      await i.reply({ content: comingSoonText, ephemeral: true });
      await showDownloadLinks(i, lang, docs);
    } else if (i.customId === 'back_options') {
      await showSearchOptions(i, lang);
    }
  });
}

async function showDownloadLinks(interaction, lang, docs) {
  await interaction.deferUpdate().catch(() => {});
  
  const openText = lang === 'pt' ? 'Abrir/Baixar' : 'Open/Download';
  
  const links = docs.map(doc => {
    const link = doc.webViewLink || `https://drive.google.com/file/d/${doc.id}/view`;
    return `📄 **${doc.name}**\n🔗 [${openText}](${link})`;
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
    await showSearchOptions(i, lang);
  });
}

