import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Partials, ActivityType, Collection } from 'discord.js';
import cron from 'node-cron';
import { config } from './config.js';
import { initStore, saveMessage } from './services/storage.js';
import * as incident from './services/incidentHandler.js';
import { preloadDrive } from './providers/drive.js';
import * as pingCmd from './commands/ping.js';
import * as docCmd from './commands/doc.js';
import * as feedbackCmd from './commands/feedback.js';
import * as uidCmd from './commands/uid.js';
// import * as diaryCmd from './commands/diary.js'; // Removido - agora é automático
import { generateAutoReport } from './services/autoReport.js';
import { runAutoDiary } from './services/autoDiary.js';

const app = express();
app.get('/health', (_req, res) => res.status(200).send('ok'));
app.listen(config.port, () => console.log(`[http] listening on :${config.port}`));

await initStore();
await preloadDrive();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message]
});

client.commands = new Collection();
client.commands.set('ping', pingCmd);
client.commands.set('doc', docCmd);
client.commands.set('feedback', feedbackCmd);
client.commands.set('uid-dima', uidCmd);
// Comandos de diário removidos - agora é automático (09:00 e 21:00)

client.once('ready', () => {
  console.log('============================================================');
  console.log('🤖 FFNexus Bot - Sistema Inteligente de Monitoramento');
  console.log('============================================================');
  console.log(`✅ Bot conectado como: ${client.user?.tag}`);
  console.log(`🌐 Servidores: ${client.guilds.cache.size}`);
  console.log(`👥 Usuários: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);
  console.log('============================================================');
  console.log('📋 Funcionalidades Ativas:');
  console.log('  ✓ Comandos /ping, /doc, /feedback, /uid-dima');
  console.log('  ✓ Sistema de alerta de login com IA');
  console.log('  ✓ Resumo automático a cada 12h');
  console.log('  ✓ Monitoramento inteligente de mensagens');
  console.log('  ✓ Sistema de preferência de idioma');
  console.log('============================================================');
  console.log('🚀 Bot totalmente operacional!');
  console.log('============================================================');
  
  client.user?.setPresence({
    activities: [{ name: 'FFNexus online', type: ActivityType.Watching }],
    status: 'online'
  });
  
  // Resumo automático a cada 12h
  cron.schedule(`0 */${config.autoReport.hours} * * *`, async () => {
    console.log('[cron] Gerando resumo automático...');
    await generateAutoReport(client);
  });
  
  // Diários automáticos às 09:00 e 21:00 (horário de Brasília)
  cron.schedule('0 9 * * *', async () => {
    console.log('[cron] Gerando diários automáticos (09:00)...');
    await runAutoDiary(client);
  }, { timezone: config.timezone });
  
  cron.schedule('0 21 * * *', async () => {
    console.log('[cron] Gerando diários automáticos (21:00)...');
    await runAutoDiary(client);
  }, { timezone: config.timezone });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  
  // Bloqueia comandos no servidor de monitoramento (exceto moderadores)
  if (interaction.guildId === config.guilds.monitoring) {
    const member = interaction.member;
    const modRoleId = config.roles.moderator;
    
    if (!member.roles.cache.has(modRoleId)) {
      await interaction.reply({
        content: 'Comandos não estão disponíveis neste servidor. Este é um servidor de monitoramento.',
        ephemeral: true
      });
      return;
    }
  }
  
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[cmd] Error executing ${interaction.commandName}:`, error);
    const reply = { content: 'Erro ao executar comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.guildId !== config.guilds.source) return;
  
  // IMPORTANTE: O bot apenas MONITORA mensagens, nunca responde diretamente aos usuários
  // Apenas salva mensagens e detecta incidentes (enviando alertas para canal específico)
  await saveMessage(message);
  
  await incident.handleMessage(message, client);
  
  // NÃO adicionar message.reply() ou message.channel.send() aqui!
  // O bot deve ser silencioso e apenas observar para aprendizado futuro
});

client.on('error', (e) => console.error('[discord] client error', e?.message || e));
client.on('shardError', (e) => console.error('[discord] shard error', e?.message || e));

if (!config.discord.token) {
  console.error('[discord] missing DISCORD_TOKEN');
  process.exit(1);
}

try {
  await client.login(config.discord.token);
} catch (e) {
  console.error('[discord] login failed', e?.message || e);
  process.exit(1);
}

setInterval(() => console.log('✅ FFNexus ativo...'), 60000);

