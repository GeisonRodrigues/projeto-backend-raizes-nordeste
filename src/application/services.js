const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get, all } = require('../infrastructure/database');
const {
  CANAIS_PERMITIDOS,
  PERFIS_PERMITIDOS,
  validarCanalPedido,
  validarStatusPedido,
  calcularPontosFidelidade
} = require('../domain/regras');

function criarErro(status, mensagem) {
  const err = new Error(mensagem);
  err.status = status;
  return err;
}

async function registrarLog(usuarioId, acao, detalhes) {
  await run(
    'INSERT INTO logs_auditoria (usuario_id, acao, detalhes) VALUES (?, ?, ?)',
    [usuarioId || null, acao, detalhes]
  );
}

async function autenticarUsuario(email, senha) {
  if (!email || !senha) {
    throw criarErro(400, 'E-mail e senha sao obrigatorios.');
  }

  const usuario = await get('SELECT * FROM usuarios WHERE email = ?', [email]);
  if (!usuario) {
    throw criarErro(401, 'Credenciais invalidas.');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaValida) {
    throw criarErro(401, 'Credenciais invalidas.');
  }

  const secret = process.env.JWT_SECRET || 'chave_secreta_geison_uninter_2026';
  const accessToken = jwt.sign(
    { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
    secret,
    { expiresIn: '4h' }
  );

  await registrarLog(usuario.id, 'LOGIN', `Login realizado pelo perfil ${usuario.perfil}`);

  return {
    accessToken,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      pontosFidelidade: usuario.pontos_fidelidade
    }
  };
}

