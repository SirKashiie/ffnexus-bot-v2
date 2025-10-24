export const translations = {
  pt: {
    chooseLang: '🗣️ Selecione o idioma / Select language',
    chooseLangDesc: 'Escolha o idioma para continuar.\n\n🇧🇷 Português • 🇺🇸 English',
    btnPT: 'Português',
    btnEN: 'English',
    
    chooseAction: 'Escolha uma opção',
    chooseActionDesc: 'Use os botões abaixo:\n• 🔍 Pesquisar documento — por nome/palavra-chave\n• 📚 Todos os arquivos — lista paginada',
    searchBtn: '🔍 Pesquisar documento',
    allBtn: '📚 Todos os arquivos',
    
    modalTitle: 'Pesquisar no Drive',
    modalLabel: 'Nome contém',
    selectDocs: 'Selecione até 5 documentos (pode navegar entre páginas sem perder a seleção).',
    selectPlaceholder: 'Selecione 1 a 5 documentos',
    pageInfo: (p, t) => `Página ${p} • ${t} itens`,
    noneFound: 'Nenhum documento encontrado.',
    timeout: '⏰ Tempo esgotado.',
    
    confirmAction: 'Confirme a ação',
    previewBtn: '🧠 Resumo IA (n8n)',
    downloadBtn: '⬇️ Baixar',
    indexBtn: '📌 Publicar no chat',
    readPrivateBtn: '👀 Ler em privado',
    backBtn: '↩️ Voltar',
    
    previewTitle: '🧾 Preview dos documentos',
    buildingSummary: 'Gerando resumo via n8n…',
    summaryFailed: 'Falha ao gerar o resumo (n8n).',
    linksTitle: '📎 Links',
    navPrev: '◀️ Anterior',
    navNext: 'Próximo ▶️',
    close: 'Fechar',
    sentPublic: '✅ Publicado no chat.',
    nothingPicked: 'Selecione ao menos 1 documento.',
    
    feedbackTitle: '📊 Resumo de Atividades',
    feedbackDesc: 'Escolha o tipo de relatório:',
    feedbackAI: '🤖 Resumo IA',
    feedbackRaw: '📝 Mensagens Brutas',
    feedbackPeriod: 'Período (horas):',
    
    diaryTitle: '📖 Diário',
    diaryLoading: 'Carregando mensagens...',
    diaryEmpty: 'Nenhuma mensagem encontrada neste canal.',
    diaryFooter: 'FFNexus • Diário',
  },
  
  en: {
    chooseLang: '🗣️ Select language',
    chooseLangDesc: 'Choose a language to continue.\n\n🇧🇷 Portuguese • 🇺🇸 English',
    btnPT: 'Portuguese',
    btnEN: 'English',
    
    chooseAction: 'Choose an option',
    chooseActionDesc: 'Use the buttons below:\n• 🔍 Search — by name/keyword\n• 📚 All files — paginated list',
    searchBtn: '🔍 Search',
    allBtn: '📚 All files',
    
    modalTitle: 'Search Drive',
    modalLabel: 'Name contains',
    selectDocs: 'Pick up to 5 files (you can change pages and keep your selection).',
    selectPlaceholder: 'Pick 1 to 5 files',
    pageInfo: (p, t) => `Page ${p} • ${t} items`,
    noneFound: 'No documents found.',
    timeout: '⏰ Timed out.',
    
    confirmAction: 'Confirm action',
    previewBtn: '🧠 AI Summary (n8n)',
    downloadBtn: '⬇️ Download',
    indexBtn: '📌 Post to chat',
    readPrivateBtn: '👀 Read privately',
    backBtn: '↩️ Back',
    
    previewTitle: '🧾 Documents preview',
    buildingSummary: 'Generating summary via n8n…',
    summaryFailed: 'Summary failed (n8n).',
    linksTitle: '📎 Links',
    navPrev: '◀️ Prev',
    navNext: 'Next ▶️',
    close: 'Close',
    sentPublic: '✅ Posted to chat.',
    nothingPicked: 'Pick at least 1 file.',
    
    feedbackTitle: '📊 Activity Summary',
    feedbackDesc: 'Choose report type:',
    feedbackAI: '🤖 AI Summary',
    feedbackRaw: '📝 Raw Messages',
    feedbackPeriod: 'Period (hours):',
    
    diaryTitle: '📖 Diary',
    diaryLoading: 'Loading messages...',
    diaryEmpty: 'No messages found in this channel.',
    diaryFooter: 'FFNexus • Diary',
  },
};

export function t(lang, key, ...args) {
  const text = translations[lang]?.[key] || translations.pt[key] || key;
  return typeof text === 'function' ? text(...args) : text;
}

