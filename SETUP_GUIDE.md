# 🚀 Guia de Setup - FFNexus Bot v2.0

## Pré-requisitos

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git
- Discord Bot Token

## Instalação

```bash
git clone https://github.com/SirKashiie/ffnexus-bot-v2.git
cd ffnexus-bot-v2
npm install
```

## Configuração

### 1. Discord Bot Token

1. Acesse https://discord.com/developers/applications
2. Clique em "New Application"
3. Vá para "Bot" e clique "Add Bot"
4. Copie o token

### 2. Variáveis Obrigatórias

Configure as seguintes variáveis de ambiente:

- `DISCORD_TOKEN` - Token do bot
- `CLIENT_ID` - ID da aplicação
- `SOURCE_GUILD_ID` - ID do servidor de origem
- `DEST_GUILD_ID` - ID do servidor de destino
- `ALERT_CHANNEL_ID` - ID do canal de alertas

### 3. Iniciar Bot

```bash
npm start        # Produção
npm run dev      # Desenvolvimento
npm test         # Testes
```

## Troubleshooting

- **TokenInvalid**: Verifique o token
- **Missing Permissions**: Configure permissões no Discord Developer Portal
- **Variáveis não carregam**: Reinicie o bot

Para mais informações, veja [README.md](./README.md)
