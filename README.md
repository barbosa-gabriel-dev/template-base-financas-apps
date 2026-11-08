# 🏦 Suite de Gestão Financeira Serverless PWA (PJ & PF) — Repositório Matriz

Repositório matriz contendo dois sistemas independentes de gestão financeira construídos sobre a arquitetura simple e gratuita **Google Sheets (Database) + Google Apps Script (Serverless API) + GitHub Pages (Frontend SPA / PWA)**.

Ambos os projetos foram desenhados no padrão **White-Label**: nenhuma URL de planilha, ID de documento ou credencial fica exposta ou fixa no código-fonte. Isso permite instanciar qualquer um dos sistemas em novas contas Google em menos de 5 minutos, além de instalá-los como aplicativos nativos no Android, iOS e Desktop.

---

## 📂 Estrutura de Diretórios do Repositório Matriz

```text
template-base-financas/
│
├── README.md                 # Documentação Matriz e Checklist de Implantação
│
├── gestao-PJ-app/            # Base completa do Sistema Empresarial (PJ)
│   ├── index.html            # Frontend SPA PJ com suporte PWA e Modal de Abatimento
│   ├── manifest.json         # Manifesto PWA PJ (Ícone vetorial embutido + Tema #0f172a)
│   ├── sw.js                 # Service Worker PJ (Cache de UI + Bypass para API Sheets)
│   ├── Codigo.gs             # Backend Apps Script PJ (Auto-Setup + API + Backup Drive)
│   └── README.md             # Documentação específica do módulo PJ
│
└── financas-PF-app/          # Base completa do Sistema Pessoal & Dívidas (PF)
    ├── index.html            # Frontend SPA PF (4 Cartões + Quitação + Estorno + PWA)
    ├── manifest.json         # Manifesto PWA PF (Ícone vetorial embutido + Tema #1e1b4b)
    ├── sw.js                 # Service Worker PF (Cache de UI + Bypass para API Sheets)
    ├── Codigo.gs             # Backend Apps Script PF (Auto-Setup + API + Backup Drive)
    └── README.md             # Documentação específica do módulo PF
```

---

## 📊 Comparativo dos Módulos

| Diretório | Sistema | Escopo e Regras de Negócio | Identidade Visual | Chaves `localStorage` |
| :--- | :--- | :--- | :--- | :--- |
| 📁 [`/gestao-PJ-app`](./gestao-PJ-app) | **Gestão Financeira PJ** | Fluxo de Caixa, Contas a Pagar/Receber, Abatimento visual de adiantamentos em parcelas, Custos Fixos Operacionais e Plano de Contas DRE com atualização em cascata. | Slate / Azul Executivo (`#0f172a`) | `fin_pj_api_url` <br> `fin_pj_api_token` |
| 📁 [`/financas-PF-app`](./financas-PF-app) | **Controle & Quitação PF** | Mapa de Dívidas (PF 0% juros livre e Instituições com juros automáticos SELIC/Mercado), Acordos, Estorno de Amortizações, Controle de até 4 Cartões de Crédito (parcelamentos/assinaturas) e Orçamento Mensal. | Indigo / Violeta (`#1e1b4b`) | `fin_pf_api_url` <br> `fin_pf_api_token` |

> 💡 **Isolamento Total de Sessão e Cache:** Como os sistemas utilizam chaves distintas no `localStorage` e nomes de cache separados nos respectivos *Service Workers* (`fin-pj-pwa-v1` e `fin-pf-pwa-v1`), ambos podem ser instalados e operados simultaneamente no mesmo smartphone ou computador, cada um conectado à sua respectiva conta Google.

---

## 🛠️ Arquitetura Técnica e Padrões de Engenharia

1. **Auto-Setup (`setupInicialPJ` / `setupInicialPF`):**
   * Nenhum cabeçalho, aba ou formatação precisa ser criada manualmente. Ao executar a função construtora no Google Apps Script uma única vez, toda a estrutura de abas, formatação de moedas (`R$ #,##0.00`), congelamento de painéis e dados iniciais (*seed data*) são gerados automaticamente.
