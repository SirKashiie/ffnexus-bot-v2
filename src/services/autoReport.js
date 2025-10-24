import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { fetchMessages } from './storage.js';
import { generateReportSummary } from './n8n.js';

export async function generateAutoReport(client) {
  try {
    const channel = await client.channels.fetch(config.channels.autoReport);
    if (!channel) {
      console.error('[auto-report] Channel not found');
      return;
    }
    
    const messages = await fetchMessages(config.guilds.source, config.autoReport.hours);
    
    if (messages.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`📊 Resumo Automático (${config.autoReport.hours}h)`)
        .setDescription('✅ Nenhuma atividade relevante detectada no período.')
        .setThumbnail(config.theme.garenaIcon)
        .setFooter({ text: 'FFNexus • Resumo Automático' })
        .setTimestamp();
      
      await channel.send({ embeds: [embed] });
      return;
    }
    
    const summaryPT = await generateReportSummary(messages, config.autoReport.hours, 'pt');
    const summaryEN = await generateReportSummary(messages, config.autoReport.hours, 'en');
    
    const embedPT = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`📊 Resumo Automático (${config.autoReport.hours}h) 🇧🇷`)
      .setDescription(summaryPT?.slice(0, 4000) || 'Resumo não disponível')
      .setThumbnail(config.theme.garenaIcon)
      .setFooter({ text: `FFNexus • ${messages.length} mensagens analisadas` })
      .setTimestamp();
    
    const embedEN = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`📊 Automatic Summary (${config.autoReport.hours}h) 🇺🇸`)
      .setDescription(summaryEN?.slice(0, 4000) || 'Summary not available')
      .setThumbnail(config.theme.garenaIcon)
      .setFooter({ text: `FFNexus • ${messages.length} messages analyzed` })
      .setTimestamp();
    
    await channel.send({ embeds: [embedPT] });
    await channel.send({ embeds: [embedEN] });
    
    console.log(`[auto-report] Sent summary: ${messages.length} messages`);
  } catch (error) {
    console.error('[auto-report] Error:', error);
  }
}

