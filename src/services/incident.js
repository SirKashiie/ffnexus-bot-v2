import { EmbedBuilder } from 'discord.js';
import { classifyIncident } from './n8n.js';

const WINDOW_MIN = Number(process.env.INCIDENT_WINDOW_MIN || 10);
const THRESHOLD = Number(process.env.INCIDENT_THRESHOLD || 1);
const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID || process.env.DEST_CHANNEL_ID;
const TZ = process.env.TIMEZONE || 'America/Sao_Paulo';
const DEBUG = String(process.env.INCIDENT_DEBUG || 'false').toLowerCase() === 'true';
const AI_ENABLED = String(process.env.INCIDENT_AI_ENABLED || 'true').toLowerCase() === 'true';
const AI_MIN_SCORE = Number(process.env.INCIDENT_AI_MIN_SCORE || process.env.MIN_SCORE || 0.6);
const REQUIRE_DOMAIN = String(process.env.REQUIRE_DOMAIN || 'true').toLowerCase() === 'true';
const MIN_WORDS = Number(process.env.MIN_WORDS || 3);

function norm(s){return (s||'').toLowerCase().normalize('nfd').replace(/\p{Diacritic}+/gu,'').trim()}

const NEG_STR = [
  'servidor do discord','server discord','canal do discord','nitro','boost',
  'servidor de aposta','apostado','aposta',' ap ',' bet ','pix','pix premiado','cassino',
  'recrutamento','recrutando','recruta','recrutar','vagas','vaga','treino','scrim',
  'divulgacao','divulgação','youtube','tiktok','live','sorteio',
  'clan','cla','clã','guild','guilda','equipe','time','line','staff','camp','campeonato','patrocinado'
];

const NEG_RX = [/\bap\b/u];

const OTHER_GAMES = [
  'clash royale','brawl stars','mlbb','mobile legends','roblox','valorant','fortnite','pubg','codm','standoff'
];

const BYPASS = ['crash royale','free fire bet','ff aposta'];

const GAME_HINTS = [
  'free fire','freefire','ff','garena','booyah','passe booyah','diamante','dima',
  'ranqueado','ranked','cs ranqueado','br ranqueado','sala personalizada','bermuda','purgatorio','kalahari'
];

const DEVICE_OR_LOCAL = [
  'meu celular','meu telefone','meu smartphone','meu aparelho','meu emulador','bluestacks','ldplayer','gameloop','msi player',
  'meu pc','pc fraco','notebook','memoria cheia','armazenamento cheio','aquecendo','esquentando','superaquecendo',
  'minha internet','meu wifi','meu wi-fi','roteador','modem','operadora vivo','operadora claro','operadora tim','operadora oi','4g','5g'
];

const PROBLEM_TERMS = [
  'caiu','offline','off','fora do ar','instavel','instabilidade','bug','erro',
  'travando','travou','trava','nao conecta','não conecta','nao loga','não loga',
  'nao entra','não entra','nao consigo entrar','não consigo entrar','fila de login','login',
  'ping','lag','alto ping','desconectou','desconectando','queda de conexao','queda na conexao'
];

const RX = {
  login: [
    /\b(nao|não)\s+(consigo|to|tô|estou)?\s*(entrar|logar|conectar|acessar)\b/u,
    /\berro(s)?\s+(de\s+)?login\b/u,
    /\bfila\s+de\s+login\b/u,
    /\b(server|servidor)\s+(cai(u)?|off|fora)\b/u,
    /\bff\s+caiu\b/u,
    /\bfree\s*fire\s+caiu\b/u,
    /\b(meu\s+)?jogo\s+n[aã]o\s+est(a|á)\s+entrando\b/u,
    /\bn[aã]o\s+conecta\b/u,
    /\bconta\s+(travada|bloqueada|suspensa)\b/u
  ],
  lag: [
    /\blag\b/u,/\bping\b/u,/\blat(ê|e)ncia\b/u,/\balto\s+ping\b/u,
    /\btrav(and|ou|a)\b/u,/\bdelay\b/u,
    /\b(desconect(ou|ei|a)|dc)\b/u,
    /\b(cai(u|ndo)?|queda(s)?\s+(de|na|no)\s+(conexa|conex[aã]o|internet|net|servidor))\b/u
  ],
  crash: [
    /\bbug(ad[oa]?|s)?\b/u,/\berro(s)?\b/u,/\bcrash\b/u,/\bfalha\b/u,
    /\btravament[oa]\b/u,/\bfechou\s+sozinho\b/u,/\btravou\s+e\s+fechou\b/u
  ]
};

function hasAny(t, arr){const x=norm(t);return arr.some(v=>x.includes(norm(v)))}
function hasAnyRx(t, arr){const x=norm(t);return arr.some(rx=>rx.test(x))}
function wordCount(t){return norm(t).split(/\s+/).filter(Boolean).length}

function isLikelyDeviceOrLocal(t){return hasAny(t,DEVICE_OR_LOCAL)}

function mentionGame(t){return hasAny(t,GAME_HINTS)}

