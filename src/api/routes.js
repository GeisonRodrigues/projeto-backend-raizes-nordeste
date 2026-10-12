const express = require('express');
const router = express.Router();
const { get, all, run } = require('../infrastructure/database');
const { autenticarJWT, autorizarPerfis } = require('./middlewares');
const {
  criarErro,
  registrarLog,
  autenticarUsuario,
  cadastrarUsuario,
  criarPedido,
  processarPagamentoMock,
  atualizarStatusPedido
} = require('../application/services');

router.post('/auth/login', async (req, res, next) => {
  try {
    const resultado = await autenticarUsuario(req.body.email, req.body.senha);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
});

router.post('/usuarios', async (req, res, next) => {
  try {
    const novoUsuario = await cadastrarUsuario(req.body);
    res.status(201).json(novoUsuario);
  } catch (err) {
    next(err);
  }
});

router.delete('/usuarios/:id/privacidade', autenticarJWT, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (req.usuario.id !== id && req.usuario.perfil !== 'ADMIN') {
      throw criarErro(403, 'Sem permissao para anonimizar outro usuario.');
    }
    await run(
      'UPDATE usuarios SET nome = ?, email = ?, consentimento_lgpd = 0 WHERE id = ?',
      [`Anonimizado_${id}`, `anonimo_${id}@raizes.local`, id]
    );
    await registrarLog(req.usuario.id, 'ANONIMIZACAO_LGPD', `Dados pessoais do usuario #${id} anonimizados.`);
    res.status(200).json({ mensagem: 'Dados pessoais anonimizados conforme LGPD.' });
  } catch (err) {
    next(err);
  }
});

router.get('/unidades', async (req, res, next) => {
  try {
    const unidades = await all('SELECT * FROM unidades WHERE ativa = 1');
    res.status(200).json(unidades);
  } catch (err) {
    next(err);
  }
});

router.get('/unidades/:id/estoque', async (req, res, next) => {
  try {
    const unidadeId = Number(req.params.id);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;

    const unidade = await get('SELECT * FROM unidades WHERE id = ?', [unidadeId]);
    if (!unidade) {
      throw criarErro(404, 'Unidade nao encontrada.');
    }

    const itens = await all(
      `SELECT p.id as produtoId, p.nome, p.categoria, p.preco, e.quantidade as quantidadeDisponivel
       FROM estoques e
       JOIN produtos p ON p.id = e.produto_id
       WHERE e.unidade_id = ? AND p.ativo = 1
       LIMIT ? OFFSET ?`,
      [unidadeId, limit, offset]
    );

    res.status(200).json({ unidadeId, page, limit, itens });
  } catch (err) {
    next(err);
  }
});

router.post('/pedidos', autenticarJWT, async (req, res, next) => {
  try {
    const pedido = await criarPedido(req.body, req.usuario);
    res.status(201).json(pedido);
  } catch (err) {
    next(err);
  }
});

router.get('/pedidos', autenticarJWT, async (req, res, next) => {
  try {
    const { canalPedido, status, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let sql = 'SELECT * FROM pedidos WHERE 1=1';
    const params = [];

    if (req.usuario.perfil === 'CLIENTE') {
      sql += ' AND usuario_id = ?';
      params.push(req.usuario.id);
    }
    if (canalPedido) {
      sql += ' AND canal_pedido = ?';
      params.push(canalPedido);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const pedidos = await all(sql, params);
    res.status(200).json({ page: Number(page), limit: Number(limit), dados: pedidos });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/pedidos/:id/status',
  autenticarJWT,
  autorizarPerfis('COZINHA', 'ATENDENTE', 'ADMIN'),
  async (req, res, next) => {
    try {
      const resultado = await atualizarStatusPedido(req.params.id, req.body.status, req.usuario);
      res.status(200).json(resultado);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/pagamentos/mock', autenticarJWT, async (req, res, next) => {
  try {
    const resultado = await processarPagamentoMock(req.body, req.usuario);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
});

router.get('/auditoria/logs', autenticarJWT, autorizarPerfis('ADMIN'), async (req, res, next) => {
  try {
    const logs = await all('SELECT * FROM logs_auditoria ORDER BY id DESC LIMIT 50');
    res.status(200).json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
