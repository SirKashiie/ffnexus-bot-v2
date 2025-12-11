import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { fetchMessages } from './storage.js';
import { generateReportSummary } from './n8n.js';

export async function generateAutoReport(client, forceSend = false) {
  try {
    const channel = await client.channels.fetch(config.channels.autoReport);
    if (!channel) {
      console.error('[auto-report] Channel not found');
      return;
    }
    
    const messages = await fetchMessages(config.guilds.source, config.autoReport.hours);
    
    if (messages.length === 0) {
      if (!forceSend) {
        // Se não houver mensagens e não for forçado, não envia nada (evita spam)
        console.log('[auto-report] No relevant activity detected. Skipping report.');
        return;
      }
      
      // Se for forçado (ciclo de 24h), envia o relatório de "sem atividade"
      const embed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`📊 Resumo Automático (${config.autoReport.hours}h)`)
        .setDescription('✅ Nenhuma atividade relevante detectada no período.')
        .setThumbnail(config.theme.garenaIcon)
        .setFooter({ text: 'FFNexus • Resumo Automático' })
        .setTimestamp();
      
      await channel.send({ embeds: [embed] });
      console.log('[auto-report] Sent forced "no activity" summary.');
      return;
    }
    
    // Gera apenas a versão PT (Versão EN removida a pedido do usuário)
    const summaryPT = await generateReportSummary(messages, config.autoReport.hours, 'pt');
    
    const embedPT = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(`📊 Resumo Automático (${config.autoReport.hours}h)`)
      .setDescription(summaryPT?.slice(0, 4000) || 'Resumo não disponível')
      .setThumbnail(config.theme.garenaIcon)
      .setFooter({ text: `FFNexus • ${messages.length} mensagens analisadas` })
      .setTimestamp();
    
    await channel.send({ embeds: [embedPT] });
    
    console.log(`[auto-report] Sent summary: ${messages.length} messages`);
  } catch (error) {
    console.error('[auto-report] Error:', error);
  }
}

