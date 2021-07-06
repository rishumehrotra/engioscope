import Router from 'express-promise-router';
import { join } from 'path';
import { promises as fs } from 'fs';
import { doesFileExist } from './utils';

const router = Router();

router.get('/api/*', async (req, res) => {
  const { path } = req;
  const fileName = path.replace('/api/', '');
  const filePath = process.cwd();
  if (!await doesFileExist(join(filePath, 'data', fileName))) {
    res.status(404);
    res.send('404 - Not found');
    return;
  }

  res.status(200);
  res.setHeader('Content-type', 'application/json');
  res.send(await fs.readFile(join(filePath, 'data', fileName), { encoding: 'utf-8' }));
});

export default router;
