# 🛡️ Sistema de Controle Financeiro & Quitação de Dívidas PF — Serverless PWA

Aplicação web progressiva (**PWA**) e **100% gratuita (Serverless)** projetada para reorganização financeira pessoal, controle detalhado de até 4 cartões de crédito e estratégia de quitação de dívidas (Pessoas Físicas e Instituições). Desenvolvida com arquitetura **White-Label (Zero Hardcoding)** para implantação rápida em qualquer conta Google.

---

## 🏗️ Arquitetura do Sistema

1. **Banco de Dados (Google Sheets):** Armazena o fluxo mensal, matriz de custos fixos/rendas, configuração e faturas de até 4 cartões de crédito, mapa de passivos e histórico de amortizações em 7 abas estruturadas.
2. **Backend / API (Google Apps Script):** Script vinculado à planilha (`doGet` e `doPost`) com controle de concorrência (`LockService`), cálculo automático de fechamento de faturas, preenchimento automático de juros de mercado/SELIC e rotina de backup semanal no Google Drive.
3. **Frontend PWA (GitHub Pages):** Single-Page Application (SPA) em `index.html` acompanhada de `manifest.json` e Service Worker (`sw.js`). Utiliza **Tailwind CSS**, **Chart.js** e **FontAwesome**. Credenciais isoladas no `localStorage` (`fin_pf_api_url` e `fin_pf_api_token`), permitindo uso simultâneo com o sistema PJ no mesmo aparelho sem conflito.

---

## ✨ Funcionalidades Principais

* **1. Dash Principal (Visão Integrada do Mês):**
  * **Resumo Financeiro Unificado:** Calcula automaticamente `Renda do Mês - (Custos Fixos + Faturas dos Cartões + Parcelas de Acordos do Mês)` para exibir o **Fôlego Livre no Mês**.
  * **Termômetro Global de Quitação:** Barra de progresso do passivo total, percentual já quitado e soma de descontos reais conquistados em acordos.
  * **Ordem de Ataque Recomendada:** Alternância dinâmica entre o **Método Avalanche** (prioriza dívidas com maiores taxas de juros) e o **Método Bola de Neve** (prioriza menores saldos devedores).
  * **Caixa PF do Mês:** Lançamento, edição, baixa e exclusão de contas e rendas do mês.
* **2. Gestão de Cartões de Crédito (Até 4 Cartões Ativos):**
  * **Gerenciamento Completo de Slots:** Adição de novos cartões, edição de Nome/Cor/Limite/Fechamento/Vencimento, ocultação/reativação em 1 clique e exclusão de cartões.
  * **Cálculo Inteligente de Fatura:** Ao lançar uma compra à vista ou parcelada, o sistema confronta a data da compra com o **Dia de Fechamento** daquele cartão e distribui automaticamente as parcelas nas faturas dos meses correspondentes.
  * **Edição Inteligente de Compras e Parcelamentos:** Permite editar apenas a parcela do mês atual ou recalcular/redistribuir todas as parcelas do grupo (`ID_Grupo_Parcela`) preservando faturas já pagas.
  * **Assinaturas Recorrentes no Cartão:** Compras marcadas como assinatura fixa são replicadas automaticamente a cada novo mês.
* **3. Custos Fixos & Renda Mensal (CRUD Completo):**
  * Matriz de salários/rendas e despesas fixas da casa com botão **"Gerar Fixos + Assinaturas no Mês Atual"** (com proteção contra duplicidade).
* **4. Mapa de Dívidas & Acordos (PF vs. Instituições):**
  * **Dívidas com Pessoas Físicas:** Taxa travada em **0% de juros** e amortização livre (abatimentos variáveis conforme disponibilidade de caixa).
  * **Dívidas com Instituições:** Preenchimento automático da taxa de juros mensal (SELIC / Mercado) conforme a modalidade financeira quando a taxa é deixada em branco.
  * **Modo Acordo Fechado:** Calcula o desconto obtido frente ao valor atualizado e gera automaticamente o cronograma de parcelas mensais.
  * **Edição e Estorno de Amortizações:** Permite corrigir valores/datas de pagamentos já efetuados ou **estornar** um pagamento lançado por engano (reabrindo a parcela no acordo ou removendo o abatimento avulso e restaurando o saldo devedor da dívida automaticamente).
* **Proteção Anti-Duplicidade (Debouncing + LockService):**
  * Bloqueio imediato de botões (`disabled` + spinner) no primeiro toque/clique e fila de gravação no backend.
* **Backup Automático Semanal no Google Drive:**
  * Função `ativarGatilhoBackupSemanal` que salva cópias semanais da planilha na pasta `Backups_Gestao_Financeira` no Google Drive, mantendo os últimos 12 backups.
