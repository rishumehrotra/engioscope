import Router from 'express-promise-router';
import { join } from 'path';
import { promises as fs, createWriteStream } from 'fs';
import uaParser from 'ua-parser-js';
import { doesFileExist } from '../utils';

const router = Router();

const analyticsStream = createWriteStream(join(process.cwd(), 'analytics.csv'), {
  flags: 'a',
  encoding: 'utf8'
});

router.post('/api/log', async (req, res) => {
  try {
    const { event, pathname, search } = req.body;
    const ua = uaParser(req.headers['user-agent']);

    analyticsStream.write(`${[
      new Date().toISOString(),
      req.cookies.c,
      event,
      pathname + search,
      ua.browser.name,
      ua.browser.version,
      ua.os.name,
      ua.os.version
    ].join(', ')}\n`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Error writing analytics ping', e);
  }

  res.status(200).send('all your base are belong to us');
});

router.get('/api/*', async (req, res) => {
  const fileName = decodeURIComponent(req.path.replace('/api/', ''));
  const filePath = join(process.cwd(), 'data', fileName);

  if (!await doesFileExist(filePath)) {
    res.status(404);
    res.send('404 - Not found');
    return;
  }

  res.status(200);
  res.setHeader('Content-type', 'application/json');
  res.send(await fs.readFile(filePath, { encoding: 'utf-8' }));
});

export default router;
