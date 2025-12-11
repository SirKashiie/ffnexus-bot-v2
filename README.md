# FFNexus Bot v2.0

Sistema inteligente de monitoramento para Discord com IA multi-camada.

## 🚀 Funcionalidades

### Comandos Disponíveis

- **`/doc`** - Sistema de documentos com Google Drive e preview IA
  - Pesquisa inteligente de documentos
  - Visualização de categorias
  - Preview com resumo gerado por IA
  - Links diretos para download

- **`/feedback`** - Resumos inteligentes ou mensagens brutas
  - Resumos automáticos por período (6h, 12h, 24h, 7d)
  - Análise de sentimento e tópicos principais
  - Visualização de mensagens brutas paginadas
  - Suporte bilíngue (PT-BR/EN)

- **`/uid-dima`** - Extração de UIDs de jogadores de Free Fire
  - Busca automática em canal monitorado
  - Estatísticas detalhadas (UIDs mais mencionados, usuários)
  - Lista organizada com contadores de menções
  - Interface visual com embeds ricos

- **`/ping`** - Verifica latência e status do bot
  - Medição de latência da API
  - Tempo de resposta em tempo real
  - Suporte bilíngue

### Sistemas Automáticos

- **Sistema de Alertas de Login** - Monitoramento inteligente com IA
  - Detecção automática de problemas de login/conexão
  - Classificação por tipo: login, lag, crash
  - Agregação de incidentes em janelas de tempo
  - Alertas com níveis de severidade (baixa, média, alta)
  - Análise contextual com IA

- **Resumo Automático** - Relatórios periódicos
  - Geração automática a cada 12 horas
  - Análise de conversas e tópicos principais
  - Resumo inteligente com IA
  - Envio para canal específico

- **Diários Automáticos** - Documentação bilíngue
  - Geração automática às 09:00 e 21:00 (horário de Brasília)
  - Diário do Conselheiro (canal avançado)
  - Diário do Aprendiz (canal iniciante)
  - Formatação rica com embeds e estatísticas
  - Suporte bilíngue (PT-BR/EN)

### Recursos Adicionais

- **Monitoramento Silencioso** - O bot observa mensagens para aprendizado futuro de gírias e comportamentos, sem responder diretamente aos usuários
- **Sistema de Preferência de Idioma** - Detecção automática e suporte bilíngue em todos os comandos
- **Cache Inteligente** - Otimização de performance com sistema de cache
- **Integração Google Drive** - Acesso direto a documentos armazenados
- **Webhooks n8n** - Processamento de IA via workflows externos

## 📦 Deploy Rápido

### Railway

1. Conecte este repositório ao Railway
2. Configure as variáveis de ambiente (ver `.env.example`)
3. Deploy automático

### Local

```bash
npm install
npm run deploy  # Registra comandos no Discord
npm start       # Inicia o bot
```

## ⚙️ Configuração

Copie `.env.example` para `.env` e preencha as variáveis necessárias:

### Essenciais
- `DISCORD_TOKEN` - Token do bot Discord
- `CLIENT_ID` - ID da aplicação Discord

### Servidores e Canais
- `SOURCE_GUILD_ID` - ID do servidor de origem (monitoramento)
- `DEST_GUILD_ID` - ID do servidor de destino (comandos)
- `ALERT_CHANNEL_ID` - Canal para alertas de incidentes
- `AUTO_REPORT_CHANNEL_ID` - Canal para resumos automáticos
- `COMMANDS_CHANNEL_ID` - Canal para comandos
- `DIARY_CONSELHEIRO_CHANNEL_ID` - Canal do diário Conselheiro
- `DIARY_APRENDIZ_CHANNEL_ID` - Canal do diário Aprendiz

### Integrações
- `N8N_REPORT_WEBHOOK_URL` - Webhook n8n para resumos
- `N8N_DOC_WEBHOOK_URL` - Webhook n8n para documentos
- `N8N_INCIDENT_CLASSIFY_WEBHOOK_URL` - Webhook n8n para classificação de incidentes

### Google Drive
- `GDRIVE_FOLDER_ID` - ID da pasta do Google Drive
- `GDRIVE_CLIENT_EMAIL` - Email da service account
- `GDRIVE_PRIVATE_KEY` - Chave privada da service account

### Configurações de Incidentes
- `INCIDENT_WINDOW_MIN` - Janela de tempo para agregação (padrão: 10 min)
- `INCIDENT_THRESHOLD` - Limite mínimo de ocorrências (padrão: 1)
- `INCIDENT_AI_ENABLED` - Ativar classificação com IA (padrão: true)
- `INCIDENT_AI_MIN_SCORE` - Score mínimo de confiança da IA (padrão: 0.6)

### Outras Configurações
- `AUTO_REPORT_HOURS` - Intervalo para resumos automáticos (padrão: 12h)
- `TIMEZONE` - Fuso horário (padrão: America/Sao_Paulo)
- `PORT` - Porta do servidor HTTP (padrão: 3000)

