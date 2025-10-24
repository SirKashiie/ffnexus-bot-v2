# FFNexus Bot v2.0

Sistema inteligente de monitoramento para Discord com IA multi-camada.

## Funcionalidades

- `/doc` - Sistema de documentos com Google Drive e preview IA
- `/feedback` - Resumos inteligentes ou mensagens brutas
- `/diario_conselheiro` - Diário do canal Conselheiro (bilíngue)
- `/diario_aprendiz` - Diário do canal Aprendiz (bilíngue)
- Sistema de alertas de login com IA
- Resumo automático a cada 12h
- Suporte bilíngue (PT-BR/EN)

## Deploy Rápido

### Railway

1. Conecte este repositório ao Railway
2. Configure as variáveis de ambiente (ver `.env.example`)
3. Deploy automático

### Local

```bash
npm install
npm run deploy
npm start
```

## Configuração

Copie `.env.example` para `.env` e preencha:

- `DISCORD_TOKEN` - Token do bot
- `CLIENT_ID` - ID da aplicação
- `DIARY_CONSELHEIRO_CHANNEL_ID` - Canal do conselheiro
- `DIARY_APRENDIZ_CHANNEL_ID` - Canal do aprendiz
- Outras variáveis conforme necessário

## Arquitetura

- Node.js 20+
- Discord.js v14
- Google Drive OAuth2
- n8n Webhooks
- Sistema de cache inteligente

## Licença

MIT

