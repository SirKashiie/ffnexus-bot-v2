/**
 * Rate Limiter Middleware
 * Protege contra spam de comandos com limite configurável por comando
 */

const RATE_LIMITS = {
  'ping': 10,
  'doc': 5,
  'report': 3,
  'incident': 3,
  'diary': 5,
  'help': 20,
};

const TIMEOUT = 60 * 1000; // 60 segundos

const cooldowns = new Map();

/**
 * Verificar se usuário pode usar comando
 * @param {string} userId - ID do usuário
 * @param {string} command - Nome do comando
 * @returns {Object} { allowed: boolean, remaining: number, retryAfter: number }
 */
export function checkRateLimit(userId, command) {
  const limit = RATE_LIMITS[command] || 5;
  const key = `${userId}:${command}`;

  // Inicializar cooldown se não existir
  if (!cooldowns.has(key)) {
    cooldowns.set(key, {
      uses: 0,
      resetTime: Date.now() + TIMEOUT,
    });
  }

  const cooldown = cooldowns.get(key);

  // Verificar se timeout expirou
  if (Date.now() > cooldown.resetTime) {
    cooldown.uses = 0;
    cooldown.resetTime = Date.now() + TIMEOUT;
  }

  // Incrementar uso
  cooldown.uses++;

  // Verificar se atingiu limite
  if (cooldown.uses > limit) {
    const retryAfter = Math.ceil((cooldown.resetTime - Date.now()) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  return {
    allowed: true,
    remaining: limit - cooldown.uses,
    retryAfter: 0,
  };
}

/**
 * Limpar cooldowns expirados
 */
export function cleanupCooldowns() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, cooldown] of cooldowns.entries()) {
    if (now > cooldown.resetTime) {
      cooldowns.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[rate-limiter] Limpeza: ${cleaned} cooldown(s) removido(s)`);
  }
}

/**
 * Resetar rate limit de um usuário
 */
export function resetUserLimit(userId, command) {
  const key = `${userId}:${command}`;
  cooldowns.delete(key);
}

/**
 * Resetar todos os rate limits
 */
export function resetAllLimits() {
  cooldowns.clear();
}

/**
 * Obter status do rate limit
 */
export function getStatus(userId, command) {
  const key = `${userId}:${command}`;
  const cooldown = cooldowns.get(key);

  if (!cooldown) {
    return {
      uses: 0,
      limit: RATE_LIMITS[command] || 5,
      resetIn: TIMEOUT,
    };
  }

  return {
    uses: cooldown.uses,
    limit: RATE_LIMITS[command] || 5,
    resetIn: Math.max(0, cooldown.resetTime - Date.now()),
  };
}

// Limpar cooldowns a cada 5 minutos
setInterval(cleanupCooldowns, 5 * 60 * 1000);

export default {
  checkRateLimit,
  cleanupCooldowns,
  resetUserLimit,
  resetAllLimits,
  getStatus,
};
