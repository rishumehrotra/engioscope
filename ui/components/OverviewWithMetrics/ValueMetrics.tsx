import React, { useCallback, useEffect, useRef, useState } from 'react';
import useSse from '../../hooks/use-merge-over-sse.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import type { ProjectOverviewStats } from '../../../backend/models/project-overview.js';
import { trpc } from '../../helpers/trpc.js';
import Filters from '../OverviewGraphs2/Filters.jsx';
import { useCreateUrlForOverview } from '../../helpers/sseUrlConfigs.js';
import QualityMetrics from './QualityMetrics.jsx';
import FlowMetrics from './FlowMetrics.jsx';

const ValueMetrics = () => {
  const sseUrl = useCreateUrlForOverview('overview-v2');
  const projectOverviewStats = useSse<ProjectOverviewStats>(sseUrl, '0');
  const queryContext = useQueryContext();
  const pageConfig = trpc.workItems.getPageConfig.useQuery({
    queryContext,
  });

  const filtersRef = useRef<HTMLDivElement>(null);
  const [filterRenderCount, setFilterRenderCount] = useState(0);
  const [, setLayoutType] = useState<'2-col' | 'full-width'>('2-col');

  const relayout = useCallback(() => {
    setLayoutType((filtersRef.current?.offsetHeight || 0) > 100 ? 'full-width' : '2-col');
  }, [setLayoutType]);

  useEffect(() => {
    relayout();

    window.addEventListener('resize', relayout, false);
    return () => window.removeEventListener('resize', relayout, false);
  }, [filterRenderCount, relayout]);

  return (
    <div>
      <div className="text-gray-950 text-2xl font-medium mb-3">Value Metrics</div>
      <Filters ref={filtersRef} setRenderCount={setFilterRenderCount} />
      <FlowMetrics stats={projectOverviewStats} pageConfig={pageConfig?.data} />
      <QualityMetrics stats={projectOverviewStats} pageConfig={pageConfig?.data} />
    </div>
  );
};

export default ValueMetrics;
