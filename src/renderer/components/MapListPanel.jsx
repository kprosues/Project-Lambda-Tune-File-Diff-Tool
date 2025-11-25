import React, { useMemo } from 'react';
import { getDifferenceColorClass, formatMapId } from '../utils/formatters';

function MapListPanel({ comparison, selectedMapId, onMapSelect, showDifferencesOnly }) {
  const sortedMaps = useMemo(() => {
    if (!comparison || !comparison.maps) return [];

    const maps = Object.entries(comparison.maps).map(([id, diff]) => ({
      id,
      ...diff
    }));

    // Sort by type (modified first, then added, removed, unchanged last)
    const typeOrder = { modified: 0, added: 1, removed: 2, unchanged: 3 };
    
    return maps.sort((a, b) => {
      const orderA = typeOrder[a.type] || 99;
      const orderB = typeOrder[b.type] || 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.id.localeCompare(b.id);
    });
  }, [comparison]);

  if (!comparison) {
    return (
      <div className="map-list-panel">
        <div className="panel-header">
          <h2>Maps</h2>
        </div>
        <div className="panel-content">
          <p className="no-data">No comparison data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-list-panel">
      <div className="panel-header">
        <h2>Maps</h2>
        <div className="map-count">
          {sortedMaps.length} {sortedMaps.length === 1 ? 'map' : 'maps'}
        </div>
      </div>
      <div className="panel-content">
        <div className="map-list">
          {sortedMaps.length === 0 ? (
            <div className="no-maps">
              <p>No {showDifferencesOnly ? 'differences' : 'maps'} found</p>
            </div>
          ) : (
            sortedMaps.map((map) => {
              const diffClass = getDifferenceColorClass(map.type);
              const isSelected = selectedMapId === map.id;

              // Count differences if modified
              const diffCount = map.type === 'modified' && map.dataDiffs
                ? map.dataDiffs.length
                : 0;

              return (
                <div
                  key={map.id}
                  className={`map-item ${diffClass} ${isSelected ? 'selected' : ''}`}
                  onClick={() => onMapSelect(map.id)}
                  title={map.id}
                >
                  <div className="map-item-header">
                    <span className="map-name">{formatMapId(map.id)}</span>
                    {map.type !== 'unchanged' && (
                      <span className={`map-badge ${diffClass}`}>
                        {map.type}
                      </span>
                    )}
                  </div>
                  {map.type === 'modified' && diffCount > 0 && (
                    <div className="map-item-details">
                      <span className="diff-count">{diffCount} differences</span>
                    </div>
                  )}
                  {map.unitsChanged && (
                    <div className="map-item-details">
                      <span className="units-change">
                        Units: {map.units.old} → {map.units.new}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default MapListPanel;

