import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { classifyIncident } from './n8n.js';

const activeAlerts = new Map();

/**
 * Determina a cor do alerta baseado no número de ocorrências
 * Verde: 1 ocorrência
 * Amarelo: 2-5 ocorrências
 * Vermelho: 6+ ocorrências
 */
function getSeverityColor(count) {
  if (count === 1) return 0x00FF00; // Verde
  if (count >= 2 && count <= 5) return 0xFFFF00; // Amarelo
  return 0xFF0000; // Vermelho (6+)
}

/**
 * Agrupa mensagens relacionadas usando análise de contexto
 */
function analyzeContext(messages) {
  const keywords = new Map();
  
  messages.forEach(msg => {
    const words = msg.content.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);
    
    words.forEach(word => {
      keywords.set(word, (keywords.get(word) || 0) + 1);
    });
  });
  
  const topKeywords = Array.from(keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
  
  return topKeywords;
}

/**
 * Gera resumo inteligente do contexto do incidente
 */
function generateContextSummary(messages) {
  const keywords = analyzeContext(messages);
  const uniqueAuthors = new Set(messages.map(m => m.author)).size;
  
  if (keywords.length === 0) {
    return 'Múltiplos relatos de problemas de login detectados.';
  }
  
  const keywordText = keywords.slice(0, 3).join(', ');
  return `${uniqueAuthors} usuário(s) reportando problemas relacionados a: ${keywordText}`;
}

export async function handleMessage(message, client) {
  if (!config.incident.aiEnabled) return;
  
  const classified = await classifyIncident(message.content);
  if (!classified || !classified.isLoginIssue) return;
  if (classified.confidence < config.incident.aiMinScore) return;
  
  const now = Date.now();
  const windowMs = config.incident.windowMin * 60 * 1000;
  
  // Procura por alerta ativo dentro da janela de tempo
  let alert = null;
  for (const [embedMsg, data] of activeAlerts.entries()) {
    if (now - data.createdAt < windowMs) {
      alert = { embedMsg, data };
      break;
    }
  }
  
  if (alert) {
    // Atualiza alerta existente
    alert.data.count++;
    alert.data.messages.push({ 
      content: message.content, 
      url: message.url, 
      author: message.author.tag,
      timestamp: now
    });
    await updateAlertEmbed(alert.embedMsg, alert.data);
  } else {
    // Cria novo alerta
    const channel = await client.channels.fetch(config.channels.alert).catch(() => null);
    if (!channel) return;
    
    const data = {
      count: 1,
      messages: [{ 
        content: message.content, 
        url: message.url, 
        author: message.author.tag,
        timestamp: now
      }],
      createdAt: now
    };
    
    const embed = createAlertEmbed(data);
    const embedMsg = await channel.send({ embeds: [embed] });
    activeAlerts.set(embedMsg, data);
    
    // Remove alerta após a janela de tempo
    setTimeout(() => activeAlerts.delete(embedMsg), windowMs);
  }
}

function createAlertEmbed(data) {
  const severityColor = getSeverityColor(data.count);
  const contextSummary = generateContextSummary(data.messages);
  
  // Determina o nível de severidade em texto
  let severityLevel = '🟢 Baixa';
  if (data.count >= 2 && data.count <= 5) severityLevel = '🟡 Média';
  if (data.count >= 6) severityLevel = '🔴 Alta';
  
  const embed = new EmbedBuilder()
    .setColor(severityColor)
    .setTitle('🚨 Alerta de Login Detectado')
    .setDescription(
      `**Severidade:** ${severityLevel}\n` +
      `**Ocorrências:** ${data.count}\n` +
      `**Contexto:** ${contextSummary}\n\n` +
      `**Últimas mensagens:**`
    )
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus • Sistema de Alertas', iconURL: config.theme.garenaIcon })
    .setTimestamp();
  
  // Mostra as 5 mensagens mais recentes
  const recent = data.messages.slice(-5);
  recent.forEach((m, idx) => {
    const timeAgo = Math.floor((Date.now() - m.timestamp) / 60000);
    const timeText = timeAgo === 0 ? 'agora' : `${timeAgo}min atrás`;
    
    embed.addFields({ 
      name: `${idx + 1}. ${m.author} (${timeText})`, 
      value: `${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}\n[🔗 Ver mensagem](${m.url})`,
      inline: false
    });
  });
  
  // Adiciona informação sobre mensagens ocultas
  if (data.messages.length > 5) {
    embed.addFields({
      name: '📊 Estatísticas',
      value: `Mostrando 5 de ${data.messages.length} mensagens. ${data.messages.length - 5} mensagens anteriores ocultas.`,
      inline: false
    });
  }
  
  return embed;
}

async function updateAlertEmbed(embedMsg, data) {
  const embed = createAlertEmbed(data);
  await embedMsg.edit({ embeds: [embed] }).catch(() => {});
}

