/**
 * Simulador do bot de WhatsApp da pousada demo: manda eventos do contrato v2
 * para POST /ingest/bot-events com a chave do bot, igual ao N8N em producao.
 *
 *   node scripts/demo/simulate-bot.cjs --historico [N]   N conversas (padrao 60) nos ultimos 30 dias, de uma vez
 *   node scripts/demo/simulate-bot.cjs --ao-vivo         uma conversa nova a cada ~25s, mensagens em tempo real
 *
 * Cada conversa segue um roteiro com desfecho: reserva, perda, socorro (humano
 * assume), erro do bot ou em andamento. Origens: anuncio (ad_id de demo-ads.cjs),
 * organico e link rastreavel. Le tenant e chave de .demo-hotel.local.json.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ADS } = require('./demo-ads.cjs');

const API = process.env.DEMO_API_URL || 'http://localhost:3002/api';
const CONF = JSON.parse(fs.readFileSync(path.join(__dirname, '.demo-hotel.local.json'), 'utf-8'));

const NOMES = ['Ana Paula', 'Bruno Costa', 'Carla Mendes', 'Diego Ramos', 'Elisa Prado', 'Fabio Lima',
  'Gabriela Souza', 'Henrique Alves', 'Isabela Rocha', 'Joao Pedro', 'Larissa Teixeira', 'Marcos Vieira',
  'Natalia Freitas', 'Otavio Nunes', 'Patricia Duarte', 'Rafael Moura', 'Sabrina Lopes', 'Tiago Barros'];
const QUARTOS = [
  { nome: 'Chale Master com hidro', diaria: 89000 },
  { nome: 'Suite Jardim', diaria: 52000 },
  { nome: 'Chale Familia', diaria: 69000 },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let phoneSeq = 0;
// Faixa ficticia (+55 11 90000-xxxx) para nao bater em numero real.
const novoTelefone = () => `551190000${String(Date.now() % 10000 + phoneSeq++).padStart(4, '0').slice(-4)}`;

function origemAleatoria() {
  const r = Math.random();
  if (r < 0.6) {
    const ad = pick(ADS);
    return { origin: 'anuncio', source_id: ad.adId, ctwa_clid: `ARA${crypto.randomBytes(8).toString('hex')}` };
  }
  if (r < 0.8) return { origin: 'link', link_code: pick(['insta-bio', 'site-topo', 'google-perfil']) };
  return { origin: 'organico' };
}

function datasEstadia(base) {
  const checkIn = new Date(base.getTime() + (7 + Math.floor(Math.random() * 40)) * 86400000);
  const noites = 2 + Math.floor(Math.random() * 3);
  const checkOut = new Date(checkIn.getTime() + noites * 86400000);
  return { checkIn: checkIn.toISOString().slice(0, 10), checkOut: checkOut.toISOString().slice(0, 10), noites };
}

/** Roteiro: lista de passos { type, stage?, data?, hold?, actor?, botStatus? } na ordem. */
function roteiro(desfecho, inicio) {
  const quarto = pick(QUARTOS);
  const { checkIn, checkOut, noites } = datasEstadia(inicio);
  const valor = quarto.diaria * noites;
  const codigo = `HD${Math.floor(100000 + Math.random() * 900000)}`;
  const hold = { code: codigo, status: 'ATIVO', amount_cents: valor, check_in: checkIn, check_out: checkOut, accommodation: quarto.nome };
  const fmt = (c) => `R$ ${(c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const u = (content) => ({ type: 'mensagem', data: { role: 'user', kind: 'texto', content } });
  const b = (content) => ({ type: 'mensagem', data: { role: 'assistant', kind: 'texto', content } });

  const abertura = [
    { type: 'contato.iniciado', stage: 'CONTATO_INICIADO' },
    u(pick(['Oi! Vi o anuncio de voces, tem disponibilidade?', 'Boa tarde, queria saber valores', 'Ola, voces tem chale com hidro?'])),
    b('Ola! Que bom falar com voce 😊 Sou a assistente da Pousada Demo. Pra quantas pessoas seria e em quais datas?'),
    u(`Seriamos 2 adultos, de ${checkIn.split('-').reverse().join('/')} a ${checkOut.split('-').reverse().join('/')}`),
    { type: 'estagio', stage: 'PUBLICO_IDENTIFICADO', audience: 'LEAD' },
    { type: 'estagio', stage: 'QUALIFICADO' },
    b(`Perfeito! Para essas ${noites} noites eu recomendo o ${quarto.nome}: vista pro vale, cafe colonial incluso.`),
    { type: 'estagio', stage: 'ACOMODACAO_APRESENTADA' },
    u('Qual o valor total?'),
    b(`O total fica ${fmt(valor)} com cafe da manha. Posso segurar a reserva pra voce por 2 horas?`),
    { type: 'hold.criado', stage: 'OFERTA_FEITA', hold },
  ];

  switch (desfecho) {
    case 'reserva':
      return [
        ...abertura,
        u('Pode sim! Como faco o pagamento?'),
        { type: 'estagio', stage: 'FECHAMENTO_INICIADO', botStatus: 'AGUARDANDO_PAGAMENTO' },
        b('Te mandei o link do Pix. Assim que cair eu confirmo aqui 🙌'),
        u('Paguei, segue o comprovante'),
        { type: 'estagio', stage: 'COMPROVANTE_RECEBIDO', botStatus: 'EM_CONFIRMACAO' },
        b(`Reserva confirmada! Codigo ${codigo}. Te esperamos dia ${checkIn.split('-').reverse().join('/')} ✨`),
        { type: 'reserva.confirmada', stage: 'RESERVA_CONFIRMADA', hold: { ...hold, status: 'CONFIRMADO' }, data: { valor_cents: valor, codigo }, botStatus: 'FECHADO' },
      ];
    case 'perdido':
      return [
        ...abertura,
        u(pick(['Achei um pouco caro, vou pensar', 'Vou ver com meu marido e te aviso', 'Encontrei mais barato no Booking'])),
        b('Entendo! Se quiser, consigo ver uma data de meio de semana com valor menor.'),
        { type: 'followup.enviado', data: { toque: 1, template: 'retomada_24h', regua: 'padrao', via: 'bot' } },
        { type: 'perdido', stage: 'PERDIDO', data: { motivo: pick(['preco', 'sem_resposta', 'concorrente']) }, botStatus: 'FRIO' },
      ];
    case 'socorro':
      return [
        ...abertura.slice(0, 6),
        u('Voces aceitam cachorro de porte grande? E tem desconto pra 7 noites?'),
        b('Hmm, deixa eu chamar alguem da equipe pra te responder certinho.'),
        { type: 'bot.socorro', data: { motivo: 'pergunta_fora_do_escopo', mensagem: 'Pet porte grande + desconto 7 noites', mensagem_hospede: 'Voces aceitam cachorro de porte grande?', workflow: 'WF2-atendimento' }, botStatus: 'PAUSADO' },
        { type: 'transferencia', data: { motivo: 'pet_e_desconto' }, botStatus: 'PAUSADO' },
        { type: 'mensagem', actor: { type: 'human', id: 'equipe' }, data: { role: 'human', kind: 'texto', content: 'Oi! Aqui e a Marina da recepcao. Aceitamos pet ate 15kg, e para 7 noites damos 10% 😉' }, botStatus: 'PAUSADO_HUMANO' },
        { ...u('Ah que otimo, obrigado!'), botStatus: 'PAUSADO_HUMANO' },
      ];
    case 'erro':
      return [
        ...abertura.slice(0, 4),
        { type: 'bot.erro', data: { categoria: 'tecnico', codigo: 'PMS_TIMEOUT', gravidade: 'alta', workflow: 'WF3-disponibilidade', no: 'HTTP Request - consulta PMS', etapa: 'disponibilidade', mensagem: 'Timeout de 30s consultando disponibilidade no PMS', mensagem_hospede: 'Seriamos 2 adultos...', resposta_bot: 'Desculpe, tive um probleminha. Ja te respondo!' } },
        b('Desculpe, tive um probleminha pra consultar as datas. Ja te respondo!'),
      ];
    default: // em andamento: para na oferta
      return abertura;
  }
}

function evento(phone, nome, origem, passo, ocorrido) {
  const contact = {
    phone, name: nome, origin: origem.origin,
    ...(origem.source_id ? { source_id: origem.source_id, ctwa_clid: origem.ctwa_clid } : {}),
    ...(origem.link_code ? { link_code: origem.link_code } : {}),
    ...(passo.audience ? { audience: passo.audience } : {}),
    bot_status: passo.botStatus ?? 'ATIVO',
  };
  const data = { ...(passo.data ?? {}) };
  if (passo.type === 'contato.iniciado') Object.assign(data, origem.origin === 'anuncio' ? { origem: 'anuncio', source_id: origem.source_id, ctwa_clid: origem.ctwa_clid } : { origem: origem.origin, link_code: origem.link_code });
  if (passo.type === 'mensagem') {
    data.wamid = `wamid.demo.${crypto.randomBytes(10).toString('hex')}`;
    data.content_preview = String(data.content).slice(0, 180);
  }
  return {
    event_id: crypto.randomUUID(),
    occurred_at: ocorrido.toISOString(),
    // "estagio" e so transicao: o tipo do catalogo mais neutro que carrega stage.
    type: passo.type === 'estagio' ? 'estagio.alterado' : passo.type,
    actor: passo.actor ?? { type: 'bot' },
    contact,
    ...(passo.stage ? { stage: passo.stage } : {}),
    ...(passo.hold ? { hold: passo.hold } : {}),
    data,
  };
}

async function enviar(events) {
  for (let i = 0; i < events.length; i += 200) {
    const res = await fetch(`${API}/ingest/bot-events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${CONF.botKey}` },
      body: JSON.stringify({ tenant_id: CONF.botTenantRef, events: events.slice(i, i + 200) }),
    });
    if (res.status !== 202) throw new Error(`ingest ${res.status}: ${await res.text()}`);
  }
}

function desfechoAleatorio() {
  const r = Math.random();
  if (r < 0.3) return 'reserva';
  if (r < 0.55) return 'perdido';
  if (r < 0.7) return 'socorro';
  if (r < 0.8) return 'erro';
  return 'andamento';
}

async function historico(total) {
  const agora = Date.now();
  const events = [];
  const resumo = {};
  for (let n = 0; n < total; n++) {
    const inicio = new Date(agora - Math.random() * 30 * 86400000);
    const desfecho = desfechoAleatorio();
    resumo[desfecho] = (resumo[desfecho] ?? 0) + 1;
    const phone = novoTelefone();
    const nome = pick(NOMES);
    const origem = origemAleatoria();
    let t = inicio.getTime();
    for (const passo of roteiro(desfecho, inicio)) {
      t += 20000 + Math.random() * 120000;
      if (t > agora) t = agora - 1000;
      events.push(evento(phone, nome, origem, passo, new Date(t)));
    }
    if (desfecho === 'reserva' && Math.random() < 0.6) {
      events.push(evento(phone, nome, origem, {
        type: 'hospede.feedback',
        data: Math.random() < 0.8
          ? { texto: 'Lugar lindo, cafe maravilhoso e atendimento impecavel!', resumo: 'Elogio ao cafe e atendimento', nota: 10, sentimento: 'positivo', link_avaliacao_enviado: true }
          : { texto: 'O chuveiro do chale demorou a esquentar.', resumo: 'Reclamacao chuveiro', nota: 6, sentimento: 'negativo', link_avaliacao_enviado: false },
        botStatus: 'FECHADO',
      }, new Date(Math.min(t + 3 * 86400000, agora - 500))));
    }
  }
  events.push({ event_id: crypto.randomUUID(), occurred_at: new Date().toISOString(), type: 'heartbeat', data: { versao: 'simulador', workflows_ativos: 11 } });
  await enviar(events);
  console.log(`Historico enviado: ${total} conversas, ${events.length} eventos`, resumo);
}

async function conversaAoVivo() {
  const desfecho = desfechoAleatorio();
  const phone = novoTelefone();
  const nome = pick(NOMES);
  const origem = origemAleatoria();
  console.log(`[ao vivo] ${nome} (${phone}) via ${origem.origin} -> ${desfecho}`);
  for (const passo of roteiro(desfecho, new Date())) {
    await enviar([evento(phone, nome, origem, passo, new Date())]);
    await sleep(passo.type === 'mensagem' ? 4000 + Math.random() * 5000 : 800);
  }
}

async function aoVivo() {
  console.log('Simulador ao vivo: Ctrl+C para parar.');
  const ativas = new Set();
  let ultimoHeartbeat = 0;
  for (;;) {
    if (Date.now() - ultimoHeartbeat > 60000) {
      await enviar([{ event_id: crypto.randomUUID(), occurred_at: new Date().toISOString(), type: 'heartbeat', data: { versao: 'simulador' } }]);
      ultimoHeartbeat = Date.now();
    }
    if (ativas.size < 3) {
      const p = conversaAoVivo().catch((e) => console.error(e.message)).finally(() => ativas.delete(p));
      ativas.add(p);
    }
    await sleep(20000 + Math.random() * 10000);
  }
}

const args = process.argv.slice(2);
(args[0] === '--historico' ? historico(Number(args[1]) || 60) : aoVivo()).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
