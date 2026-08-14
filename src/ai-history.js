const fs = require("fs");
const path = require("path");

function nomeSeguroProjeto(nomeProjeto) {
  const nomeSeguro = String(nomeProjeto)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");

  if (!nomeSeguro) {
    throw new Error(
      "Nome de projeto invalido."
    );
  }

  return nomeSeguro;
}

function obterPastaHistorico(nomeProjeto) {
  const projeto =
    nomeSeguroProjeto(nomeProjeto);

  const raiz =
    path.resolve(
      __dirname,
      "..",
      "ai-history"
    );

  const pasta =
    path.resolve(
      raiz,
      projeto
    );

  if (
    pasta !== raiz &&
    !pasta.startsWith(
      raiz + path.sep
    )
  ) {
    throw new Error(
      "Caminho de historico invalido."
    );
  }

  return {
    projeto,
    raiz,
    pasta,
    arquivo:
      path.join(
        pasta,
        "history.json"
      )
  };
}

function lerHistoricoIA(nomeProjeto) {
  const {
    projeto,
    arquivo
  } = obterPastaHistorico(
    nomeProjeto
  );

  if (
    !fs.existsSync(
      arquivo
    )
  ) {
    return {
      projeto,
      registros: []
    };
  }

  const texto =
    fs.readFileSync(
      arquivo,
      "utf8"
    );

  if (!texto.trim()) {
    return {
      projeto,
      registros: []
    };
  }

  const registros =
    JSON.parse(texto);

  if (!Array.isArray(registros)) {
    throw new Error(
      "Historico da IA invalido."
    );
  }

  return {
    projeto,
    registros
  };
}

function registrarHistoricoIA(
  nomeProjeto,
  registro
) {
  const {
    projeto,
    pasta,
    arquivo
  } = obterPastaHistorico(
    nomeProjeto
  );

  fs.mkdirSync(
    pasta,
    {
      recursive: true
    }
  );

  const historico =
    lerHistoricoIA(
      projeto
    );

  const novoRegistro = {
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    data:
      new Date().toISOString(),

    ...registro
  };

  historico.registros.unshift(
    novoRegistro
  );

  /*
    Limitamos a 500 registros
    por projeto nesta fase.
  */
  const registros =
    historico.registros.slice(
      0,
      500
    );

  fs.writeFileSync(
    arquivo,
    JSON.stringify(
      registros,
      null,
      2
    ),
    "utf8"
  );

  return {
    success: true,
    projeto,
    registro:
      novoRegistro
  };
}

module.exports = {
  registrarHistoricoIA,
  lerHistoricoIA
};