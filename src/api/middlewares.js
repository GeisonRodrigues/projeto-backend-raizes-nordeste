const jwt = require('jsonwebtoken');

function autenticarJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      erro: true,
      status: 401,
      mensagem: 'Token de autenticacao ausente ou mal formatado.',
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'chave_secreta_geison_uninter_2026';

  try {
    const payload = jwt.verify(token, secret);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({
      erro: true,
      status: 401,
      mensagem: 'Token JWT invalido ou expirado.',
      timestamp: new Date().toISOString()
    });
  }
}

function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        erro: true,
        status: 403,
        mensagem: 'Acesso negado: seu perfil nao possui permissao para esta operacao.',
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
}

function tratadorGlobalErros(err, req, res, next) {
  const status = err.status || 500;
  const mensagem = err.message || 'Erro interno no servidor.';
  return res.status(status).json({
    erro: true,
    status,
    mensagem,
    timestamp: new Date().toISOString()
  });
}

module.exports = { autenticarJWT, autorizarPerfis, tratadorGlobalErros };