* **Instalável como Aplicativo Nativo (PWA):**
  * Botão **"Instalar App"** integrado na barra superior, manifesto com ícone vetorial violeta (`#1e1b4b`) e abertura em tela cheia (`standalone`).

---

## 📊 Estrutura do Banco de Dados (Abas da Planilha PF)

| Aba | Colunas | Finalidade |
| :--- | :--- | :--- |
| **`Fluxo_Mes`** | `ID`, `Mes_Ano`, `Data_Vencimento`, `Data_Pagamento`, `Tipo`, `Categoria`, `Descricao`, `Valor`, `Status`, `Origem_Ref`, `Observacoes` | Lançamentos de entradas e saídas de caixa do mês. |
| **`Custos_Fixos`** | `ID_Fixo`, `Tipo`, `Descricao`, `Categoria`, `Valor_Base`, `Dia_Vencimento`, `Ativo` | Matriz de rendas e despesas fixas mensais. |
| **`Cartoes_Config`** | `ID_Cartao`, `Nome_Cartao`, `Cor_Hex`, `Limite_Total`, `Dia_Fechamento`, `Dia_Vencimento`, `Ativo` | Parâmetros dos cartões de crédito (até 4 ativos). |
| **`Cartoes_Lancamentos`** | `ID_Compra`, `ID_Grupo_Parcela`, `ID_Cartao`, `Data_Compra`, `Mes_Fatura`, `Descricao`, `Categoria`, `Valor_Parcela`, `Parcela_Atual`, `Total_Parcelas`, `Assinatura_Fixa`, `Status_Fatura` | Parcelas e assinaturas alocadas por fatura mensal. |
| **`Dividas`** | `ID_Divida`, `Tipo_Credor`, `Credor`, `Descricao`, `Modalidade`, `Data_Inicio`, `Valor_Original`, `Taxa_Juros_Mes`, `Valor_Atualizado`, `Em_Acordo`, `Valor_Acordo`, `Desconto_Obtido`, `Qtd_Parcelas`, `Parcelas_Pagas`, `Valor_Pago_Total`, `Saldo_Restante`, `Dia_Venc_Acordo`, `Prioridade`, `Status`, `Observacoes` | Cadastro mestre de passivos PF e Instituições. |
| **`Dividas_Pagamentos`** | `ID_Pagto`, `ID_Divida`, `Data_Vencimento`, `Data_Pagamento`, `Numero_Parcela`, `Valor_Previsto`, `Valor_Pago`, `Status`, `Observacoes` | Cronograma de parcelas de acordos e histórico de amortizações avulsas. |
| **`Config`** | `Chave`, `Valor`, `Descricao` | Parâmetros globais (`API_TOKEN`, `NOME_TITULAR`, `TAXA_SELIC_MENSAL`, `ESTRATEGIA_QUITACAO`). |

---

## 🚀 Guia de Implantação Rápida (Em Qualquer Conta Google)

### Passo 1: Planilha e Backend (Google Sheets)
1. Crie uma **Planilha em branco** na conta Google destinada ao controle PF.
2. Acesse **Extensões** > **Apps Script**, cole o conteúdo de `Codigo.gs` e salve.
3. Selecione a função **`setupInicialPF`** na barra superior e clique em **Executar** (autorize as permissões).
4. *(Opcional — Backup Automático)* Selecione a função **`ativarGatilhoBackupSemanal`** e clique em **Executar** para agendar o backup semanal no Google Drive.
5. Na aba **`Config`** criada na planilha, defina o seu **`API_TOKEN`** (PIN de segurança) e o **`NOME_TITULAR`**.

### Passo 2: Publicação do Web App (API)
1. No Apps Script, clique em **Implantar** > **Nova implantação** > tipo **App da Web**.
2. Configure:
   * **Executar como:** `Eu`
   * **Quem pode acessar:** `Qualquer pessoa`
3. Clique em **Implantar** e copie a URL terminada em `/exec`.

### Passo 3: Publicação do PWA no GitHub Pages
1. Suba os arquivos `index.html`, `manifest.json` e `sw.js` na raiz deste repositório e ative o **GitHub Pages** em *Settings > Pages > Branch: main*.
2. Acesse o link gerado, insira a URL `/exec` e o PIN no modal de configuração e clique em **"Instalar App"** no topo para adicionar o aplicativo à tela inicial.

---

## 📁 Estrutura de Arquivos do Repositório

```text
├── index.html      # Aplicação Frontend SPA (4 Abas + Edição/Estorno + Instalação PWA)
├── manifest.json   # Manifesto Web App com ícone vetorial embutido e tema #1e1b4b
├── sw.js           # Service Worker (Cache de UI + Bypass em tempo real para API Google)
├── Codigo.gs       # Código-fonte do Google Apps Script (Auto-Setup + API + Backup Drive)
└── README.md       # Documentação técnica e guia de implantação White-Label
```
