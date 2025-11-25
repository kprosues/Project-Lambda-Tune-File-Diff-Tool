import React, { useState, useCallback } from 'react';
import MapListPanel from './MapListPanel';
import MapView from './MapView';
import { filterDifferences } from '../utils/comparator';

function ComparisonView({ file1, file2, comparison, onFileLoad, onCompare, onClear }) {
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
  const [showPercentChange, setShowPercentChange] = useState(false); // 'absolute' or 'percent'

  const handleMapSelect = useCallback((mapId) => {
    setSelectedMapId(mapId);
  }, []);

  // Get filtered comparison if needed
  let displayComparison = comparison;
  if (showDifferencesOnly && comparison) {
    try {
      displayComparison = filterDifferences(comparison);
    } catch (err) {
      console.error('Error filtering differences:', err);
      // Fall back to unfiltered comparison
    }
  }

  // Get selected map info
  const selectedMap = selectedMapId && comparison
    ? comparison.maps[selectedMapId]
    : null;

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <div className="header-left">
          <h1>ECU Tune Comparison</h1>
          <div className="file-names">
            <span className="file-label">File 1: <strong>{file1.name}</strong></span>
            <span className="vs-text">vs</span>
            <span className="file-label">File 2: <strong>{file2.name}</strong></span>
          </div>
        </div>
        <div className="header-right">
          <div className="header-controls">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showDifferencesOnly}
                onChange={(e) => setShowDifferencesOnly(e.target.checked)}
              />
              Show differences only
            </label>
            {comparison && (
              <div className="change-mode-toggle">
                <button
                  className={`toggle-btn ${!showPercentChange ? 'active' : ''}`}
                  onClick={() => setShowPercentChange(false)}
                  title="Show absolute value changes"
                >
                  Abs
                </button>
                <button
                  className={`toggle-btn ${showPercentChange ? 'active' : ''}`}
                  onClick={() => setShowPercentChange(true)}
                  title="Show percent changes"
                >
                  %
                </button>
              </div>
            )}
            <button className="btn-secondary" onClick={onClear}>
              Load New Files
            </button>
          </div>
          {comparison && (
            <div className="comparison-stats">
              <span className="stat">
                <span className="stat-label">Modified:</span>
                <span className="stat-value">{comparison.statistics.modifiedMaps}</span>
              </span>
              <span className="stat">
                <span className="stat-label">Added:</span>
                <span className="stat-value">{comparison.statistics.addedMaps}</span>
              </span>
              <span className="stat">
                <span className="stat-label">Removed:</span>
                <span className="stat-value">{comparison.statistics.removedMaps}</span>
              </span>
              <span className="stat">
                <span className="stat-label">Unchanged:</span>
                <span className="stat-value">{comparison.statistics.unchangedMaps}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="comparison-body">
        <MapListPanel
          comparison={displayComparison}
          selectedMapId={selectedMapId}
          onMapSelect={handleMapSelect}
          showDifferencesOnly={showDifferencesOnly}
        />

        <div className="map-view-container">
          {selectedMap ? (
            <MapView
              mapId={selectedMapId}
              mapDiff={selectedMap}
              file1={file1}
              file2={file2}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showPercentChange={showPercentChange}
            />
          ) : (
            <div className="no-map-selected">
              <div className="no-map-content">
                <h2>Select a map to view details</h2>
                <p>Choose a map from the list on the left to see its comparison</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparisonView;

