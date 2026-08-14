const OpenAI = require("openai");

const {
  criarProjeto,
  lerProjeto,
  criarBackupProjeto,
  listarVersoes,
  lerVersaoProjeto,
  restaurarVersaoProjeto,
  salvarArquivoProjeto,
  criarArquivoProjeto,
  renomearArquivoProjeto,
  excluirArquivoProjeto,
  aplicarOperacoesProjeto,
  duplicarProjeto,
  renomearProjeto,
  excluirProjeto
} = require("./generator");

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { ZipArchive } = require("archiver");

require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/apps", express.static("generated-apps"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


/* =========================================================
   STATUS DO SERVIDOR
========================================================= */

app.get("/", (req, res) => {
  res.json({
    status: "online",
    app: "AppABUOA",
    message: "Servidor AppABUOA funcionando!"
  });
});


/* =========================================================
   CRIAR NOVO APLICATIVO COM IA
========================================================= */

app.post("/api/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        error: "Envie o campo prompt."
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5.5",

      instructions: `
VocÃª Ã© o motor gerador de aplicativos do AppABUOA.

Sua tarefa Ã© transformar a ideia do usuÃ¡rio em um pequeno
aplicativo web funcional.

Responda SOMENTE com JSON vÃ¡lido.

NÃ£o use markdown.
NÃ£o escreva explicaÃ§Ãµes fora do JSON.

Use exatamente esta estrutura:

{
  "nomeProjeto": "nome-do-projeto",
  "resumo": "resumo curto do aplicativo",
  "arquivos": [
    {
      "path": "index.html",
      "content": "conteÃºdo completo do arquivo"
    },
    {
      "path": "style.css",
      "content": "conteÃºdo completo do arquivo"
    },
    {
      "path": "script.js",
      "content": "conteÃºdo completo do arquivo"
    }
  ]
}

Regras:

- Gere sempre index.html.
- Use HTML, CSS e JavaScript puro nesta primeira versÃ£o.
- O aplicativo precisa abrir diretamente no navegador.
- index.html deve referenciar style.css e script.js quando existirem.
- NÃ£o use caminhos absolutos.
- NÃ£o use ../ nos nomes dos arquivos.
- Gere cÃ³digo funcional.
- Crie um design moderno e responsivo.
- O aplicativo deve funcionar em desktop, tablet e celular.
      `,

      input: String(prompt).trim()
    });

    const textoResposta = String(
      response.output_text || ""
    )
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");

    const projetoGerado = JSON.parse(
      textoResposta
    );

    if (
      !projetoGerado ||
      !projetoGerado.nomeProjeto ||
      !Array.isArray(projetoGerado.arquivos) ||
      projetoGerado.arquivos.length === 0
    ) {
      throw new Error(
        "Estrutura de projeto invÃ¡lida."
      );
    }

    const possuiIndex =
      projetoGerado.arquivos.some(
        arquivo =>
          arquivo &&
          arquivo.path === "index.html" &&
          typeof arquivo.content === "string"
      );

    if (!possuiIndex) {
      throw new Error(
        "O projeto gerado nÃ£o possui index.html."
      );
    }

    const resultadoCriacao =
      criarProjeto(
        projetoGerado.nomeProjeto,
        projetoGerado.arquivos
      );

    res.json({
      success: true,

      answer:
        projetoGerado.resumo ||
        "Aplicativo criado com sucesso.",

      projeto:
        resultadoCriacao.projeto,

      quantidadeArquivos:
        resultadoCriacao.quantidadeArquivos,

      previewUrl:
        `/apps/${resultadoCriacao.projeto}/`
    });

  } catch (error) {
    console.error(
      "Erro no /api/ai:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Erro ao gerar o aplicativo."
    });
  }
});


/* =========================================================
   EDITAR APLICATIVO EXISTENTE COM IA
========================================================= */


/* =========================================================
   PLANO DE ALTERACOES COM IA
   Esta rota apenas analisa. Nao altera arquivos.
========================================================= */

