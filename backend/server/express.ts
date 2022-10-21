import path from 'node:path';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import mongoose from 'mongoose';
import type { ParsedConfig } from '../scraper/parse-config.js';
import api from './api.js';
import { setConfig } from '../config.js';
import setupCrons from '../crons/index.js';
import { dirname } from '../utils.js';

const uiFolder = path.join(dirname(import.meta.url), '..', '..', 'ui');

const configureExpress = (config: ParsedConfig) => {
  const app = express();

  app.use(express.json());
  app.use(express.text({ type: 'text/html' }));

  app.use(cookieParser());
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.cookies.c === undefined) {
      // Set a new cookie
      let randomNumber = Math.random().toString();
      randomNumber = randomNumber.slice(2);
      res.cookie('c', randomNumber, { maxAge: 31_622_400, httpOnly: true });
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

  app.use(api(config));
  app.use((req, res, next) => {
    if (!req.accepts('html')) return next();
    sendIndexHtml(req, res);
  });

  return app;
};

export default (config: ParsedConfig) => {
  // TODO: This belongs at a higher layer, maybe
  setConfig(config);

  // Disabling floating promise since mongoose takes care of this internally
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  mongoose.connect(config.mongoUrl);

  setupCrons();

  const app = configureExpress(config);
  const port = config.port || 1337;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`The server is running on port ${port}`);
  });
};
