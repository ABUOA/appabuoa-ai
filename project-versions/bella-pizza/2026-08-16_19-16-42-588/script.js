const pizzas = [
  {
    id: 1,
    nome: 'Margherita',
    descricao: 'Molho de tomate, muçarela, manjericão fresco e azeite especial.',
    preco: 39.9,
    emoji: '🍅'
  },
  {
    id: 2,
    nome: 'Calabresa',
    descricao: 'Calabresa fatiada, cebola roxa, muçarela e orégano.',
    preco: 42.9,
    emoji: '🌶️'
  },
  {
    id: 3,
    nome: 'Portuguesa',
    descricao: 'Presunto, ovos, cebola, ervilha, azeitonas e muçarela cremosa.',
    preco: 47.9,
    emoji: '🫒'
  },
  {
    id: 4,
    nome: 'Quatro Queijos',
    descricao: 'Muçarela, provolone, parmesão e gorgonzola em combinação perfeita.',
    preco: 49.9,
    emoji: '🧀'
  },
  {
    id: 5,
    nome: 'Frango com Catupiry',
    descricao: 'Frango desfiado temperado, catupiry original, milho e orégano.',
    preco: 46.9,
    emoji: '🍗'
  },
  {
    id: 6,
    nome: 'Bella Especial',
    descricao: 'Pepperoni, bacon crocante, pimentão, cebola caramelizada e muçarela.',
    preco: 54.9,
    emoji: '⭐'
  }
];

let carrinho = [];

const listaPizzas = document.getElementById('listaPizzas');
const itensCarrinho = document.getElementById('itensCarrinho');
const subtotalEl = document.getElementById('subtotal');
const entregaEl = document.getElementById('entrega');
const totalEl = document.getElementById('total');
const contadorItens = document.getElementById('contadorItens');
const finalizarPedido = document.getElementById('finalizarPedido');
const limparCarrinho = document.getElementById('limparCarrinho');

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function renderizarCardapio() {
  listaPizzas.innerHTML = pizzas.map(pizza => `
    <article class="card-pizza">
      <div class="card-topo">
        <div class="emoji-pizza">${pizza.emoji}</div>
        <div>
          <h3>${pizza.nome}</h3>
          <p>${pizza.descricao}</p>
        </div>
      </div>
      <div class="card-rodape">
        <span class="preco">${formatarMoeda(pizza.preco)}</span>
        <button class="botao-adicionar" onclick="adicionarAoCarrinho(${pizza.id})">Adicionar</button>
      </div>
    </article>
  `).join('');
}

function adicionarAoCarrinho(id) {
  const pizza = pizzas.find(item => item.id === id);
  const itemExistente = carrinho.find(item => item.id === id);

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({ ...pizza, quantidade: 1 });
  }

  atualizarCarrinho();
}

function removerUmaUnidade(id) {
  const item = carrinho.find(produto => produto.id === id);
  if (!item) return;

  item.quantidade -= 1;

  if (item.quantidade <= 0) {
    carrinho = carrinho.filter(produto => produto.id !== id);
  }

  atualizarCarrinho();
}

function adicionarUmaUnidade(id) {
  const item = carrinho.find(produto => produto.id === id);
  if (!item) return;

  item.quantidade += 1;
  atualizarCarrinho();
}

function calcularSubtotal() {
  return carrinho.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}

function contarItens() {
  return carrinho.reduce((soma, item) => soma + item.quantidade, 0);
}

function obterFormaPagamento() {
  const pagamentoSelecionado = document.querySelector('input[name="formaPagamento"]:checked');
  return pagamentoSelecionado ? pagamentoSelecionado.value : 'PIX';
}

function atualizarCarrinho() {
  const quantidadeTotal = contarItens();
  const subtotal = calcularSubtotal();
  const entrega = subtotal > 0 ? 7.9 : 0;
  const total = subtotal + entrega;

  contadorItens.textContent = quantidadeTotal === 1 ? '1 item' : `${quantidadeTotal} itens`;
  subtotalEl.textContent = formatarMoeda(subtotal);
  entregaEl.textContent = formatarMoeda(entrega);
  totalEl.textContent = formatarMoeda(total);

  finalizarPedido.disabled = quantidadeTotal === 0;
  limparCarrinho.disabled = quantidadeTotal === 0;

  if (carrinho.length === 0) {
    itensCarrinho.innerHTML = '<p class="vazio">Seu carrinho está vazio.</p>';
    return;
  }

  itensCarrinho.innerHTML = carrinho.map(item => `
    <div class="item-carrinho">
      <div class="item-info">
        <strong>${item.nome}</strong>
        <span>${formatarMoeda(item.preco * item.quantidade)}</span>
      </div>
      <div class="controles">
        <button onclick="removerUmaUnidade(${item.id})" aria-label="Remover uma unidade">−</button>
        <span class="quantidade">Qtd. ${item.quantidade}</span>
        <button onclick="adicionarUmaUnidade(${item.id})" aria-label="Adicionar uma unidade">+</button>
      </div>
    </div>
  `).join('');
}

limparCarrinho.addEventListener('click', () => {
  carrinho = [];
  atualizarCarrinho();
});

finalizarPedido.addEventListener('click', () => {
  const total = calcularSubtotal() + 7.9;
  const formaPagamento = obterFormaPagamento();
  const instrucoesPagamento = formaPagamento === 'PIX'
    ? 'Chave PIX: pedidos@bellapizza.com'
    : 'Pagamento no cartão de crédito será realizado na entrega ou retirada.';

  alert(`Pedido confirmado na Bella Pizza!\nTotal: ${formatarMoeda(total)}\nPagamento: ${formaPagamento}\n${instrucoesPagamento}\nObrigado pela preferência.`);
  carrinho = [];
  atualizarCarrinho();
});

renderizarCardapio();
atualizarCarrinho();
