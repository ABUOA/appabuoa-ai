const OpenAI = require("openai");
const { criarProjeto } = require("./generator");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/apps", express.static("generated-apps"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    app: "AppABUOA",
    message: "Servidor AppABUOA funcionando!",
  });
});

app.post("/api/ai", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Envie o campo prompt.",
      });
    }

    const response = await openai.responses.create({
      model: "gpt-5.5",
      instructions: `
Você é o motor gerador de aplicativos do AppABUOA.

Sua tarefa é transformar a ideia do usuário em um pequeno aplicativo web funcional.

Responda SOMENTE com JSON válido, sem markdown e sem explicações fora do JSON.

Use exatamente esta estrutura:

{
  "nomeProjeto": "nome-do-projeto",
  "resumo": "resumo curto do aplicativo",
  "arquivos": [
    {
      "path": "index.html",
      "content": "conteúdo completo do arquivo"
    },
    {
      "path": "style.css",
      "content": "conteúdo completo do arquivo"
    },
    {
      "path": "script.js",
      "content": "conteúdo completo do arquivo"
    }
  ]
}

Regras:
- Gere sempre index.html.
- Use HTML, CSS e JavaScript puro nesta primeira versão.
- O aplicativo precisa abrir diretamente no navegador.
- index.html deve referenciar style.css e script.js quando esses arquivos existirem.
- Não use caminhos absolutos.
- Não use ../ nos nomes dos arquivos.
- Gere código funcional, não apenas uma descrição.
      `,
      input: prompt,
    });

    const projetoGerado = JSON.parse(response.output_text);

    if (
      !projetoGerado.nomeProjeto ||
      !Array.isArray(projetoGerado.arquivos)
    ) {
      throw new Error("Estrutura de projeto inválida.");
    }

    const resultadoCriacao = criarProjeto(
      projetoGerado.nomeProjeto,
      projetoGerado.arquivos
    );

    res.json({
      success: true,
      answer: projetoGerado.resumo,
      projeto: resultadoCriacao.projeto,
      quantidadeArquivos: resultadoCriacao.quantidadeArquivos,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Erro ao gerar o aplicativo.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AppABUOA rodando na porta ${PORT}`);
});