app.post("/api/edit/plan", async (req, res) => {
  try {
    const {
      projeto,
      pedido
    } = req.body;

    if (
      !projeto ||
      !pedido ||
      !String(pedido).trim()
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Informe o projeto e o pedido."
      });
    }

    const projetoAtual =
      lerProjeto(projeto);

    const response =
      await openai.responses.create({
        model: "gpt-5.5",

        instructions: `
Voce e o planejador de desenvolvimento do AppABUOA.

Sua tarefa e analisar um projeto existente e o pedido do usuario.

IMPORTANTE:
Nesta etapa voce NAO deve gerar codigo completo.
Voce NAO deve alterar arquivos.
Voce deve apenas criar um plano de trabalho.

Responda SOMENTE com JSON valido.
Nao use markdown.
Nao escreva nada fora do JSON.

Use exatamente esta estrutura:

{
  "nomeProjeto": "nome-do-projeto",
  "resumo": "resumo curto do que sera feito",
  "plano": [
    {
      "tipo": "alterar",
      "path": "index.html",
      "motivo": "explicacao curta"
    },
    {
      "tipo": "criar",
      "path": "login.html",
      "motivo": "explicacao curta"
    },
    {
      "tipo": "excluir",
      "path": "arquivo-antigo.js",
      "motivo": "explicacao curta"
    }
  ],
  "alertas": [
    "alerta opcional"
  ]
}

Regras:

- Use somente os tipos criar, alterar ou excluir.
- Nunca proponha excluir index.html.
- Nao use caminhos absolutos.
- Nao use ../.
- Nao altere o nome do projeto.
- Preserve funcionalidades existentes.
- Proponha somente mudancas necessarias.
- Nao inclua o campo content nesta etapa.
- Se nenhuma mudanca for necessaria, retorne plano vazio.
        `,

        input: JSON.stringify({
          projeto:
            projetoAtual.projeto,

          pedido:
            String(pedido).trim(),

          arquivosAtuais:
            projetoAtual.arquivos
              .map(arquivo => ({
                path: arquivo.path,
                content: arquivo.content
              }))
        })
      });

    const textoResposta =
      String(
        response.output_text || ""
      )
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "");

    const planoIA =
      JSON.parse(textoResposta);

    if (
      !planoIA ||
      planoIA.nomeProjeto !==
        projetoAtual.projeto ||
      !Array.isArray(planoIA.plano)
    ) {
      throw new Error(
        "Estrutura do plano da IA invalida."
      );
    }

    const tiposPermitidos =
      new Set([
        "criar",
        "alterar",
        "excluir"
      ]);

    for (const item of planoIA.plano) {
      if (
        !item ||
        !tiposPermitidos.has(
          String(item.tipo || "")
        ) ||
        !item.path
      ) {
        throw new Error(
          "O plano contem uma operacao invalida."
        );
      }

      if (
        item.tipo === "excluir" &&
        item.path === "index.html"
      ) {
        throw new Error(
          "O plano tentou excluir index.html."
        );
      }
    }

    res.json({
      success: true,

      projeto:
        projetoAtual.projeto,

      resumo:
        planoIA.resumo ||
        "Plano criado.",

      plano:
        planoIA.plano,

      alertas:
        Array.isArray(planoIA.alertas)
          ? planoIA.alertas
          : [],

      quantidadeOperacoes:
        planoIA.plano.length,

      message:
        "Plano criado. Nenhum arquivo foi alterado."
    });

  } catch (error) {
    console.error(
      "Erro ao gerar plano com IA:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Erro ao gerar plano."
    });
  }
});


/* =========================================================
   APLICAR PLANO APROVADO COM IA
   Somente operacoes previamente aprovadas podem ser executadas.
========================================================= */

