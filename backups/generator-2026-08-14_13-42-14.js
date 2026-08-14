const fs = require("fs");
const path = require("path");

function nomeSeguroProjeto(nomeProjeto) {
  const nomeSeguro = String(nomeProjeto)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-");

  if (!nomeSeguro) {
    throw new Error("Nome de projeto invÃ¡lido.");
  }

  return nomeSeguro;
}

function obterRaizGerados() {
  return path.resolve(
    __dirname,
    "..",
    "generated-apps"
  );
}

function obterPastaProjeto(nomeProjeto) {
  const nomeSeguro =
    nomeSeguroProjeto(nomeProjeto);

  const raizGerados =
    obterRaizGerados();

  const pastaBase = path.resolve(
    raizGerados,
    nomeSeguro
  );

  if (
    pastaBase !== raizGerados &&
    !pastaBase.startsWith(
      raizGerados + path.sep
    )
  ) {
    throw new Error(
      "Caminho de projeto invÃ¡lido."
    );
  }

  return {
    nomeSeguro,
    raizGerados,
    pastaBase
  };
}

function validarCaminhoArquivo(
  pastaBase,
  caminhoArquivo
) {
  const caminhoRelativo =
    String(caminhoArquivo)
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

  if (
    !caminhoRelativo ||
    caminhoRelativo === ".." ||
    caminhoRelativo.includes("../")
  ) {
    throw new Error(
      "Caminho de arquivo nÃ£o permitido."
    );
  }

  const caminhoCompleto =
    path.resolve(
      pastaBase,
      caminhoRelativo
    );

  if (
    caminhoCompleto !== pastaBase &&
    !caminhoCompleto.startsWith(
      pastaBase + path.sep
    )
  ) {
    throw new Error(
      "Tentativa de acessar arquivo fora do projeto."
    );
  }

  return {
    caminhoRelativo,
    caminhoCompleto
  };
}


/* =========================================================
   CRIAR / ATUALIZAR PROJETO
========================================================= */

function criarProjeto(
  nomeProjeto,
  arquivos
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(nomeProjeto);

  if (!Array.isArray(arquivos)) {
    throw new Error(
      "Lista de arquivos invÃ¡lida."
    );
  }

  fs.mkdirSync(
    pastaBase,
    {
      recursive: true
    }
  );

  for (const arquivo of arquivos) {
    if (
      !arquivo ||
      typeof arquivo.path !== "string" ||
      typeof arquivo.content !== "string"
    ) {
      throw new Error(
        "Arquivo gerado invÃ¡lido."
      );
    }

    const {
      caminhoCompleto
    } = validarCaminhoArquivo(
      pastaBase,
      arquivo.path
    );

    fs.mkdirSync(
      path.dirname(caminhoCompleto),
      {
        recursive: true
      }
    );

    fs.writeFileSync(
      caminhoCompleto,
      arquivo.content,
      "utf8"
    );
  }

  return {
    success: true,
    projeto: nomeSeguro,
    pasta: pastaBase,
    quantidadeArquivos:
      arquivos.length
  };
}


/* =========================================================
   LER ARQUIVOS DE UMA PASTA
========================================================= */

function lerArquivosDaPasta(
  pastaBase
) {
  const arquivos = [];

  function percorrerPasta(
    pastaAtual
  ) {
    const itens =
      fs.readdirSync(
        pastaAtual,
        {
          withFileTypes: true
        }
      );

    for (const item of itens) {
      const caminhoCompleto =
        path.join(
          pastaAtual,
          item.name
        );

      if (item.isDirectory()) {
        percorrerPasta(
          caminhoCompleto
        );
      } else {
        const caminhoRelativo =
          path
            .relative(
              pastaBase,
              caminhoCompleto
            )
            .replace(/\\/g, "/");

        const content =
          fs.readFileSync(
            caminhoCompleto,
            "utf8"
          );

        arquivos.push({
          path:
            caminhoRelativo,
          content
        });
      }
    }
  }

  percorrerPasta(
    pastaBase
  );

  return arquivos;
}


/* =========================================================
   LER PROJETO
========================================================= */

function lerProjeto(
  nomeProjeto
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (
    !fs.existsSync(
      pastaBase
    )
  ) {
    throw new Error(
      "Projeto nÃ£o encontrado."
    );
  }

  return {
    projeto:
      nomeSeguro,

    arquivos:
      lerArquivosDaPasta(
        pastaBase
      )
  };
}