2. **Progressive Web App (PWA) com Cache Seletivo:**
   * **Ícones SVG Embutidos:** Os arquivos `manifest.json` trazem os ícones vetoriais codificados em *Data URI*, eliminando dependências de imagens externas.
   * **Service Worker (`sw.js`) Inteligente:** Armazena a interface estática em cache para carregamento instantâneo em tela cheia (`standalone`), mas **ignora automaticamente** todas as requisições destinadas a `script.google.com` e `googleusercontent.com`, garantindo que os dados financeiros reflitam a planilha em tempo real.
3. **Backup Automático Semanal & Rotação no Google Drive:**
   * A função `ativarGatilhoBackupSemanal()` cria automaticamente a pasta `Backups_Gestao_Financeira` no Google Drive da conta ativa e agenda um gatilho (*Time-driven Trigger*) para toda segunda-feira às 05h.
   * **Política de Retenção:** O módulo mantém apenas as **12 cópias mais recentes** (~3 meses de histórico) e move os backups excedentes mais antigos para a lixeira, evitando o consumo excessivo de armazenamento no Google Drive.
4. **Prevenção de Bloqueio CORS no GitHub Pages:**
   * Todas as requisições `POST` utilizam `Content-Type: text/plain;charset=utf-8` com payload serializado via `JSON.stringify()`. Isso evita requisições *preflight OPTIONS* bloqueadas pelo Google Apps Script.
5. **Controle de Concorrência e Anti-Duplicidade:**
   * **No Frontend:** Trava global (`emProcessamento`) aliada à desativação imediata do botão acionado (`disabled = true` + ícone giratório) no primeiro toque/clique.
   * **No Backend:** Uso de `LockService.getScriptLock().waitLock(10000)` no Google Apps Script para enfileirar requisições concorrentes e impedir sobrescrita ou duplicidade de linhas.
6. **Segurança via Token/PIN:**
   * Todas as rotas `GET` e `POST` passam pelo middleware `validarToken()`, que confronta o PIN enviado pela requisição com a chave `API_TOKEN` configurada na aba `Config` da planilha.

---

## ⚡ Checklist Rápido de Implantação (Deploy em Nova Conta)

Sempre que desejar instanciar um dos módulos em uma nova conta Google, siga estes 4 passos:

### 1. Instanciar o Banco de Dados e Backup (Google Sheets)
- [ ] Crie uma planilha em branco na conta Google desejada.
- [ ] Abra **Extensões > Apps Script** e cole o código do arquivo `Codigo.gs` correspondente (`/sistema-pj` ou `/sistema-pf`).
- [ ] Execute a função construtora (`setupInicialPJ` ou `setupInicialPF`) e autorize as permissões.
- [ ] Execute a função **`ativarGatilhoBackupSemanal`** e autorize o acesso ao Google Drive para habilitar o backup automático toda segunda-feira.
- [ ] Na aba `Config` da planilha, altere o valor de `API_TOKEN` para um novo PIN pessoal.

### 2. Publicar o Web App (Google Apps Script)
- [ ] Clique em **Implantar > Nova implantação > App da Web**.
- [ ] Defina *Executar como:* **Eu** e *Quem pode acessar:* **Qualquer pessoa**.
- [ ] Copie a URL `/exec` gerada.

### 3. Hospedar o PWA (GitHub Pages)
- [ ] Crie um repositório público no GitHub para a instância e envie os arquivos `index.html`, `manifest.json` e `sw.js` da pasta correspondente.
- [ ] Ative o **GitHub Pages** na branch `main` (`Settings > Pages`).

### 4. Vincular Credenciais e Instalar o App
- [ ] Abra o link do GitHub Pages no computador ou smartphone.
- [ ] Insira a URL `/exec` e o `API_TOKEN` no modal de conexão.
- [ ] Clique no botão **"Instalar App"** na barra superior (ou use a opção *"Adicionar à tela inicial"* do navegador) para instalar o aplicativo no dispositivo.

---

## 🔄 Manutenção e Atualização de Versão

* **No Google Apps Script (`Codigo.gs`):** Após salvar alterações no código, acesse **Implantar > Gerenciar implantações > Editar (ícone de lápis) > Versão: "Nova versão" > Implantar**. Isso atualiza a API mantendo a mesma URL `/exec`.
* **No Service Worker (`sw.js`):** Caso faça alterações visuais profundas no `index.html` e queira forçar a limpeza imediata do cache nos aparelhos instalados, basta incrementar o nome da constante `CACHE_NAME` no `sw.js` (ex: de `'fin-pj-pwa-v1'` para `'fin-pj-pwa-v2'`).
