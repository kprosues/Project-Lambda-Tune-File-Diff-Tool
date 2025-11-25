import React, { useState } from 'react';
import MapTable from './MapTable';
import MapChart from './MapChart';
import { findIndexArrays } from '../utils/parser';

function MapView({ mapId, mapDiff, file1, file2, viewMode, onViewModeChange, showPercentChange = false }) {
  const map1 = mapDiff.map1 || (file1 && file1.maps.find(m => m.id === mapId));
  const map2 = mapDiff.map2 || (file2 && file2.maps.find(m => m.id === mapId));

  // Get map dimensions for validation
  const map1Rows = map1?.data?.length || null;
  const map1Cols = map1?.data?.[0]?.length || null;

  // Find index arrays for row/column headers (prefer file1, fallback to file2)
  const tuneFileForIndices = file1 || file2;
  const { rowIndex, colIndex } = mapId && tuneFileForIndices
    ? findIndexArrays(tuneFileForIndices, mapId, map1Rows, map1Cols)
    : { rowIndex: null, colIndex: null };

  // Safely extract index data from the same file used to find indices
  const rowIndexMap = rowIndex && tuneFileForIndices
    ? tuneFileForIndices.maps.find(m => m.id === rowIndex)
    : null;
  
  // Index arrays are stored as 2D arrays with one row: [[val1, val2, ...]]
  // Extract the first row which contains all the index values
  const rowIndexData = rowIndexMap?.data && rowIndexMap.data.length > 0
    ? (Array.isArray(rowIndexMap.data[0]) ? rowIndexMap.data[0] : rowIndexMap.data)
    : null;

  const colIndexMap = colIndex && tuneFileForIndices
    ? tuneFileForIndices.maps.find(m => m.id === colIndex)
    : null;
  
  const colIndexData = colIndexMap?.data && colIndexMap.data.length > 0
    ? (Array.isArray(colIndexMap.data[0]) ? colIndexMap.data[0] : colIndexMap.data)
    : null;

  if (!map1 && !map2) {
    return (
      <div className="map-view">
        <div className="no-map-data">
          <p>No map data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div className="map-view-header">
        <div className="map-info">
          <h2>{mapId}</h2>
          {map1 && map2 && map1.units && (
            <span className="map-units">{map1.units}</span>
          )}
        </div>
        <div className="view-mode-toggle">
          <button
            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => onViewModeChange('table')}
          >
            Table
          </button>
          <button
            className={`toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => onViewModeChange('chart')}
          >
            Chart
          </button>
        </div>
      </div>

      <div className="map-view-content">
        {viewMode === 'table' ? (
          <MapTable
            map1={map1}
            map2={map2}
            mapDiff={mapDiff}
            rowIndexData={rowIndexData}
            colIndexData={colIndexData}
            showPercentChange={showPercentChange}
          />
        ) : (
          <MapChart
            map1={map1}
            map2={map2}
            mapDiff={mapDiff}
            rowIndexData={rowIndexData}
            colIndexData={colIndexData}
          />
        )}
      </div>
    </div>
  );
}

export default MapView;

