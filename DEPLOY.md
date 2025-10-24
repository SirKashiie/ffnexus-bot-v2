# Guia de Deploy - FFNexus Bot v2.0

## Railway (Recomendado)

### 1. Conectar Repositório

1. Acesse https://railway.app
2. New Project > Deploy from GitHub repo
3. Selecione `SirKashiie/ffnexus-bot`
4. Deploy Now

### 2. Configurar Variáveis de Ambiente

Na aba Variables, adicione:

```env
DISCORD_TOKEN=SEU_TOKEN_AQUI
CLIENT_ID=1414673589810233424

SOURCE_GUILD_ID=388600486552403980
DEST_GUILD_ID=1334909910923743334
ALERT_CHANNEL_ID=1428687423805591623
AUTO_REPORT_CHANNEL_ID=1428241618309349397
COMMANDS_CHANNEL_ID=1334913231327727768

DIARY_CONSELHEIRO_CHANNEL_ID=SEU_ID_AQUI
DIARY_APRENDIZ_CHANNEL_ID=SEU_ID_AQUI

N8N_REPORT_WEBHOOK_URL=https://sirkashiie-modff.app.n8n.cloud/webhook/report-summarize
N8N_DOC_WEBHOOK_URL=https://sirkashiie-modff.app.n8n.cloud/webhook/doc-summarize
N8N_INCIDENT_CLASSIFY_WEBHOOK_URL=https://sirkashiie-modff.app.n8n.cloud/webhook/incident-classify

GDRIVE_FOLDER_ID=SEU_ID_AQUI
GDRIVE_CLIENT_EMAIL=SEU_EMAIL_AQUI
GDRIVE_PRIVATE_KEY=SUA_CHAVE_AQUI

INCIDENT_WINDOW_MIN=10
INCIDENT_THRESHOLD=1
INCIDENT_AI_ENABLED=true
INCIDENT_AI_MIN_SCORE=0.6

AUTO_REPORT_HOURS=12
TIMEZONE=America/Sao_Paulo

THEME_PRIMARY_COLOR=0x000000
THEME_ACCENT_COLOR=0xD00000
THEME_GARENA_ICON_URL=https://cdn.discordapp.com/attachments/1334913231327727768/1429906575925182605/logo-escudo-garena-256-1.png

PORT=3000
```

### 3. Registrar Comandos

Localmente:
```bash
npm install
npm run deploy
```

### 4. Verificar

- Veja os logs no Railway
- Teste `/doc` no Discord
- Confirme alertas funcionando

## Troubleshooting

### Bot não conecta
- Verifique DISCORD_TOKEN
- Veja logs do Railway

### Comandos não aparecem
- Execute `npm run deploy`
- Aguarde até 1 hora

### Alertas não funcionam
- Confirme ALERT_CHANNEL_ID
- Verifique n8n webhooks

## Suporte

Veja logs em tempo real no Railway para diagnóstico.

