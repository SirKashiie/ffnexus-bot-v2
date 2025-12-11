import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';
import { formatDiaryExecutive } from './diaryFormatter.js';

/**
 * Busca mensagens do dia atual de um canal
 */
async function fetchTodayMessages(channel) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  
  const messages = [];
  let lastId;
  
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    
    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;
    
    for (const msg of batch.values()) {
      if (msg.createdAt < startOfDay) {
        return messages.reverse();
      }
      if (!msg.author.bot) {
        messages.push(msg);
      }
    }
    
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }
  
  return messages.reverse();
}

/**
 * Cria embed visual limpo para diário
 */
function createDiaryEmbed(diaryData, channelName, lang) {
  // Apenas PT-BR é suportado agora
  const title = `Diario ${channelName}`;
  
  const embed = new EmbedBuilder()
    .setColor(config.theme.primary)
    .setTitle(title)
    .setThumbnail(config.theme.ffBadge)
    .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon })
    .setTimestamp();
  
  // Daily Report
  embed.addFields({
    name: 'Relatório Diário',
    value: diaryData.date,
    inline: false
  });
  
  // Topic
  if (diaryData.topic) {
    embed.addFields({
      name: 'Tópico Principal',
      value: diaryData.topic,
      inline: false
    });
  }
  
  // Volume
  if (diaryData.volume) {
    embed.addFields({
      name: 'Volume de Mensagens',
      value: diaryData.volume,
      inline: true
    });
  }
  
  // Sentiment
  if (diaryData.sentiment) {
    embed.addFields({
      name: 'Sentimento',
      value: diaryData.sentiment,
      inline: true
    });
  }
  
  // Key Points
  if (diaryData.keyPoints) {
    // Divide em múltiplos campos se necessário (limite de 1024 chars por campo)
    const chunks = splitIntoChunks(diaryData.keyPoints, 1024);
    chunks.forEach((chunk, index) => {
      embed.addFields({
        name: index === 0 ? 'Pontos Chave' : '\u200B',
        value: chunk,
        inline: false
      });
    });
  }
  
  // Links
  if (diaryData.links && diaryData.links.length > 0) {
    const linksText = diaryData.links.slice(0, 10).map((link, i) => 
      `Link ${String(i + 1).padStart(2, '0')}: ${link}`
    ).join('\n');
    
    embed.addFields({
      name: 'Links de Referência',
      value: linksText || 'Nenhum link',
      inline: false
    });
  }
  
  // Summary
  if (diaryData.summary) {
    const chunks = splitIntoChunks(diaryData.summary, 1024);
    chunks.forEach((chunk, index) => {
      embed.addFields({
        name: index === 0 ? 'Resumo Executivo' : '\u200B',
        value: chunk,
        inline: false
      });
    });
  }
  
  return embed;
}

/**
 * Divide texto em chunks para respeitar limite do Discord
 */
function splitIntoChunks(text, maxLength) {
  if (text.length <= maxLength) return [text];
  
  const chunks = [];
  let current = '';
  
  const sentences = text.split('. ');
  
  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = sentence + '. ';
    } else {
      current += sentence + '. ';
    }
  }
  
  if (current) chunks.push(current.trim());
  
  return chunks;
}

/**
 * Gera e envia diário automático para um canal
 */
async function generateDiary(client, sourceChannelId, channelName, lang) {
  try {
    const sourceChannel = await client.channels.fetch(sourceChannelId).catch(() => null);
    if (!sourceChannel) {
      console.error(`[autoDiary] Canal ${channelName} não encontrado: ${sourceChannelId}`);
      return null;
    }
    
    const messages = await fetchTodayMessages(sourceChannel);
    
    if (messages.length === 0) {
      const noFeedbackText = `Hoje não teve feedback diário no canal ${channelName}.`;
      
      return new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(`Diario ${channelName}`)
        .setDescription(noFeedbackText)
        .setThumbnail(config.theme.ffBadge)
        .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon })
        .setTimestamp();
    }
    
    const diaryData = await formatDiaryExecutive(messages, channelName, lang);
    
    return createDiaryEmbed(diaryData, channelName, lang);
  } catch (error) {
    console.error(`[autoDiary] Erro ao gerar diário ${channelName} (${lang}):`, error);
    return null;
  }
}

/**
 * Executa geração automática de todos os diários (Apenas PT)
 */
export async function runAutoDiary(client) {
  console.log('[autoDiary] Iniciando geração automática de diários...');
  
  const destChannelId = config.channels.autoReport;
  const destChannel = await client.channels.fetch(destChannelId).catch(() => null);
  
  if (!destChannel) {
    console.error(`[autoDiary] Canal de destino não encontrado: ${destChannelId}`);
    return;
  }
  
  const diaries = [
    { id: config.channels.diaryConselheiro, name: 'Conselheiro' },
    { id: config.channels.diaryAprendiz, name: 'Aprendiz' }
  ];
  
  for (const diary of diaries) {
    if (!diary.id) {
      console.warn(`[autoDiary] Canal ${diary.name} não configurado, pulando...`);
      continue;
    }
    
    // Gera apenas a versão PT (Versão EN removida a pedido do usuário)
    const embedPT = await generateDiary(client, diary.id, diary.name, 'pt');
    if (embedPT) {
      await destChannel.send({ embeds: [embedPT] });
      console.log(`[autoDiary] ✅ Diário ${diary.name} (PT) enviado`);
    }
    
    // Aguarda 2 segundos antes do próximo canal
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('[autoDiary] ✅ Geração automática concluída!');
}

