# ATLANTYX · PMO Executivo Semanal — v4

Atualização desta versão:

- o terceiro bloco do topo agora mostra **Status do projeto**, **% concluído** e **% planejado**;
- os percentuais são lidos da aba `INDICADORES_PROJECT`;
- para a semana selecionada, o dashboard usa o registro com a **maior Data referência dentro daquela semana** para o mesmo `projeto_id`;
- o status (🟢/🟡/🔴) continua vindo da aba `PROJETOS`;
- a equipe continua vindo da aba `Equipe_projeto`.

## Aba INDICADORES_PROJECT

Colunas:

1. Projeto
2. Projeto ID (automático)
3. Data referência
4. % concluído
5. % planejado

Você pode inserir várias linhas para o mesmo projeto. O dashboard escolhe automaticamente o snapshot mais recente dentro da semana selecionada.

## GitHub

Substitua na raiz do repositório:

- `index.html`
- `app.js`
- `styles.css`
- `config.js`

Depois faça commit e `Ctrl + F5` no dashboard.