app.post("/api/edit/apply", async (req, res) => {
  try {
    const {
      projeto,
      pedido,
      plano
    } = req.body;

    if (
      !projeto ||
      !pedido ||
      !String(pedido).trim() ||
      !Array.isArray(plano)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Informe projeto, pedido e plano aprovado."
      });
    }

    if (plano.length === 0) {
      return res.json({
        success: true,
        projeto,
        answer:
          "Nenhuma alteracao foi necessaria.",
        backup: null,
        operacoes: [],
        quantidadeOperacoes: 0
      });
    }

    const projetoAtual =
      lerProjeto(projeto);

    const tiposPermitidos =
      new Set([
        "criar",
        "alterar",
        "excluir"
      ]);

    const planoAprovado =
      plano.map(item => {
        const tipo =
          String(
            item.tipo || ""
          ).trim();

        const pathArquivo =
          String(
            item.path || ""
          ).trim();

        if (
          !tiposPermitidos.has(tipo) ||
          !pathArquivo
        ) {
          throw new Error(
            "O plano aprovado contem uma operacao invalida."
          );
        }

        if (
          tipo === "excluir" &&
          pathArquivo === "index.html"
        ) {
          throw new Error(
            "index.html nao pode ser excluido."
          );
        }

        return {
          tipo,
          path: pathArquivo,
          motivo:
            String(
              item.motivo || ""
            )
        };
      });

    const response =
      await openai.responses.create({
        model: "gpt-5.5",

        instructions: `
Voce e o executor de alteracoes do AppABUOA.

O usuario ja analisou e APROVOU um plano de alteracoes.

Sua tarefa e gerar o codigo necessario para executar SOMENTE esse plano.

Responda SOMENTE com JSON valido.
Nao use markdown.
Nao escreva nada fora do JSON.

Use exatamente esta estrutura:

{
  "nomeProjeto": "nome-do-projeto",
  "resumo": "resumo curto das alteracoes",
  "operacoes": [
    {
      "tipo": "alterar",
      "path": "index.html",
      "content": "conteudo COMPLETO atualizado"
    },
    {
      "tipo": "criar",
      "path": "login.html",
      "content": "conteudo COMPLETO do novo arquivo"
    },
    {
      "tipo": "excluir",
      "path": "arquivo-antigo.js"
    }
  ]
}

REGRAS OBRIGATORIAS:

- Execute SOMENTE os itens presentes no plano aprovado.
- Nao adicione arquivos que nao estejam no plano.
- Nao exclua arquivos que nao estejam no plano.
- Nao altere arquivos que nao estejam no plano.
- Mantenha exatamente o tipo e o path aprovados.
- Para criar e alterar, envie o conteudo COMPLETO em content.
- Para excluir, nao envie content.
- Nunca exclua index.html.
- Nunca use caminhos absolutos.
- Nunca use ../.
- Nao renomeie o projeto.
- Preserve as funcionalidades existentes que nao fazem parte do pedido.
        `,

        input: JSON.stringify({
          projeto:
            projetoAtual.projeto,

          pedido:
            String(pedido).trim(),

          planoAprovado,

          arquivosAtuais:
            projetoAtual.arquivos
        })
      });

    const textoResposta =
      String(
        response.output_text || ""
      )
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "");

    const resultadoIA =
      JSON.parse(
        textoResposta
      );

    if (
      !resultadoIA ||
      resultadoIA.nomeProjeto !==
        projetoAtual.projeto ||
      !Array.isArray(
        resultadoIA.operacoes
      )
    ) {
      throw new Error(
        "Estrutura de execucao da IA invalida."
      );
    }

    /*
      Cria um conjunto com exatamente
      as operacoes que o usuario aprovou.
    */

    const aprovadas =
      new Set(
        planoAprovado.map(
          item =>
            `${item.tipo}:${item.path}`
        )
      );

    const recebidas =
      new Set();

    for (
      const operacao
      of resultadoIA.operacoes
    ) {
      const chave =
        `${operacao.tipo}:${operacao.path}`;

      if (
        !aprovadas.has(chave)
      ) {
        throw new Error(
          `A IA tentou executar uma operacao nao aprovada: ${chave}`
        );
      }

      recebidas.add(chave);
    }

    /*
      Tambem exige que a IA devolva
      todos os itens aprovados.
    */

    if (
      recebidas.size !==
      aprovadas.size
    ) {
      throw new Error(
        "A IA nao retornou todas as operacoes aprovadas."
      );
    }

    for (
      const chave
      of aprovadas
    ) {
      if (
        !recebidas.has(chave)
      ) {
        throw new Error(
          `Operacao aprovada ausente: ${chave}`
        );
      }
    }

    /*
      aplicarOperacoesProjeto ja:
      - valida caminhos
      - protege index.html
      - cria backup
      - aplica todas as mudancas
      - restaura o backup se houver falha
    */

    const resultado =
      aplicarOperacoesProjeto(
        projetoAtual.projeto,
        resultadoIA.operacoes
      );

    res.json({
      success: true,

      projeto:
        resultado.projeto,

      answer:
        resultadoIA.resumo ||
        "Plano aplicado com sucesso.",

      backup:
        resultado.backup,

      operacoes:
        resultado.operacoes,

      quantidadeOperacoes:
        resultado.operacoes.length,

      previewUrl:
        `/apps/${resultado.projeto}/`,

      message:
        "Plano aprovado e aplicado com sucesso."
    });

  } catch (error) {
    console.error(
      "Erro ao aplicar plano aprovado:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Erro ao aplicar plano aprovado."
    });
  }
});

