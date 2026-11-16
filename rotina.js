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
    treinoA: '',
    treinoB: '',
  };

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

  // Letra do treino do dia: a que já foi registrada, a escolhida na mão, ou o oposto do último treino feito.
  function letraTreino(dias, k) {
    const r = dias[k];
    if (r && r.treino) return r.treino.letra;
    if (r && r.letra) return r.letra;
    const antes = Object.keys(dias).filter((x) => x < k && dias[x].treino).sort();
    if (!antes.length) return 'A';
    return dias[antes[antes.length - 1]].treino.letra === 'A' ? 'B' : 'A';
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
    if (dow === 0) L.push({ id: 'producao', min: 960, titulo: 'Produzir os jantares de seg a qui', detalhe: 'Do plano da nutri' });

    const jantaPronta = presencial ? 'Já pronta, só esquentar' : plano;
    if (treino) {
      L.push({ id: 'pretreino', hora: '17h30', min: 1050, titulo: 'Pré-treino', detalhe: '' });
      L.push({ id: 'descer', hora: presencial ? 'Chegada' : '', min: 1080, titulo: 'Trocar e descer pra academia', detalhe: 'Sem sofá antes' });
      L.push({ id: 'treino', tipo: 'treino', min: 1110, titulo: 'Treino', detalhe: 'Full-body · 40 min' });
      L.push({ id: 'janta', hora: 'Depois', min: 1170, titulo: 'Banho + janta', detalhe: jantaPronta });
    } else {
      L.push({ id: 'janta', hora: presencial ? 'Chegada' : '', min: 1140, titulo: 'Janta', detalhe: jantaPronta });
    }

    L.push({ id: 'telas', hora: hora(sono.telas), min: sono.telas, titulo: 'Telas desligadas', detalhe: 'Livro + chá sem mel nem leite' });
    L.push({ id: 'dormir', hora: hora(sono.luz), min: sono.luz, titulo: 'Luz apagada', detalhe: sono.naMeta ? 'Na meta de sono' : 'Descendo 15 min por semana até ' + hora(sono.meta) });

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

  const api = { AJUSTES_PADRAO, NOMES_DIA, min, hora, chave, data, somaDias, diasEntre, segundaDaSemana, horarioSono, diaNutri, tipoDia, ehDiaDeTreino, letraTreino, itens, feito, placar };
  g.Rotina = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