/* =========================================================
   CRIAR BACKUP
========================================================= */

function criarBackupProjeto(
  nomeProjeto
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (
    !fs.existsSync(
      pastaBase
    )
  ) {
    throw new Error(
      "Projeto nÃ£o encontrado."
    );
  }

  const raizVersoes =
    path.resolve(
      __dirname,
      "..",
      "project-versions",
      nomeSeguro
    );

  fs.mkdirSync(
    raizVersoes,
    {
      recursive: true
    }
  );

  const agora =
    new Date();

  const versao =
    agora.getFullYear() +
    "-" +
    String(
      agora.getMonth() + 1
    ).padStart(2, "0") +
    "-" +
    String(
      agora.getDate()
    ).padStart(2, "0") +
    "_" +
    String(
      agora.getHours()
    ).padStart(2, "0") +
    "-" +
    String(
      agora.getMinutes()
    ).padStart(2, "0") +
    "-" +
    String(
      agora.getSeconds()
    ).padStart(2, "0") +
    "-" +
    String(
      agora.getMilliseconds()
    ).padStart(3, "0");

  const pastaVersao =
    path.join(
      raizVersoes,
      versao
    );

  fs.cpSync(
    pastaBase,
    pastaVersao,
    {
      recursive: true
    }
  );

  return {
    success: true,
    projeto:
      nomeSeguro,
    versao
  };
}


/* =========================================================
   LISTAR VERSÃ•ES
========================================================= */

function listarVersoes(
  nomeProjeto
) {
  const nomeSeguro =
    nomeSeguroProjeto(
      nomeProjeto
    );

  const pastaVersoes =
    path.resolve(
      __dirname,
      "..",
      "project-versions",
      nomeSeguro
    );

  if (
    !fs.existsSync(
      pastaVersoes
    )
  ) {
    return [];
  }

  return fs
    .readdirSync(
      pastaVersoes,
      {
        withFileTypes: true
      }
    )
    .filter(
      item =>
        item.isDirectory()
    )
    .map(
      item =>
        item.name
    )
    .sort()
    .reverse();
}


/* =========================================================
   LER VERSÃƒO ANTIGA
========================================================= */

function lerVersaoProjeto(
  nomeProjeto,
  versao
) {
  const nomeSeguro =
    nomeSeguroProjeto(
      nomeProjeto
    );

  const versaoSegura =
    String(versao)
      .trim();

  if (
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}$/.test(
      versaoSegura
    )
  ) {
    throw new Error(
      "VersÃ£o invÃ¡lida."
    );
  }

  const raizVersoes =
    path.resolve(
      __dirname,
      "..",
      "project-versions",
      nomeSeguro
    );

  const pastaVersao =
    path.resolve(
      raizVersoes,
      versaoSegura
    );

  if (
    pastaVersao !==
      raizVersoes &&
    !pastaVersao.startsWith(
      raizVersoes + path.sep
    )
  ) {
    throw new Error(
      "Caminho de versÃ£o invÃ¡lido."
    );
  }

  if (
    !fs.existsSync(
      pastaVersao
    )
  ) {
    throw new Error(
      "VersÃ£o nÃ£o encontrada."
    );
  }

  return {
    projeto:
      nomeSeguro,

    versao:
      versaoSegura,

    pasta:
      pastaVersao,

    arquivos:
      lerArquivosDaPasta(
        pastaVersao
      )
  };
}


/* =========================================================
   RESTAURAR VERSÃƒO
========================================================= */

function restaurarVersaoProjeto(
  nomeProjeto,
  versao
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (
    !fs.existsSync(
      pastaBase
    )
  ) {
    throw new Error(
      "Projeto atual nÃ£o encontrado."
    );
  }

  const versaoAnterior =
    lerVersaoProjeto(
      nomeSeguro,
      versao
    );

  const backupAtual =
    criarBackupProjeto(
      nomeSeguro
    );

  fs.rmSync(
    pastaBase,
    {
      recursive: true,
      force: true
    }
  );

  fs.mkdirSync(
    pastaBase,
    {
      recursive: true
    }
  );

  fs.cpSync(
    versaoAnterior.pasta,
    pastaBase,
    {
      recursive: true
    }
  );

  return {
    success: true,

    projeto:
      nomeSeguro,

    versaoRestaurada:
      versaoAnterior.versao,

    backupAnterior:
      backupAtual.versao
  };
}


