# 💼 Sistema de Gestão Financeira PJ — Serverless PWA

Aplicação web progressiva (**PWA**), leve e **100% gratuita (Serverless)** para controle financeiro empresarial (PJ). Desenvolvida com arquitetura **White-Label (Zero Hardcoding)**, permitindo instanciar o sistema em qualquer conta Google em menos de 5 minutos, sem necessidade de alterar variáveis no código-fonte.

---

## 🏗️ Arquitetura do Sistema

O projeto opera em modelo desacoplado de três camadas a custo zero:

1. **Banco de Dados (Google Sheets):** Armazena os lançamentos, matriz de custos fixos, plano de contas (DRE) e parâmetros globais em 4 abas estruturadas.
2. **Backend / API (Google Apps Script):** Script vinculado à planilha atuando como API REST (`doGet` e `doPost`), com controle de concorrência (`LockService`), autenticação via Token/PIN e rotina de backup automatizado no Google Drive.
3. **Frontend PWA (GitHub Pages):** Single-Page Application (SPA) em `index.html` acompanhada de `manifest.json` e Service Worker (`sw.js`). Utiliza **Tailwind CSS**, **Chart.js** e **FontAwesome**, mantendo credenciais isoladas no `localStorage` (`fin_pj_api_url` e `fin_pj_api_token`).

---

## ✨ Funcionalidades Principais

* **Auto-Setup da Planilha (`setupInicialPJ`):** Cria e formata automaticamente todas as abas, cabeçalhos, cores executivas, formatos de moeda/data e categorias iniciais com apenas 1 clique.
* **Dashboard & Fluxo de Caixa em Tempo Real:**
  * KPIs de Entradas Realizadas, A Receber, Saídas Pagas, A Pagar, Saldo Real em Caixa e Saldo Projetado do Mês.
  * Alerta automático de pendências vencidas no mês.
  * Gráficos dinâmicos de *Realizado vs. Previsto* e *Despesas por Categoria*.
* **Gestão de Contas a Pagar e Receber (CRUD Completo):**
  * Adição, edição completa em modal, baixa rápida com 1 clique e exclusão de lançamentos.
  * Filtro mensal e filtros combinados por Tipo (Entrada/Saída) e Status (Pendente/Pago).
* **Modal Visual de Abatimento / Adiantamento em Parcelas:**
  * Simulação em tempo real para descontar pagamentos adiantados (ex: manutenções, taxas ou despesas pagas por fora) diretamente do saldo de uma mensalidade pendente.
  * Registra imediatamente a saída de caixa na data do adiantamento e deduz o valor do saldo restante da parcela original, documentando o histórico nas observações.
* **Matriz de Custos Fixos Operacionais (CRUD Completo):**
  * Cadastro, edição, ativação/pausa (`Sim`/`Não`) e exclusão de despesas recorrentes (DAS, internet, aluguel, sistemas).
  * Botão **"Gerar Custos Fixos do Mês"** que lança todas as contas ativas no mês selecionado com trava contra duplicidade.
* **Plano de Categorias & Classificação DRE (CRUD Completo):**
  * Adição, edição e exclusão de categorias diretamente pelo painel web.
  * **Atualização em Cascata:** Renomear uma categoria atualiza automaticamente todos os lançamentos e custos fixos vinculados a ela na planilha.
* **Proteção Anti-Duplicidade (Debouncing + LockService):**
  * Bloqueio imediato dos botões de ação no primeiro clique/toque (`disabled` + spinner) e fila de execução no Apps Script.
* **Backup Automático Semanal no Google Drive:**
  * Gatilho programado (`ativarGatilhoBackupSemanal`) que gera cópias datadas da planilha toda segunda-feira às 05h na pasta `Backups_Gestao_Financeira`, mantendo os últimos 12 backups (rotação automática).
* **Instalável como Aplicativo Nativo (PWA):**
  * Suporte a instalação em tela cheia (`standalone`) no Android, iOS e Desktop, com cache inteligente de interface via Service Worker (sem fazer cache das chamadas da API).

