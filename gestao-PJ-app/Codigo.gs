/**
 * ============================================================================
 * SISTEMA DE GESTÃO FINANCEIRA PF - QUITAÇÃO DE DÍVIDAS & CARTÕES (PORTÁVEL)
 * ============================================================================
 * Instruções de Implantação:
 * 1. No menu superior do Apps Script, selecione "setupInicialPF" e clique em "Executar".
 * 2. (Opcional) Selecione "ativarGatilhoBackupSemanal" e clique em "Executar" para agendar backups no Drive.
 * 3. Clique em "Implantar" > "Nova implantação" > Tipo: "App da Web".
 *    - Executar como: "Eu"
 *    - Quem pode acessar: "Qualquer pessoa"
 */

const TOKEN_PADRAO_PF = "123456";
const NOME_PASTA_BACKUP = "Backups_Gestao_Financeira";
const MAX_BACKUPS_MANTIDOS = 12;

// Tabela oficial de taxas automáticas ( % ao mês ) quando o usuário não declara juros
const TAXAS_MERCADO_PADRAO = {
  "Pessoa Física (Sem Juros)": 0.00,
  "Impostos / Taxas Públicas (SELIC)": 0.90,
  "Consignado / Financiamento": 1.80,
  "Empréstimo Pessoal / Carnê / Boleto": 4.50,
  "Cheque Especial": 8.00,
  "Cartão de Crédito (Rotativo/Atraso)": 14.00,
  "Outros (SELIC Padrão)": 0.90
};

const ESTRUTURA_PF = {
  "Fluxo_Mes": [
    "ID", "Mes_Ano", "Data_Vencimento", "Data_Pagamento", "Tipo",
    "Categoria", "Descricao", "Valor", "Status", "Origem_Ref", "Observacoes"
  ],
  "Custos_Fixos": [
    "ID_Fixo", "Tipo", "Descricao", "Categoria", "Valor_Base", "Dia_Vencimento", "Ativo"
  ],
  "Cartoes_Config": [
    "ID_Cartao", "Nome_Cartao", "Cor_Hex", "Limite_Total", "Dia_Fechamento", "Dia_Vencimento", "Ativo"
  ],
  "Cartoes_Lancamentos": [
    "ID_Compra", "ID_Grupo_Parcela", "ID_Cartao", "Data_Compra", "Mes_Fatura",
    "Descricao", "Categoria", "Valor_Parcela", "Parcela_Atual", "Total_Parcelas",
    "Assinatura_Fixa", "Status_Fatura"
  ],
  "Dividas": [
    "ID_Divida", "Tipo_Credor", "Credor", "Descricao", "Modalidade",
    "Data_Inicio", "Valor_Original", "Taxa_Juros_Mes", "Valor_Atualizado",
    "Em_Acordo", "Valor_Acordo", "Desconto_Obtido", "Qtd_Parcelas",
    "Parcelas_Pagas", "Valor_Pago_Total", "Saldo_Restante", "Dia_Venc_Acordo",
    "Prioridade", "Status", "Observacoes"
  ],
  "Dividas_Pagamentos": [
    "ID_Pagto", "ID_Divida", "Data_Vencimento", "Data_Pagamento",
    "Numero_Parcela", "Valor_Previsto", "Valor_Pago", "Status", "Observacoes"
  ],
  "Config": [
    "Chave", "Valor", "Descricao"
  ]
};

/**
 * 1. AUTO-SETUP DA PLANILHA PF
 * Execute esta função APENAS UMA VEZ para criar e formatar todas as abas.
 */
