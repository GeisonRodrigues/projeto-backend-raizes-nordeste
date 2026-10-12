const bcrypt = require('bcryptjs');
const { run, get, inicializarTabelas } = require('./database');

async function executarSeed() {
  await inicializarTabelas();

  const usuarioExistente = await get('SELECT id FROM usuarios WHERE email = ?', ['cliente@raizes.com']);
  if (usuarioExistente) {
    console.log('Seed ja foi aplicado anteriormente.');
    return;
  }

  const senhaHash = await bcrypt.hash('123456', 10);

  await run(
    'INSERT INTO usuarios (nome, email, senha_hash, perfil, consentimento_lgpd, pontos_fidelidade) VALUES (?, ?, ?, ?, ?, ?)',
    ['Maria Oliveira', 'cliente@raizes.com', senhaHash, 'CLIENTE', 1, 10]
  );
  await run(
    'INSERT INTO usuarios (nome, email, senha_hash, perfil, consentimento_lgpd, pontos_fidelidade) VALUES (?, ?, ?, ?, ?, ?)',
    ['Pedro Cozinheiro', 'cozinha@raizes.com', senhaHash, 'COZINHA', 1, 0]
  );
  await run(
    'INSERT INTO usuarios (nome, email, senha_hash, perfil, consentimento_lgpd, pontos_fidelidade) VALUES (?, ?, ?, ?, ?, ?)',
    ['Geison Admin', 'admin@raizes.com', senhaHash, 'ADMIN', 1, 0]
  );

  await run('INSERT INTO unidades (nome, cidade, ativa) VALUES (?, ?, ?)', ['Unidade Matriz - Centro', 'Recife', 1]);
  await run('INSERT INTO unidades (nome, cidade, ativa) VALUES (?, ?, ?)', ['Unidade Shopping Sul', 'Fortaleza', 1]);

  await run('INSERT INTO produtos (nome, categoria, preco, ativo) VALUES (?, ?, ?, ?)', ['Cuscuz Nordestino com Carne de Sol', 'Pratos Tipicos', 24.50, 1]);
  await run('INSERT INTO produtos (nome, categoria, preco, ativo) VALUES (?, ?, ?, ?)', ['Cafe Passado na Hora (Grande)', 'Bebidas', 8.00, 1]);
  await run('INSERT INTO produtos (nome, categoria, preco, ativo) VALUES (?, ?, ?, ?)', ['Tapioca de Queijo Coalho com Manteiga de Garrafa', 'Lanches', 16.00, 1]);

  await run('INSERT INTO estoques (unidade_id, produto_id, quantidade) VALUES (?, ?, ?)', [1, 1, 20]);
  await run('INSERT INTO estoques (unidade_id, produto_id, quantidade) VALUES (?, ?, ?)', [1, 2, 50]);
  await run('INSERT INTO estoques (unidade_id, produto_id, quantidade) VALUES (?, ?, ?)', [1, 3, 15]);
  await run('INSERT INTO estoques (unidade_id, produto_id, quantidade) VALUES (?, ?, ?)', [2, 1, 10]);

  console.log('Banco de dados e Seed inicial criados com sucesso!');
}

if (require.main === module) {
  executarSeed().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { executarSeed };
