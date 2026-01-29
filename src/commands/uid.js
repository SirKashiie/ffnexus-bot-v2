import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { config } from '../config.js';
import { detectLanguage } from '../utils/i18n.js';

export const data = new SlashCommandBuilder()
  .setName('uid-dima')
  .setDescription('Extrai TODOS os UIDs de jogadores de Free Fire do canal monitorado')
  .setDescriptionLocalizations({
    'en-US': 'Extract ALL Free Fire player UIDs from monitored channel',
    'pt-BR': 'Extrai TODOS os UIDs de jogadores de Free Fire do canal monitorado'
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

/**
 * Busca TODAS as mensagens de um canal (sem limite de tempo)
 * Usa paginação para contornar o limite de 100 mensagens por requisição
 */
async function fetchAllMessages(channel, statusCallback) {
  const allMessages = [];
  let lastMessageId = null;
  let fetchCount = 0;
  
  while (true) {
    const options = { limit: 100 };
    if (lastMessageId) {
      options.before = lastMessageId;
    }
    
    const messages = await channel.messages.fetch(options).catch(() => null);
    
    if (!messages || messages.size === 0) {
      break;
    }
    
    allMessages.push(...messages.values());
    lastMessageId = messages.last().id;
    fetchCount++;
    
    // Callback para atualizar status
    if (statusCallback) {
      await statusCallback(allMessages.length, fetchCount);
    }
    
    // Pequena pausa para evitar rate limiting
    if (fetchCount % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return allMessages;
}

export async function execute(interaction) {
  const lang = detectLanguage(interaction);
  
  await interaction.deferReply({ ephemeral: false });
  
  try {
    // Canal fonte fixo: 1433209029437689917
    const sourceChannelId = '1433209029437689917';
    
    // Busca o canal fonte
    const sourceChannel = await interaction.client.channels.fetch(sourceChannelId).catch(() => null);
    
    if (!sourceChannel) {
      const errorMsg = lang === 'pt' 
        ? '❌ Não foi possível acessar o canal de origem. Verifique as permissões do bot.'
        : '❌ Could not access source channel. Check bot permissions.';
      return interaction.editReply({ content: errorMsg });
    }
    
    // Atualiza status enquanto busca mensagens
    let lastUpdate = Date.now();
    const statusCallback = async (count, batches) => {
      const now = Date.now();
      // Atualiza a cada 3 segundos para evitar rate limiting
      if (now - lastUpdate > 3000) {
        lastUpdate = now;
        const statusMsg = lang === 'pt'
          ? `⏳ Buscando mensagens... ${count} encontradas (${batches} lotes)`
          : `⏳ Fetching messages... ${count} found (${batches} batches)`;
        await interaction.editReply({ content: statusMsg }).catch(() => {});
      }
    };
    
    // Busca TODAS as mensagens do canal
    const messages = await fetchAllMessages(sourceChannel, statusCallback);
    
    if (!messages || messages.length === 0) {
      const errorMsg = lang === 'pt'
        ? '❌ Nenhuma mensagem encontrada no canal de origem.'
        : '❌ No messages found in source channel.';
      return interaction.editReply({ content: errorMsg });
    }
    
    // Estrutura para armazenar dados: UID FF -> { discordUser, discordId, ffUID, messageUrl, timestamp }
    const uidRecords = [];
    const seenCombinations = new Set(); // Para evitar duplicatas exatas
    
    for (const message of messages) {
      if (message.author.bot) continue;
      
      const uids = extractUIDs(message.content);
      
      for (const uid of uids) {
        const combinationKey = `${message.author.id}-${uid}`;
        
        // Evita duplicatas do mesmo usuário com o mesmo UID
        if (!seenCombinations.has(combinationKey)) {
          seenCombinations.add(combinationKey);
          
          uidRecords.push({
            discordUsername: message.author.tag || message.author.username,
            discordId: message.author.id,
            ffUID: uid,
            messageUrl: message.url,
            timestamp: message.createdAt.toISOString()
          });
        }
      }
    }
    
    if (uidRecords.length === 0) {
      const noUIDMsg = lang === 'pt'
        ? `📋 Nenhum UID encontrado em ${messages.length} mensagens do canal monitorado.`
        : `📋 No UIDs found in ${messages.length} messages from monitored channel.`;
      return interaction.editReply({ content: noUIDMsg });
    }
    
    // Ordena por timestamp (mais recentes primeiro)
    uidRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Cria arquivo CSV com todos os dados
    const csvHeader = 'Discord Username,Discord UID,Free Fire UID,Message URL,Timestamp\n';
    const csvContent = uidRecords.map(r => 
      `"${r.discordUsername}","${r.discordId}","${r.ffUID}","${r.messageUrl}","${r.timestamp}"`
    ).join('\n');
    
    const csvBuffer = Buffer.from(csvHeader + csvContent, 'utf-8');
    const csvAttachment = new AttachmentBuilder(csvBuffer, { name: 'ffnexus_uids_completo.csv' });
    
    // Cria arquivo TXT com formato mais legível
    const txtHeader = `=== FFNexus - Lista Completa de UIDs ===\n`;
    const txtInfo = `Total de registros: ${uidRecords.length}\nMensagens analisadas: ${messages.length}\nGerado em: ${new Date().toISOString()}\n\n`;
    const txtDivider = '─'.repeat(80) + '\n';
    const txtContent = uidRecords.map((r, i) => 
      `#${i + 1}\nDiscord: ${r.discordUsername}\nDiscord UID: ${r.discordId}\nFree Fire UID: ${r.ffUID}\nData: ${r.timestamp}\n`
    ).join(txtDivider);
    
    const txtBuffer = Buffer.from(txtHeader + txtInfo + txtDivider + txtContent, 'utf-8');
    const txtAttachment = new AttachmentBuilder(txtBuffer, { name: 'ffnexus_uids_completo.txt' });
    
    // Cria embed com resumo
    const embed = new EmbedBuilder()
      .setColor(config.theme.primary)
      .setTitle(lang === 'pt' ? '🎮 Lista Completa de UIDs Free Fire' : '🎮 Complete Free Fire UID List')
      .setDescription(
        lang === 'pt'
          ? `✅ Busca completa finalizada!\n\n**📊 Estatísticas:**\n• Mensagens analisadas: **${messages.length.toLocaleString()}**\n• Registros únicos encontrados: **${uidRecords.length.toLocaleString()}**\n• Usuários únicos: **${new Set(uidRecords.map(r => r.discordId)).size}**\n• UIDs únicos: **${new Set(uidRecords.map(r => r.ffUID)).size}**`
          : `✅ Complete search finished!\n\n**📊 Statistics:**\n• Messages analyzed: **${messages.length.toLocaleString()}**\n• Unique records found: **${uidRecords.length.toLocaleString()}**\n• Unique users: **${new Set(uidRecords.map(r => r.discordId)).size}**\n• Unique UIDs: **${new Set(uidRecords.map(r => r.ffUID)).size}**`
      )
      .setThumbnail(config.theme.ffBadge)
      .setFooter({ 
        text: lang === 'pt' ? 'FFNexus • Garena BR • Lista Completa' : 'FFNexus • Garena BR • Complete List',
        iconURL: config.theme.garenaIcon 
      })
      .setTimestamp();
    
    // Mostra preview dos primeiros 10 registros no embed
    const previewRecords = uidRecords.slice(0, 10);
    let previewText = '';
    for (const record of previewRecords) {
      previewText += `**${record.discordUsername}** (${record.discordId})\n└ FF UID: \`${record.ffUID}\`\n`;
    }
    
    if (uidRecords.length > 10) {
      previewText += `\n... e mais ${uidRecords.length - 10} registros nos arquivos anexos.`;
    }
    
    embed.addFields({
      name: lang === 'pt' ? '📋 Preview (10 primeiros)' : '📋 Preview (first 10)',
      value: previewText || 'Nenhum registro',
      inline: false
    });
    
    embed.addFields({
      name: lang === 'pt' ? '📁 Arquivos Anexos' : '📁 Attached Files',
      value: lang === 'pt'
        ? '• **CSV**: Formato para Excel/Planilhas\n• **TXT**: Formato legível'
        : '• **CSV**: Excel/Spreadsheet format\n• **TXT**: Human-readable format',
      inline: false
    });
    
    await interaction.editReply({ 
      embeds: [embed], 
      files: [csvAttachment, txtAttachment] 
    });
    
  } catch (error) {
    console.error('[uid-dima] Error:', error);
    const errorMsg = lang === 'pt'
      ? '❌ Erro ao buscar UIDs. Tente novamente mais tarde.'
      : '❌ Error fetching UIDs. Try again later.';
    await interaction.editReply({ content: errorMsg });
  }
}
