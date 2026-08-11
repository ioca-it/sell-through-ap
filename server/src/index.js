import { createServer } from 'node:http';
import { createCustomerApi } from './app/createApp.js';
import { loadEnvironment } from './config/environment.js';

const config = loadEnvironment();
const app = createCustomerApi({ config });
const server = createServer(app);

server.listen(config.port, () => {
  console.log(`Customer API listening on port ${config.port}.`);
});