function setupInicialPF() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  for (let nomeAba in ESTRUTURA_PF) {
    let sheet = ss.getSheetByName(nomeAba);
    if (!sheet) {
      sheet = ss.insertSheet(nomeAba);
    }

    const colunas = ESTRUTURA_PF[nomeAba];
    const rangeCabecalho = sheet.getRange(1, 1, 1, colunas.length);

    if (!rangeCabecalho.getValue()) {
      rangeCabecalho.setValues([colunas]);
      rangeCabecalho.setBackground("#1e1b4b");
      rangeCabecalho.setFontColor("#ffffff");
      rangeCabecalho.setFontWeight("bold");
      sheet.setFrozenRows(1);

      if (nomeAba === "Fluxo_Mes") {
        sheet.getRange("H2:H1000").setNumberFormat("R$ #,##0.00");
      } else if (nomeAba === "Custos_Fixos") {
        sheet.getRange("E2:E500").setNumberFormat("R$ #,##0.00");
      } else if (nomeAba === "Cartoes_Config") {
        sheet.getRange("D2:D20").setNumberFormat("R$ #,##0.00");
      } else if (nomeAba === "Cartoes_Lancamentos") {
        sheet.getRange("H2:H2000").setNumberFormat("R$ #,##0.00");
      } else if (nomeAba === "Dividas") {
        sheet.getRange("G2:G500").setNumberFormat("R$ #,##0.00");
        sheet.getRange("I2:I500").setNumberFormat("R$ #,##0.00");
        sheet.getRange("K2:L500").setNumberFormat("R$ #,##0.00");
        sheet.getRange("O2:P500").setNumberFormat("R$ #,##0.00");
      } else if (nomeAba === "Dividas_Pagamentos") {
        sheet.getRange("F2:G1000").setNumberFormat("R$ #,##0.00");
      }
    }
  }

  ["Página1", "Sheet1"].forEach(nome => {
    const aba = ss.getSheetByName(nome);
    if (aba && ss.getSheets().length > 1) ss.deleteSheet(aba);
  });

  const sheetConfig = ss.getSheetByName("Config");
  if (sheetConfig.getLastRow() === 1) {
    sheetConfig.appendRow(["API_TOKEN", TOKEN_PADRAO_PF, "PIN de acesso ao painel web PF"]);
    sheetConfig.appendRow(["NOME_TITULAR", "Controle Financeiro & Quitação PF", "Título exibido no topo do painel"]);
    sheetConfig.appendRow(["TAXA_SELIC_MENSAL", "0.90", "Taxa SELIC mensal de referência (%)"]);
    sheetConfig.appendRow(["ESTRATEGIA_QUITACAO", "AVALANCHE", "AVALANCHE (Maior Juros) ou BOLA_DE_NEVE (Menor Saldo)"]);
  }

  const sheetCartoes = ss.getSheetByName("Cartoes_Config");
  if (sheetCartoes.getLastRow() === 1) {
    const cartoesIniciais = [
      ["CARD-01", "Cartão 01 (Principal)", "#7c3aed", 3000.00, 5, 12, "Sim"],
      ["CARD-02", "Cartão 02", "#ea580c", 2000.00, 10, 17, "Sim"],
      ["CARD-03", "Cartão 03", "#0284c7", 1500.00, 15, 22, "Sim"],
      ["CARD-04", "Cartão 04", "#059669", 1000.00, 20, 28, "Sim"]
    ];
    sheetCartoes.getRange(2, 1, cartoesIniciais.length, 7).setValues(cartoesIniciais);
  }

  const sheetFixos = ss.getSheetByName("Custos_Fixos");
  if (sheetFixos.getLastRow() === 1) {
    const fixosIniciais = [
      ["FIX-01", "Entrada", "Salário / Pró-Labore / Renda Principal", "Renda Mensal", 4000.00, 5, "Sim"],
      ["FIX-02", "Saída", "Energia Elétrica / Água", "Moradia", 250.00, 10, "Sim"],
      ["FIX-03", "Saída", "Internet Residencial", "Moradia", 100.00, 15, "Sim"],
      ["FIX-04", "Saída", "Supermercado / Alimentação Base", "Alimentação", 1200.00, 5, "Sim"]
    ];
    sheetFixos.getRange(2, 1, fixosIniciais.length, 7).setValues(fixosIniciais);
  }
}

/**
 * 2. VALIDAÇÃO DE TOKEN
 */
function validarToken(tokenRecebido) {
  const sheetConfig = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Config");
  const dados = sheetConfig.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === "API_TOKEN") {
      return String(dados[i][1]).trim() === String(tokenRecebido).trim();
    }
  }
  return tokenRecebido === TOKEN_PADRAO_PF;
}

/**
 * 3. API GET - Retorna todos os dados estruturados para o Frontend PF
 */
