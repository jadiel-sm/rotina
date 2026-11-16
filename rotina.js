// Regras da rotina: o que entra em cada dia, horários de sono, ciclo da nutri e treino A/B.
// Não depende da tela; roda também no Node (testes).
(function (g) {
  'use strict';

  const AJUSTES_PADRAO = {
    diasTreino: [1, 3, 5], // 0 = domingo ... 6 = sábado
    metaTreinos: 3,
    acordar: '07:00',
    luzInicial: '23:30', // horário de luz apagada quando a descida começou
    luzMeta: '23:00', // onde a descida para
    inicioSono: null, // data em que a descida começou (AAAA-MM-DD)
    minutosTelas: 60, // telas desligadas X min antes da luz apagada
    inicioNutri: null, // data do dia 1 do cardápio de 14 dias
  };

  // Fim de semana em faixas que intercalam desenvolvimento, lazer e descanso.
  const CATEGORIAS = {
    dev: { titulo: 'Desenvolvimento pessoal', detalhe: 'Estudo, leitura, curso, projeto' },
    lazer: { titulo: 'Lazer', detalhe: 'O que der vontade: passeio, filme, jogo, encontro' },
    descanso: { titulo: 'Descanso', detalhe: 'Sem obrigação: cochilo, sofá, nada' },
  };
  // [id, categoria, início, fim]
  const FAIXAS = {
    6: [['fx-dev1', 'dev', '08:30', '10:30'], ['fx-lazer1', 'lazer', '10:30', '12:00'], ['fx-desc1', 'descanso', '13:00', '14:30'],
      ['fx-dev2', 'dev', '14:30', '16:00'], ['fx-lazer2', 'lazer', '16:00', '19:00']],
    0: [['fx-dev1', 'dev', '08:30', '10:00'], ['fx-lazer1', 'lazer', '10:00', '12:00'], ['fx-desc1', 'descanso', '13:00', '14:30'],
      ['producao', 'producao', '14:30', '17:00'], ['fx-lazer2', 'lazer', '17:00', '19:00']],
  };
  const IDS_FAIXAS = ['fx-dev1', 'fx-lazer1', 'fx-desc1', 'fx-dev2', 'fx-lazer2'];

  const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  function min(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
  }
  function hora(mins) {
    mins = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), m = mins % 60;
    return h + 'h' + (m ? String(m).padStart(2, '0') : '');
  }
  // Horário da noite: 0h30 vira 24h30 para dar pra comparar com 23h30.
  function noite(mins) { return mins < 720 ? mins + 1440 : mins; }

  function chave(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function data(k) {
    const [a, m, d] = k.split('-').map(Number);
    return new Date(a, m - 1, d);
  }
  function somaDias(k, n) {
    const d = data(k);
    d.setDate(d.getDate() + n);
    return chave(d);
  }
  function diasEntre(a, b) { return Math.round((data(b) - data(a)) / 86400000); }
  function segundaDaSemana(k) {
    const dow = data(k).getDay();
    return somaDias(k, dow === 0 ? -6 : 1 - dow);
  }

  function horarioSono(k, aj) {
    const ini = noite(min(aj.luzInicial)), meta = noite(min(aj.luzMeta));
    const semanas = aj.inicioSono ? Math.max(0, Math.floor(diasEntre(aj.inicioSono, k) / 7)) : 0;
    const luz = meta >= ini ? ini : Math.max(meta, ini - 15 * semanas);
    return { luz, telas: luz - (Number(aj.minutosTelas) || 0), semanas, naMeta: luz === meta || meta >= ini, meta };
  }

  function diaNutri(k, aj) {
    if (!aj.inicioNutri) return null;
    return (((diasEntre(aj.inicioNutri, k)) % 14) + 14) % 14 + 1;
  }

  function tipoDia(k) {
    const dow = data(k).getDay();
    if (dow >= 1 && dow <= 4) return 'presencial';
    if (dow === 5) return 'remoto';
    return 'fds';
  }

  function ehDiaDeTreino(k, aj, reg) {
    return aj.diasTreino.includes(data(k).getDay()) || !!(reg && (reg.extra || reg.treino));
  }

  function itens(k, aj, reg) {
    const dow = data(k).getDay();
    const tipo = tipoDia(k);
    const presencial = tipo === 'presencial', util = tipo !== 'fds';
    const treino = ehDiaDeTreino(k, aj, reg);
    const sono = horarioSono(k, aj);
    const nutri = diaNutri(k, aj);
    const plano = nutri ? 'Cardápio da nutri · dia ' + nutri + ' de 14' : 'Do plano da nutri';
    const acordar = min(aj.acordar);
    const L = [];

    L.push({ id: 'acordar', hora: hora(acordar), min: acordar, titulo: 'Levantar', detalhe: 'Despertador longe da cama' });
    L.push({ id: 'luz-manha', min: acordar + 5, titulo: '10 min de ar e luz, sem celular', detalhe: 'Depois, banho' });
    L.push({ id: 'cafe', min: acordar + 25, titulo: 'Café da manhã', detalhe: plano });
    if (presencial) L.push({ id: 'sair', hora: '7h30–8h', min: 450, titulo: 'Sair de casa', detalhe: '~1h até o trabalho' });
    L.push({ id: 'almoco', hora: '12h', min: 720, titulo: 'Almoço', detalhe: plano });
    if (util) L.push({ id: 'caminhada', min: 750, titulo: '15 min de caminhada', detalhe: 'Depois do almoço' });
    L.push({ id: 'lanche', hora: '15h30', min: 930, titulo: 'Lanche', detalhe: presencial ? 'Do estoque do escritório (opções da nutri)' : 'Opções da nutri' });

    for (const [id, cat, ini, fim] of FAIXAS[dow] || []) {
      const c = cat === 'producao'
        ? { titulo: 'Produzir os jantares de seg a qui', detalhe: 'Do plano da nutri' }
        : CATEGORIAS[cat];
      L.push({ id, tipo: 'faixa', cat, hora: hora(min(ini)) + '–' + hora(min(fim)), min: min(ini), fim: min(fim), titulo: c.titulo, detalhe: c.detalhe });
    }

    const jantaPronta = presencial ? 'Já pronta, só esquentar' : plano;
    if (treino) {
      L.push({ id: 'pretreino', hora: '17h30', min: 1050, titulo: 'Pré-treino', detalhe: '' });
      L.push({ id: 'descer', hora: presencial ? 'Chegada' : '', min: 1080, titulo: 'Trocar e descer pra academia', detalhe: 'Sem sofá antes' });
      L.push({ id: 'treino', tipo: 'treino', min: 1110, titulo: 'Treino', detalhe: '40 min' });
      L.push({ id: 'janta', hora: 'Depois', min: 1170, titulo: 'Banho + janta', detalhe: jantaPronta });
    } else {
      L.push({ id: 'janta', hora: presencial ? 'Chegada' : tipo === 'fds' ? '19h' : '', min: 1140, titulo: 'Janta', detalhe: jantaPronta });
    }

    L.push({ id: 'telas', hora: hora(sono.telas), min: sono.telas, titulo: 'Telas desligadas', detalhe: 'Livro + chá sem mel nem leite' });
    L.push({ id: 'dormir', hora: hora(sono.luz), min: sono.luz, titulo: 'Luz apagada', detalhe: sono.naMeta ? 'Na meta de sono' : 'Descendo 15 min por semana até ' + hora(sono.meta) });
    L.sort((a, b) => a.min - b.min);

    L.push({ id: 'celular', tipo: 'regra', titulo: 'Celular carregou fora do quarto' });
    L.push({ id: 'acucar', tipo: 'regra', titulo: 'Sem açúcar adicionado, suco ou mel fora do plano' });
    return L;
  }

  function feito(item, reg) {
    if (!reg) return false;
    if (item.tipo === 'treino') return !!reg.treino;
    return !!(reg.feitos && reg.feitos[item.id]);
  }

  function placar(k, aj, reg) {
    const L = itens(k, aj, reg);
    const n = L.filter((i) => feito(i, reg)).length;
    return { feitos: n, total: L.length, pct: L.length ? n / L.length : 0 };
  }

  // Item em destaque: a partir do que está acontecendo agora, o primeiro ainda não marcado.
  function emDestaque(L, reg, agoraMin) {
    const T = L.filter((i) => i.tipo !== 'regra');
    let ini = 0;
    T.forEach((i, n) => { if (i.min <= agoraMin) ini = n; });
    const i = T.slice(ini).find((x) => !feito(x, reg));
    if (!i) return null;
    return { id: i.id, agora: i.min <= agoraMin };
  }

  const api = { AJUSTES_PADRAO, NOMES_DIA, IDS_FAIXAS, min, hora, chave, data, somaDias, diasEntre, segundaDaSemana, horarioSono, diaNutri, tipoDia, ehDiaDeTreino, itens, feito, placar, emDestaque };
  g.Rotina = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