app.post("/api/edit", async (req, res) => {
  try {
    const {
      projeto,
      pedido
    } = req.body;

    if (!projeto || !pedido) {
      return res.status(400).json({
        success: false,
        error:
          "Informe o projeto e a alteraÃ§Ã£o desejada."
      });
    }

    const projetoAtual =
      lerProjeto(projeto);

    const response =
      await openai.responses.create({
        model: "gpt-5.5",

        instructions: `
VocÃª Ã© o editor de projetos do AppABUOA.

VocÃª receberÃ¡:
1. O nome do projeto.
2. O pedido do usuÃ¡rio.
3. Todos os arquivos atuais do aplicativo.

VocÃª pode criar arquivos, alterar arquivos existentes e excluir arquivos desnecessÃ¡rios.

Responda SOMENTE com JSON vÃ¡lido, sem markdown e sem explicaÃ§Ãµes fora do JSON.

Use exatamente esta estrutura:

{
  "nomeProjeto": "nome-do-projeto",
  "resumo": "resumo curto das alteraÃ§Ãµes realizadas",
  "operacoes": [
    {
      "tipo": "alterar",
      "path": "index.html",
      "content": "conteÃºdo completo atualizado do arquivo"
    },
    {
      "tipo": "criar",
      "path": "login.html",
      "content": "conteÃºdo completo do novo arquivo"
    },
    {
      "tipo": "excluir",
      "path": "arquivo-antigo.js"
    }
  ]
}

Regras obrigatÃ³rias:
- Use somente os tipos criar, alterar ou excluir.
- Para criar e alterar, envie sempre o conteÃºdo COMPLETO do arquivo em content.
- Para excluir, envie apenas tipo e path.
- Nunca exclua index.html.
- Nunca use caminhos absolutos.
- Nunca use ../.
- NÃ£o renomeie o projeto.
- Preserve funcionalidades existentes, salvo quando o pedido exigir mudanÃ§a.
- NÃ£o exclua arquivos apenas para reorganizar o projeto.
- FaÃ§a somente as operaÃ§Ãµes necessÃ¡rias para atender ao pedido.
- Se um arquivo existente precisar mudar, use tipo alterar.
- Se um arquivo novo for necessÃ¡rio, use tipo criar.
- Se nenhum arquivo precisar ser excluÃ­do, nÃ£o envie operaÃ§Ãµes de exclusÃ£o.
        `,

        input: JSON.stringify({
          projeto: projetoAtual.projeto,
          pedido,
          arquivosAtuais:
            projetoAtual.arquivos
        })
      });

    const resultadoIA =
      JSON.parse(response.output_text);

    if (
      !resultadoIA.nomeProjeto ||
      resultadoIA.nomeProjeto !==
        projetoAtual.projeto ||
      !Array.isArray(resultadoIA.operacoes)
    ) {
      throw new Error(
        "Estrutura de ediÃ§Ã£o da IA invÃ¡lida."
      );
    }

if (resultadoIA.operacoes.length === 0) {
  return res.json({
    success: true,
    projeto: projetoAtual.projeto,
    answer:
      resultadoIA.resumo ||
      "O projeto jÃ¡ possui as alteraÃ§Ãµes solicitadas.",
    backup: null,
    operacoes: [],
    quantidadeOperacoes: 0,
    previewUrl:
      `/apps/${projetoAtual.projeto}/`,
    message:
      "Nenhuma nova alteraÃ§Ã£o foi necessÃ¡ria."
  });
}

    const resultado =
      aplicarOperacoesProjeto(
        projetoAtual.projeto,
        resultadoIA.operacoes
      );

    res.json({
      success: true,
      projeto: resultado.projeto,
      answer:
        resultadoIA.resumo ||
        "AlteraÃ§Ãµes concluÃ­das.",
      backup: resultado.backup,
      operacoes: resultado.operacoes,
      quantidadeOperacoes:
        resultado.operacoes.length,
      previewUrl:
        `/apps/${resultado.projeto}/`
    });

  } catch (error) {
    console.error(
      "Erro ao editar projeto com IA:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Erro ao editar o aplicativo."
    });
  }
});


