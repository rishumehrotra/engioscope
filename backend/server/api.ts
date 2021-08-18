import Router from 'express-promise-router';
import { join } from 'path';
import { promises as fs } from 'fs';
import { doesFileExist } from '../utils';

const router = Router();

router.post('/api/log', async (req, res) => {
  try {
    const { event, pathname, search } = req.body;
    await fs.appendFile(
      join(process.cwd(), 'analytics.csv'),
      `${[
        new Date().toISOString(),
        req.cookies.c,
        event,
        pathname,
        search,
        req.headers['user-agent']
      ].join(', ')}\n`,
      'utf8'
    );
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
