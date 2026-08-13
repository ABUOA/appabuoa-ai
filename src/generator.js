const fs = require("fs");
const path = require("path");

function criarProjeto(nomeProjeto, arquivos) {
  const nomeSeguro = String(nomeProjeto)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");

  if (!nomeSeguro) {
    throw new Error("Nome de projeto inválido.");
  }

  const raizGerados = path.resolve(
    __dirname,
    "..",
    "generated-apps"
  );

  const pastaBase = path.resolve(
    raizGerados,
    nomeSeguro
  );

  if (
    pastaBase !== raizGerados &&
    !pastaBase.startsWith(raizGerados + path.sep)
  ) {
    throw new Error("Caminho de projeto inválido.");
  }

  fs.mkdirSync(pastaBase, { recursive: true });

  for (const arquivo of arquivos) {
    if (
      !arquivo ||
      typeof arquivo.path !== "string" ||
      typeof arquivo.content !== "string"
    ) {
      throw new Error("Arquivo gerado inválido.");
    }

    const caminhoRelativo = arquivo.path
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    if (
      caminhoRelativo.includes("../") ||
      caminhoRelativo === ".."
    ) {
      throw new Error("Caminho de arquivo não permitido.");
    }

    const caminhoArquivo = path.resolve(
      pastaBase,
      caminhoRelativo
    );

    if (
      caminhoArquivo !== pastaBase &&
      !caminhoArquivo.startsWith(pastaBase + path.sep)
    ) {
      throw new Error("Tentativa de criar arquivo fora do projeto.");
    }

    fs.mkdirSync(
      path.dirname(caminhoArquivo),
      { recursive: true }
    );

    fs.writeFileSync(
      caminhoArquivo,
      arquivo.content,
      "utf8"
    );
  }

  return {
    success: true,
    projeto: nomeSeguro,
    pasta: pastaBase,
    quantidadeArquivos: arquivos.length
  };
}

module.exports = {
  criarProjeto
};