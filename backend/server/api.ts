import Router from 'express-promise-router';
import { join } from 'path';
import { promises as fs } from 'fs';
import { doesFileExist } from '../utils';

const router = Router();

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
