import { generateReportSummary } from './n8n.js';

export async function formatDiaryExecutive(messages, channelName, lang = 'pt') {
  const messagesData = messages.map(m => ({
    content: m.content,
    author: m.author.username,
    timestamp: m.createdAt.toISOString(),
    url: m.url
  }));
  
  const prompt = lang === 'pt' 
    ? `Analise as mensagens do canal ${channelName} e crie um relatório executivo profissional no seguinte formato:

Daily Community Report – [Data]

Topic: [Título do tópico principal]
Discussion Volume: [High/Medium/Low]
Overall Sentiment: [Positive/Negative/Neutral/Mixed]

Key Points:
[Análise detalhada em parágrafos, mantendo todos os links e dados importantes mencionados]

Links importantes:
[Liste todos os links mencionados nas mensagens]

IMPORTANTE: Mantenha TODOS os links originais, dados importantes e contexto. Escreva em parágrafos completos e profissionais.`
    : `Analyze the messages from ${channelName} channel and create a professional executive report in the following format:

Daily Community Report – [Date]

Topic: [Main topic title]
Discussion Volume: [High/Medium/Low]
Overall Sentiment: [Positive/Negative/Neutral/Mixed]

Key Points:
[Detailed analysis in paragraphs, keeping all links and important data mentioned]

Important Links:
[List all links mentioned in messages]

IMPORTANT: Keep ALL original links, important data and context. Write in complete professional paragraphs.`;
  
  const summary = await generateReportSummary(messagesData, 999999, lang);
  
  if (!summary) {
    return formatDiaryFallback(messages, channelName, lang);
  }
  
  return summary;
}

function formatDiaryFallback(messages, channelName, lang) {
  const date = new Date().toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const title = lang === 'pt' 
    ? `Relatório Diário da Comunidade – ${date}`
    : `Daily Community Report – ${date}`;
  
  const header = lang === 'pt'
    ? `Topic: Atividades do ${channelName}\nDiscussion Volume: ${messages.length > 50 ? 'High' : messages.length > 20 ? 'Medium' : 'Low'}\nOverall Sentiment: Mixed\n\nKey Points:`
    : `Topic: ${channelName} Activities\nDiscussion Volume: ${messages.length > 50 ? 'High' : messages.length > 20 ? 'Medium' : 'Low'}\nOverall Sentiment: Mixed\n\nKey Points:`;
  
  const content = messages.slice(0, 10).map(m => 
    `${m.author.username}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`
  ).join('\n\n');
  
  const links = messages
    .map(m => m.content.match(/https?:\/\/[^\s]+/g))
    .flat()
    .filter(Boolean)
    .slice(0, 10)
    .map((link, i) => `Link ${String(i + 1).padStart(2, '0')}: ${link}`)
    .join('\n');
  
  return `${title}\n\n${header}\n\n${content}\n\n${links ? `\n${links}` : ''}`;
}

