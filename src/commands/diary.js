import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';
import { t } from '../utils/i18n.js';
import { formatDiaryExecutive } from '../services/diaryFormatter.js';

export const conselheiro = new SlashCommandBuilder()
  .setName('diario_conselheiro')
  .setDescription('Gerar diário do canal Conselheiro')
  .setDescriptionLocalizations({ 'pt-BR': 'Gerar diário do canal Conselheiro', 'en-US': 'Generate Counselor channel diary' });

export const aprendiz = new SlashCommandBuilder()
  .setName('diario_aprendiz')
  .setDescription('Gerar diário do canal Aprendiz')
  .setDescriptionLocalizations({ 'pt-BR': 'Gerar diário do canal Aprendiz', 'en-US': 'Generate Apprentice channel diary' });

async function fetchAllMessages(channel, limit = 10000) {
  const messages = [];
  let lastId;
  
  while (messages.length < limit) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    
    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;
    
    messages.push(...batch.values());
    lastId = batch.last().id;
    
    if (batch.size < 100) break;
  }
  
  return messages.reverse();
}

async function formatDiary(messages, channelName, lang) {
  return await formatDiaryExecutive(messages, channelName, lang);
}

async function executeDiary(interaction, channelId, diaryType) {
  const lang = interaction.locale?.startsWith('pt') ? 'pt' : 'en';
  
  if (!channelId) {
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(lang === 'pt' ? 'Canal não configurado. Configure DIARY_CONSELHEIRO_CHANNEL_ID ou DIARY_APRENDIZ_CHANNEL_ID.' : 'Channel not configured. Set DIARY_CONSELHEIRO_CHANNEL_ID or DIARY_APRENDIZ_CHANNEL_ID.')
      .setFooter({ text: 'FFNexus • Diário' });
    
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  
  await interaction.deferReply({ ephemeral: false });
  
  const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
  if (!channel) {
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(lang === 'pt' ? 'Canal não encontrado.' : 'Channel not found.')
      .setFooter({ text: 'FFNexus • Diário' });
    
    return interaction.editReply({ embeds: [embed] });
  }
  
  const loadEmbed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setDescription(t(lang, 'diaryLoading'))
    .setFooter({ text: 'FFNexus • Diário' });
  
  await interaction.editReply({ embeds: [loadEmbed] });
  
  const messages = await fetchAllMessages(channel);
  
  if (messages.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(config.theme.accent)
      .setDescription(t(lang, 'diaryEmpty'))
      .setFooter({ text: 'FFNexus • Diário' });
    
    return interaction.editReply({ embeds: [embed] });
  }
  
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pt').setLabel('🇧🇷 Português').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('en').setLabel('🇺🇸 English').setStyle(ButtonStyle.Primary)
  );
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(`📖 ${t(lang, 'diaryTitle')} - ${diaryType}`)
    .setDescription(lang === 'pt' ? `${messages.length} mensagens encontradas.\n\nEscolha o idioma:` : `${messages.length} messages found.\n\nChoose language:`)
    .setThumbnail(config.theme.garenaIcon)
    .setFooter({ text: t(lang, 'diaryFooter') });
  
  await interaction.editReply({ embeds: [embed], components: [row] });
  
  const collector = interaction.channel.createMessageComponentCollector({ time: 300000 });
  
  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: 'Este botão não é para você.', ephemeral: true });
    
    const selectedLang = i.customId;
    await i.deferUpdate();
    
    const channelName = selectedLang === 'pt' ? diaryType : diaryType;
    const formatted = await formatDiary(messages, channelName, selectedLang);
    
    const chunks = [];
    for (let i = 0; i < formatted.length; i += 4000) {
      chunks.push(formatted.slice(i, i + 4000));
    }
    
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkEmbed = new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(idx === 0 ? `📖 ${diaryType} (${selectedLang === 'pt' ? 'Português' : 'English'})` : null)
        .setDescription(chunks[idx])
        .setFooter({ text: `FFNexus • Diário • Parte ${idx + 1}/${chunks.length}` });
      
      if (idx === 0) {
        await i.editReply({ embeds: [chunkEmbed], components: [] });
      } else {
        await interaction.followUp({ embeds: [chunkEmbed] });
      }
    }
    
    collector.stop();
  });
}

export async function executeConselheiro(interaction) {
  await executeDiary(interaction, config.channels.diaryConselheiro, 'Conselheiro');
}

export async function executeAprendiz(interaction) {
  await executeDiary(interaction, config.channels.diaryAprendiz, 'Aprendiz');
}

