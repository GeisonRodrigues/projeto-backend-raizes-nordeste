# Projeto Multidisciplinar Back-end — Rede Raizes do Nordeste (UNINTER)

API RESTful desenvolvida por Geison Rodrigues para a Trilha Back-end do Projeto Multidisciplinar, implementando controle de pedidos multicanal (canalPedido), gestao de estoque por unidade, integracao simulada de pagamentos (mock), programa de fidelidade e controles de seguranca e privacidade exigidos pela LGPD.

## Links e Evidencias Obrigatorias
- Repositorio Git Publico: https://github.com/GeisonRodrigues/projeto-backend-raizes-nordeste
- URL do Swagger Local: http://localhost:3000/api-docs (Rota: /api-docs)
- Colecao Postman/Insomnia: Arquivo raizes_do_nordeste_postman_collection.json na raiz deste repositorio.

## Requisitos de Ambiente
- Linguagem / Runtime: Node.js (v18+ ou v20+)
- Gerenciador de Pacotes: NPM
- Banco de Dados: SQLite (persistencia em arquivo local raizes.sqlite)
- Dependencias Principais: express, sqlite3, jsonwebtoken, bcryptjs, swagger-ui-express, dotenv

## Estrutura em Camadas do Projeto
- src/domain/: Regras de negocio puras, constantes enumeradas (canalPedido, status, perfis) e calculo de fidelidade.
- src/application/: Casos de uso e servicos orquestradores (autenticacao, reserva de estoque, criacao de pedido, pagamento mock e auditoria).
- src/infrastructure/: Conexao com o banco SQLite, criacao automatica de tabelas (migrations) e carga de dados iniciais (seed).
- src/api/: Rotas REST, middlewares de autenticacao JWT, autorizacao por perfil (RBAC), padronizacao de erros e documentacao Swagger.

## Passo a Passo de Execucao

1. Clonar o repositorio e instalar dependencias:
   git clone https://github.com/GeisonRodrigues/projeto-backend-raizes-nordeste.git
   cd projeto-backend-raizes-nordeste
   npm install

2. Configurar variaveis de ambiente:
   Copie o arquivo .env.example para um novo arquivo chamado .env na raiz do projeto:
   cp .env.example .env

3. Criar banco de dados, tabelas e aplicar o Seed inicial:
   npm run seed
   Usuarios criados no Seed para testes:
   - Cliente: cliente@raizes.com | Senha: 123456
   - Cozinha: cozinha@raizes.com | Senha: 123456
   - Admin/Gerente: admin@raizes.com | Senha: 123456

4. Iniciar a API:
   npm start

5. Acessar a Documentacao Interativa (Swagger/OpenAPI):
   Com o servidor rodando, acesse no navegador: http://localhost:3000/api-docs

## Como Executar os Testes (Postman / Insomnia / Swagger)
1. Importe o arquivo raizes_do_nordeste_postman_collection.json no Postman ou Insomnia.
2. Execute a requisicao T01 - Auth/Login valido (Cliente) e copie o accessToken retornado para a variavel tokenCliente da colecao (ou para o botao Authorize do Swagger).
3. Siga os cenarios numerados (T01 a T11) cobrindo os fluxos positivos e negativos de estoque, canalPedido, pagamento mock e auditoria.
