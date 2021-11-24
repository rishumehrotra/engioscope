import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AnalyticsItem } from '../../shared/types';
import Header from '../components/Header';
import Loading from '../components/Loading';
import { fetchAnalytics } from '../network';

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsItem[] | undefined>();

  useEffect(() => { fetchAnalytics().then(setAnalytics); }, []);

  return (
    <div>
      <div>
        <Header title="Analytics" lastUpdated={new Date()} />
        <div className="mx-32 bg-gray-50 p-8 rounded-lg" style={{ marginTop: '-3.25rem' }}>
          {!analytics
            ? <Loading />
            : (
              <ul className="grid grid-flow-row gap-8 grid-col-1 grid-cols-2 auto-rows-fr">
                {analytics.map(({
                  label, pageLoads, uniques, pages
                }) => (
                  <li key={label} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                    <h2 className="text-2xl mb-2 bg-gray-900 text-white py-4 px-6 shadow-sm">{label}</h2>
                    <div className="flex flex-row gap-4 p-4">
                      <div className="text-2xl bg-gray-200 rounded-md p-2 px-3">
                        {pageLoads}
                        <div className="text-sm text-gray-600">Page loads</div>
                      </div>
                      <div className="text-2xl bg-gray-200 rounded-md p-2 px-3">
                        {uniques}
                        <div className="text-sm text-gray-600">Unique visitors</div>
                      </div>
                    </div>
                    <h4 className="mt-4 uppercase text-xs text-gray-600 px-4">Most visited pages</h4>
                    <table className="m-4 break-all">
                      <tbody>
                        {pages.map(({ pathname, count }, index) => (
                          <tr key={pathname} className={index % 2 === 0 ? '' : 'bg-gray-200'}>
                            <td className="p-1 px-3" width="90%">
                              <Link
                                to={pathname}
                                className="text-blue-500 hover:text-blue-700 inline-block text-sm"
                              >
                                {pathname}
                              </Link>
                            </td>
                            <td className="p-1 px-3 text-right align-top text-sm text-gray-700" width="10%">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
