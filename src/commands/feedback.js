import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';
import { t } from '../utils/i18n.js';
import { generateReportSummary } from '../services/n8n.js';
import { fetchMessages } from '../services/storage.js';
import { detectLanguage } from '../services/userPreferences.js';

const MESSAGES_PER_PAGE = 20;

export const data = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('Gerar resumo de atividades do servidor')
  .setDescriptionLocalizations({ 
    'pt-BR': 'Gerar resumo de atividades do servidor', 
    'en-US': 'Generate server activity summary' 
  });

export async function execute(interaction) {
  const lang = detectLanguage(interaction);
  
  await interaction.deferReply({ ephemeral: false });
  
  await showTimeSelection(interaction, lang);
}

async function showTimeSelection(interaction, lang) {
  const titleText = lang === 'pt' ? '⏰ Selecione o Período' : '⏰ Select Time Period';
  const descText = lang === 'pt' 
    ? 'Escolha o período para análise:' 
    : 'Choose the period for analysis:';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(titleText)
    .setDescription(descText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('time_1').setLabel('1h').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('time_3').setLabel('3h').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('time_6').setLabel('6h').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('time_12').setLabel('12h').setStyle(ButtonStyle.Primary)
  );
  
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('time_24').setLabel('24h').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('time_168').setLabel(lang === 'pt' ? '7 dias' : '7 days').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('cancel_feedback').setLabel(lang === 'pt' ? '❌ Cancelar' : '❌ Cancel').setStyle(ButtonStyle.Danger)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    collector.stop();
    
    if (i.customId === 'cancel_feedback') {
      const cancelText = lang === 'pt' ? '❌ Cancelado.' : '❌ Cancelled.';
      await i.update({ content: cancelText, embeds: [], components: [] });
      return;
    }
    
    const hours = parseInt(i.customId.split('_')[1]);
    await showSummaryOptions(i, lang, hours);
  });
}

async function showSummaryOptions(interaction, lang, hours) {
  await interaction.deferUpdate().catch(() => {});
  
  const loadingText = lang === 'pt' ? '🔍 Buscando mensagens...' : '🔍 Fetching messages...';
  
  const loadingEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(loadingText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  await interaction.editReply({ embeds: [loadingEmbed], components: [] });
  
  const messages = await fetchMessages(config.guilds.source, hours);
  
  if (!messages || messages.length === 0) {
    const noMessagesText = lang === 'pt' 
      ? 'Nenhuma mensagem encontrada no período.' 
      : 'No messages found in the period.';
    
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(noMessagesText)
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('back_time').setLabel(backText).setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row] });
    
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter: i => i.user.id === interaction.user.id,
      time: 300000 
    });
    
    collector.on('collect', async i => {
      collector.stop();
      await showTimeSelection(i, lang);
    });
    
    return;
  }
  
  const periodText = hours >= 24 ? `${hours / 24} ${lang === 'pt' ? 'dias' : 'days'}` : `${hours}h`;
  const titleText = lang === 'pt' ? `📊 Feedback (${periodText})` : `📊 Feedback (${periodText})`;
  const descText = lang === 'pt' 
    ? `${messages.length} mensagens encontradas.\n\nEscolha o tipo de resumo:` 
    : `${messages.length} messages found.\n\nChoose summary type:`;
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(titleText)
    .setDescription(descText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  const aiText = lang === 'pt' ? '🤖 Resumo IA' : '🤖 AI Summary';
  const rawText = lang === 'pt' ? '📄 Mensagens Completas' : '📄 Full Messages';
  const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('summary_ai').setLabel(aiText).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('summary_raw').setLabel(rawText).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('back_summary').setLabel(backText).setStyle(ButtonStyle.Secondary)
  );
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    collector.stop();
    
    if (i.customId === 'summary_ai') {
      await generateAISummary(i, lang, messages, hours);
    } else if (i.customId === 'summary_raw') {
      await showRawMessages(i, lang, messages, hours, 0);
    } else if (i.customId === 'back_summary') {
      await showTimeSelection(i, lang);
    }
  });
}

