# ATLANTYX · PMO Executivo Semanal — v3

Dashboard estático para GitHub Pages alimentado pela publicação Web do Google Sheets.

## Estrutura da planilha

### PROJETOS

- `projeto_id`
- `projeto`
- `ativo`
- `ordem`
- `sinalizador`

Valores do `sinalizador`:
- `Sem atraso` → 🟢
- `Atraso sem impacto no término` → 🟡
- `Atraso com impacto no término` → 🔴

A equipe agora é lida da aba `Equipe_projeto`, uma pessoa por linha, usando as colunas `Id_recurso`, `recurso`, `funcao`, `projeto` e `projeto_id`.


### ATUALIZACOES

Os pilares novos são:
- `O que foi feito`
- `O que será feito`
- `Marcos do cronograma`
- `Pontos de atenção`

O dashboard mantém compatibilidade com registros históricos chamados `Entregas` e `Macros do cronograma`.

## Atualização no GitHub

Substitua na raiz do repositório:
- `app.js`
- `config.js`
- `README.md` (opcional)

`index.html`, `styles.css` e a pasta `assets` podem permanecer iguais se você já aplicou a v3.