/* =========================================================
   SALVAR ARQUIVO EXISTENTE
   COM BACKUP AUTOMÃTICO
========================================================= */

function salvarArquivoProjeto(
  nomeProjeto,
  caminhoArquivo,
  novoConteudo
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (
    !fs.existsSync(
      pastaBase
    )
  ) {
    throw new Error(
      "Projeto nÃ£o encontrado."
    );
  }

  if (
    typeof novoConteudo !==
    "string"
  ) {
    throw new Error(
      "ConteÃºdo do arquivo invÃ¡lido."
    );
  }

  const {
    caminhoRelativo,
    caminhoCompleto
  } = validarCaminhoArquivo(
    pastaBase,
    caminhoArquivo
  );

  if (
    !fs.existsSync(
      caminhoCompleto
    )
  ) {
    throw new Error(
      "Arquivo nÃ£o encontrado."
    );
  }

  const backup =
    criarBackupProjeto(
      nomeSeguro
    );

  fs.writeFileSync(
    caminhoCompleto,
    novoConteudo,
    "utf8"
  );

  return {
    success: true,

    projeto:
      nomeSeguro,

    arquivo:
      caminhoRelativo,

    backup:
      backup.versao
  };
}


/* =========================================================
   CRIAR NOVO ARQUIVO
   COM BACKUP AUTOMÃTICO
========================================================= */

function criarArquivoProjeto(
  nomeProjeto,
  caminhoArquivo,
  conteudoInicial = ""
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (
    !fs.existsSync(
      pastaBase
    )
  ) {
    throw new Error(
      "Projeto nÃ£o encontrado."
    );
  }

  if (
    typeof conteudoInicial !==
    "string"
  ) {
    throw new Error(
      "ConteÃºdo inicial invÃ¡lido."
    );
  }

  const {
    caminhoRelativo,
    caminhoCompleto
  } = validarCaminhoArquivo(
    pastaBase,
    caminhoArquivo
  );

  if (
    fs.existsSync(
      caminhoCompleto
    )
  ) {
    throw new Error(
      "JÃ¡ existe um arquivo com esse nome."
    );
  }

  /*
    Criamos um backup do projeto
    antes de adicionar o novo arquivo.
  */

  const backup =
    criarBackupProjeto(
      nomeSeguro
    );

  /*
    Permite criar arquivos tambÃ©m
    dentro de subpastas.

    Exemplo:
    pages/login.html
  */

  fs.mkdirSync(
    path.dirname(
      caminhoCompleto
    ),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    caminhoCompleto,
    conteudoInicial,
    "utf8"
  );

  return {
    success: true,

    projeto:
      nomeSeguro,

    arquivo:
      caminhoRelativo,

    backup:
      backup.versao
  };
}



/* =========================================================
   RENOMEAR ARQUIVO
   COM BACKUP AUTOMÃTICO
========================================================= */

function renomearArquivoProjeto(
  nomeProjeto,
  caminhoAtual,
  novoCaminho
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (!fs.existsSync(pastaBase)) {
    throw new Error("Projeto nÃ£o encontrado.");
  }

  const atual = validarCaminhoArquivo(
    pastaBase,
    caminhoAtual
  );

  const novo = validarCaminhoArquivo(
    pastaBase,
    novoCaminho
  );

  if (atual.caminhoRelativo === "index.html") {
    throw new Error(
      "O arquivo index.html Ã© protegido e nÃ£o pode ser renomeado."
    );
  }

  if (!fs.existsSync(atual.caminhoCompleto)) {
    throw new Error("Arquivo nÃ£o encontrado.");
  }

  if (fs.existsSync(novo.caminhoCompleto)) {
    throw new Error(
      "JÃ¡ existe um arquivo com o novo nome."
    );
  }

  const backup =
    criarBackupProjeto(nomeSeguro);

  fs.mkdirSync(
    path.dirname(novo.caminhoCompleto),
    { recursive: true }
  );

  fs.renameSync(
    atual.caminhoCompleto,
    novo.caminhoCompleto
  );

  return {
    success: true,
    projeto: nomeSeguro,
    arquivoAnterior: atual.caminhoRelativo,
    arquivo: novo.caminhoRelativo,
    backup: backup.versao
  };
}


/* =========================================================
   EXCLUIR ARQUIVO
   COM BACKUP AUTOMÃTICO
========================================================= */

