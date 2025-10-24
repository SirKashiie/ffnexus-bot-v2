import 'dotenv/config';

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN?.trim() || '',
    clientId: process.env.CLIENT_ID?.trim() || '',
  },
  
  guilds: {
    source: process.env.SOURCE_GUILD_ID || '388600486552403980',
    dest: process.env.DEST_GUILD_ID || '1334909910923743334',
  },
  
  channels: {
    alert: process.env.ALERT_CHANNEL_ID || '1428687423805591623',
    autoReport: process.env.AUTO_REPORT_CHANNEL_ID || '1428241618309349397',
    commands: process.env.COMMANDS_CHANNEL_ID || '1334913231327727768',
    diaryConselheiro: process.env.DIARY_CONSELHEIRO_CHANNEL_ID || '',
    diaryAprendiz: process.env.DIARY_APRENDIZ_CHANNEL_ID || '',
  },
  
  n8n: {
    reportUrl: process.env.N8N_REPORT_WEBHOOK_URL || 'https://sirkashiie-modff.app.n8n.cloud/webhook/report-summarize',
    docUrl: process.env.N8N_DOC_WEBHOOK_URL || 'https://sirkashiie-modff.app.n8n.cloud/webhook/doc-summarize',
    incidentUrl: process.env.N8N_INCIDENT_CLASSIFY_WEBHOOK_URL || 'https://sirkashiie-modff.app.n8n.cloud/webhook/incident-classify',
  },
  
  drive: {
    folderId: process.env.GDRIVE_FOLDER_ID || '',
    clientEmail: process.env.GDRIVE_CLIENT_EMAIL || '',
    privateKey: (process.env.GDRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  
  incident: {
    windowMin: Number(process.env.INCIDENT_WINDOW_MIN || 60),
    threshold: Number(process.env.INCIDENT_THRESHOLD || 1),
    aiEnabled: process.env.INCIDENT_AI_ENABLED !== 'false',
    aiMinScore: Number(process.env.INCIDENT_AI_MIN_SCORE || 0.6),
  },
  
  autoReport: {
    hours: Number(process.env.AUTO_REPORT_HOURS || 12),
  },
  
  theme: {
    primary: Number(process.env.THEME_PRIMARY_COLOR || 0x000000),
    accent: Number(process.env.THEME_ACCENT_COLOR || 0xD00000),
    garenaIcon: process.env.THEME_GARENA_ICON_URL || 'https://cdn.discordapp.com/attachments/1334913231327727768/1429906575925182605/logo-escudo-garena-256-1.png',
    ffBadge: process.env.THEME_FF_BADGE_URL || '',
  },
  
  timezone: process.env.TIMEZONE || 'America/Sao_Paulo',
  port: Number(process.env.PORT || 3000),
};

