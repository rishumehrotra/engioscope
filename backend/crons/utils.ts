import { CronJob } from 'cron';
import cronTime from 'cron-time-generator';
import debug from 'debug';
import { oneDayInMs, oneHourInMs } from '../../shared/utils.js';
import { appendCronLog, registerCron } from '../models/cron-status.js';

const cronLog = debug('cron');

export const setupJob = (
  name: string,
  when: (time: typeof cronTime) => string,
  onTick: () => Promise<unknown>
) => {
  const timePattern = when(cronTime);

  cronLog('Setting up cron for fetching', name, 'with pattern', timePattern);
  registerCron(name, timePattern);
  const j = new CronJob(timePattern, async () => {
    cronLog('Starting cron for', name);
    try {
      await onTick();
      cronLog('Done cron for', name);
      await appendCronLog(name, 'succeeded');
    } catch (error) {
      cronLog('Cron for ', name, 'FAILED', error);
      await appendCronLog(name, 'failed');
    }
  });
  j.start();
};

const timeSince = (date: Date) => Date.now() - date.getTime();

const scheduleLine = (_: TemplateStringsArray, limit: number, frequency: number) =>
  [limit, frequency] as const;

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

export const shouldUpdate = createSchedule({
  frequency: oneHourInMs,
  schedule: s => [
    s`For the first ${oneDayInMs}, check every ${oneHourInMs}.`,
    s`Then till ${3 * oneDayInMs}, check every ${3 * oneHourInMs}.`,
    s`Then till ${6 * oneDayInMs}, check every ${12 * oneHourInMs}.`,
    s`Then till ${18 * oneDayInMs}, check every ${oneDayInMs}.`,
    s`Then till ${33 * oneDayInMs}, check every ${2 * oneDayInMs}.`,
    s`Then till ${60 * oneDayInMs}, check every ${6 * oneDayInMs}.`,
    s`Then till ${90 * oneDayInMs}, check every ${10 * oneDayInMs}.`,
  ],
});