async function cadastrarUsuario(dados) {
  const { nome, email, senha, perfil = 'CLIENTE', consentimentoLgpd = false } = dados;

  if (!nome || !email || !senha) {
    throw criarErro(400, 'Nome, e-mail e senha sao obrigatorios.');
  }
  if (!PERFIS_PERMITIDOS.includes(perfil)) {
    throw criarErro(400, `Perfil invalido. Valores aceitos: ${PERFIS_PERMITIDOS.join(', ')}`);
  }

  const existente = await get('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existente) {
    throw criarErro(409, 'Este e-mail ja esta cadastrado.');
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const consentimentoInt = consentimentoLgpd ? 1 : 0;

  const resultado = await run(
    'INSERT INTO usuarios (nome, email, senha_hash, perfil, consentimento_lgpd) VALUES (?, ?, ?, ?, ?)',
    [nome, email, senhaHash, perfil, consentimentoInt]
  );

  await registrarLog(resultado.id, 'CADASTRO_USUARIO', `Cadastro criado com consentimentoLgpd=${consentimentoLgpd}`);

  return {
    id: resultado.id,
    nome,
    email,
    perfil,
    consentimentoLgpd: Boolean(consentimentoLgpd),
    pontosFidelidade: 0
  };
}

async function criarPedido(dados, usuarioLogado) {
  const { canalPedido, unidadeId, itens } = dados;

  if (!canalPedido || !validarCanalPedido(canalPedido)) {
    throw criarErro(
      400,
      `O campo canalPedido e obrigatorio e deve ser um dos seguintes: ${CANAIS_PERMITIDOS.join(', ')}`
    );
  }

  if (!unidadeId || !Array.isArray(itens) || itens.length === 0) {
    throw criarErro(400, 'Informe a unidadeId e ao menos um item no pedido.');
  }

  const unidade = await get('SELECT * FROM unidades WHERE id = ? AND ativa = 1', [unidadeId]);
  if (!unidade) {
    throw criarErro(404, 'Unidade nao encontrada ou inativa.');
  }

  let valorTotal = 0;
  const itensValidados = [];

  for (const item of itens) {
    if (!item.produtoId || typeof item.quantidade !== 'number' || item.quantidade <= 0) {
      throw criarErro(400, 'Cada item deve ter produtoId valido e quantidade maior que zero.');
    }

    const produto = await get('SELECT * FROM produtos WHERE id = ? AND ativo = 1', [item.produtoId]);
    if (!produto) {
      throw criarErro(404, `Produto ID ${item.produtoId} nao encontrado.`);
    }

    const estoque = await get(
      'SELECT * FROM estoques WHERE unidade_id = ? AND produto_id = ?',
      [unidadeId, item.produtoId]
    );

    if (!estoque || estoque.quantidade < item.quantidade) {
      throw criarErro(
        409,
        `Estoque insuficiente para o produto "${produto.nome}" na unidade selecionada.`
      );
    }

    valorTotal += produto.preco * item.quantidade;
    itensValidados.push({
      produtoId: produto.id,
      quantidade: item.quantidade,
      precoUnitario: produto.preco
    });
  }

  for (const item of itensValidados) {
    await run(
      'UPDATE estoques SET quantidade = quantidade - ? WHERE unidade_id = ? AND produto_id = ?',
      [item.quantidade, unidadeId, item.produtoId]
    );
  }

  const pedidoResult = await run(
    'INSERT INTO pedidos (usuario_id, unidade_id, canal_pedido, status, valor_total) VALUES (?, ?, ?, ?, ?)',
    [usuarioLogado.id, unidadeId, canalPedido, 'AGUARDANDO_PAGAMENTO', Number(valorTotal.toFixed(2))]
  );

  for (const item of itensValidados) {
    await run(
      'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
      [pedidoResult.id, item.produtoId, item.quantidade, item.precoUnitario]
    );
  }

  await registrarLog(
    usuarioLogado.id,
    'CRIAR_PEDIDO',
    `Pedido #${pedidoResult.id} criado via canal ${canalPedido} na unidade ${unidadeId}`
  );

  return {
    pedidoId: pedidoResult.id,
    canalPedido,
    unidadeId,
    status: 'AGUARDANDO_PAGAMENTO',
    valorTotal: Number(valorTotal.toFixed(2)),
    criadoEm: new Date().toISOString()
  };
}

async function processarPagamentoMock(dados, usuarioLogado) {
  const { pedidoId, metodo = 'MOCK_PIX', simularFalha = false } = dados;

  if (!pedidoId) {
    throw criarErro(400, 'O campo pedidoId e obrigatorio.');
  }

  const pedido = await get('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
  if (!pedido) {
    throw criarErro(404, 'Pedido nao encontrado.');
  }

  if (pedido.status === 'PAGO') {
    throw criarErro(409, 'Este pedido ja foi pago anteriormente.');
  }
  if (pedido.status === 'CANCELADO') {
    throw criarErro(409, 'Nao e possivel pagar um pedido cancelado.');
  }

  const transacaoIdMock = `MOCK-${Math.floor(10000 + Math.random() * 90000)}`;

  if (simularFalha) {
    await run(
      'INSERT INTO pagamentos (pedido_id, metodo, status, transacao_id_mock) VALUES (?, ?, ?, ?)',
      [pedidoId, metodo, 'RECUSADO', transacaoIdMock]
    );
    await run('UPDATE pedidos SET status = ? WHERE id = ?', ['CANCELADO', pedidoId]);

    const itens = await all('SELECT * FROM itens_pedido WHERE pedido_id = ?', [pedidoId]);
    for (const item of itens) {
      await run(
        'UPDATE estoques SET quantidade = quantidade + ? WHERE unidade_id = ? AND produto_id = ?',
        [item.quantidade, pedido.unidade_id, item.produto_id]
      );
    }

    await registrarLog(usuarioLogado.id, 'PAGAMENTO_MOCK_RECUSADO', `Pagamento negado para pedido #${pedidoId}`);
    throw criarErro(422, 'Pagamento recusado pelo servico externo simulado (Mock). Pedido cancelado e estoque estornado.');
  }

  const pgto = await run(
    'INSERT INTO pagamentos (pedido_id, metodo, status, transacao_id_mock) VALUES (?, ?, ?, ?)',
    [pedidoId, metodo, 'APROVADO', transacaoIdMock]
  );

  await run('UPDATE pedidos SET status = ? WHERE id = ?', ['PAGO', pedidoId]);

  const cliente = await get('SELECT * FROM usuarios WHERE id = ?', [pedido.usuario_id]);
  const pontosGanhos = calcularPontosFidelidade(pedido.valor_total, Boolean(cliente?.consentimento_lgpd));

  if (pontosGanhos > 0) {
    await run('UPDATE usuarios SET pontos_fidelidade = pontos_fidelidade + ? WHERE id = ?', [
      pontosGanhos,
      pedido.usuario_id
    ]);
  }

  await registrarLog(
    usuarioLogado.id,
    'PAGAMENTO_MOCK_APROVADO',
    `Pagamento aprovado (${transacaoIdMock}) para pedido #${pedidoId}`
  );

  return {
    pagamentoId: pgto.id,
    pedidoId,
    statusPagamento: 'APROVADO',
    statusPedido: 'PAGO',
    transacaoIdMock,
    pontosCreditados: pontosGanhos
  };
}

async function atualizarStatusPedido(pedidoId, novoStatus, usuarioLogado) {
  if (!novoStatus || !validarStatusPedido(novoStatus)) {
    throw criarErro(400, 'Status informado e invalido.');
  }

  const pedido = await get('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
  if (!pedido) {
    throw criarErro(404, 'Pedido nao encontrado.');
  }

  await run('UPDATE pedidos SET status = ? WHERE id = ?', [novoStatus, pedidoId]);
  await registrarLog(
    usuarioLogado.id,
    'ATUALIZAR_STATUS_PEDIDO',
    `Pedido #${pedidoId} alterado de ${pedido.status} para ${novoStatus}`
  );

  return {
    pedidoId: Number(pedidoId),
    statusAnterior: pedido.status,
    novoStatus
  };
}

module.exports = {
  criarErro,
  registrarLog,
  autenticarUsuario,
  cadastrarUsuario,
  criarPedido,
  processarPagamentoMock,
  atualizarStatusPedido
};
