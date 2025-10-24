import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { classifyIncident } from './n8n.js';

const activeAlerts = new Map();

export async function handleMessage(message, client) {
  if (!config.incident.aiEnabled) return;
  
  const classified = await classifyIncident(message.content);
  if (!classified || !classified.isLoginIssue) return;
  if (classified.confidence < config.incident.aiMinScore) return;
  
  const now = Date.now();
  const windowMs = config.incident.windowMin * 60 * 1000;
  
  let alert = null;
  for (const [embedMsg, data] of activeAlerts.entries()) {
    if (now - data.createdAt < windowMs) {
      alert = { embedMsg, data };
      break;
    }
  }
  
  if (alert) {
    alert.data.count++;
    alert.data.messages.push({ 
      content: message.content, 
      url: message.url, 
      author: message.author.tag 
    });
    await updateAlertEmbed(alert.embedMsg, alert.data);
  } else {
    const channel = await client.channels.fetch(config.channels.alert).catch(() => null);
    if (!channel) return;
    
    const data = {
      count: 1,
      messages: [{ 
        content: message.content, 
        url: message.url, 
        author: message.author.tag 
      }],
      createdAt: now
    };
    
    const embed = createAlertEmbed(data);
    const embedMsg = await channel.send({ embeds: [embed] });
    activeAlerts.set(embedMsg, data);
    
    setTimeout(() => activeAlerts.delete(embedMsg), windowMs);
  }
}

function createAlertEmbed(data) {
  const severity = data.count >= 10 ? 0xFF0000 : config.theme.accent;
  
  const embed = new EmbedBuilder()
    .setColor(severity)
    .setTitle('🚨 Alerta de Login Detectado')
    .setDescription(`**${data.count} reclamação(ões) detectada(s)**\n\nÚltimas mensagens:`)
    .setThumbnail(config.theme.garenaIcon)
    .setFooter({ text: 'FFNexus • Sistema de Alertas' })
    .setTimestamp();
  
  const recent = data.messages.slice(-5);
  recent.forEach(m => {
    embed.addFields({ 
      name: m.author, 
      value: `${m.content.slice(0, 200)}\n[Link](${m.url})` 
    });
  });
  
  return embed;
}

async function updateAlertEmbed(embedMsg, data) {
  const embed = createAlertEmbed(data);
  await embedMsg.edit({ embeds: [embed] }).catch(() => {});
}

