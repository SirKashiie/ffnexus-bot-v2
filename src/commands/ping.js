import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { detectLanguage } from '../services/userPreferences.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Teste rápido de resposta do bot')
  .setDescriptionLocalizations({ 
    'pt-BR': 'Teste rápido de resposta do bot', 
    'en-US': 'Quick bot response test' 
  });

export async function execute(interaction) {
  const lang = detectLanguage(interaction);
  
  const sent = await interaction.reply({ 
    content: lang === 'pt' ? '🏓 Calculando...' : '🏓 Calculating...', 
    fetchReply: true,
    ephemeral: true
  });
  
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatency = Math.round(interaction.client.ws.ping);
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(lang === 'pt' ? '🏓 Pong!' : '🏓 Pong!')
    .setDescription(
      lang === 'pt' 
        ? `**Latência:** ${latency}ms\n**API Discord:** ${apiLatency}ms`
        : `**Latency:** ${latency}ms\n**Discord API:** ${apiLatency}ms`
    )
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon })
    .setTimestamp();
  
  await interaction.editReply({ content: '', embeds: [embed] });
}

