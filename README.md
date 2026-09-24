# ATLANTYX · PMO Executivo Semanal

Dashboard estático para GitHub Pages, alimentado pelo Google Sheets do PMO.

## Estrutura

- `index.html` — interface do dashboard
- `styles.css` — identidade visual ATLANTYX / layout responsivo
- `app.js` — leitura da planilha, filtro por projeto/semana e renderização
- `config.js` — ID da planilha e GIDs das abas
- `assets/` — logo ATLANTYX

## Planilha configurada

Spreadsheet ID:
`1fKYBPZjO_mLDDqD2h2yG9naXAmQc7oA1IeVDdDawZGw`

Abas usadas:
- `PROJETOS` — gid `1281331603`
- `ATUALIZACOES` — gid `1629390087`

O front-end espera as colunas atuais da aba ATUALIZACOES:

`Projeto | Projeto ID | Data da atualização | Pilar | Descritivo | Status | Data início | Data fim | % | Observação / Evidência`

## Semana

Não existe uma coluna de semana na planilha. O JavaScript calcula automaticamente a semana de segunda a sexta a partir de `Data da atualização` e mostra, por exemplo:

`Semana 39 · 21–25 set 2026`

## Publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo `atlantyx-pmo-dashboard`.
2. Envie todos os arquivos deste diretório para a raiz do repositório.
3. No GitHub, abra **Settings → Pages**.
4. Em **Build and deployment**, selecione **Deploy from a branch**.
5. Selecione a branch `main` e a pasta `/ (root)`.
6. Salve. O GitHub exibirá a URL do site.

## Permissão do Google Sheets

O dashboard lê o Google Sheets diretamente pelo navegador usando o endpoint de visualização do Google (`gviz`).

Para que os dados reais carreguem, a planilha precisa estar acessível para leitura sem login, por exemplo por uma política de compartilhamento/publicação compatível com sua empresa.

**Importante:** se os dados forem confidenciais e a planilha não puder ficar acessível publicamente, não publique o conteúdo. Nesse caso, mantenha o GitHub Pages apenas como front-end e adicione depois uma camada autenticada para servir os dados.

Quando o navegador não consegue ler a planilha, o dashboard entra automaticamente em **modo demonstração** para que o layout continue visível.

## Teste local

Você pode abrir `index.html` diretamente, mas alguns navegadores restringem `fetch` quando aberto como `file://`. Para testar de forma idêntica ao GitHub Pages, rode um servidor local simples:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`.
