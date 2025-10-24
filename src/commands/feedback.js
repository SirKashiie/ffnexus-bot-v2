import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config } from '../config.js';
import { t } from '../utils/i18n.js';
import { generateReportSummary } from '../services/n8n.js';
import { fetchMessages } from '../services/storage.js';

export const data = new SlashCommandBuilder()
  .setName('feedback')
  .setDescription('Gerar resumo de atividades do servidor')
  .setDescriptionLocalizations({ 'pt-BR': 'Gerar resumo de atividades do servidor', 'en-US': 'Generate server activity summary' })
  .addStringOption(option =>
    option.setName('tipo')
      .setDescription('Tipo de relatório')
      .setDescriptionLocalizations({ 'pt-BR': 'Tipo de relatório', 'en-US': 'Report type' })
      .setRequired(true)
      .addChoices(
        { name: '🤖 Resumo IA', value: 'ai' },
        { name: '📝 Mensagens Brutas', value: 'raw' }
      ))
  .addIntegerOption(option =>
    option.setName('horas')
      .setDescription('Período em horas (1-168)')
      .setDescriptionLocalizations({ 'pt-BR': 'Período em horas (1-168)', 'en-US': 'Period in hours (1-168)' })
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(168));

export async function execute(interaction) {
  const lang = interaction.locale?.startsWith('pt') ? 'pt' : 'en';
  const tipo = interaction.options.getString('tipo');
  const horas = interaction.options.getInteger('horas') || 12;
  
  await interaction.deferReply({ ephemeral: false });
  
  const messages = await fetchMessages(config.guilds.source, horas);
  
  if (!messages || messages.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setTitle(t(lang, 'feedbackTitle'))
      .setDescription(lang === 'pt' ? 'Nenhuma mensagem encontrada no período.' : 'No messages found in the period.')
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    return interaction.editReply({ embeds: [embed] });
  }
  
  if (tipo === 'ai') {
    await generateAISummary(interaction, lang, messages, horas);
  } else {
    await generateRawReport(interaction, lang, messages, horas);
  }
}

async function generateAISummary(interaction, lang, messages, horas) {
  const summary = await generateReportSummary(messages, horas, lang);
  
  if (!summary) {
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setTitle(t(lang, 'feedbackTitle'))
      .setDescription(lang === 'pt' ? 'Falha ao gerar resumo via n8n.' : 'Failed to generate summary via n8n.')
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon });
    
    return interaction.editReply({ embeds: [embed] });
  }
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(`📊 ${t(lang, 'feedbackTitle')} (${horas}h)`)
    .setDescription(summary.slice(0, 4000))
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: `FFNexus • ${messages.length} mensagens analisadas`, iconURL: config.theme.garenaIcon })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed] });
}

async function generateRawReport(interaction, lang, messages, horas) {
  const lines = messages.map(m => {
    const timestamp = new Date(m.createdAt).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US', { timeZone: config.timezone });
    return `[${timestamp}] ${m.author}: ${m.content}\n${m.url}\n`;
  });
  
  const content = lines.join('\n');
  const buffer = Buffer.from(content, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `feedback_${horas}h_${Date.now()}.txt` });
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(`📝 ${t(lang, 'feedbackTitle')} (${horas}h)`)
    .setDescription(lang === 'pt' ? `${messages.length} mensagens exportadas` : `${messages.length} messages exported`)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon })
    .setTimestamp();
  
  await interaction.editReply({ embeds: [embed], files: [attachment] });
}