function travProximityOK(t){
  const x=norm(t);
  const a=/(jogo|free\s*fire|ff|garena).{0,40}trav(a|ou|ando)/u.test(x);
  const b=/trav(a|ou|ando).{0,40}(jogo|free\s*fire|ff|garena)/u.test(x);
  return a||b;
}

function passesGuards(raw){
  const t=norm(raw);
  if(!t) return false;
  if(wordCount(t)<MIN_WORDS) return false;
  if(hasAny(t,NEG_STR)||hasAnyRx(t,NEG_RX)) return false;
  if(hasAny(t,OTHER_GAMES)) return false;
  if(hasAny(t,BYPASS)) return false;
  if(!hasAny(t,PROBLEM_TERMS)) return false;
  if(REQUIRE_DOMAIN && !mentionGame(t)) return false;
  return true;
}

function detectType(text){
  const t=norm(text);
  const hit=a=>a.some(rx=>rx.test(t));
  if(hit(RX.login)) return 'login';
  if(hit(RX.lag) || hit(RX.crash)){
    if(!mentionGame(t)) return null;
    if(isLikelyDeviceOrLocal(t)){
      if(!travProximityOK(t)) return null;
    }
    if(/trav(a|ou|ando)/u.test(t) && !travProximityOK(t)) return null;
    return hit(RX.lag)?'lag':'crash';
  }
  return null;
}

function fmt(ts){return new Date(ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:TZ})}

function buildEmbed(meta,w,aiNote){
  const header=[`Ocorrências em ${WINDOW_MIN} min: ${w.count}`,`Início: ${fmt(w.firstTs)} • Último: ${fmt(w.lastTs)}`].join('\n');
  const examples=w.examples.slice(-5).map(e=>`• ${fmt(e.ts)} — ${e.text}${e.url?` ([abrir](${e.url}))`:''}`).join('\n');
  const ai=aiNote?`\n\n🧠 ${aiNote}`:'';
  const desc=[header,examples?`\nExemplos:\n${examples}`:null].filter(Boolean).join('\n')+ai;
  return new EmbedBuilder().setTitle(`⚠️ Alerta: ${meta.label}`).setDescription(desc).setFooter({ text: 'FFNexus • Garena BR' }).setTimestamp(new Date(w.lastTs));
}

const META={login:{key:'login',label:'Problemas de login/conexão'},lag:{key:'lag',label:'Lag/Ping/Quedas'},crash:{key:'crash',label:'Erros/Bugs/Crash'}};
const windows=new Map();

async function sendNewCard(client,meta,row,aiNote){
  if(!ALERT_CHANNEL_ID) return null;
  const ch=await client.channels.fetch(ALERT_CHANNEL_ID).catch(()=>null);
  if(!ch||!ch.send) return null;
  const now=Date.now();
  const w={count:1,firstTs:now,lastTs:now,examples:[{ts:now,text:row.content||'[sem texto]',url:row.url||null}],messageId:null,channelId:ch.id,aiNote:aiNote||''};
  const embed=buildEmbed(meta,w,w.aiNote);
  const msg=await ch.send({embeds:[embed]});
  w.messageId=msg.id;
  windows.set(meta.key,w);
  return w;
}

async function updateCard(client,meta,w){
  const ch=await client.channels.fetch(w.channelId).catch(()=>null);
  if(!ch) return;
  const msg=await ch.messages.fetch(w.messageId).catch(()=>null);
  if(!msg) return;
  const embed=buildEmbed(meta,w,w.aiNote);
  await msg.edit({embeds:[embed]}).catch(()=>{});
}

export async function handleIncident(client,msg){
  const raw=(msg.content||'').trim();
  if(!raw) return;
  if(!passesGuards(raw)) return;

  let type=detectType(raw);
  let aiNote='';

  if(AI_ENABLED && (!type || type==='login')){
    try{
      const r=await classifyIncident({ text: raw, hint: 'login', lang: 'pt' });
      if(r && r.label==='login' && Number(r.score)>=AI_MIN_SCORE && (r.gameContext===true || mentionGame(raw))){
        type='login';
        aiNote=(r.summary||r.reasons?.join('; ')||'').toString().trim().slice(0,240) || 'Indícios de problema de login no jogo.';
        if(DEBUG) console.log('[incident-ai]', r.label, r.score, r.gameContext, '|', raw);
      }
    }catch{}
  }

  if(!type) return;
  if(DEBUG) console.log('[incident]', type, '|', raw);

  const meta=META[type];
  const now=Date.now();
  const windowMs=WINDOW_MIN*60*1000;
  const row={content:raw.slice(0,300),ts:now,url:msg.url};

  let w=windows.get(type);
  if(!w || now-w.lastTs>windowMs){
    await sendNewCard(client,meta,row,aiNote);
    return;
  }

  w.count+=1;
  w.lastTs=now;
  if(aiNote) w.aiNote=aiNote;
  w.examples.push({ts:now,text:row.content,url:msg.url});
  if(w.examples.length>12) w.examples.shift();
  windows.set(type,w);

  if(w.count>=THRESHOLD) await updateCard(client,meta,w);
}