app.get("/api/apps", (req, res) => {
  try {
    const pastaApps = path.resolve(
      __dirname,
      "..",
      "generated-apps"
    );

    if (!fs.existsSync(pastaApps)) {
      return res.json({
        success: true,
        apps: []
      });
    }

    const apps = fs
      .readdirSync(
        pastaApps,
        {
          withFileTypes: true
        }
      )
      .filter(
        item => item.isDirectory()
      )
      .map(item => ({
        nome: item.name,
        url: `/apps/${item.name}/`
      }));

    res.json({
      success: true,
      apps
    });

  } catch (error) {
    console.error(
      "Erro no /api/apps:",
      error
    );

    res.status(500).json({
      success: false,
      error:
        "Erro ao listar aplicativos."
    });
  }
});


/* =========================================================
   LISTAR HISTÓRICO DE VERSÕES
========================================================= */

app.get(
  "/api/apps/:projeto/versions",
  (req, res) => {
    try {
      const {
        projeto
      } = req.params;

      const versoes =
        listarVersoes(projeto);

      res.json({
        success: true,
        projeto,
        versoes
      });

    } catch (error) {
      console.error(
        "Erro ao listar versÃµes:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Erro ao listar versÃµes."
      });
    }
  }
);


/* =========================================================
   LER UMA VERSÃO ANTIGA
========================================================= */

app.get(
  "/api/apps/:projeto/versions/:versao",
  (req, res) => {
    try {
      const {
        projeto,
        versao
      } = req.params;

      const resultado =
        lerVersaoProjeto(
          projeto,
          versao
        );

      res.json({
        success: true,

        projeto:
          resultado.projeto,

        versao:
          resultado.versao,

        arquivos:
          resultado.arquivos
      });

    } catch (error) {
      console.error(
        "Erro ao ler versÃ£o:",
        error
      );

      res.status(404).json({
        success: false,
        error:
          "VersÃ£o nÃ£o encontrada."
      });
    }
  }
);


/* =========================================================
   RESTAURAR UMA VERSÃO ANTIGA
========================================================= */

app.post(
  "/api/apps/:projeto/versions/:versao/restore",
  (req, res) => {
    try {
      const {
        projeto,
        versao
      } = req.params;

      /*
        restaurarVersaoProjeto cria backup
        da versÃ£o atual antes de restaurar.
      */

      const resultado =
        restaurarVersaoProjeto(
          projeto,
          versao
        );

      res.json({
        success: true,

        projeto:
          resultado.projeto,

        versaoRestaurada:
          resultado.versaoRestaurada,

        backupAnterior:
          resultado.backupAnterior,

        previewUrl:
          `/apps/${resultado.projeto}/`,

        message:
          "VersÃ£o restaurada com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao restaurar versÃ£o:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Erro ao restaurar a versÃ£o."
      });
    }
  }
);


/* =========================================================
   INICIAR SERVIDOR
========================================================= */

// ============================================================
// EXPLORADOR DE ARQUIVOS DO PROJETO
// ============================================================

app.get(
  "/api/apps/:projeto/files",
  (req, res) => {
    try {
      const { projeto } = req.params;

      const resultado = lerProjeto(projeto);

      res.json({
        success: true,
        projeto: resultado.projeto,
        arquivos: resultado.arquivos.map(arquivo => ({
          path: arquivo.path
        }))
      });

    } catch (error) {
      console.error(error);

      res.status(404).json({
        success: false,
        error: "Projeto nÃ£o encontrado."
      });
    }
  }
);


// ============================================================
// LER UM ARQUIVO ESPECÍFICO DO PROJETO
// ============================================================

app.get(
  "/api/apps/:projeto/file",
  (req, res) => {
    try {
      const { projeto } = req.params;
      const arquivoSolicitado = req.query.path;

      if (!arquivoSolicitado) {
        return res.status(400).json({
          success: false,
          error: "Informe o arquivo."
        });
      }

      const resultado = lerProjeto(projeto);

      const arquivo = resultado.arquivos.find(
        item => item.path === arquivoSolicitado
      );

      if (!arquivo) {
        return res.status(404).json({
          success: false,
          error: "Arquivo nÃ£o encontrado."
        });
      }

      res.json({
        success: true,
        projeto: resultado.projeto,
        path: arquivo.path,
        content: arquivo.content
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        error: "Erro ao ler arquivo."
      });
    }
  }
);

