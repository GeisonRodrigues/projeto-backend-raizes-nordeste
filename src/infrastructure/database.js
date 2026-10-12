const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_FILE || './raizes.sqlite');

let usarNativo = false;
let db = null;

try {
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(dbPath);
} catch (err) {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
  usarNativo = true;
}

function run(sql, params = []) {
  if (usarNativo) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        const result = stmt.run(...params);
        resolve({ id: Number(result.lastInsertRowid), changes: Number(result.changes) });
      } catch (e) {
        reject(e);
      }
    });
  }
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  if (usarNativo) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        resolve(stmt.get(...params));
      } catch (e) {
        reject(e);
      }
    });
  }
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  if (usarNativo) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        resolve(stmt.all(...params));
      } catch (e) {
        reject(e);
      }
    });
  }
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function inicializarTabelas() {
  await run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL,
      consentimento_lgpd INTEGER DEFAULT 0,
      pontos_fidelidade INTEGER DEFAULT 0,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS unidades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cidade TEXT NOT NULL,
      ativa INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL,
      preco REAL NOT NULL,
      ativo INTEGER DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS estoques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unidade_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      FOREIGN KEY (unidade_id) REFERENCES unidades(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      unidade_id INTEGER NOT NULL,
      canal_pedido TEXT NOT NULL,
      status TEXT NOT NULL,
      valor_total REAL NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (unidade_id) REFERENCES unidades(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      produto_id INTEGER NOT NULL,
      quantidade INTEGER NOT NULL,
      preco_unitario REAL NOT NULL,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
      FOREIGN KEY (produto_id) REFERENCES produtos(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      metodo TEXT NOT NULL,
      status TEXT NOT NULL,
      transacao_id_mock TEXT NOT NULL,
      processado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      acao TEXT NOT NULL,
      detalhes TEXT NOT NULL,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = { db, run, get, all, inicializarTabelas };
