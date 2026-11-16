# Rotina — instruções para o Claude

App pessoal (PWA, instalável pelo Chrome) para acompanhar a rotina diária do Jadiel. Ele não programa: explicar em português simples.

## Como é feito
- Sem build e sem dependências: `index.html`, `estilo.css`, `rotina.js` (regras da rotina, testável no Node), `app.js` (telas), `sw.js` (offline), `manifest.webmanifest`.
- Dados só no aparelho (localStorage, chave `rotina:v1`). Backup por Exportar/Importar em Ajustes.
- A rotina (horários e itens de cada dia) está em `itens()` no `rotina.js`. Mudou a rotina → mudar ali.
- Fim de semana: faixas de desenvolvimento / lazer / descanso em `FAIXAS` (`rotina.js`); domingo tem a produção dos jantares.
- Treino: só registra se treinou (completo ou "dia de preguiça"). Ele tem 3 treinos num app pago; não detalhar exercícios aqui.
- O destaque "agora/próximo" segue o relógio (`emDestaque`) e a tela Hoje se atualiza a cada minuto.
- Sem lembretes/notificações por enquanto (decisão dele, 16/11/2026).
- Ao publicar mudança, subir `CACHE` em `sw.js` (`rotina-v2`, …) e a versão em `telaMais()`.
- Ícones: `node scripts/icones.mjs`.

## Regras
- Dieta é a do plano da nutricionista (ciclo de 14 dias): o app nunca sugere alimentos.
- Nenhum dado pessoal (peso, saúde, nome) no código: o repositório pode ser público.
