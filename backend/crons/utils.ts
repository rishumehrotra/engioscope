import { CronJob } from 'cron';
import cronTime from 'cron-time-generator';
import debug from 'debug';

const cronLog = debug('cron');

export const runJob = (name: string, when: (time: typeof cronTime) => string, onTick: () => Promise<unknown>) => {
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

const timeSince = (date: Date) => Date.now() - date.getTime();

const scheduleLine = (_: TemplateStringsArray, limit: number, frequency: number) => (
  [limit, frequency] as const
);

type CreateScheduleArgs = {
  frequency: number;
  schedule: (line: typeof scheduleLine) => ReturnType<typeof scheduleLine>[];
};

export const createSchedule = ({ frequency, schedule }: CreateScheduleArgs) => {
  const currentCallFrequency = (timeSinceLastUpdate: number) => {
    const sch = schedule(scheduleLine);
    const match = sch.find(([limit]) => timeSinceLastUpdate < limit);
    return match ? match[1] : sch[sch.length - 1][1];
  };

  return (lastUpdateDate: Date) => {
    const timeSinceLastUpdate = timeSince(lastUpdateDate);
    const callFrequency = currentCallFrequency(timeSinceLastUpdate);
    const remainder = timeSince(lastUpdateDate) % callFrequency;
    return remainder >= 0 && remainder < frequency;
  };
};
