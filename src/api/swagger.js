const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API Rede Raizes do Nordeste - UNINTER',
    version: '1.0.0',
    description: 'Documentacao OpenAPI/Swagger da Trilha Back-end (Pedidos Multicanal, Estoque por Unidade, Pagamento Mock e LGPD).'
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Autentica um usuario e retorna o token JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { email: 'cliente@raizes.com', senha: '123456' }
            }
          }
        },
        responses: {
          200: { description: 'Login realizado com sucesso' },
          401: { description: 'Credenciais invalidas' }
        }
      }
    },
    '/usuarios': {
      post: {
        tags: ['Usuarios e LGPD'],
        summary: 'Cadastra novo usuario com hash de senha e consentimento LGPD',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: {
                nome: 'Carlos Santos',
                email: 'carlos@email.com',
                senha: '123456',
                perfil: 'CLIENTE',
                consentimentoLgpd: true
              }
            }
          }
        },
        responses: {
          201: { description: 'Usuario criado' },
          409: { description: 'E-mail ja cadastrado' }
        }
      }
    },
    '/unidades/{id}/estoque': {
      get: {
        tags: ['Unidades e Estoque'],
        summary: 'Consulta cardapio e saldo de estoque de uma unidade',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', default: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
        ],
        responses: {
          200: { description: 'Lista paginada de produtos com estoque' },
          404: { description: 'Unidade nao encontrada' }
        }
      }
    },
    '/pedidos': {
      post: {
        tags: ['Pedidos'],
        security: [{ bearerAuth: [] }],
        summary: 'Cria pedido exigindo canalPedido e validando estoque local',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: {
                canalPedido: 'TOTEM',
                unidadeId: 1,
                itens: [{ produtoId: 1, quantidade: 2 }],
                formaPagamento: 'MOCK'
              }
            }
          }
        },
        responses: {
          201: { description: 'Pedido criado com sucesso' },
          400: { description: 'canalPedido invalido ou quantidade invalida' },
          401: { description: 'Nao autenticado' },
          409: { description: 'Estoque insuficiente na unidade' }
        }
      },
      get: {
        tags: ['Pedidos'],
        security: [{ bearerAuth: [] }],
        summary: 'Lista pedidos permitindo filtrar por canalPedido e status',
        parameters: [
          { name: 'canalPedido', in: 'query', schema: { type: 'string', enum: ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'] } },
          { name: 'status', in: 'query', schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Lista de pedidos' },
          401: { description: 'Nao autenticado' }
        }
      }
    },
    '/pagamentos/mock': {
      post: {
        tags: ['Pagamentos'],
        security: [{ bearerAuth: [] }],
        summary: 'Simula processamento de pagamento via servico externo (Mock)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { pedidoId: 1, metodo: 'MOCK_PIX', simularFalha: false }
            }
          }
        },
        responses: {
          200: { description: 'Pagamento aprovado e status atualizado para PAGO' },
          409: { description: 'Pedido ja pago ou cancelado' },
          422: { description: 'Pagamento recusado pelo Mock (pedido cancelado e estoque estornado)' }
        }
      }
    },
    '/pedidos/{id}/status': {
      patch: {
        tags: ['Pedidos'],
        security: [{ bearerAuth: [] }],
        summary: 'Atualiza o status operacional do pedido (Cozinha/Atendente/Admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', default: 1 } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              example: { status: 'EM_PREPARO' }
            }
          }
        },
        responses: {
          200: { description: 'Status atualizado' },
          403: { description: 'Perfil sem permissao (ex.: CLIENTE)' }
        }
      }
    },
    '/auditoria/logs': {
      get: {
        tags: ['Auditoria'],
        security: [{ bearerAuth: [] }],
        summary: 'Lista os registros de auditoria de acoes sensiveis (Apenas ADMIN)',
        responses: {
          200: { description: 'Lista de logs' },
          403: { description: 'Acesso restrito ao perfil ADMIN' }
        }
      }
    }
  }
};

module.exports = swaggerDocument;