function excluirArquivoProjeto(
  nomeProjeto,
  caminhoArquivo
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (!fs.existsSync(pastaBase)) {
    throw new Error("Projeto nÃ£o encontrado.");
  }

  const {
    caminhoRelativo,
    caminhoCompleto
  } = validarCaminhoArquivo(
    pastaBase,
    caminhoArquivo
  );

  if (caminhoRelativo === "index.html") {
    throw new Error(
      "O arquivo index.html Ã© protegido e nÃ£o pode ser excluÃ­do."
    );
  }

  if (!fs.existsSync(caminhoCompleto)) {
    throw new Error("Arquivo nÃ£o encontrado.");
  }

  const backup =
    criarBackupProjeto(nomeSeguro);

  fs.rmSync(
    caminhoCompleto,
    { force: true }
  );

  return {
    success: true,
    projeto: nomeSeguro,
    arquivo: caminhoRelativo,
    backup: backup.versao
  };
}



/* =========================================================
   APLICAR OPERAÃ‡Ã•ES DA IA NO PROJETO INTEIRO
   Valida tudo antes, cria um Ãºnico backup e sÃ³ entÃ£o aplica.
========================================================= */

function aplicarOperacoesProjeto(
  nomeProjeto,
  operacoes
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(nomeProjeto);

  if (!fs.existsSync(pastaBase)) {
    throw new Error("Projeto nÃ£o encontrado.");
  }

  if (!Array.isArray(operacoes) || operacoes.length === 0) {
    throw new Error("Nenhuma operaÃ§Ã£o vÃ¡lida foi recebida.");
  }

  const validadas = [];
  const destinos = new Set();

  for (const operacao of operacoes) {
    if (!operacao || typeof operacao !== "object") {
      throw new Error("OperaÃ§Ã£o invÃ¡lida.");
    }

    const tipo = String(operacao.tipo || "").toLowerCase().trim();

    if (!["criar", "alterar", "excluir"].includes(tipo)) {
      throw new Error(`Tipo de operaÃ§Ã£o nÃ£o permitido: ${tipo}`);
    }

    const arquivo = validarCaminhoArquivo(
      pastaBase,
      operacao.path
    );

    if (tipo === "excluir") {
      if (arquivo.caminhoRelativo === "index.html") {
        throw new Error(
          "A IA nÃ£o pode excluir o arquivo index.html."
        );
      }

      if (!fs.existsSync(arquivo.caminhoCompleto)) {
        throw new Error(
          `Arquivo para exclusÃ£o nÃ£o encontrado: ${arquivo.caminhoRelativo}`
        );
      }

      validadas.push({
        tipo,
        ...arquivo
      });

      continue;
    }

    if (typeof operacao.content !== "string") {
      throw new Error(
        `ConteÃºdo invÃ¡lido para ${arquivo.caminhoRelativo}.`
      );
    }

    if (destinos.has(arquivo.caminhoRelativo)) {
      throw new Error(
        `OperaÃ§Ãµes duplicadas para o arquivo ${arquivo.caminhoRelativo}.`
      );
    }

    destinos.add(arquivo.caminhoRelativo);

    if (
      tipo === "criar" &&
      fs.existsSync(arquivo.caminhoCompleto)
    ) {
      throw new Error(
        `A IA tentou criar um arquivo que jÃ¡ existe: ${arquivo.caminhoRelativo}`
      );
    }

    if (
      tipo === "alterar" &&
      !fs.existsSync(arquivo.caminhoCompleto)
    ) {
      throw new Error(
        `A IA tentou alterar um arquivo inexistente: ${arquivo.caminhoRelativo}`
      );
    }

    validadas.push({
      tipo,
      content: operacao.content,
      ...arquivo
    });
  }

  const backup = criarBackupProjeto(nomeSeguro);

  try {
    for (const operacao of validadas) {
      if (operacao.tipo === "excluir") {
        fs.rmSync(
          operacao.caminhoCompleto,
          { force: true }
        );
        continue;
      }

      fs.mkdirSync(
        path.dirname(operacao.caminhoCompleto),
        { recursive: true }
      );

      fs.writeFileSync(
        operacao.caminhoCompleto,
        operacao.content,
        "utf8"
      );
    }

    return {
      success: true,
      projeto: nomeSeguro,
      backup: backup.versao,
      operacoes: validadas.map(item => ({
        tipo: item.tipo,
        path: item.caminhoRelativo
      }))
    };

  } catch (error) {
    // Se uma gravaÃ§Ã£o falhar no meio, restaura o backup recÃ©m-criado.
    const versaoBackup = lerVersaoProjeto(
      nomeSeguro,
      backup.versao
    );

    fs.rmSync(
      pastaBase,
      {
        recursive: true,
        force: true
      }
    );

    fs.mkdirSync(
      pastaBase,
      {
        recursive: true
      }
    );

    fs.cpSync(
      versaoBackup.pasta,
      pastaBase,
      {
        recursive: true
      }
    );

    throw error;
  }
}



