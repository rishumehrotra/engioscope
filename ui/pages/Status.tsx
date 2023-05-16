import React, { useEffect } from 'react';
import { trpc } from '../helpers/trpc.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';

const Status: React.FC = () => {
  const setHeaderDetails = useSetHeaderDetails();
  const cronStatus = trpc.cronStatusOverview.useQuery();

  useEffect(() => {
    setHeaderDetails({ title: 'Cron status' });
  }, [setHeaderDetails]);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      <table className="table-auto text-center divide-y divide-gray-200 w-full">
        <thead>
          <tr>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider w-3/5 text-left">
              {' '}
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-left">
              Frequency
            </th>
            <th className="px-6 py-3 text-xs font-medium text-gray-800 uppercase tracking-wider text-right">
              status
            </th>
          </tr>
        </thead>
        <tbody className="text-base text-gray-600 bg-white divide-y divide-gray-200">
          {cronStatus.data?.map(line => (
            <tr key={line.name}>
              <td className="pl-6 py-4 whitespace-nowrap text-left">{line.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-left">{line.frequency}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                {line.status ? (
                  <>
                    <time dateTime={line.date?.toISOString()}>
                      {new Intl.DateTimeFormat('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      }).format(line.date!)}
                    </time>
                    <span
                      className={`w-2 h-2 ml-2 inline-block rounded-full ${
                        line.status === 'succeeded' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                  </>
                ) : (
                  <span className="text-gray-700">
                    Unknown
                    <span className="w-2 h-2 ml-2 inline-block rounded-full bg-gray-300" />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Status;
