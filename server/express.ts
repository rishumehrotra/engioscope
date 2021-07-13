import express from 'express';
import path from 'path';
import { Config } from './types';
import api from './api';

const uiFolder = path.join(__dirname, '..', 'ui');
const app = express();

const sendIndexHtml = (_: express.Request, res: express.Response) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  res.sendFile(path.join(uiFolder, 'index.html'));
};

app.get('/', sendIndexHtml);
app.use(express.static(uiFolder));
app.use(api);
app.use((req, res, next) => {
  if (!req.accepts('html')) return next();
  sendIndexHtml(req, res);
});

export default (config: Config) => {
  app.listen(config.port || 1337, () => {
    // eslint-disable-next-line no-console
    console.log(`The server is running on port ${config.port || 1337}`);
  });
};
