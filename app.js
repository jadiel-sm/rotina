// Telas do app. Os dados ficam só neste aparelho (localStorage); backup em Mais → Exportar.
(function () {
  'use strict';
  const R = window.Rotina;
  const CHAVE = 'rotina:v1';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n, casas = 1) => n.toFixed(casas).replace('.', ',');

  let db = carregar();
  let aba = ['progresso', 'peso', 'mais'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'hoje';
  let hoje = R.chave(new Date());
  let dataSel = hoje;
  let promptInstalar = null;
  const tela = document.getElementById('tela');

  function normalizar(d) {
    d = d && typeof d === 'object' ? d : {};
    d.dias = d.dias || {};
    d.pesos = Array.isArray(d.pesos) ? d.pesos : [];
    d.ajustes = Object.assign({}, R.AJUSTES_PADRAO, d.ajustes || {});
    if (!d.ajustes.inicioSono) d.ajustes.inicioSono = R.chave(new Date());
    return d;
  }
  function carregar() {
    try { return normalizar(JSON.parse(localStorage.getItem(CHAVE))); } catch (e) { return normalizar(null); }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { aviso('Não consegui salvar neste aparelho.'); }
  }
  function reg(k, criar) {
    if (!db.dias[k] && criar) db.dias[k] = { feitos: {} };
    return db.dias[k];
  }
  function aviso(txt) {
    const el = document.getElementById('aviso');
    el.textContent = txt;
    el.classList.add('vis');
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => el.classList.remove('vis'), 2600);
  }
  function vibrar() { if (navigator.vibrate) navigator.vibrate(12); }

  function nomeData(k) {
    if (k === hoje) return 'Hoje';
    if (k === R.somaDias(hoje, -1)) return 'Ontem';
    const d = R.data(k);
    return R.NOMES_DIA[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }

  // ---------- HOJE ----------
  function telaHoje() {
    const k = dataSel, aj = db.ajustes, r = reg(k);
    const L = R.itens(k, aj, r);
    const p = R.placar(k, aj, r);
    const tipo = R.tipoDia(k);
    const treinoDia = R.ehDiaDeTreino(k, aj, r);
    const letra = R.letraTreino(db.dias, k);
    const sono = R.horarioSono(k, aj);
    const nutri = R.diaNutri(k, aj);
    const sub = { presencial: 'Dia útil · escritório', remoto: 'Sexta · remoto', fds: 'Fim de semana' }[tipo] + (treinoDia ? ' · Treino ' + letra : '');
    const nTreinos = treinosNaSemana(k);
    const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
    const proximo = k === hoje ? L.find((i) => i.tipo !== 'regra' && !R.feito(i, r)) : null;

    let h = '';
    if (promptInstalar && k === hoje) {
      h += '<button class="faixa" data-acao="instalar">Instalar o app na tela inicial</button>';
    }
    h += '<section class="dia-cab">' +
      '<button class="seta" data-acao="dia-ant" aria-label="Dia anterior">‹</button>' +
      '<div class="dia-tit"><h1>' + esc(nomeData(k)) + '</h1><p>' + esc(sub) + '</p></div>' +
      '<button class="seta" data-acao="dia-prox" aria-label="Próximo dia"' + (k >= hoje ? ' disabled' : '') + '>›</button></section>';
    if (k !== hoje) h += '<button class="link centro" data-acao="dia-hoje">Voltar para hoje</button>';

    h += '<div class="placar"><div class="barra"><span style="width:' + Math.round(p.pct * 100) + '%"></span></div><b>' + p.feitos + '/' + p.total + '</b></div>';

    h += '<div class="chips">' +
      '<span class="chip">Luz apagada ' + R.hora(sono.luz) + '</span>' +
      '<span class="chip">Treinos na semana ' + nTreinos + '/' + aj.metaTreinos + '</span>' +
      (nutri ? '<span class="chip">Nutri dia ' + nutri + '/14</span>' : '') + '</div>';

    h += '<ol class="linha">';
    for (const i of L) {
      if (i.tipo === 'regra') continue;
      if (i.tipo === 'treino') { h += cartaoTreino(k, r, letra); continue; }
      const ok = R.feito(i, r);
      const ehProx = proximo && proximo.id === i.id;
      h += '<li class="item' + (ok ? ' ok' : '') + (ehProx ? ' prox' : '') + '">' +
        '<button data-acao="marcar" data-id="' + i.id + '" aria-pressed="' + ok + '">' +
        '<span class="hora">' + esc(i.hora || '') + '</span>' +
        '<span class="txt"><b>' + esc(i.titulo) + '</b>' + (i.detalhe ? '<small>' + esc(i.detalhe) + '</small>' : '') +
        (ehProx ? '<em>' + (i.min <= agoraMin ? 'agora' : 'próximo') + '</em>' : '') + '</span>' +
        '<span class="caixa" aria-hidden="true"></span></button></li>';
    }
    h += '</ol>';

    if (!treinoDia) {
      h += '<button class="link" data-acao="treino-extra">+ Treinar hoje mesmo assim</button>';
    } else if (r && r.extra && !r.treino) {
      h += '<button class="link" data-acao="treino-extra">Tirar o treino de hoje</button>';
    }

    h += '<h2>Regras do dia</h2><ol class="linha">';
    for (const i of L) {
      if (i.tipo !== 'regra') continue;
      const ok = R.feito(i, r);
      h += '<li class="item regra' + (ok ? ' ok' : '') + '"><button data-acao="marcar" data-id="' + i.id + '" aria-pressed="' + ok + '">' +
        '<span class="txt"><b>' + esc(i.titulo) + '</b></span><span class="caixa" aria-hidden="true"></span></button></li>';
    }
    h += '</ol>';

    h += '<h2>Anotação do dia</h2><textarea id="nota" rows="3" placeholder="Como foi o sono, a fome, o treino…">' + esc(r && r.nota) + '</textarea>';
    return h;
  }

  function cartaoTreino(k, r, letra) {
    const aj = db.ajustes;
    const exs = String(letra === 'A' ? aj.treinoA : aj.treinoB).split('\n').map((s) => s.trim()).filter(Boolean);
    const t = r && r.treino;
    let h = '<li class="treino' + (t ? ' ok' : '') + '"><div class="treino-cab"><span class="hora"></span><div><b>Treino ' + letra + '</b><small>Full-body · 40 min · academia do condomínio</small></div>';
    if (!t) h += '<button class="mini" data-acao="treino-trocar">Trocar p/ ' + (letra === 'A' ? 'B' : 'A') + '</button>';
    h += '</div>';
    if (t) {
      h += '<p class="feito-msg">✓ ' + (t.modo === 'preguica' ? 'Dia de preguiça: aquecimento + 1 exercício. Contou!' : 'Treino completo.') +
        ' <button class="link" data-acao="treino-desfazer">desfazer</button></p>';
    } else {
      if (exs.length) {
        const marc = (r && r.exs) || {};
        h += '<ul class="exs">' + exs.map((e, n) => '<li><label><input type="checkbox" data-acao="ex" data-n="' + n + '"' + (marc[n] ? ' checked' : '') + '> ' + esc(e) + '</label></li>').join('') + '</ul>';
      }
      h += '<div class="botoes"><button class="btn" data-acao="treino-feito" data-modo="completo">Fiz o treino</button>' +
        '<button class="btn sec" data-acao="treino-feito" data-modo="preguica">Dia de preguiça<small>aquecimento + 1 exercício</small></button></div>';
    }
    return h + '</li>';
  }

  function treinosNaSemana(k) {
    const seg = R.segundaDaSemana(k);
    let n = 0;
    for (let i = 0; i < 7; i++) { const r = db.dias[R.somaDias(seg, i)]; if (r && r.treino) n++; }
    return n;
  }

  // ---------- PROGRESSO ----------
  function telaProgresso() {
    const aj = db.ajustes;
    const seg = R.segundaDaSemana(hoje);
    const diasSemana = [];
    for (let k = seg; k <= hoje; k = R.somaDias(k, 1)) diasSemana.push(k);

    const conta = (ids, filtro) => {
      let feitos = 0, total = 0;
      for (const k of diasSemana) {
        const r = db.dias[k];
        const L = R.itens(k, aj, r);
        for (const id of ids) {
          const it = L.find((i) => i.id === id);
          if (!it || (filtro && !filtro(k))) continue;
          total++;
          if (R.feito(it, r)) feitos++;
        }
      }
      return { feitos, total };
    };
    const linhas = [
      ['Treinos', { feitos: treinosNaSemana(hoje), total: Number(aj.metaTreinos) || 3 }],
      ['Refeições do plano', conta(['cafe', 'almoco', 'lanche', 'janta'])],
      ['Caminhada depois do almoço', conta(['caminhada'])],
      ['10 min de ar e luz de manhã', conta(['luz-manha'])],
      ['Telas desligadas no horário', conta(['telas'])],
      ['Luz apagada no horário', conta(['dormir'])],
      ['Celular fora do quarto', conta(['celular'])],
      ['Sem açúcar / suco / mel', conta(['acucar'])],
    ];

    let h = '<h1 class="tit">Progresso</h1>';
    h += '<section class="cartao"><h2>Esta semana</h2>';
    for (const [nome, c] of linhas) {
      const pct = c.total ? Math.min(1, c.feitos / c.total) : 0;
      h += '<div class="metrica"><div class="metrica-tx"><span>' + nome + '</span><b>' + c.feitos + '/' + c.total + '</b></div><div class="barra fina"><span style="width:' + Math.round(pct * 100) + '%"></span></div></div>';
    }
    h += '</section>';

    // sequência de dias bons (>= 80%)
    let seq = 0, k = hoje;
    if (R.placar(k, aj, db.dias[k]).pct < 0.8) k = R.somaDias(k, -1);
    while (db.dias[k] && R.placar(k, aj, db.dias[k]).pct >= 0.8) { seq++; k = R.somaDias(k, -1); }

    h += '<section class="cartao"><h2>Últimos 14 dias</h2><div class="colunas">';
    for (let i = 13; i >= 0; i--) {
      const kk = R.somaDias(hoje, -i);
      const p = R.placar(kk, aj, db.dias[kk]).pct;
      const letra = R.NOMES_DIA[R.data(kk).getDay()][0].toUpperCase();
      const treinou = db.dias[kk] && db.dias[kk].treino;
      h += '<button class="col' + (kk === hoje ? ' hoje' : '') + '" data-acao="ir-dia" data-k="' + kk + '" title="' + nomeData(kk) + ': ' + Math.round(p * 100) + '%">' +
        '<span class="col-barra"><span style="height:' + Math.max(3, Math.round(p * 100)) + '%"' + (p >= 0.8 ? ' class="bom"' : '') + '></span></span>' +
        '<small>' + (treinou ? '●' : '&nbsp;') + '</small><small>' + letra + '</small></button>';
    }
    h += '</div><p class="nota-peq">Toque num dia para abrir. ● = treinou. Verde = 80% ou mais.</p>';
    h += '<p class="destaque">' + (seq ? seq + (seq === 1 ? ' dia bom seguido' : ' dias bons seguidos') : 'Comece a sequência hoje') + '</p></section>';

    h += '<section class="cartao"><h2>Treinos por semana</h2><div class="semanas">';
    for (let w = 7; w >= 0; w--) {
      const s = R.somaDias(seg, -7 * w);
      const n = treinosNaSemana(s);
      const d = R.data(s);
      h += '<div class="semana"><span class="pontos">' + '●'.repeat(Math.min(n, 7)) + '<i>' + '○'.repeat(Math.max(0, (Number(aj.metaTreinos) || 3) - n)) + '</i></span><small>' + d.getDate() + '/' + (d.getMonth() + 1) + '</small></div>';
    }
    h += '</div></section>';
    return h;
  }

  // ---------- PESO ----------
  function telaPeso() {
    const P = db.pesos.slice().sort((a, b) => (a.data < b.data ? -1 : 1));
    let h = '<h1 class="tit">Peso</h1>';
    h += '<section class="cartao"><h2>Registrar</h2><div class="form">' +
      '<label>Data<input type="date" id="p-data" value="' + hoje + '" max="' + hoje + '"></label>' +
      '<label>Peso (kg)<input type="number" id="p-kg" inputmode="decimal" step="0.1" min="30" max="300" placeholder="0,0"></label>' +
      '<label>Cintura (cm, opcional)<input type="number" id="p-cint" inputmode="decimal" step="0.5" min="40" max="200"></label>' +
      '<button class="btn" data-acao="peso-salvar">Salvar</button></div>' +
      '<p class="nota-peq">Uma vez por semana, mesmo dia e horário, em jejum, depois do banheiro. A cintura ajuda a ver perda de gordura quando a balança empaca.</p></section>';

    if (P.length) {
      const ult = P[P.length - 1], pri = P[0];
      const dif = ult.kg - pri.kg;
      const semanas = Math.max(1, Math.round(R.diasEntre(pri.data, ult.data) / 7));
      h += '<section class="cartao"><div class="resumo">' +
        '<div><small>Atual</small><b>' + num(ult.kg) + ' kg</b></div>' +
        '<div><small>Desde ' + fmtData(pri.data) + '</small><b class="' + (dif <= 0 ? 'desce' : 'sobe') + '">' + (dif > 0 ? '+' : '') + num(dif) + ' kg</b></div>' +
        (P.length > 1 ? '<div><small>Por semana</small><b>' + (dif > 0 ? '+' : '') + num(dif / semanas, 2) + '</b></div>' : '') +
        '</div>' + (P.length > 1 ? grafico(P) : '') + '</section>';

      h += '<section class="cartao"><h2>Registros</h2><ul class="lista">';
      for (let i = P.length - 1; i >= 0; i--) {
        const p = P[i];
        h += '<li><span>' + fmtData(p.data) + '</span><b>' + num(p.kg) + ' kg</b><span>' + (p.cintura ? num(p.cintura) + ' cm' : '') + '</span>' +
          '<button class="mini" data-acao="peso-apagar" data-data="' + p.data + '" aria-label="Apagar">✕</button></li>';
      }
      h += '</ul></section>';
    }
    return h;
  }

  function fmtData(k) { const d = R.data(k); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }

  function grafico(P) {
    const W = 320, H = 150, m = { l: 34, r: 10, t: 12, b: 22 };
    const xs = P.map((p) => R.diasEntre(P[0].data, p.data));
    const ks = P.map((p) => p.kg);
    const maxX = Math.max(1, xs[xs.length - 1]);
    const lo = Math.floor(Math.min(...ks) - 0.5), hi = Math.ceil(Math.max(...ks) + 0.5);
    const X = (x) => m.l + (x / maxX) * (W - m.l - m.r);
    const Y = (y) => m.t + (1 - (y - lo) / (hi - lo)) * (H - m.t - m.b);
    const pts = P.map((p, i) => X(xs[i]).toFixed(1) + ',' + Y(p.kg).toFixed(1)).join(' ');
    let s = '<svg class="graf" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico do peso">';
    for (const v of [lo, (lo + hi) / 2, hi]) {
      s += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="grade"/>' +
        '<text x="' + (m.l - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + num(v, v % 1 ? 1 : 0) + '</text>';
    }
    s += '<text x="' + m.l + '" y="' + (H - 4) + '">' + fmtData(P[0].data) + '</text>';
    s += '<text x="' + (W - m.r) + '" y="' + (H - 4) + '" text-anchor="end">' + fmtData(P[P.length - 1].data) + '</text>';
    s += '<polyline points="' + pts + '" class="traco"/>';
    P.forEach((p, i) => { s += '<circle cx="' + X(xs[i]).toFixed(1) + '" cy="' + Y(p.kg).toFixed(1) + '" r="3.5" class="ponto"/>'; });
    return s + '</svg>';
  }

  // ---------- MAIS ----------
  function telaMais() {
    const aj = db.ajustes;
    const sono = R.horarioSono(hoje, aj);
    const nutri = R.diaNutri(hoje, aj);
    const letras = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    let h = '<h1 class="tit">Ajustes</h1>';
    if (promptInstalar) h += '<button class="faixa" data-acao="instalar">Instalar o app na tela inicial</button>';

    h += '<section class="cartao"><h2>Treino</h2><p class="rot">Dias de academia</p><div class="dias">' +
      letras.map((l, i) => '<button class="dia-bt' + (aj.diasTreino.includes(i) ? ' on' : '') + '" data-acao="dia-treino" data-d="' + i + '" aria-label="' + R.NOMES_DIA[i] + '">' + l + '</button>').join('') + '</div>' +
      '<label>Meta por semana<input type="number" min="1" max="7" data-campo="metaTreinos" value="' + esc(aj.metaTreinos) + '"></label>' +
      '<label>Exercícios do treino A <i>um por linha, opcional</i><textarea rows="5" data-campo="treinoA">' + esc(aj.treinoA) + '</textarea></label>' +
      '<label>Exercícios do treino B <i>um por linha, opcional</i><textarea rows="5" data-campo="treinoB">' + esc(aj.treinoB) + '</textarea></label></section>';

    h += '<section class="cartao"><h2>Sono</h2>' +
      '<p class="destaque">Esta semana: telas ' + R.hora(sono.telas) + ' · luz apagada ' + R.hora(sono.luz) + '</p>' +
      '<div class="form duas">' +
      '<label>Acordar<input type="time" data-campo="acordar" value="' + esc(aj.acordar) + '"></label>' +
      '<label>Telas (min antes)<input type="number" min="0" max="180" step="15" data-campo="minutosTelas" value="' + esc(aj.minutosTelas) + '"></label>' +
      '<label>Luz apagada no começo<input type="time" data-campo="luzInicial" value="' + esc(aj.luzInicial) + '"></label>' +
      '<label>Meta de luz apagada<input type="time" data-campo="luzMeta" value="' + esc(aj.luzMeta) + '"></label>' +
      '<label>Descida começou em<input type="date" data-campo="inicioSono" value="' + esc(aj.inicioSono) + '"></label></div>' +
      '<p class="nota-peq">O horário desce 15 min por semana a partir dessa data, até chegar na meta.</p></section>';

    h += '<section class="cartao"><h2>Plano da nutri</h2>' +
      '<label>Hoje é o dia… do cardápio de 14 dias<input type="number" min="1" max="14" data-campo="nutriHoje" value="' + (nutri || '') + '" placeholder="1 a 14"></label>' +
      '<p class="nota-peq">O app só conta os dias do ciclo. Os alimentos são os do plano da nutricionista; o app não sugere nada fora dele.</p></section>';

    h += '<section class="cartao"><h2>Regras da rotina</h2><ul class="regras">' +
      '<li>Celular carrega fora do quarto; despertador longe da cama.</li>' +
      '<li>Dia de preguiça: aquecimento + 1 exercício já conta.</li>' +
      '<li>Domingo: produção dos jantares de seg a qui.</li>' +
      '<li>Horário de dormir desce aos poucos (15 min por semana), sem salto brusco.</li>' +
      '<li>Sem açúcar adicionado, suco ou mel fora do plano.</li></ul></section>';

    h += '<section class="cartao"><h2>Backup</h2><p class="nota-peq">Os dados ficam só neste celular. Exporte de vez em quando e guarde o arquivo (Drive, e-mail).</p>' +
      '<div class="botoes"><button class="btn sec" data-acao="exportar">Exportar</button><button class="btn sec" data-acao="importar">Importar</button></div>' +
      '<input type="file" id="arquivo" accept="application/json,.json" hidden></section>';
    h += '<p class="versao">Rotina · v1</p>';
    return h;
  }

  // ---------- RENDER ----------
  function render() {
    const telas = { hoje: telaHoje, progresso: telaProgresso, peso: telaPeso, mais: telaMais };
    tela.innerHTML = telas[aba]();
    document.querySelectorAll('#abas button').forEach((b) => b.classList.toggle('on', b.dataset.aba === aba));
  }

  const acoes = {
    aba(b) { aba = b.dataset.aba; if (aba === 'hoje') dataSel = hoje; render(); window.scrollTo(0, 0); },
    'dia-ant'() { dataSel = R.somaDias(dataSel, -1); render(); },
    'dia-prox'() { if (dataSel < hoje) dataSel = R.somaDias(dataSel, 1); render(); },
    'dia-hoje'() { dataSel = hoje; render(); },
    'ir-dia'(b) { dataSel = b.dataset.k; aba = 'hoje'; render(); window.scrollTo(0, 0); },
    marcar(b) {
      const r = reg(dataSel, true);
      r.feitos[b.dataset.id] = !r.feitos[b.dataset.id];
      if (!r.feitos[b.dataset.id]) delete r.feitos[b.dataset.id];
      vibrar(); salvar(); render();
    },
    'treino-feito'(b) {
      const r = reg(dataSel, true);
      r.treino = { letra: R.letraTreino(db.dias, dataSel), modo: b.dataset.modo };
      vibrar(); salvar(); render();
      aviso(b.dataset.modo === 'preguica' ? 'Contou! Melhor pouco do que nada.' : 'Treino registrado.');
    },
    'treino-desfazer'() { const r = reg(dataSel, true); r.letra = r.treino && r.treino.letra; delete r.treino; salvar(); render(); },
    'treino-trocar'() { const r = reg(dataSel, true); r.letra = R.letraTreino(db.dias, dataSel) === 'A' ? 'B' : 'A'; r.exs = {}; salvar(); render(); },
    'treino-extra'() { const r = reg(dataSel, true); r.extra = !r.extra; salvar(); render(); },
    ex(b) { const r = reg(dataSel, true); r.exs = r.exs || {}; r.exs[b.dataset.n] = b.checked; salvar(); },
    'dia-treino'(b) {
      const d = Number(b.dataset.d), L = db.ajustes.diasTreino;
      db.ajustes.diasTreino = L.includes(d) ? L.filter((x) => x !== d) : L.concat(d).sort();
      salvar(); render();
    },
    'peso-salvar'() {
      const data = document.getElementById('p-data').value || hoje;
      const kg = parseFloat(String(document.getElementById('p-kg').value).replace(',', '.'));
      const cint = parseFloat(String(document.getElementById('p-cint').value).replace(',', '.'));
      if (!(kg > 30 && kg < 300)) { aviso('Digite o peso em kg.'); return; }
      db.pesos = db.pesos.filter((p) => p.data !== data);
      db.pesos.push({ data, kg: Math.round(kg * 10) / 10, cintura: cint > 0 ? cint : null });
      salvar(); render(); aviso('Peso salvo.');
    },
    'peso-apagar'(b) {
      if (!confirm('Apagar o registro de ' + fmtData(b.dataset.data) + '?')) return;
      db.pesos = db.pesos.filter((p) => p.data !== b.dataset.data); salvar(); render();
    },
    exportar() {
      const blob = new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'rotina-backup-' + hoje + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    importar() { document.getElementById('arquivo').click(); },
    async instalar() {
      if (!promptInstalar) return;
      promptInstalar.prompt();
      await promptInstalar.userChoice;
      promptInstalar = null; render();
    },
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b || !acoes[b.dataset.acao] || b.type === 'checkbox') return;
    acoes[b.dataset.acao](b);
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.type === 'checkbox' && el.dataset.acao === 'ex') { acoes.ex(el); return; }
    if (el.id === 'arquivo' && el.files[0]) {
      el.files[0].text().then((t) => {
        const novo = JSON.parse(t);
        if (!novo || !novo.dias) throw new Error();
        if (!confirm('Substituir os dados deste aparelho pelos do backup?')) return;
        db = normalizar(novo); salvar(); render(); aviso('Backup restaurado.');
      }).catch(() => aviso('Arquivo de backup inválido.'));
      return;
    }
    const campo = el.dataset.campo;
    if (!campo) return;
    const aj = db.ajustes;
    if (campo === 'nutriHoje') {
      const n = parseInt(el.value, 10);
      aj.inicioNutri = n >= 1 && n <= 14 ? R.somaDias(hoje, -(n - 1)) : null;
    } else if (campo === 'metaTreinos' || campo === 'minutosTelas') {
      const n = parseInt(el.value, 10);
      if (n >= 0) aj[campo] = n;
    } else if (el.value || campo === 'treinoA' || campo === 'treinoB') {
      aj[campo] = el.value;
    }
    salvar(); render();
  });

  let tNota;
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'nota') return;
    const r = reg(dataSel, true);
    r.nota = e.target.value;
    clearTimeout(tNota);
    tNota = setTimeout(salvar, 400);
  });

  // Virou o dia com o app aberto: volta para hoje.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const agora = R.chave(new Date());
    if (agora !== hoje) { if (dataSel === hoje) dataSel = agora; hoje = agora; }
    if (!document.activeElement || !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) render();
  });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; render(); });
  window.addEventListener('appinstalled', () => { promptInstalar = null; render(); aviso('App instalado.'); });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  render();
})();
