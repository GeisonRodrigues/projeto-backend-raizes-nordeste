require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./api/swagger');
const routes = require('./api/routes');
const { tratadorGlobalErros } = require('./api/middlewares');
const { executarSeed } = require('./infrastructure/seed');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/', routes);
app.use(tratadorGlobalErros);

const PORT = process.env.PORT || 3000;

executarSeed()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Documentacao Swagger disponivel em http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => {
    console.error('Erro ao inicializar banco de dados:', err);
  });
