# Checklist de Deploy - FFNexus Bot v2.0

## ✅ Pré-Deploy

- [x] Código enviado para GitHub
- [x] Todas as funcionalidades implementadas
- [x] Testes de sintaxe passando
- [ ] IDs dos canais de diário configurados
- [ ] Credenciais do Google Drive configuradas

## 📋 Deploy no Railway

### Passo 1: Criar Projeto
1. Acesse https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha `SirKashiie/ffnexus-bot`
5. Clique em "Deploy Now"

### Passo 2: Configurar Variáveis

Na aba "Variables", adicione TODAS as variáveis do arquivo `.env.example`:

**Obrigatórias:**
- `DISCORD_TOKEN` (já preenchido)
- `CLIENT_ID` (já preenchido)
- `SOURCE_GUILD_ID` (já preenchido)
- `DEST_GUILD_ID` (já preenchido)
- `ALERT_CHANNEL_ID` (já preenchido)
- `AUTO_REPORT_CHANNEL_ID` (já preenchido)
- `COMMANDS_CHANNEL_ID` (já preenchido)

**Pendentes:**
- `DIARY_CONSELHEIRO_CHANNEL_ID` - ID do canal Conselheiro
- `DIARY_APRENDIZ_CHANNEL_ID` - ID do canal Aprendiz
- `GDRIVE_FOLDER_ID` - ID da pasta do Drive
- `GDRIVE_CLIENT_EMAIL` - Email da service account
- `GDRIVE_PRIVATE_KEY` - Chave privada (com \\n)

**Webhooks n8n (já configurados):**
- `N8N_REPORT_WEBHOOK_URL`
- `N8N_DOC_WEBHOOK_URL`
- `N8N_INCIDENT_CLASSIFY_WEBHOOK_URL`

### Passo 3: Aguardar Deploy

O Railway vai:
1. Baixar o código
2. Instalar dependências
3. Construir Docker image
4. Iniciar o bot

Tempo estimado: 2-5 minutos

### Passo 4: Verificar Logs

Na aba "Deployments", clique no deploy ativo e veja os logs.

Você deve ver:
```
============================================================
🤖 FFNexus Bot - Sistema Inteligente de Monitoramento
============================================================
✅ Bot conectado como: FFNexus#1234
🌐 Servidores: 2
👥 Usuários: 1500
============================================================
📋 Funcionalidades Ativas:
  ✓ Comandos /doc, /feedback, /diario_*
  ✓ Sistema de alerta de login com IA
  ✓ Resumo automático a cada 12h
  ✓ Monitoramento inteligente de mensagens
============================================================
🚀 Bot totalmente operacional!
============================================================
```

## 🎮 Registrar Comandos no Discord

**Localmente (recomendado):**

1. Clone o repositório:
```bash
git clone https://github.com/SirKashiie/ffnexus-bot.git
cd ffnexus-bot
```

2. Instale dependências:
```bash
npm install
```

3. Crie arquivo `.env` com:
```env
DISCORD_TOKEN=SEU_TOKEN_AQUI
CLIENT_ID=1414673589810233424
```

4. Registre comandos:
```bash
npm run deploy
```

Você verá:
```
✅ Comandos registrados com sucesso!
📋 Total: 4 comandos
   - /doc: Buscar e acessar documentos do Google Drive
   - /feedback: Gerar resumo de atividades do servidor
   - /diario_conselheiro: Gerar diário do canal Conselheiro
   - /diario_aprendiz: Gerar diário do canal Aprendiz
```

## 🧪 Testar Funcionalidades

### Teste 1: Comando /doc
1. No Discord, digite `/doc`
2. Escolha idioma (PT ou EN)
3. Clique em "🔍 Pesquisar documento" ou "📚 Todos os arquivos"
4. Selecione um documento
5. Clique em "🧠 Resumo IA"

**Esperado:** Preview gerado via n8n

### Teste 2: Comando /feedback
1. Digite `/feedback tipo:🤖 Resumo IA horas:12`
2. Aguarde processamento

**Esperado:** Resumo bilíngue com estatísticas

### Teste 3: Sistema de Alertas
1. Envie mensagem no servidor monitorado: "o jogo não entra"
2. Aguarde 5-10 segundos

**Esperado:** Embed no canal de alertas

### Teste 4: Resumo Automático
1. Aguarde até a próxima execução (a cada 12h)
2. Verifique canal de resumos

**Esperado:** 2 embeds (PT e EN)

## ❌ Troubleshooting

### Bot não aparece online
- Verifique logs do Railway
- Confirme DISCORD_TOKEN correto
- Veja se há erros de conexão

### Comandos não aparecem
- Execute `npm run deploy` localmente
- Aguarde até 1 hora (cache do Discord)
- Tente em modo anônimo

### Alertas não funcionam
- Confirme ALERT_CHANNEL_ID correto
- Verifique n8n webhook ativo
- Veja logs para erros de classificação

### Google Drive não funciona
- Confirme credenciais corretas
- Teste com `GDRIVE_FOLDER_ID` válido
- Veja logs para erros de autenticação

## 📞 Próximos Passos

1. Configure IDs dos canais de diário
2. Configure Google Drive
3. Teste todas as funcionalidades
4. Monitore logs por 24h
5. Ajuste configurações conforme necessário

## ✅ Checklist Final

- [ ] Bot online no Discord
- [ ] Comandos registrados
- [ ] `/doc` funcionando
- [ ] `/feedback` funcionando
- [ ] Alertas detectando problemas
- [ ] Resumo automático configurado
- [ ] Todos os canais corretos
- [ ] Google Drive integrado

**Quando todos os itens estiverem marcados, o bot está 100% operacional!**