function doGet(e) {
  try {
    const token = e.parameter.token;
    if (!validarToken(token)) {
      return responderJSON({ status: "erro", mensagem: "Token/PIN inválido ou não autorizado." });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    return responderJSON({
      status: "sucesso",
      config: lerAbaComoObjeto(ss.getSheetByName("Config")),
      fluxo_mes: lerAbaComoObjeto(ss.getSheetByName("Fluxo_Mes")),
      custos_fixos: lerAbaComoObjeto(ss.getSheetByName("Custos_Fixos")),
      cartoes_config: lerAbaComoObjeto(ss.getSheetByName("Cartoes_Config")),
      cartoes_lancamentos: lerAbaComoObjeto(ss.getSheetByName("Cartoes_Lancamentos")),
      dividas: lerAbaComoObjeto(ss.getSheetByName("Dividas")),
      dividas_pagamentos: lerAbaComoObjeto(ss.getSheetByName("Dividas_Pagamentos")),
      taxas_padrao: TAXAS_MERCADO_PADRAO
    });
  } catch (erro) {
    return responderJSON({ status: "erro", mensagem: erro.toString() });
  }
}

/**
 * 4. API POST - Regras de Negócio PF (Cartões, Custos Fixos, Fluxo Mensal e Dívidas)
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (!validarToken(body.token)) {
      return responderJSON({ status: "erro", mensagem: "Token/PIN inválido ou não autorizado." });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const acao = body.acao;

      // ========================================================================
      // MÓDULO 1: FLUXO DO MÊS E CUSTOS FIXOS PF
      // ========================================================================
      if (acao === "salvar_fluxo_mes") {
        const sheet = ss.getSheetByName("Fluxo_Mes");
        const d = body.dados;
        const idExistente = d.ID;
        const mesAno = String(d.Data_Vencimento).slice(0, 7);

        if (!idExistente) {
          const novoId = "FLX-" + Utilities.getUuid().slice(0, 8).toUpperCase();
          sheet.appendRow([
            novoId, mesAno, d.Data_Vencimento, d.Status === "Pago" ? d.Data_Vencimento : "",
            d.Tipo, d.Categoria || "Geral", d.Descricao, Number(d.Valor),
            d.Status || "Pendente", d.Origem_Ref || "Manual", d.Observacoes || ""
          ]);
          return responderJSON({ status: "sucesso", mensagem: "Lançamento registrado no mês." });
        } else {
          const dados = sheet.getDataRange().getValues();
          for (let i = 1; i < dados.length; i++) {
            if (String(dados[i][0]) === String(idExistente)) {
              sheet.getRange(i + 1, 1, 1, 11).setValues([[
                idExistente, mesAno, d.Data_Vencimento,
                d.Status === "Pago" ? (dados[i][3] || d.Data_Vencimento) : "",
                d.Tipo, d.Categoria || "Geral", d.Descricao, Number(d.Valor),
                d.Status, dados[i][9] || "Manual", d.Observacoes || ""
              ]]);
              return responderJSON({ status: "sucesso", mensagem: "Lançamento atualizado." });
            }
          }
        }
      }

      if (acao === "baixar_fluxo_mes") {
        const sheet = ss.getSheetByName("Fluxo_Mes");
        const dados = sheet.getDataRange().getValues();
        const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
        for (let i = 1; i < dados.length; i++) {
          if (String(dados[i][0]) === String(body.id)) {
            sheet.getRange(i + 1, 4).setValue(hoje);
            sheet.getRange(i + 1, 9).setValue("Pago");
            return responderJSON({ status: "sucesso", mensagem: "Baixa realizada!" });
          }
        }
        return responderJSON({ status: "erro", mensagem: "Registro não encontrado." });
      }

      if (acao === "excluir_fluxo_mes") {
        const sheet = ss.getSheetByName("Fluxo_Mes");
        const dados = sheet.getDataRange().getValues();
        for (let i = 1; i < dados.length; i++) {
          if (String(dados[i][0]) === String(body.id)) {
            sheet.deleteRow(i + 1);
            return responderJSON({ status: "sucesso", mensagem: "Registro excluído." });
          }
        }
      }

      if (acao === "salvar_custo_fixo") {
        const sheet = ss.getSheetByName("Custos_Fixos");
        const d = body.dados;
        if (!d.ID_Fixo) {
          const id = "FIX-" + Utilities.getUuid().slice(0, 6).toUpperCase();
          sheet.appendRow([id, d.Tipo, d.Descricao, d.Categoria, Number(d.Valor_Base), Number(d.Dia_Vencimento), d.Ativo || "Sim"]);
        } else {
          const dados = sheet.getDataRange().getValues();
          for (let i = 1; i < dados.length; i++) {
            if (String(dados[i][0]) === String(d.ID_Fixo)) {
              sheet.getRange(i + 1, 1, 1, 7).setValues([[
                d.ID_Fixo, d.Tipo, d.Descricao, d.Categoria, Number(d.Valor_Base), Number(d.Dia_Vencimento), d.Ativo || "Sim"
              ]]);
              break;
            }
          }
        }
        return responderJSON({ status: "sucesso", mensagem: "Item fixo salvo com sucesso." });
      }

      if (acao === "excluir_custo_fixo") {
        const sheet = ss.getSheetByName("Custos_Fixos");
        const dados = sheet.getDataRange().getValues();
        for (let i = 1; i < dados.length; i++) {
          if (String(dados[i][0]) === String(body.id)) {
            sheet.deleteRow(i + 1);
            return responderJSON({ status: "sucesso", mensagem: "Item fixo removido." });
          }
        }
      }

      if (acao === "gerar_fixos_mes") {
        const mesAno = body.mes_ano;
        const sheetFixos = ss.getSheetByName("Custos_Fixos");
        const sheetFluxo = ss.getSheetByName("Fluxo_Mes");
        const fixos = lerAbaComoObjeto(sheetFixos);
        const atuais = sheetFluxo.getDataRange().getValues();
        let cont = 0;

        fixos.forEach(f => {
          if (String(f.Ativo).toLowerCase() === "sim") {
            const idGerado = `GER-${mesAno.replace("-", "")}-${f.ID_Fixo}`;
            const jaExiste = atuais.some(l => String(l[0]) === idGerado);
            if (!jaExiste) {
              const dia = String(f.Dia_Vencimento).padStart(2, "0");
              sheetFluxo.appendRow([
                idGerado, mesAno, `${mesAno}-${dia}`, "", f.Tipo,
                f.Categoria, `[Fixo] ${f.Descricao}`, Number(f.Valor_Base),
                "Pendente", "Custo_Fixo", ""
              ]);
              cont++;
            }
          }
        });

        const sheetCompras = ss.getSheetByName("Cartoes_Lancamentos");
        const compras = lerAbaComoObjeto(sheetCompras);
        const assinaturas = compras.filter(c => String(c.Assinatura_Fixa).toLowerCase() === "sim");
        const gruposAssinatura = {};
        assinaturas.forEach(a => { gruposAssinatura[a.ID_Grupo_Parcela] = a; });

        Object.values(gruposAssinatura).forEach(ass => {
          const jaTemNoMes = compras.some(c => c.ID_Grupo_Parcela === ass.ID_Grupo_Parcela && c.Mes_Fatura === mesAno);
          if (!jaTemNoMes) {
            const idComp = "CMP-" + Utilities.getUuid().slice(0, 8).toUpperCase();
            sheetCompras.appendRow([
              idComp, ass.ID_Grupo_Parcela, ass.ID_Cartao, `${mesAno}-01`, mesAno,
              ass.Descricao, ass.Categoria, Number(ass.Valor_Parcela), 1, 1, "Sim", "Aberta"
            ]);
            cont++;
          }
        });

        return responderJSON({ status: "sucesso", mensagem: `${cont} item(ns) recorrente(s) gerado(s) para ${mesAno}.` });
      }

      // ========================================================================
      // MÓDULO 2: CARTÕES DE CRÉDITO (CRIAR, EDITAR, REATIVAR, EXCLUIR E FATURAS)
      // ========================================================================
      if (acao === "salvar_config_cartao") {
        const sheet = ss.getSheetByName("Cartoes_Config");
        const d = body.dados;
        const dados = sheet.getDataRange().getValues();

        if (d.ID_Cartao) {
          for (let i = 1; i < dados.length; i++) {
            if (String(dados[i][0]) === String(d.ID_Cartao)) {
              sheet.getRange(i + 1, 1, 1, 7).setValues([[
                d.ID_Cartao, d.Nome_Cartao, d.Cor_Hex || "#4f46e5",
                Number(d.Limite_Total), Number(d.Dia_Fechamento), Number(d.Dia_Vencimento), d.Ativo || "Sim"
              ]]);
              return responderJSON({ status: "sucesso", mensagem: "Cartão atualizado com sucesso!" });
            }
          }
        }

        const ativosCount = dados.slice(1).filter(r => String(r[6]).toLowerCase() === "sim").length;
        if (ativosCount >= 4 && (d.Ativo || "Sim") === "Sim") {
          return responderJSON({ status: "erro", mensagem: "O limite máximo é de 4 cartões ativos simultaneamente." });
        }

        const novoId = "CARD-" + Utilities.getUuid().slice(0, 5).toUpperCase();
        sheet.appendRow([
          novoId, d.Nome_Cartao, d.Cor_Hex || "#4f46e5",
          Number(d.Limite_Total), Number(d.Dia_Fechamento), Number(d.Dia_Vencimento), d.Ativo || "Sim"
        ]);
        return responderJSON({ status: "sucesso", id: novoId, mensagem: "Novo cartão adicionado com sucesso!" });
      }

      if (acao === "excluir_cartao") {
        const sheet = ss.getSheetByName("Cartoes_Config");
        const dados = sheet.getDataRange().getValues();
        for (let i = 1; i < dados.length; i++) {
          if (String(dados[i][0]) === String(body.id_cartao)) {
            sheet.deleteRow(i + 1);
            return responderJSON({ status: "sucesso", mensagem: "Cartão excluído. Você pode adicionar outro quando quiser." });
          }
        }
        return responderJSON({ status: "erro", mensagem: "Cartão não localizado." });
      }

      if (acao === "adicionar_compra_cartao") {
        const sheetCompras = ss.getSheetByName("Cartoes_Lancamentos");
        const sheetCartoes = ss.getSheetByName("Cartoes_Config");
        const d = body.dados;

        const cartoes = lerAbaComoObjeto(sheetCartoes);
        const cartao = cartoes.find(c => String(c.ID_Cartao) === String(d.ID_Cartao));
        const diaFechamento = cartao ? Number(cartao.Dia_Fechamento) : 10;

        const partesData = String(d.Data_Compra).split("-");
        let ano = parseInt(partesData[0], 10);
        let mes = parseInt(partesData[1], 10);
        const diaCompra = parseInt(partesData[2], 10);

        if (diaCompra >= diaFechamento) {
          mes += 1;
          if (mes > 12) { mes = 1; ano += 1; }
        }

        const qtdParcelas = Math.max(1, parseInt(d.Total_Parcelas, 10) || 1);
        const valorTotal = Number(d.Valor_Total);
        const valorParcela = Number((valorTotal / qtdParcelas).toFixed(2));
        const idGrupo = "GRP-" + Utilities.getUuid().slice(0, 8).toUpperCase();

        const novasLinhas = [];
        for (let p = 1; p <= qtdParcelas; p++) {
          const mesFormatado = `${ano}-${String(mes).padStart(2, "0")}`;
          const idCompra = "CMP-" + Utilities.getUuid().slice(0, 8).toUpperCase();
          const descParcela = qtdParcelas > 1 ? `${d.Descricao} (${p}/${qtdParcelas})` : d.Descricao;

          novasLinhas.push([
            idCompra, idGrupo, d.ID_Cartao, d.Data_Compra, mesFormatado,
            descParcela, d.Categoria || "Geral", valorParcela,
            p, qtdParcelas, d.Assinatura_Fixa || "Não", "Aberta"
          ]);

          mes += 1;
          if (mes > 12) { mes = 1; ano += 1; }
        }

        sheetCompras.getRange(sheetCompras.getLastRow() + 1, 1, novasLinhas.length, 12).setValues(novasLinhas);
        return responderJSON({ status: "sucesso", mensagem: "Compra lançada nas faturas correspondentes!" });
      }

      if (acao === "editar_compra_cartao") {
        const sheetCompras = ss.getSheetByName("Cartoes_Lancamentos");
        const sheetCartoes = ss.getSheetByName("Cartoes_Config");
        const d = body.dados;
        const dadosPlanilha = sheetCompras.getDataRange().getValues();

        if (!d.Recalcular_Grupo) {
          for (let i = 1; i < dadosPlanilha.length; i++) {
            if (String(dadosPlanilha[i][0]) === String(d.ID_Compra)) {
              sheetCompras.getRange(i + 1, 3).setValue(d.ID_Cartao);
              sheetCompras.getRange(i + 1, 4).setValue(d.Data_Compra);
              sheetCompras.getRange(i + 1, 6).setValue(d.Descricao);
              sheetCompras.getRange(i + 1, 7).setValue(d.Categoria || "Geral");
              sheetCompras.getRange(i + 1, 8).setValue(Number(d.Valor_Total));
              sheetCompras.getRange(i + 1, 11).setValue(d.Assinatura_Fixa || "Não");
              return responderJSON({ status: "sucesso", mensagem: "Lançamento da fatura atualizado!" });
            }
          }
          return responderJSON({ status: "erro", mensagem: "Compra não localizada." });
        }

        const faturasPagas = {};
        for (let i = dadosPlanilha.length - 1; i >= 1; i--) {
          if (String(dadosPlanilha[i][1]) === String(d.ID_Grupo_Parcela)) {
            if (String(dadosPlanilha[i][11]) === "Paga") {
              faturasPagas[String(dadosPlanilha[i][4])] = "Paga";
            }
            sheetCompras.deleteRow(i + 1);
          }
        }

        const cartoes = lerAbaComoObjeto(sheetCartoes);
        const cartao = cartoes.find(c => String(c.ID_Cartao) === String(d.ID_Cartao));
        const diaFechamento = cartao ? Number(cartao.Dia_Fechamento) : 10;

        const partesData = String(d.Data_Compra).split("-");
        let ano = parseInt(partesData[0], 10);
        let mes = parseInt(partesData[1], 10);
        const diaCompra = parseInt(partesData[2], 10);

        if (diaCompra >= diaFechamento) {
          mes += 1;
          if (mes > 12) { mes = 1; ano += 1; }
        }

        const qtdParcelas = Math.max(1, parseInt(d.Total_Parcelas, 10) || 1);
        const valorTotal = Number(d.Valor_Total);
        const valorParcela = Number((valorTotal / qtdParcelas).toFixed(2));
        const idGrupo = d.ID_Grupo_Parcela || ("GRP-" + Utilities.getUuid().slice(0, 8).toUpperCase());

        const novasLinhas = [];
        for (let p = 1; p <= qtdParcelas; p++) {
          const mesFormatado = `${ano}-${String(mes).padStart(2, "0")}`;
          const idCompra = "CMP-" + Utilities.getUuid().slice(0, 8).toUpperCase();
          const descParcela = qtdParcelas > 1 ? `${d.Descricao} (${p}/${qtdParcelas})` : d.Descricao;
          const statusMes = faturasPagas[mesFormatado] || "Aberta";

          novasLinhas.push([
            idCompra, idGrupo, d.ID_Cartao, d.Data_Compra, mesFormatado,
            descParcela, d.Categoria || "Geral", valorParcela,
            p, qtdParcelas, d.Assinatura_Fixa || "Não", statusMes
          ]);

          mes += 1;
          if (mes > 12) { mes = 1; ano += 1; }
        }

        sheetCompras.getRange(sheetCompras.getLastRow() + 1, 1, novasLinhas.length, 12).setValues(novasLinhas);
        return responderJSON({ status: "sucesso", mensagem: "Compra e parcelas recalculadas com sucesso!" });
      }

      if (acao === "excluir_compra_cartao") {
        const sheet = ss.getSheetByName("Cartoes_Lancamentos");
        const dados = sheet.getDataRange().getValues();
        const excluirGrupo = body.excluir_todas_parcelas;
        const idAlvo = body.id;

        for (let i = dados.length - 1; i >= 1; i--) {
          if (excluirGrupo && String(dados[i][1]) === String(body.id_grupo)) {
            sheet.deleteRow(i + 1);
          } else if (!excluirGrupo && String(dados[i][0]) === String(idAlvo)) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
        return responderJSON({ status: "sucesso", mensagem: "Lançamento removido do cartão." });
      }

      if (acao === "pagar_fatura_cartao") {
        const sheet = ss.getSheetByName("Cartoes_Lancamentos");
        const dados = sheet.getDataRange().getValues();
        const idCartao = body.id_cartao;
        const mesFatura = body.mes_fatura;
        const novoStatus = body.status || "Paga";

        for (let i = 1; i < dados.length; i++) {
          if (String(dados[i][2]) === String(idCartao) && String(dados[i][4]) === String(mesFatura)) {
            sheet.getRange(i + 1, 12).setValue(novoStatus);
          }
        }
        return responderJSON({ status: "sucesso", mensagem: `Fatura de ${mesFatura} marcada como ${novoStatus}!` });
      }

      // ========================================================================
      // MÓDULO 3: DÍVIDAS E ACORDOS (CADASTRO, AMORTIZAÇÃO, EDIÇÃO E ESTORNO)
      // ========================================================================
      if (acao === "salvar_divida") {
        const sheetDiv = ss.getSheetByName("Dividas");
        const sheetPag = ss.getSheetByName("Dividas_Pagamentos");
        const d = body.dados;

        const isPF = d.Tipo_Credor === "Pessoa Física";
        const modalidade = isPF ? "Pessoa Física (Sem Juros)" : (d.Modalidade || "Outros (SELIC Padrão)");

        let taxaJuros = 0;
        if (!isPF) {
          if (d.Taxa_Juros_Mes !== "" && d.Taxa_Juros_Mes !== null && d.Taxa_Juros_Mes !== undefined) {
            taxaJuros = Number(d.Taxa_Juros_Mes);
          } else {
            taxaJuros = TAXAS_MERCADO_PADRAO[modalidade] !== undefined ? TAXAS_MERCADO_PADRAO[modalidade] : 0.90;
          }
        }

        const valorOriginal = Number(d.Valor_Original) || 0;
        let valorAtualizado = Number(d.Valor_Atualizado) || 0;

        if (valorAtualizado <= 0) {
          if (!isPF && d.Data_Inicio && taxaJuros > 0) {
            const inicio = new Date(d.Data_Inicio);
            const hoje = new Date();
            const mesesDecorridos = Math.max(0, (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth()));
            valorAtualizado = Number((valorOriginal * Math.pow(1 + (taxaJuros / 100), mesesDecorridos)).toFixed(2));
          } else {
            valorAtualizado = valorOriginal;
          }
        }

        const emAcordo = d.Em_Acordo === "Sim" ? "Sim" : "Não";
        const valorAcordo = emAcordo === "Sim" ? (Number(d.Valor_Acordo) || valorAtualizado) : 0;
        const descontoObtido = emAcordo === "Sim" ? Math.max(0, valorAtualizado - valorAcordo) : 0;
        const qtdParcelas = Math.max(1, parseInt(d.Qtd_Parcelas, 10) || 1);
        const baseDivida = emAcordo === "Sim" ? valorAcordo : valorAtualizado;

        if (!d.ID_Divida) {
          const novoId = "DIV-" + Utilities.getUuid().slice(0, 7).toUpperCase();
          sheetDiv.appendRow([
            novoId, d.Tipo_Credor, d.Credor, d.Descricao, modalidade,
            d.Data_Inicio || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd"),
            valorOriginal, taxaJuros, valorAtualizado,
            emAcordo, valorAcordo, descontoObtido, qtdParcelas,
            0, 0, baseDivida, Number(d.Dia_Venc_Acordo) || 10,
            d.Prioridade || "Média", "Ativa", d.Observacoes || ""
          ]);

          if (emAcordo === "Sim" && d.Mes_Inicio_Acordo) {
            gerarParcelasAcordoInterno(sheetPag, novoId, valorAcordo, qtdParcelas, Number(d.Dia_Venc_Acordo) || 10, d.Mes_Inicio_Acordo);
          }

          return responderJSON({ status: "sucesso", mensagem: "Dívida cadastrada com sucesso!" });
        } else {
          const dados = sheetDiv.getDataRange().getValues();
          for (let i = 1; i < dados.length; i++) {
            if (String(dados[i][0]) === String(d.ID_Divida)) {
              const parcelasPagas = Number(dados[i][13]) || 0;
              const valorPagoTotal = Number(dados[i][14]) || 0;
              const novoSaldo = Math.max(0, baseDivida - valorPagoTotal);
              const novoStatus = novoSaldo <= 0.05 ? "Quitada" : "Ativa";

              const tinhaAcordoAntes = String(dados[i][9]) === "Sim";

              sheetDiv.getRange(i + 1, 1, 1, 20).setValues([[
                d.ID_Divida, d.Tipo_Credor, d.Credor, d.Descricao, modalidade,
                d.Data_Inicio, valorOriginal, taxaJuros, valorAtualizado,
                emAcordo, valorAcordo, descontoObtido, qtdParcelas,
                parcelasPagas, valorPagoTotal, novoSaldo, Number(d.Dia_Venc_Acordo) || 10,
                d.Prioridade || "Média", novoStatus, d.Observacoes || ""
              ]]);

              if (!tinhaAcordoAntes && emAcordo === "Sim" && d.Mes_Inicio_Acordo) {
                gerarParcelasAcordoInterno(sheetPag, d.ID_Divida, novoSaldo, qtdParcelas, Number(d.Dia_Venc_Acordo) || 10, d.Mes_Inicio_Acordo);
              }
              return responderJSON({ status: "sucesso", mensagem: "Dívida atualizada com sucesso!" });
            }
          }
        }
      }

      if (acao === "amortizar_divida") {
        const sheetDiv = ss.getSheetByName("Dividas");
        const sheetPag = ss.getSheetByName("Dividas_Pagamentos");
        const idDivida = body.id_divida;
        const idPagto = body.id_pagto;
        const valorPago = Number(body.valor_pago) || 0;
        const dataPagto = body.data_pagamento || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

        if (idPagto) {
          const pagtos = sheetPag.getDataRange().getValues();
          for (let j = 1; j < pagtos.length; j++) {
            if (String(pagtos[j][0]) === String(idPagto)) {
              sheetPag.getRange(j + 1, 4).setValue(dataPagto);
              sheetPag.getRange(j + 1, 7).setValue(valorPago);
              sheetPag.getRange(j + 1, 8).setValue("Pago");
              if (body.observacoes) sheetPag.getRange(j + 1, 9).setValue(body.observacoes);
              break;
            }
          }
        } else {
          const novoIdPag = "PAG-" + Utilities.getUuid().slice(0, 7).toUpperCase();
          sheetPag.appendRow([
            novoIdPag, idDivida, dataPagto, dataPagto,
            body.numero_parcela || 1, valorPago, valorPago, "Pago", body.observacoes || "Amortização avulsa"
          ]);
        }

        recalcularTotaisDivida(sheetDiv, sheetPag, idDivida);
        return responderJSON({ status: "sucesso", mensagem: "Pagamento/Amortização registrado e saldo abatido!" });
      }

      if (acao === "editar_pagamento_divida") {
        const sheetDiv = ss.getSheetByName("Dividas");
        const sheetPag = ss.getSheetByName("Dividas_Pagamentos");
        const idPagto = body.id_pagto;
        const idDivida = body.id_divida;
        const pagtos = sheetPag.getDataRange().getValues();

        for (let j = 1; j < pagtos.length; j++) {
          if (String(pagtos[j][0]) === String(idPagto)) {
            if (body.data_vencimento) sheetPag.getRange(j + 1, 3).setValue(body.data_vencimento);
            if (body.data_pagamento !== undefined) sheetPag.getRange(j + 1, 4).setValue(body.data_pagamento);
            if (body.valor_previsto !== undefined) sheetPag.getRange(j + 1, 6).setValue(Number(body.valor_previsto));
            if (body.valor_pago !== undefined) sheetPag.getRange(j + 1, 7).setValue(Number(body.valor_pago));
            if (body.status) sheetPag.getRange(j + 1, 8).setValue(body.status);
            if (body.observacoes !== undefined) sheetPag.getRange(j + 1, 9).setValue(body.observacoes);

            recalcularTotaisDivida(sheetDiv, sheetPag, idDivida);
            return responderJSON({ status: "sucesso", mensagem: "Registro de pagamento atualizado e saldo recalculado!" });
          }
        }
        return responderJSON({ status: "erro", mensagem: "Pagamento não localizado." });
      }

      if (acao === "estornar_pagamento_divida") {
        const sheetDiv = ss.getSheetByName("Dividas");
        const sheetPag = ss.getSheetByName("Dividas_Pagamentos");
        const idPagto = body.id_pagto;
        const idDivida = body.id_divida;

        const divs = lerAbaComoObjeto(sheetDiv);
        const div = divs.find(d => String(d.ID_Divida) === String(idDivida));
        const emAcordo = div && String(div.Em_Acordo) === "Sim";

        const pagtos = sheetPag.getDataRange().getValues();
        for (let j = 1; j < pagtos.length; j++) {
          if (String(pagtos[j][0]) === String(idPagto)) {
            const obsAtual = String(pagtos[j][8] || "");
            const ehParcelaDeAcordo = emAcordo && obsAtual.includes("Acordo");

            if (ehParcelaDeAcordo) {
              sheetPag.getRange(j + 1, 4).setValue("");
              sheetPag.getRange(j + 1, 7).setValue(0);
              sheetPag.getRange(j + 1, 8).setValue("Pendente");
            } else {
              sheetPag.deleteRow(j + 1);
            }

            recalcularTotaisDivida(sheetDiv, sheetPag, idDivida);
            return responderJSON({ status: "sucesso", mensagem: "Pagamento estornado! O saldo devedor foi restaurado." });
          }
        }
        return responderJSON({ status: "erro", mensagem: "Registro de pagamento não encontrado." });
      }

      if (acao === "excluir_divida") {
        const sheetDiv = ss.getSheetByName("Dividas");
        const sheetPag = ss.getSheetByName("Dividas_Pagamentos");
        const idAlvo = body.id;

        const pagtos = sheetPag.getDataRange().getValues();
        for (let j = pagtos.length - 1; j >= 1; j--) {
          if (String(pagtos[j][1]) === String(idAlvo)) {
            sheetPag.deleteRow(j + 1);
          }
        }

        const divs = sheetDiv.getDataRange().getValues();
        for (let i = 1; i < divs.length; i++) {
          if (String(divs[i][0]) === String(idAlvo)) {
            sheetDiv.deleteRow(i + 1);
            break;
          }
        }
        return responderJSON({ status: "sucesso", mensagem: "Dívida e histórico removidos." });
      }

      return responderJSON({ status: "erro", mensagem: "Ação não reconhecida pela API PF." });
    } finally {
      lock.releaseLock();
    }
  } catch (erro) {
    return responderJSON({ status: "erro", mensagem: erro.toString() });
  }
}

/**
 * 5. FUNÇÕES INTERNAS DE CÁLCULO E CONVERSÃO
 */
function gerarParcelasAcordoInterno(sheetPag, idDivida, valorTotalAcordo, qtdParcelas, diaVenc, mesInicioStr) {
  const partes = String(mesInicioStr).split("-");
  let ano = parseInt(partes[0], 10);
  let mes = parseInt(partes[1], 10);
  const valorParcela = Number((valorTotalAcordo / qtdParcelas).toFixed(2));
  const linhas = [];

  for (let p = 1; p <= qtdParcelas; p++) {
    const idPag = "PAG-" + Utilities.getUuid().slice(0, 7).toUpperCase();
    const dataVenc = `${ano}-${String(mes).padStart(2, "0")}-${String(diaVenc).padStart(2, "0")}`;
    linhas.push([
      idPag, idDivida, dataVenc, "", p, valorParcela, 0, "Pendente", `Parcela ${p}/${qtdParcelas} do Acordo`
    ]);
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }
  sheetPag.getRange(sheetPag.getLastRow() + 1, 1, linhas.length, 9).setValues(linhas);
}

function recalcularTotaisDivida(sheetDiv, sheetPag, idDivida) {
  const todosPagtos = lerAbaComoObjeto(sheetPag).filter(p => String(p.ID_Divida) === String(idDivida) && p.Status === "Pago");
  const qtdPagas = todosPagtos.length;
  const somaPago = todosPagtos.reduce((acc, p) => acc + (Number(p.Valor_Pago) || 0), 0);

  const divs = sheetDiv.getDataRange().getValues();
  for (let i = 1; i < divs.length; i++) {
    if (String(divs[i][0]) === String(idDivida)) {
      const emAcordo = String(divs[i][9]) === "Sim";
      const valorBase = emAcordo ? (Number(divs[i][10]) || 0) : (Number(divs[i][8]) || 0);
      const saldoRestante = Math.max(0, valorBase - somaPago);
      const novoStatus = saldoRestante <= 0.05 ? "Quitada" : "Ativa";

      sheetDiv.getRange(i + 1, 14).setValue(qtdPagas);
      sheetDiv.getRange(i + 1, 15).setValue(somaPago);
      sheetDiv.getRange(i + 1, 16).setValue(saldoRestante);
      sheetDiv.getRange(i + 1, 19).setValue(novoStatus);
      break;
    }
  }
}

function lerAbaComoObjeto(sheet) {
  const dados = sheet.getDataRange().getDisplayValues();
  if (dados.length <= 1) return [];
  const cabecalho = dados.shift();
  const colsMoeda = [
    "Valor", "Valor_Base", "Limite_Total", "Valor_Parcela",
    "Valor_Original", "Valor_Atualizado", "Valor_Acordo",
    "Desconto_Obtido", "Valor_Pago_Total", "Saldo_Restante",
    "Valor_Previsto", "Valor_Pago", "Taxa_Juros_Mes"
  ];

  return dados.map(linha => {
    let obj = {};
    cabecalho.forEach((col, i) => {
      if (colsMoeda.includes(col)) {
        let limpo = String(linha[i]).replace(/[R$%\s.]/g, "").replace(",", ".");
        obj[col] = parseFloat(limpo) || 0;
      } else {
        obj[col] = linha[i];
      }
    });
    return obj;
  });
}

function responderJSON(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 6. MÓDULO DE BACKUP AUTOMÁTICO SEMANAL & ROTAÇÃO NO GOOGLE DRIVE
 */
function realizarBackupAutomatico() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const arquivoOriginal = DriveApp.getFileById(ss.getId());
  const nomeOriginal = ss.getName();

  let pastaBackup;
  const pastas = DriveApp.getFoldersByName(NOME_PASTA_BACKUP);
  if (pastas.hasNext()) {
    pastaBackup = pastas.next();
  } else {
    pastaBackup = DriveApp.createFolder(NOME_PASTA_BACKUP);
  }

  const dataHora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH-mm");
  const nomeCopia = `[BKP] ${nomeOriginal} - ${dataHora}`;

  arquivoOriginal.makeCopy(nomeCopia, pastaBackup);
  limparBackupsAntigos(pastaBackup, nomeOriginal);
}

function limparBackupsAntigos(pasta, prefixoPlanilha) {
  const arquivos = pasta.getFiles();
  const listaBackups = [];

  while (arquivos.hasNext()) {
    const arq = arquivos.next();
    if (arq.getName().includes(prefixoPlanilha)) {
      listaBackups.push({
        arquivo: arq,
        criadoEm: arq.getDateCreated().getTime()
      });
    }
  }

  listaBackups.sort((a, b) => b.criadoEm - a.criadoEm);

  if (listaBackups.length > MAX_BACKUPS_MANTIDOS) {
    for (let i = MAX_BACKUPS_MANTIDOS; i < listaBackups.length; i++) {
      listaBackups[i].arquivo.setTrashed(true);
    }
  }
}

function ativarGatilhoBackupSemanal() {
  const gatilhosAtuais = ScriptApp.getProjectTriggers();
  gatilhosAtuais.forEach(g => {
    if (g.getHandlerFunction() === "realizarBackupAutomatico") {
      ScriptApp.deleteTrigger(g);
    }
  });

  ScriptApp.newTrigger("realizarBackupAutomatico")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(5)
    .create();

  realizarBackupAutomatico();
}
