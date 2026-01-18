/**
 * Validador de Configuração
 * Valida todas as variáveis de ambiente necessárias no startup
 */

import { config } from './config.js';

const REQUIRED_VARS = {
  'DISCORD_TOKEN': 'Token do Discord (obrigatório)',
  'CLIENT_ID': 'ID da aplicação Discord (obrigatório)',
  'SOURCE_GUILD_ID': 'ID do servidor de origem (obrigatório)',
  'DEST_GUILD_ID': 'ID do servidor de destino (obrigatório)',
  'ALERT_CHANNEL_ID': 'ID do canal de alertas (obrigatório)',
};

const OPTIONAL_VARS = {
  'AUTO_REPORT_CHANNEL_ID': 'ID do canal de resumos automáticos',
  'COMMANDS_CHANNEL_ID': 'ID do canal de comandos',
  'DIARY_CONSELHEIRO_CHANNEL_ID': 'ID do canal Conselheiro',
  'DIARY_APRENDIZ_CHANNEL_ID': 'ID do canal Aprendiz',
  'GDRIVE_FOLDER_ID': 'ID da pasta do Google Drive',
  'GDRIVE_CLIENT_EMAIL': 'Email da service account Google Drive',
  'GDRIVE_PRIVATE_KEY': 'Chave privada Google Drive',
  'N8N_REPORT_WEBHOOK_URL': 'Webhook n8n para resumos',
  'N8N_DOC_WEBHOOK_URL': 'Webhook n8n para documentos',
  'N8N_INCIDENT_CLASSIFY_WEBHOOK_URL': 'Webhook n8n para classificação',
};

/**
 * Validar se uma string é um ID válido do Discord
 */
export function isValidDiscordId(id) {
  return /^\d{18,19}$/.test(id);
}

/**
 * Validar se uma URL é válida
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validar token do Discord (formato básico)
 */
export function isValidDiscordToken(token) {
  // Token deve ter pelo menos 50 caracteres e conter pontos
  return token && token.length > 50 && token.includes('.');
}

/**
 * Executar validações
 */
export function validateConfig() {
  const errors = [];
  const warnings = [];

  console.log('[config-validator] Validando configuração...');

  // Validar variáveis obrigatórias
  for (const [varName, description] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      errors.push(`❌ ${varName}: ${description} - NÃO CONFIGURADO`);
      continue;
    }

    // Validações específicas
    if (varName === 'DISCORD_TOKEN') {
      if (!isValidDiscordToken(value)) {
        errors.push(`❌ ${varName}: Token inválido (formato incorreto)`);
      }
    } else if (varName.includes('_ID')) {
      if (!isValidDiscordId(value)) {
        errors.push(`❌ ${varName}: ID inválido (deve ser número com 18-19 dígitos)`);
      }
    }
  }

  // Validar variáveis opcionais (apenas se configuradas)
  for (const [varName, description] of Object.entries(OPTIONAL_VARS)) {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
      warnings.push(`⚠️  ${varName}: ${description} - NÃO CONFIGURADO (opcional)`);
      continue;
    }

    // Validações específicas
    if (varName.includes('_ID')) {
      if (!isValidDiscordId(value)) {
        warnings.push(`⚠️  ${varName}: ID inválido (deve ser número com 18-19 dígitos)`);
      }
    } else if (varName.includes('WEBHOOK_URL') || varName.includes('GDRIVE')) {
      if (varName.includes('WEBHOOK_URL') && !isValidUrl(value)) {
        warnings.push(`⚠️  ${varName}: URL inválida`);
      }
    }
  }

  // Validações adicionais
  if (config.incident.windowMin < 1) {
    warnings.push(`⚠️  INCIDENT_WINDOW_MIN: Deve ser >= 1 minuto`);
  }

  if (config.incident.aiMinScore < 0 || config.incident.aiMinScore > 1) {
    warnings.push(`⚠️  INCIDENT_AI_MIN_SCORE: Deve estar entre 0 e 1`);
  }

  if (config.autoReport.hours < 1) {
    warnings.push(`⚠️  AUTO_REPORT_HOURS: Deve ser >= 1 hora`);
  }

  // Exibir resultados
  console.log('\n============================================================');
  console.log('🔍 VALIDAÇÃO DE CONFIGURAÇÃO');
  console.log('============================================================');

  if (errors.length === 0) {
    console.log('✅ Todas as variáveis obrigatórias estão configuradas!');
  } else {
    console.log(`❌ ${errors.length} erro(s) encontrado(s):\n`);
    errors.forEach((error) => console.log(`   ${error}`));
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} aviso(s):\n`);
    warnings.forEach((warning) => console.log(`   ${warning}`));
  }

  console.log('\n============================================================\n');

  // Se houver erros, parar o bot
  if (errors.length > 0) {
    console.error('❌ Configuração inválida. Bot não pode iniciar.');
    console.error('\n📖 Para configurar as variáveis, veja: SETUP_GUIDE.md\n');
    process.exit(1);
  }

  console.log('[config-validator] ✅ Configuração validada com sucesso!\n');
}

export default {
  validateConfig,
  isValidDiscordId,
  isValidUrl,
  isValidDiscordToken,
};
