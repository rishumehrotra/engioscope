import { CronJob } from 'cron';
import cronTime from 'cron-time-generator';
import debug from 'debug';

const cronLog = debug('cron');

export const runJob = (name: string, when: (time: typeof cronTime) => string, onTick: () => Promise<void>) => {
  const timePattern = when(cronTime);

  cronLog('Setting up cron for ', name, 'with pattern', timePattern);
  const j = new CronJob(
    timePattern,
    async () => {
      cronLog('Starting cron for', name);
      try {
        await onTick();
        cronLog('Done cron for', name);
      } catch (error) {
        cronLog('Cron for ', name, 'FAILED', error);
      }
    }
  );
  j.start();
};
