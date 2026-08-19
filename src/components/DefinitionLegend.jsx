import React from 'react';
import { getMetricDefinitions } from '../presentation/metricDefinitions.js';

export const DefinitionLegend = ({ ids, expanded = false, title = 'Definiciones y fórmulas' }) => {
  const definitions = getMetricDefinitions(ids);

  return (
    <details
      open={expanded}
      className="border text-[10px]"
      style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}
      data-definition-legend="true"
    >
      <summary className="px-3 py-2 cursor-pointer font-bold" style={{ color: '#0a2540' }}>
        {title}
      </summary>
      <div className="border-t overflow-x-auto" style={{ borderColor: '#e5e0d5' }}>
        <table className="w-full min-w-[760px] text-[10px]">
          <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
            <tr>
              <th className="px-2 py-1.5 text-left">Nombre</th>
              <th className="px-2 py-1.5 text-left">Definición</th>
              <th className="px-2 py-1.5 text-left">Unidad</th>
              <th className="px-2 py-1.5 text-left">Fórmula</th>
              <th className="px-2 py-1.5 text-left">Fuente</th>
              <th className="px-2 py-1.5 text-left">Interpretación</th>
            </tr>
          </thead>
          <tbody>
            {definitions.map((definition) => (
              <tr key={definition.id} className="border-t align-top" style={{ borderColor: '#e5e0d5' }}>
                <td className="px-2 py-1.5 font-bold whitespace-nowrap">{definition.name}</td>
                <td className="px-2 py-1.5">{definition.definition}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{definition.unit}</td>
                <td className="px-2 py-1.5 font-mono">{definition.formula}</td>
                <td className="px-2 py-1.5">{definition.source}</td>
                <td className="px-2 py-1.5">{definition.interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
};
