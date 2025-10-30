import 'dotenv/config';
import { REST, Routes } from 'discord.js';

const token = process.env.DISCORD_TOKEN?.trim();
const clientId = process.env.CLIENT_ID?.trim();

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN ou CLIENT_ID não configurado');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function cleanCommands() {
  try {
    console.log('🗑️  Deletando TODOS os comandos antigos...');
    
    // Deleta comandos globais
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('✅ Comandos globais deletados');
    
    // Deleta comandos de todos os servidores
    const guilds = await rest.get(Routes.userGuilds());
    
    for (const guild of guilds) {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: [] });
        console.log(`✅ Comandos deletados do servidor: ${guild.name}`);
      } catch (e) {
        console.warn(`⚠️  Erro ao deletar comandos do servidor ${guild.name}:`, e.message);
      }
    }
    
    console.log('✅ Limpeza concluída! Agora rode: node src/deploy-commands.js');
  } catch (error) {
    console.error('❌ Erro ao limpar comandos:', error);
    process.exit(1);
  }
}

cleanCommands();

