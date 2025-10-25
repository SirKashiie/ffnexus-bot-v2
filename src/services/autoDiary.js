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
      const noFeedbackText = lang === 'pt' 
        ? `Hoje não teve feedback diário no canal ${channelName}.`
        : `No daily feedback today in ${channelName} channel.`;
      
      return {
        embed: new EmbedBuilder()
          .setColor(config.theme.primary)
          .setTitle(lang === 'pt' ? `📋 Diário ${channelName}` : `📋 ${channelName} Diary`)
          .setDescription(noFeedbackText)
          .setThumbnail(config.theme.ffBadge)
          .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon })
          .setTimestamp(),
        files: []
      };
    }
    
    const diaryContent = await formatDiaryExecutive(messages, channelName, lang);
    
    const fileName = `diario_${channelName.toLowerCase()}_${new Date().toISOString().split('T')[0]}_${lang}.md`;
    const buffer = Buffer.from(diaryContent, 'utf-8');
    
    const titleText = lang === 'pt' 
      ? `📋 Diário ${channelName} - ${new Date().toLocaleDateString('pt-BR')}`
      : `📋 ${channelName} Diary - ${new Date().toLocaleDateString('en-US')}`;
    
    const descText = lang === 'pt'
      ? `**${messages.length} mensagens** coletadas e analisadas automaticamente.`
      : `**${messages.length} messages** collected and analyzed automatically.`;
    
    return {
      embed: new EmbedBuilder()
        .setColor(config.theme.primary)
        .setTitle(titleText)
        .setDescription(descText)
        .setThumbnail(config.theme.ffBadge)
        .setFooter({ text: 'FFNexus', iconURL: config.theme.garenaIcon })
        .setTimestamp(),
      files: [{ attachment: buffer, name: fileName }]
    };
  } catch (error) {
    console.error(`[autoDiary] Erro ao gerar diário ${channelName} (${lang}):`, error);
    return null;
  }
}

/**
 * Executa geração automática de todos os diários (PT + EN)
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
    
    // Gera versão PT
    const resultPT = await generateDiary(client, diary.id, diary.name, 'pt');
    if (resultPT) {
      await destChannel.send({ embeds: [resultPT.embed], files: resultPT.files });
      console.log(`[autoDiary] ✅ Diário ${diary.name} (PT) enviado`);
    }
    
    // Aguarda 2 segundos entre envios
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Gera versão EN
    const resultEN = await generateDiary(client, diary.id, diary.name, 'en');
    if (resultEN) {
      await destChannel.send({ embeds: [resultEN.embed], files: resultEN.files });
      console.log(`[autoDiary] ✅ Diário ${diary.name} (EN) enviado`);
    }
    
    // Aguarda 2 segundos antes do próximo canal
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('[autoDiary] ✅ Geração automática concluída!');
}

