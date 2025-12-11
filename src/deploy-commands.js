import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import * as pingCmd from './commands/ping.js';
import * as docCmd from './commands/doc.js';
import * as feedbackCmd from './commands/feedback.js';
import * as uidCmd from './commands/uid.js';
// import * as diaryCmd from './commands/diary.js'; // Removido - agora é automático

const commands = [
  pingCmd.data.toJSON(),
  docCmd.data.toJSON(),
  feedbackCmd.data.toJSON(),
  uidCmd.data.toJSON(),
  // diaryCmd removidos - agora são automáticos (09:00 e 21:00)
];

const rest = new REST().setToken(config.discord.token);

try {
  console.log(`🔄 Registrando ${commands.length} comandos...`);
  
  const data = await rest.put(
    Routes.applicationCommands(config.discord.clientId),
    { body: commands },
  );
  
  console.log('============================================================');
  console.log('✅ Comandos registrados com sucesso!');
  console.log(`📋 Total: ${data.length} comandos`);
  data.forEach(cmd => console.log(`   - /${cmd.name}: ${cmd.description}`));
  console.log('============================================================');
} catch (error) {
  console.error('❌ Erro ao registrar comandos:', error);
  process.exit(1);
}

