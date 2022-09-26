import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnalyticsItem } from '../../shared/types.js';
import Loading from '../components/Loading.js';
import { num } from '../helpers/utils.js';
import { useSetHeaderDetails } from '../hooks/header-hooks.js';
import { fetchAnalytics } from '../network.js';

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsItem[] | undefined>();
  const setHeaderDetails = useSetHeaderDetails();

  useEffect(() => {
    // TODO: Error handling
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    fetchAnalytics().then(setAnalytics);
  }, []);
  useEffect(() => {
    analytics && setHeaderDetails({
      globalSettings: {
        lastUpdated: new Date().toISOString(),
        hasSummary: false,
        queryPeriodDays: 0 // unused
      },
      title: 'Analytics'
    });
  }, [analytics, setHeaderDetails]);

  return (
    <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
      {!analytics
        ? <Loading />
        : (
          <ul className="grid grid-flow-row gap-8 grid-col-1 grid-cols-2 auto-rows-auto">
            {analytics.map(({
              label, pageLoads, uniques, pages
            }) => (
              <li key={label} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <h2 className="text-2xl mb-2 bg-gray-900 text-white py-4 px-6 shadow-sm">{label}</h2>
                <div className="flex flex-row gap-4 p-4">
                  <div className="text-2xl bg-gray-200 rounded-md p-2 px-3">
                    {num(pageLoads)}
                    <div className="text-sm text-gray-600">Page views</div>
                  </div>
                  <div className="text-2xl bg-gray-200 rounded-md p-2 px-3">
                    {num(uniques)}
                    <div className="text-sm text-gray-600">Unique visitors</div>
                  </div>
                </div>
                <h4 className="mt-4 uppercase text-xs text-gray-600 px-4">Most visited pages</h4>
                <table className="m-4 break-all" style={{ width: 'calc(100% - 2rem)' }}>
                  <tbody>
                    {pages.map(({ pathname, count }, index) => (
                      <tr key={pathname} className={index % 2 === 0 ? '' : 'bg-gray-200'}>
                        <td className="p-1 px-3" width="90%">
                          <Link
                            to={pathname}
                            className="text-blue-600 hover:text-blue-800 inline-block text-sm truncate w-96"
                            title={pathname}
                          >
                            {pathname}
                          </Link>
                        </td>
                        <td className="p-1 px-3 text-right align-top text-sm text-gray-700" width="10%">
                          {num(count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
};

export default Analytics;
