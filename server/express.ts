import express from 'express';
import path from 'path';
import { promises as fs } from 'fs';
import { Config } from './types';
import api from './api';

const app = express();

app.use(express.static(path.join(__dirname, '..', 'ui')));
app.use(api);
app.use(async (req, res, next) => {
  if (!req.accepts('html')) return next();
  res.send(await fs.readFile(path.join(__dirname, '..', 'ui', 'index.html'), { encoding: 'utf-8' }));
});

export default (config: Config) => {
  app.listen(config.port || 1337, () => {
    // eslint-disable-next-line no-console
    console.log(`The server is running on port ${config.port || 1337}`);
  });
};
