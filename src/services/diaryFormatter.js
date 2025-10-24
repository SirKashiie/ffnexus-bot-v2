import { generateReportSummary } from './n8n.js';

export async function formatDiaryExecutive(messages, channelName, lang = 'pt') {
  const messagesData = messages.map(m => ({
    content: m.content,
    author: m.author.username,
    timestamp: m.createdAt.toISOString(),
    url: m.url
  }));
  
  const prompt = lang === 'pt' 
    ? `Analise as mensagens do canal ${channelName} e crie um relatório executivo profissional no seguinte formato EXATO:

**Daily Community Report – [Data em português por extenso]**

**Topic:** [Título descritivo do tópico principal]
**Discussion Volume:** [High/Medium/Low]
**Overall Sentiment:** [Positive/Negative/Neutral/Mixed]

**Key Points:**

[Análise detalhada em parágrafos completos e bem formatados. Cada parágrafo deve ter no mínimo 4-5 linhas. Mantenha TODOS os links originais das mensagens. Use quebras de linha duplas entre parágrafos. Preserve dados, números, nomes de usuários e contexto completo. Organize por temas/assuntos relevantes.]

**Important Links:**

Link 01: [URL completa da mensagem]
Link 02: [URL completa da mensagem]
Link 03: [URL completa da mensagem]
[etc...]

**Summary:**

[Parágrafo final de conclusão com insights principais e recomendações, mínimo 3 linhas]

REGRAS CRÍTICAS:
- Mantenha TODOS os links originais completos (URLs das mensagens)
- Escreva em parágrafos completos e bem estruturados (mínimo 4 linhas cada)
- Use quebras de linha duplas entre seções e parágrafos
- Preserve todos os dados, números, nomes de usuários e contexto
- Formato limpo, organizado e profissional
- NÃO corte texto ou links
- NÃO use markdown excessivo, mantenha simples e legível`
    : `Analyze the messages from ${channelName} channel and create a professional executive report in this EXACT format:

**Daily Community Report – [Date in English, spelled out]**

**Topic:** [Descriptive title of main topic]
**Discussion Volume:** [High/Medium/Low]
**Overall Sentiment:** [Positive/Negative/Neutral/Mixed]

**Key Points:**

[Detailed analysis in complete, well-formatted paragraphs. Each paragraph should have at least 4-5 lines. Keep ALL original message links. Use double line breaks between paragraphs. Preserve data, numbers, usernames and complete context. Organize by relevant themes/topics.]

**Important Links:**

Link 01: [Complete message URL]
Link 02: [Complete message URL]
Link 03: [Complete message URL]
[etc...]

**Summary:**

[Final conclusion paragraph with main insights and recommendations, minimum 3 lines]

CRITICAL RULES:
- Keep ALL original complete links (message URLs)
- Write in complete, well-structured paragraphs (minimum 4 lines each)
- Use double line breaks between sections and paragraphs
- Preserve all data, numbers, usernames and context
- Clean, organized and professional format
- DO NOT cut text or links
- DO NOT use excessive markdown, keep it simple and readable`;
  
  try {
    const summary = await generateReportSummary(messagesData, 999999, lang);
    
    if (!summary || summary.length < 100) {
      return formatDiaryFallback(messages, channelName, lang);
    }
    
    return cleanupFormat(summary);
  } catch (error) {
    console.error('Erro ao gerar diário:', error);
    return formatDiaryFallback(messages, channelName, lang);
  }
}

function cleanupFormat(text) {
  return text
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\s+/gm, '')
    .replace(/\s+$/gm, '')
    .trim();
}

function formatDiaryFallback(messages, channelName, lang) {
  const date = new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const title = `**Daily Community Report – ${date}**`;
  
  const volume = messages.length > 50 ? 'High' : messages.length > 20 ? 'Medium' : 'Low';
  
  const header = lang === 'pt'
    ? `**Topic:** Atividades do ${channelName}\n**Discussion Volume:** ${volume}\n**Overall Sentiment:** Mixed`
    : `**Topic:** ${channelName} Activities\n**Discussion Volume:** ${volume}\n**Overall Sentiment:** Mixed`;
  
  const keyPointsTitle = lang === 'pt' ? '**Key Points:**' : '**Key Points:**';
  
  // Agrupa mensagens por data
  const groupedMessages = {};
  messages.forEach(m => {
    const dateKey = m.createdAt.toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US');
    if (!groupedMessages[dateKey]) groupedMessages[dateKey] = [];
    groupedMessages[dateKey].push(m);
  });
  
  // Gera conteúdo organizado por data
  const content = Object.entries(groupedMessages).slice(0, 5).map(([date, msgs]) => {
    const summary = msgs.slice(0, 5).map(m => {
      const text = m.content.slice(0, 400);
      const link = m.url;
      return `**${m.author.username}:** ${text}${m.content.length > 400 ? '...' : ''}\n[🔗 Ver mensagem completa](${link})`;
    }).join('\n\n');
    
    return `**${date}**\n\n${summary}`;
  }).join('\n\n---\n\n');
  
  // Extrai todos os links das mensagens
  const messageLinks = messages
    .slice(0, 20)
    .map(m => m.url)
    .filter(Boolean);
  
  const uniqueLinks = [...new Set(messageLinks)];
  
  const linksSection = uniqueLinks.length > 0
    ? `\n\n**${lang === 'pt' ? 'Important Links:' : 'Important Links:'}**\n\n${uniqueLinks.slice(0, 15).map((link, i) => `Link ${String(i + 1).padStart(2, '0')}: ${link}`).join('\n')}`
    : '';
  
  const summarySection = lang === 'pt'
    ? `\n\n**Summary:**\n\nForam analisadas ${messages.length} mensagens do canal ${channelName}. A discussão apresentou volume ${volume.toLowerCase()} de atividade, com participação de múltiplos membros da comunidade. Os principais tópicos abordados estão detalhados acima, com links diretos para as mensagens originais preservados para referência futura.`
    : `\n\n**Summary:**\n\n${messages.length} messages from ${channelName} channel were analyzed. The discussion showed ${volume.toLowerCase()} activity volume, with participation from multiple community members. The main topics discussed are detailed above, with direct links to original messages preserved for future reference.`;
  
  return `${title}\n\n${header}\n\n${keyPointsTitle}\n\n${content}${linksSection}${summarySection}`;
}

