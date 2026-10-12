const CANAIS_PERMITIDOS = ['APP', 'TOTEM', 'BALCAO', 'PICKUP', 'WEB'];
const PERFIS_PERMITIDOS = ['CLIENTE', 'ATENDENTE', 'COZINHA', 'ADMIN'];
const STATUS_PEDIDO = [
  'AGUARDANDO_PAGAMENTO',
  'PAGO',
  'EM_PREPARO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO'
];

function validarCanalPedido(canal) {
  return CANAIS_PERMITIDOS.includes(canal);
}

function validarStatusPedido(status) {
  return STATUS_PEDIDO.includes(status);
}

function calcularPontosFidelidade(valorTotal, consentimentoLgpd) {
  if (!consentimentoLgpd) return 0;
  return Math.floor(Number(valorTotal) / 10);
}

module.exports = {
  CANAIS_PERMITIDOS,
  PERFIS_PERMITIDOS,
  STATUS_PEDIDO,
  validarCanalPedido,
  validarStatusPedido,
  calcularPontosFidelidade
};