---

## 📊 Estrutura do Banco de Dados (Abas da Planilha)

| Aba | Colunas | Descrição |
| :--- | :--- | :--- |
| **`Lancamentos`** | `ID`, `Data_Competencia`, `Data_Vencimento`, `Data_Pagamento`, `Tipo`, `Categoria`, `Centro_Custo`, `Descricao`, `Valor`, `Status`, `Forma_Pagto`, `Observacoes`, `Criado_Em` | Tabela fato principal do fluxo de caixa e contas a pagar/receber. |
| **`Custos_Op`** | `ID_Custo`, `Descricao`, `Categoria`, `Centro_Custo`, `Tipo_Custo`, `Periodicidade`, `Valor_Base`, `Dia_Vencimento`, `Ativo` | Matriz de despesas recorrentes para geração automática mensal. |
| **`Categorias`** | `ID_Cat`, `Nome_Categoria`, `Tipo_Fluxo`, `Classificacao_DRE` | Plano de contas para padronização de lançamentos e estrutura DRE. |
| **`Config`** | `Chave`, `Valor`, `Descricao` | Parâmetros globais (`API_TOKEN`, `NOME_EMPRESA`, `META_FATURAMENTO`). |

---

## 🚀 Guia de Implantação Rápida (Em Qualquer Conta Google)

### Passo 1: Configurar a Planilha e o Backend (Google Sheets)
1. Acesse o [Google Sheets](https://sheets.google.com) na conta destinada ao PJ e crie uma **Planilha em branco**.
2. No menu superior, clique em **Extensões** > **Apps Script**.
3. Apague o código padrão, cole todo o conteúdo do arquivo `Codigo.gs` e salve o projeto.
4. Na barra superior do Apps Script, selecione a função **`setupInicialPJ`** e clique em **Executar** (autorize as permissões da conta).
5. *(Opcional — Backup Automático)* Selecione a função **`ativarGatilhoBackupSemanal`** e clique em **Executar** para criar a pasta de backup no Google Drive e agendar o backup semanal.
6. Volte para a planilha: na aba **`Config`**, altere o valor de **`API_TOKEN`** (padrão `123456`) para um PIN pessoal e ajuste o **`NOME_EMPRESA`**.

### Passo 2: Publicar a API (Web App)
1. No editor do **Apps Script**, clique em **Implantar** > **Nova implantação**.
2. Selecione o tipo **App da Web** e configure:
   * **Descrição:** `API Gestão PJ`
   * **Executar como:** `Eu`
   * **Quem pode acessar:** `Qualquer pessoa`
3. Clique em **Implantar** e copie a **URL do app da Web** gerada (terminada em `/exec`).

> ⚠️ **Atualizações de código no Apps Script:** Sempre que alterar o `Codigo.gs`, publique em **Implantar > Gerenciar implantações > Editar (ícone de lápis) > Versão: "Nova versão" > Implantar** para manter a mesma URL ativa.

### Passo 3: Publicar o Frontend PWA no GitHub Pages
1. Suba os arquivos `index.html`, `manifest.json` e `sw.js` na raiz do repositório GitHub.
2. Acesse **Settings** > **Pages** e ative a publicação na branch `main` (pasta `/root`).
3. Acesse o link gerado, insira a **URL do Web App** e o **Token/PIN** no modal de conexão e clique no botão **"Instalar App"** na barra superior para instalar o PWA no dispositivo.

---

## 📁 Estrutura de Arquivos do Repositório

```text
├── index.html      # Aplicação Frontend SPA com suporte a instalação PWA
├── manifest.json   # Manifesto Web App com ícone vetorial embutido e tema #0f172a
├── sw.js           # Service Worker (Cache de UI + Bypass em tempo real para API Google)
├── Codigo.gs       # Código-fonte do Google Apps Script (Auto-Setup + API + Backup Drive)
└── README.md       # Documentação técnica e guia de implantação White-Label
```
