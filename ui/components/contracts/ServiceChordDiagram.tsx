import React, { useCallback, useMemo } from 'react';
import { trpc } from '../../helpers/trpc.js';
import { useQueryContext } from '../../hooks/query-hooks.js';
import ChordDiagram from './ChordDiagram.jsx';
import { lineColor } from '../OverviewGraphs2/utils.jsx';
import type { Service } from './utils.jsx';
import { serviceAccessors } from './utils.jsx';

const ServiceChordDiagram = () => {
  const queryContext = useQueryContext();
  const serviceGraph = trpc.contracts.getServiceGraph.useQuery(queryContext);

  const accessors = useMemo(
    () => serviceAccessors(serviceGraph.data || []),
    [serviceGraph.data]
  );

  const hasConnections = useCallback(
    (service: Service) =>
      accessors.consumers(service).length > 0 || accessors.providers(service).length > 0,
    [accessors]
  );

  return (
    <ChordDiagram
      data={serviceGraph.data || []}
      hasConnections={hasConnections}
      getParents={accessors.providers}
      getChildren={accessors.consumers}
      lineColor={x => lineColor(x.serviceId)}
      getKey={x => x.serviceId}
      getTitle={x => x.name || 'Unknown'}
      ribbonTooltip={accessors.connectionTooltip}
      ribbonWeight={(from, to) => {
        return from.dependsOn.filter(d => d.serviceId === to.serviceId).length;
      }}
      chordTooltip={accessors.serviceTooltip}
    />
  );
};

export default ServiceChordDiagram;