/* =========================================================
   SALVAR ARQUIVO MANUALMENTE
========================================================= */

app.put(
  "/api/apps/:projeto/file",
  (req, res) => {
    try {
      const {
        projeto
      } = req.params;

      const {
        path: caminhoArquivo,
        content
      } = req.body;

      if (!caminhoArquivo) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o caminho do arquivo."
        });
      }

      if (
        typeof content !== "string"
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o conteÃºdo do arquivo."
        });
      }

      const resultado =
        salvarArquivoProjeto(
          projeto,
          caminhoArquivo,
          content
        );

      res.json({
        success: true,

        projeto:
          resultado.projeto,

        arquivo:
          resultado.arquivo,

        backup:
          resultado.backup,

        previewUrl:
          `/apps/${resultado.projeto}/`,

        message:
          "Arquivo salvo com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao salvar arquivo:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Erro ao salvar arquivo."
      });
    }
  }
);


/* =========================================================
   CRIAR NOVO ARQUIVO
========================================================= */

app.post(
  "/api/apps/:projeto/file",
  (req, res) => {
    try {
      const { projeto } = req.params;
      const {
        path: caminhoArquivo,
        content = ""
      } = req.body;

      if (
        !caminhoArquivo ||
        !String(caminhoArquivo).trim()
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o nome ou caminho do novo arquivo."
        });
      }

      if (typeof content !== "string") {
        return res.status(400).json({
          success: false,
          error:
            "O conteÃºdo inicial do arquivo Ã© invÃ¡lido."
        });
      }

      const resultado =
        criarArquivoProjeto(
          projeto,
          String(caminhoArquivo).trim(),
          content
        );

      res.status(201).json({
        success: true,
        projeto: resultado.projeto,
        arquivo: resultado.arquivo,
        backup: resultado.backup,
        previewUrl:
          `/apps/${resultado.projeto}/`,
        message:
          "Novo arquivo criado com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao criar arquivo:",
        error
      );

      if (
        error.message ===
        "JÃ¡ existe um arquivo com esse nome."
      ) {
        return res.status(409).json({
          success: false,
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Erro ao criar arquivo."
      });
    }
  }
);


/* =========================================================
   RENOMEAR ARQUIVO
========================================================= */

app.patch(
  "/api/apps/:projeto/file",
  (req, res) => {
    try {
      const { projeto } = req.params;
      const {
        path: caminhoAtual,
        newPath: novoCaminho
      } = req.body;

      if (!caminhoAtual || !novoCaminho) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o arquivo atual e o novo nome."
        });
      }

      const resultado =
        renomearArquivoProjeto(
          projeto,
          caminhoAtual,
          novoCaminho
        );

      res.json({
        success: true,
        projeto: resultado.projeto,
        arquivoAnterior:
          resultado.arquivoAnterior,
        arquivo: resultado.arquivo,
        backup: resultado.backup,
        previewUrl:
          `/apps/${resultado.projeto}/`,
        message:
          "Arquivo renomeado com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao renomear arquivo:",
        error
      );

      const conflito =
        error.message ===
        "JÃ¡ existe um arquivo com o novo nome.";

      res.status(conflito ? 409 : 500).json({
        success: false,
        error:
          error.message ||
          "Erro ao renomear arquivo."
      });
    }
  }
);


/* =========================================================
   EXCLUIR ARQUIVO
========================================================= */

app.delete(
  "/api/apps/:projeto/file",
  (req, res) => {
    try {
      const { projeto } = req.params;
      const caminhoArquivo =
        req.query.path;

      if (!caminhoArquivo) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o arquivo a excluir."
        });
      }

      const resultado =
        excluirArquivoProjeto(
          projeto,
          caminhoArquivo
        );

      res.json({
        success: true,
        projeto: resultado.projeto,
        arquivo: resultado.arquivo,
        backup: resultado.backup,
        previewUrl:
          `/apps/${resultado.projeto}/`,
        message:
          "Arquivo excluÃ­do com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao excluir arquivo:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Erro ao excluir arquivo."
      });
    }
  }
);