async function generateAISummary(interaction, lang, messages, hours) {
  await interaction.deferUpdate().catch(() => {});
  
  const generatingText = lang === 'pt' ? '🤖 Gerando resumo executivo...' : '🤖 Generating executive summary...';
  
  const loadingEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(generatingText)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
  
  await interaction.editReply({ embeds: [loadingEmbed], components: [] });
  
  try {
    const summary = await generateReportSummary(messages, hours, lang);
    
    if (!summary || summary.length < 50) {
      const noRelevantText = lang === 'pt' 
        ? '📊 **Análise do Período**\n\nApós análise detalhada das mensagens coletadas, não foram identificados feedbacks ou discussões relevantes que justifiquem um resumo executivo. O período apresentou baixa atividade significativa ou mensagens sem conteúdo substancial para análise.' 
        : '📊 **Period Analysis**\n\nAfter detailed analysis of collected messages, no relevant feedback or discussions were identified that warrant an executive summary. The period showed low significant activity or messages without substantial content for analysis.';
      
      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(lang === 'pt' ? '📊 Resumo Executivo' : '📊 Executive Summary')
        .setDescription(noRelevantText)
        .setThumbnail(config.theme.ffBadge)
        .setFooter({ text: `FFNexus • ${messages.length} ${lang === 'pt' ? 'mensagens analisadas' : 'messages analyzed'}`, iconURL: config.theme.garenaIcon })
        .setTimestamp();
      
      const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('back_ai').setLabel(backText).setStyle(ButtonStyle.Secondary)
      );
      
      await interaction.editReply({ embeds: [embed], components: [row] });
      
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter: i => i.user.id === interaction.user.id,
        time: 300000 
      });
      
      collector.on('collect', async i => {
        collector.stop();
        await showTimeSelection(i, lang);
      });
      
      return;
    }
    
    const periodText = hours >= 24 ? `${hours / 24} ${lang === 'pt' ? 'dias' : 'days'}` : `${hours}h`;
    
    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`📊 ${lang === 'pt' ? 'Resumo Executivo' : 'Executive Summary'} (${periodText})`)
      .setDescription(summary.slice(0, 4000))
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: `FFNexus • ${messages.length} ${lang === 'pt' ? 'mensagens analisadas' : 'messages analyzed'}`, iconURL: config.theme.garenaIcon })
      .setTimestamp();
    
    const rawText = lang === 'pt' ? '📄 Ver Mensagens' : '📄 View Messages';
    const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('view_raw').setLabel(rawText).setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('back_ai_summary').setLabel(backText).setStyle(ButtonStyle.Secondary)
    );
    
    await interaction.editReply({ embeds: [embed], components: [row] });
    
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter: i => i.user.id === interaction.user.id,
      time: 300000 
    });
    
    collector.on('collect', async i => {
      collector.stop();
      
      if (i.customId === 'view_raw') {
        await showRawMessages(i, lang, messages, hours, 0);
      } else if (i.customId === 'back_ai_summary') {
        await showTimeSelection(i, lang);
      }
    });
  } catch (error) {
    console.error('AI summary error:', error);
    const errorText = lang === 'pt' ? '❌ Erro ao gerar resumo.' : '❌ Error generating summary.';
    
    const errorEmbed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(errorText)
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    await interaction.editReply({ embeds: [errorEmbed], components: [] });
  }
}

async function showRawMessages(interaction, lang, messages, hours, page = 0) {
  await interaction.deferUpdate().catch(() => {});
  
  const totalPages = Math.ceil(messages.length / MESSAGES_PER_PAGE);
  const start = page * MESSAGES_PER_PAGE;
  const end = start + MESSAGES_PER_PAGE;
  const pageMessages = messages.slice(start, end);
  
  const messageList = pageMessages.map((m, idx) => {
    const timestamp = new Date(m.createdAt).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { timeZone: config.timezone });
    const content = m.content.slice(0, 150);
    return `**${start + idx + 1}.** \`${timestamp}\` - **${m.author}**\n${content}${m.content.length > 150 ? '...' : ''}\n[🔗 Link](${m.url})`;
  }).join('\n\n');
  
  const periodText = hours >= 24 ? `${hours / 24} ${lang === 'pt' ? 'dias' : 'days'}` : `${hours}h`;
  const pageText = lang === 'pt' ? 'Página' : 'Page';
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(`📄 ${lang === 'pt' ? 'Mensagens Completas' : 'Full Messages'} (${periodText})`)
    .setDescription(messageList)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: `FFNexus • ${pageText} ${page + 1}/${totalPages}`, iconURL: config.theme.garenaIcon })
    .setTimestamp();
  
  const navButtons = [];
  
  if (totalPages > 1) {
    const prevText = lang === 'pt' ? '◀️ Anterior' : '◀️ Previous';
    const nextText = lang === 'pt' ? 'Próxima ▶️' : 'Next ▶️';
    
    navButtons.push(
      new ButtonBuilder().setCustomId(`raw_prev_${page}`).setLabel(prevText).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId(`raw_next_${page}`).setLabel(nextText).setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
    );
  }
  
  const exportText = lang === 'pt' ? '📥 Exportar TXT' : '📥 Export TXT';
  const backText = lang === 'pt' ? '🔙 Voltar' : '🔙 Back';
  
  navButtons.push(
    new ButtonBuilder().setCustomId('export_txt').setLabel(exportText).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('back_raw').setLabel(backText).setStyle(ButtonStyle.Secondary)
  );
  
  const row = new ActionRowBuilder().addComponents(navButtons.slice(0, 5));
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter: i => i.user.id === interaction.user.id,
    time: 300000 
  });
  
  collector.on('collect', async i => {
    if (i.customId.startsWith('raw_prev_')) {
      collector.stop();
      await showRawMessages(i, lang, messages, hours, page - 1);
    } else if (i.customId.startsWith('raw_next_')) {
      collector.stop();
      await showRawMessages(i, lang, messages, hours, page + 1);
    } else if (i.customId === 'export_txt') {
      await exportToTxt(i, lang, messages, hours);
    } else if (i.customId === 'back_raw') {
      collector.stop();
      await showTimeSelection(i, lang);
    }
  });
}

async function exportToTxt(interaction, lang, messages, hours) {
  await interaction.deferUpdate().catch(() => {});
  
  const lines = messages.map(m => {
    const timestamp = new Date(m.createdAt).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { timeZone: config.timezone });
    return `[${timestamp}] ${m.author}: ${m.content}\n${m.url}\n`;
  });
  
  const content = lines.join('\n');
  const buffer = Buffer.from(content, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `feedback_${hours}h_${Date.now()}.txt` });
  
  const exportedText = lang === 'pt' 
    ? `✅ ${messages.length} mensagens exportadas` 
    : `✅ ${messages.length} messages exported`;
  
  await interaction.followUp({ content: exportedText, files: [attachment], ephemeral: true });
}