/* =========================================================
   DUPLICAR PROJETO
   Cria uma copia independente sem alterar o projeto original.
========================================================= */

function duplicarProjeto(
  nomeProjetoOrigem,
  nomeNovoProjeto
) {
  const origem =
    obterPastaProjeto(
      nomeProjetoOrigem
    );

  const destino =
    obterPastaProjeto(
      nomeNovoProjeto
    );

  if (
    !fs.existsSync(
      origem.pastaBase
    )
  ) {
    throw new Error(
      "Projeto de origem nao encontrado."
    );
  }

  if (
    origem.nomeSeguro ===
    destino.nomeSeguro
  ) {
    throw new Error(
      "O novo projeto precisa ter um nome diferente do projeto original."
    );
  }

  if (
    fs.existsSync(
      destino.pastaBase
    )
  ) {
    throw new Error(
      "Ja existe um projeto com esse nome."
    );
  }

  fs.cpSync(
    origem.pastaBase,
    destino.pastaBase,
    {
      recursive: true,
      errorOnExist: true,
      force: false
    }
  );

  const arquivosCopiados =
    lerArquivosDaPasta(
      destino.pastaBase
    );

  return {
    success: true,
    projetoOriginal:
      origem.nomeSeguro,
    projeto:
      destino.nomeSeguro,
    pasta:
      destino.pastaBase,
    quantidadeArquivos:
      arquivosCopiados.length
  };
}

/* =========================================================
   RENOMEAR PROJETO
   Mantem todos os arquivos e altera somente o nome da pasta.
========================================================= */

function renomearProjeto(
  nomeProjetoAtual,
  novoNomeProjeto
) {
  const atual =
    obterPastaProjeto(
      nomeProjetoAtual
    );

  const novo =
    obterPastaProjeto(
      novoNomeProjeto
    );

  if (
    !fs.existsSync(
      atual.pastaBase
    )
  ) {
    throw new Error(
      "Projeto atual nao encontrado."
    );
  }

  if (
    atual.nomeSeguro ===
    novo.nomeSeguro
  ) {
    throw new Error(
      "O novo nome precisa ser diferente do nome atual."
    );
  }

  if (
    fs.existsSync(
      novo.pastaBase
    )
  ) {
    throw new Error(
      "Ja existe um projeto com esse nome."
    );
  }

  fs.renameSync(
    atual.pastaBase,
    novo.pastaBase
  );

  const arquivos =
    lerArquivosDaPasta(
      novo.pastaBase
    );

  return {
    success: true,

    projetoAnterior:
      atual.nomeSeguro,

    projeto:
      novo.nomeSeguro,

    pasta:
      novo.pastaBase,

    quantidadeArquivos:
      arquivos.length
  };
}

/* =========================================================
   EXCLUIR PROJETO
   Cria backup completo antes da exclusao.
========================================================= */

function excluirProjeto(
  nomeProjeto
) {
  const {
    nomeSeguro,
    pastaBase
  } = obterPastaProjeto(
    nomeProjeto
  );

  if (
    !fs.existsSync(
      pastaBase
    )
  ) {
    throw new Error(
      "Projeto nao encontrado."
    );
  }

  /*
    Antes de apagar o projeto,
    criamos um backup completo.
  */

  const backup =
    criarBackupProjeto(
      nomeSeguro
    );

  const arquivosAntes =
    lerArquivosDaPasta(
      pastaBase
    );

  fs.rmSync(
    pastaBase,
    {
      recursive: true,
      force: true
    }
  );

  return {
    success: true,

    projeto:
      nomeSeguro,

    quantidadeArquivos:
      arquivosAntes.length,

    backup:
      backup.versao
  };
}
module.exports = {
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
};