/* =========================================================
   DUPLICAR PROJETO
========================================================= */

app.post(
  "/api/apps/:projeto/duplicate",
  (req, res) => {
    try {
      const { projeto } = req.params;

      const {
        novoNome
      } = req.body;

      if (
        !novoNome ||
        !String(novoNome).trim()
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o nome do novo projeto."
        });
      }

      const resultado =
        duplicarProjeto(
          projeto,
          String(novoNome).trim()
        );

      res.status(201).json({
        success: true,

        projetoOriginal:
          resultado.projetoOriginal,

        projeto:
          resultado.projeto,

        quantidadeArquivos:
          resultado.quantidadeArquivos,

        previewUrl:
          `/apps/${resultado.projeto}/`,

        message:
          "Projeto duplicado com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao duplicar projeto:",
        error
      );

      const conflito =
        error.message ===
        "Ja existe um projeto com esse nome." ||
        error.message ===
        "JÃ¡ existe um projeto com esse nome.";

      res.status(
        conflito ? 409 : 500
      ).json({
        success: false,
        error:
          error.message ||
          "Erro ao duplicar projeto."
      });
    }
  }
);

/* =========================================================
   RENOMEAR PROJETO
========================================================= */

app.patch(
  "/api/apps/:projeto/rename",
  (req, res) => {
    try {
      const { projeto } = req.params;

      const {
        novoNome
      } = req.body;

      if (
        !novoNome ||
        !String(novoNome).trim()
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Informe o novo nome do projeto."
        });
      }

      const resultado =
        renomearProjeto(
          projeto,
          String(novoNome).trim()
        );

      res.json({
        success: true,

        projetoAnterior:
          resultado.projetoAnterior,

        projeto:
          resultado.projeto,

        quantidadeArquivos:
          resultado.quantidadeArquivos,

        previewUrl:
          `/apps/${resultado.projeto}/`,

        message:
          "Projeto renomeado com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao renomear projeto:",
        error
      );

      const conflito =
        error.message ===
        "Ja existe um projeto com esse nome." ||
        error.message ===
        "JÃ¡ existe um projeto com esse nome.";

      res.status(
        conflito ? 409 : 500
      ).json({
        success: false,
        error:
          error.message ||
          "Erro ao renomear projeto."
      });
    }
  }
);

/* =========================================================
   EXCLUIR PROJETO
========================================================= */

app.delete(
  "/api/apps/:projeto/delete",
  (req, res) => {
    try {
      const { projeto } = req.params;

      const resultado =
        excluirProjeto(
          projeto
        );

      res.json({
        success: true,

        projeto:
          resultado.projeto,

        quantidadeArquivos:
          resultado.quantidadeArquivos,

        backup:
          resultado.backup,

        message:
          "Projeto excluido com sucesso."
      });

    } catch (error) {
      console.error(
        "Erro ao excluir projeto:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Erro ao excluir projeto."
      });
    }
  }
);

/* =========================================================
   BAIXAR PROJETO EM ZIP
========================================================= */

app.get(
  "/api/apps/:projeto/download",
  (req, res) => {
    try {
      const { projeto } = req.params;

      const resultado =
        lerProjeto(projeto);

      const nomeProjeto =
        resultado.projeto;

      const pastaProjeto =
        path.resolve(
          __dirname,
          "..",
          "generated-apps",
          nomeProjeto
        );

      if (
        !fs.existsSync(
          pastaProjeto
        )
      ) {
        return res.status(404).json({
          success: false,
          error:
            "Projeto nÃ£o encontrado."
        });
      }

      res.setHeader(
        "Content-Type",
        "application/zip"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nomeProjeto}.zip"`
      );

      const archive =
        new ZipArchive({
          zlib: {
            level: 9
          }
        });

      archive.on(
        "error",
        (error) => {
          console.error(
            "Erro ao gerar ZIP:",
            error
          );

          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error:
                "Erro ao gerar arquivo ZIP."
            });
          } else {
            res.end();
          }
        }
      );

      archive.pipe(res);

      archive.directory(
        pastaProjeto,
        false
      );

      archive.finalize();

    } catch (error) {
      console.error(
        "Erro no download ZIP:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Erro ao baixar projeto."
      });
    }
  }
);
const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `AppABUOA rodando na porta ${PORT}`
  );
});
