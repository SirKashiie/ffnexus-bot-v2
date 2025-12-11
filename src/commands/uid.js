import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { detectLanguage } from '../utils/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('uid-dima')
  .setDescription('Extrai UIDs de jogadores de Free Fire do canal monitorado')
  .setDescriptionLocalizations({
    'en-US': 'Extract Free Fire player UIDs from monitored channel',
    'pt-BR': 'Extrai UIDs de jogadores de Free Fire do canal monitorado'
  });

/**
 * Regex para detectar UIDs de Free Fire
 * UIDs geralmente são números de 9-12 dígitos
 */
const UID_PATTERNS = [
  /\buid[:\s]*(\d{9,12})\b/gi,
  /\bid[:\s]*(\d{9,12})\b/gi,
  /\b(\d{9,12})\b/g, // Números soltos que podem ser UIDs
];

/**
 * Extrai UIDs de uma mensagem
 */
function extractUIDs(content) {
  const uids = new Set();
  const text = content.toLowerCase();
  
  // Verifica se a mensagem menciona UID ou ID
  const hasUIDContext = /\b(uid|id|player|jogador|conta|account)\b/i.test(text);
  
  for (const pattern of UID_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const uid = match[1] || match[0];
      const cleanUID = uid.replace(/\D/g, '');
      
      // Valida se é um UID válido (9-12 dígitos)
      if (cleanUID.length >= 9 && cleanUID.length <= 12) {
        // Se não tem contexto de UID, só aceita números com 10+ dígitos
        if (!hasUIDContext && cleanUID.length < 10) continue;
        uids.add(cleanUID);
      }
    }
  }
  
  return Array.from(uids);
}

export async function execute(interaction) {
  const lang = detectLanguage(interaction);
  
  await interaction.deferReply({ ephemeral: false });
  
  try {
    // Canal fonte: 1433209029437689917 (servidor 388600486552403980)
    const sourceChannelId = '1433209029437689917';
    const sourceGuildId = '388600486552403980';
    
    // Busca o canal fonte
    const sourceChannel = await interaction.client.channels.fetch(sourceChannelId).catch(() => null);
    
    if (!sourceChannel) {
      const errorMsg = lang === 'pt' 
        ? '❌ Não foi possível acessar o canal de origem. Verifique as permissões do bot.'
        : '❌ Could not access source channel. Check bot permissions.';
      return interaction.editReply({ content: errorMsg });
    }
    
    // Busca mensagens recentes (últimas 100)
    const messages = await sourceChannel.messages.fetch({ limit: 100 }).catch(() => null);
    
    if (!messages || messages.size === 0) {
      const errorMsg = lang === 'pt'
        ? '❌ Nenhuma mensagem encontrada no canal de origem.'
        : '❌ No messages found in source channel.';
      return interaction.editReply({ content: errorMsg });
    }
    
    // Extrai UIDs de todas as mensagens
    const uidData = new Map(); // uid -> { users: Set, messages: [] }
    
    for (const [, message] of messages) {
      if (message.author.bot) continue;
      
      const uids = extractUIDs(message.content);
      
      for (const uid of uids) {
        if (!uidData.has(uid)) {
          uidData.set(uid, {
            users: new Set(),
            messages: []
          });
        }
        
        const data = uidData.get(uid);
        data.users.add(message.author.tag);
        data.messages.push({
          content: message.content.slice(0, 100),
          url: message.url,
          timestamp: message.createdTimestamp
        });
      }
    }
    
    if (uidData.size === 0) {
      const noUIDMsg = lang === 'pt'
        ? '📋 Nenhum UID encontrado nas últimas 100 mensagens do canal monitorado.'
        : '📋 No UIDs found in the last 100 messages from monitored channel.';
      return interaction.editReply({ content: noUIDMsg });
    }
    
    // Ordena UIDs por número de menções
    const sortedUIDs = Array.from(uidData.entries())
      .sort((a, b) => b[1].messages.length - a[1].messages.length)
      .slice(0, 20); // Limita a 20 UIDs
    
    // Cria embed com resultados
    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(lang === 'pt' ? '🎮 UIDs de Free Fire Encontrados' : '🎮 Free Fire UIDs Found')
      .setDescription(
        lang === 'pt'
          ? `Encontrados **${uidData.size}** UIDs únicos nas últimas 100 mensagens.\nMostrando os ${Math.min(20, sortedUIDs.length)} mais mencionados:`
          : `Found **${uidData.size}** unique UIDs in the last 100 messages.\nShowing the ${Math.min(20, sortedUIDs.length)} most mentioned:`
      )
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ 
        text: lang === 'pt' ? 'FFNexus • Garena BR' : 'FFNexus • Garena BR',
        iconURL: config.theme.garenaIcon 
      })
      .setTimestamp();
    
    // Adiciona UIDs ao embed
    let uidList = '';
    for (const [uid, data] of sortedUIDs) {
      const mentions = data.messages.length;
      const users = Array.from(data.users).slice(0, 2).join(', ');
      const moreUsers = data.users.size > 2 ? ` +${data.users.size - 2}` : '';
      
      uidList += `\`${uid}\` • ${mentions}x • ${users}${moreUsers}\n`;
    }
    
    embed.addFields({
      name: lang === 'pt' ? '📋 Lista de UIDs' : '📋 UID List',
      value: uidList || 'Nenhum UID encontrado',
      inline: false
    });
    
    // Adiciona informações adicionais
    const totalMentions = sortedUIDs.reduce((sum, [, data]) => sum + data.messages.length, 0);
    const uniqueUsers = new Set();
    sortedUIDs.forEach(([, data]) => data.users.forEach(u => uniqueUsers.add(u)));
    
    embed.addFields({
      name: lang === 'pt' ? '📊 Estatísticas' : '📊 Statistics',
      value: lang === 'pt'
        ? `**Total de UIDs:** ${uidData.size}\n**Menções totais:** ${totalMentions}\n**Usuários únicos:** ${uniqueUsers.size}`
        : `**Total UIDs:** ${uidData.size}\n**Total mentions:** ${totalMentions}\n**Unique users:** ${uniqueUsers.size}`,
      inline: false
    });
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('[uid-dima] Error:', error);
    const errorMsg = lang === 'pt'
      ? '❌ Erro ao buscar UIDs. Tente novamente mais tarde.'
      : '❌ Error fetching UIDs. Try again later.';
    await interaction.editReply({ content: errorMsg });
  }
}
