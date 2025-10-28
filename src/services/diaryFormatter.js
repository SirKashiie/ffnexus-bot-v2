import { generateReportSummary } from './n8n.js';

export async function formatDiaryExecutive(messages, channelName, lang = 'pt') {
  const messagesData = messages.map(m => ({
    content: m.content,
    author: m.author.username,
    timestamp: m.createdAt.toISOString(),
    url: m.url
  }));
  
  const prompt = lang === 'pt' 
    ? `Analise as mensagens do canal ${channelName} e crie um relatório executivo profissional.

Retorne um JSON com a seguinte estrutura EXATA:
{
  "date": "[Data em português por extenso, ex: 26 de outubro de 2025]",
  "topic": "[Título descritivo do tópico principal]",
  "volume": "[High/Medium/Low]",
  "sentiment": "[Positive/Negative/Neutral/Mixed]",
  "keyPoints": "[Análise detalhada em texto corrido, sem formatação markdown, sem asteriscos, sem emojis. Parágrafos completos e bem estruturados com mínimo 4-5 linhas cada. Use quebras de linha simples entre parágrafos. Preserve dados, números, nomes de usuários e contexto completo.]",
  "links": ["URL1", "URL2", "URL3"],
  "summary": "[Parágrafo final de conclusão com insights principais e recomendações, mínimo 3 linhas, sem formatação markdown, sem asteriscos, sem emojis]"
}

REGRAS CRÍTICAS:
- Retorne APENAS o JSON, sem texto adicional
- NÃO use formatação markdown (asteriscos, hashtags, etc)
- NÃO use emojis
- Texto limpo e profissional
- Preserve TODOS os links originais das mensagens
- Parágrafos completos e bem estruturados
- Mantenha dados, números e contexto completo`
    : `Analyze the messages from ${channelName} channel and create a professional executive report.

Return a JSON with this EXACT structure:
{
  "date": "[Date in English, spelled out, ex: October 26, 2025]",
  "topic": "[Descriptive title of main topic]",
  "volume": "[High/Medium/Low]",
  "sentiment": "[Positive/Negative/Neutral/Mixed]",
  "keyPoints": "[Detailed analysis in plain text, no markdown formatting, no asterisks, no emojis. Complete and well-structured paragraphs with minimum 4-5 lines each. Use simple line breaks between paragraphs. Preserve data, numbers, usernames and complete context.]",
  "links": ["URL1", "URL2", "URL3"],
  "summary": "[Final conclusion paragraph with main insights and recommendations, minimum 3 lines, no markdown formatting, no asterisks, no emojis]"
}

CRITICAL RULES:
- Return ONLY the JSON, no additional text
- DO NOT use markdown formatting (asterisks, hashtags, etc)
- DO NOT use emojis
- Clean and professional text
- Preserve ALL original message links
- Complete and well-structured paragraphs
- Keep data, numbers and complete context`;
  
  try {
    const summary = await generateReportSummary(messagesData, 999999, lang);
    
    if (!summary || summary.length < 50) {
      return formatDiaryFallback(messages, channelName, lang);
    }
    
    // Tenta parsear JSON
    try {
      const jsonMatch = summary.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return cleanupDiaryData(parsed);
      }
    } catch (e) {
      console.warn('[diaryFormatter] Não foi possível parsear JSON, usando fallback');
    }
    
    return formatDiaryFallback(messages, channelName, lang);
  } catch (error) {
    console.error('Erro ao gerar diário:', error);
    return formatDiaryFallback(messages, channelName, lang);
  }
}

function cleanupDiaryData(data) {
  // Remove formatação markdown e emojis
  const cleanText = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .trim();
  };
  
  return {
    date: cleanText(data.date),
    topic: cleanText(data.topic),
    volume: cleanText(data.volume),
    sentiment: cleanText(data.sentiment),
    keyPoints: cleanText(data.keyPoints),
    links: Array.isArray(data.links) ? data.links : [],
    summary: cleanText(data.summary)
  };
}

function formatDiaryFallback(messages, channelName, lang) {
  const date = new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const volume = messages.length > 50 ? 'High' : messages.length > 20 ? 'Medium' : 'Low';
  
  const topic = lang === 'pt'
    ? `Atividades do ${channelName}`
    : `${channelName} Activities`;
  
  // Agrupa mensagens por usuário
  const userMessages = {};
  messages.forEach(m => {
    if (!userMessages[m.author.username]) {
      userMessages[m.author.username] = [];
    }
    userMessages[m.author.username].push(m);
  });
  
  const keyPoints = lang === 'pt'
    ? `Foram coletadas ${messages.length} mensagens de ${Object.keys(userMessages).length} usuários diferentes no canal ${channelName}. As discussões abordaram diversos tópicos relacionados às atividades da comunidade. Os principais participantes foram: ${Object.keys(userMessages).slice(0, 5).join(', ')}. A interação demonstrou engajamento da comunidade com troca de informações e feedback sobre diferentes aspectos do jogo.`
    : `${messages.length} messages were collected from ${Object.keys(userMessages).length} different users in ${channelName} channel. Discussions covered various topics related to community activities. Main participants were: ${Object.keys(userMessages).slice(0, 5).join(', ')}. The interaction demonstrated community engagement with information exchange and feedback on different aspects of the game.`;
  
  const links = messages
    .slice(0, 10)
    .map(m => m.url)
    .filter(Boolean);
  
  const summary = lang === 'pt'
    ? `O canal ${channelName} apresentou volume ${volume.toLowerCase()} de atividade durante o período analisado. A participação da comunidade foi diversificada, com múltiplos membros contribuindo para as discussões. Os links das mensagens originais estão preservados para referência futura e análise detalhada.`
    : `The ${channelName} channel showed ${volume.toLowerCase()} activity volume during the analyzed period. Community participation was diverse, with multiple members contributing to discussions. Original message links are preserved for future reference and detailed analysis.`;
  
  return {
    date,
    topic,
    volume,
    sentiment: 'Mixed',
    keyPoints,
    links,
    summary
  };
}

