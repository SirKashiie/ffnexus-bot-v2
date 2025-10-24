const userLanguages = new Map();

export function getUserLanguage(userId) {
  return userLanguages.get(userId) || null;
}

export function setUserLanguage(userId, lang) {
  userLanguages.set(userId, lang);
}

export function detectLanguage(interaction) {
  const userId = interaction.user.id;
  const saved = getUserLanguage(userId);
  
  if (saved) return saved;
  
  return interaction.locale?.startsWith('pt') ? 'pt' : 'en';
}

