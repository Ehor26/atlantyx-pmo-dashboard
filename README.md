# ATLANTYX · PMO Executivo Semanal — v3

Dashboard estático para GitHub Pages alimentado pela publicação Web do Google Sheets.

## Estrutura da planilha

### PROJETOS

- `projeto_id`
- `projeto`
- `ativo`
- `ordem`
- `sinalizador`
- `equipe_atlantyx`

Valores do `sinalizador`:
- `Sem atraso` → 🟢
- `Atraso sem impacto no término` → 🟡
- `Atraso com impacto no término` → 🔴

Em `equipe_atlantyx`, coloque os integrantes separados por ponto e vírgula. Opcionalmente inclua função usando travessão:

`Ana Souza — PM; Bruno Lima — Arquiteto; Carla Dias — Engenheira de Dados`

### ATUALIZACOES

Os pilares novos são:
- `O que foi feito`
- `O que será feito`
- `Marcos do cronograma`
- `Pontos de atenção`

O dashboard mantém compatibilidade com registros históricos chamados `Entregas` e `Macros do cronograma`.

## Atualização no GitHub

Substitua na raiz do repositório:
- `index.html`
- `styles.css`
- `app.js`
- `README.md` (opcional)

`config.js` e a pasta `assets` podem permanecer iguais.