## 🏗️ Arquitetura

### Stack Tecnológica
- **Node.js 20+** - Runtime JavaScript
- **Discord.js v14** - Biblioteca para Discord API
- **Google Drive OAuth2** - Integração com Google Drive
- **n8n Webhooks** - Processamento de IA via workflows
- **Express** - Servidor HTTP para health checks

### Estrutura do Projeto

```
src/
├── commands/           # Comandos slash do Discord
│   ├── ping.js        # Comando de latência
│   ├── doc.js         # Sistema de documentos
│   ├── feedback.js    # Sistema de feedback
│   ├── uid.js         # Extração de UIDs
│   └── diary.js       # Diários (legacy, agora automático)
├── services/          # Serviços e lógica de negócio
│   ├── storage.js     # Armazenamento de mensagens
│   ├── incident.js    # Detecção de incidentes (regras)
│   ├── incidentHandler.js  # Handler de incidentes (IA)
│   ├── autoReport.js  # Resumos automáticos
│   ├── autoDiary.js   # Diários automáticos
│   ├── diaryFormatter.js  # Formatação de diários
│   ├── n8n.js         # Integração com n8n
│   └── userPreferences.js  # Preferências de usuário
├── providers/         # Provedores externos
│   ├── drive.js       # Google Drive
│   └── local.js       # Armazenamento local
├── utils/             # Utilitários
│   ├── i18n.js        # Internacionalização
│   ├── filters.js     # Filtros de mensagens
│   └── hybridSearch.js  # Busca híbrida
├── config.js          # Configurações centralizadas
├── index.js           # Ponto de entrada
└── deploy-commands.js # Registro de comandos
```

### Fluxo de Dados

1. **Mensagens** → Monitoramento silencioso → Armazenamento
2. **Incidentes** → Detecção (regras + IA) → Alertas agregados
3. **Comandos** → Processamento → Resposta (embeds/paginação)
4. **Cron Jobs** → Resumos/Diários → Envio automático

## 🔒 Segurança

- ✅ Variáveis sensíveis em `.env` (não commitadas)
- ✅ Service account do Google Drive (sem OAuth interativo)
- ✅ Validação de permissões por servidor
- ✅ Rate limiting e timeouts em requisições externas
- ✅ Logs estruturados sem expor dados sensíveis

## 🧪 Desenvolvimento

### Estrutura de Comandos

Cada comando segue o padrão:

```javascript
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('comando')
  .setDescription('Descrição');

export async function execute(interaction) {
  // Lógica do comando
}
```

### Adicionando Novos Comandos

1. Crie o arquivo em `src/commands/`
2. Importe em `src/deploy-commands.js`
3. Importe em `src/index.js`
4. Registre no `client.commands`
5. Execute `npm run deploy`

### Testando Localmente

```bash
# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite .env com suas credenciais

# Registrar comandos
npm run deploy

# Iniciar bot
npm start
```

## 📊 Monitoramento

O bot expõe um endpoint de health check:

```bash
GET http://localhost:3000/health
# Resposta: "ok"
```

Logs estruturados:
- `[discord]` - Eventos do Discord
- `[cmd]` - Execução de comandos
- `[incident]` - Detecção de incidentes
- `[cron]` - Jobs agendados
- `[http]` - Servidor HTTP

## 🐛 Troubleshooting

### Bot não responde comandos
- Verifique se os comandos foram registrados: `npm run deploy`
- Confirme que o bot tem permissões no servidor
- Verifique logs para erros

### Alertas não funcionam
- Confirme `INCIDENT_AI_ENABLED=true`
- Verifique webhook n8n configurado
- Teste o canal de alertas manualmente

### Google Drive não funciona
- Valide credenciais da service account
- Confirme permissões na pasta do Drive
- Execute `preloadDrive()` no startup

## 📝 Changelog

### v2.0 (Atual)
- ✨ Comando `/uid-dima` para extração de UIDs
- 🔒 Garantia de monitoramento silencioso (sem respostas automáticas)
- 📚 Documentação aprimorada no código
- 🐛 Correções de estabilidade

### v1.9
- ✨ Diários automáticos (09:00 e 21:00)
- 🎨 Embeds visuais para diários
- 🔒 Bloqueio de comandos em servidor de monitoramento

### v1.8
- ✨ Sistema completo `/doc` com Google Drive
- ✨ Sistema `/feedback` com IA e paginação
- 🌐 Sistema de preferência de idioma

### v1.7
- ✨ Alertas de login com IA multi-camada
- 🎨 Cores dinâmicas por severidade
- 📊 Agregação inteligente de incidentes

## 📄 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adicionar nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.

---

**Desenvolvido com ❤️ para a comunidade Free Fire Brasil**
