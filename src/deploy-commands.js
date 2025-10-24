import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import * as docCmd from './commands/doc.js';
import * as feedbackCmd from './commands/feedback.js';
import * as diaryCmd from './commands/diary.js';

const commands = [
  docCmd.data.toJSON(),
  feedbackCmd.data.toJSON(),
  diaryCmd.conselheiro.toJSON(),
  diaryCmd.aprendiz.toJSON(),
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

