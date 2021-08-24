import path from 'path';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import type { ParsedConfig } from '../scraper/parse-config';
import api from './api';

const uiFolder = path.join(__dirname, '..', '..', 'ui');
const app = express();

app.use(express.json());

app.use(cookieParser());
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.cookies.c === undefined) {
    // Set a new cookie
    let randomNumber = Math.random().toString();
    randomNumber = randomNumber.substring(2, randomNumber.length);
    res.cookie('c', randomNumber, { maxAge: 31622400, httpOnly: true });
  } else {
    // Cookie was already present
  }
  next();
});

const sendIndexHtml = (req: express.Request, res: express.Response) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  res.sendFile(path.join(uiFolder, 'index.html'));
};

app.use(morgan('combined'));
app.use(compression());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 })); // 100 reqs/min

app.get('/', sendIndexHtml);
app.use(express.static(uiFolder));

export default (config: ParsedConfig) => {
  app.use(api(config));
  app.use((req, res, next) => {
    if (!req.accepts('html')) return next();
    sendIndexHtml(req, res);
  });
  app.listen(config.port || 1337, () => {
    // eslint-disable-next-line no-console
    console.log(`The server is running on port ${config.port || 1337}`);
  });
};
