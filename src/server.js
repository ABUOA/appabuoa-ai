const express = require("express");
const cors = require("cors");
require("dotenv").config();

const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

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
      instructions:
        "Você é o AI Core do AppABUOA. Ajude a transformar ideias em aplicativos estruturados.",
      input: prompt,
    });

    res.json({
      success: true,
      answer: response.output_text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Erro ao consultar a inteligência artificial.",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AppABUOA rodando na porta ${PORT}`);
});