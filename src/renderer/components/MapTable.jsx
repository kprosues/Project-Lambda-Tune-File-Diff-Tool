import React, { useMemo, useState, useEffect, useRef } from 'react';
import { formatNumber, formatDelta, formatPercentageChange, getDifferenceColorClass, detectDataPrecision, calculateDataRange, valueToHeatmapColor } from '../utils/formatters';

function MapTable({ map1, map2, mapDiff, rowIndexData, colIndexData, showPercentChange = false }) {
  const containerRef = useRef(null);
  const [cellSize, setCellSize] = useState({ width: 80, height: 40 });
  // Determine which map to use for dimensions (prefer map1, fallback to map2)
  const primaryMap = map1 || map2;
  const data1 = map1?.data || [];
  const data2 = map2?.data || [];
  
  // Get units from the map (prefer map2 if comparing, otherwise map1, or from mapDiff)
  const unitsString = useMemo(() => {
    let units = null;
    
    // Try to get units from mapDiff first (when comparing)
    if (mapDiff) {
      // Check mapDiff.map2 and mapDiff.map1
      if (mapDiff.map2 && mapDiff.map2.units !== undefined && mapDiff.map2.units !== null && mapDiff.map2.units !== '') {
        units = mapDiff.map2.units;
      } else if (mapDiff.map1 && mapDiff.map1.units !== undefined && mapDiff.map1.units !== null && mapDiff.map1.units !== '') {
        units = mapDiff.map1.units;
      }
      // Also check mapDiff.units (object with old/new)
      if ((!units || units === '') && mapDiff.units && typeof mapDiff.units === 'object') {
        units = mapDiff.units.new || mapDiff.units.old || null;
      }
    }
    
    // Fallback to direct map objects
    if (!units || units === '') {
      units = (map2?.units && map2.units !== '') ? map2.units : 
              (map1?.units && map1.units !== '') ? map1.units : null;
    }
    
    // Extract units string
    if (!units || units === '') return '';
    
    if (typeof units === 'string') {
      const trimmed = units.trim();
      return trimmed.length > 0 ? trimmed : '';
    }
    
    if (typeof units === 'object' && units !== null) {
      const unitValue = units.new ?? units.old ?? null;
      if (unitValue !== null && unitValue !== undefined && unitValue !== '') {
        const trimmed = String(unitValue).trim();
        return trimmed.length > 0 ? trimmed : '';
      }
    }
    
    return '';
  }, [map1, map2, mapDiff]);

  // Detect the maximum decimal precision in the data
  const dataPrecision = useMemo(() => {
    const precision1 = detectDataPrecision(data1);
    const precision2 = detectDataPrecision(data2);
    return Math.max(precision1, precision2);
  }, [data1, data2]);

  // Create sorted column and row indices based on index values
  const sortedIndices = useMemo(() => {
    // Create column sort order (sorted by index value)
    let colSortOrder = null;
    if (colIndexData && Array.isArray(colIndexData)) {
      const indicesWithPos = colIndexData.map((val, idx) => ({ val, idx }));
      indicesWithPos.sort((a, b) => (a.val || 0) - (b.val || 0));
      colSortOrder = indicesWithPos.map(item => item.idx);
    }

    // Create row sort order (sorted by index value)
    let rowSortOrder = null;
    if (rowIndexData && Array.isArray(rowIndexData)) {
      const indicesWithPos = rowIndexData.map((val, idx) => ({ val, idx }));
      indicesWithPos.sort((a, b) => (a.val || 0) - (b.val || 0));
      rowSortOrder = indicesWithPos.map(item => item.idx);
    }

    return { colSortOrder, rowSortOrder };
  }, [colIndexData, rowIndexData]);

  // Create diff lookup for quick access (using original indices)
  const diffLookup = useMemo(() => {
    if (!mapDiff || !mapDiff.dataDiffs) return new Map();

    const lookup = new Map();
    mapDiff.dataDiffs.forEach(diff => {
      const key = `${diff.row},${diff.col}`;
      lookup.set(key, diff);
    });
    return lookup;
  }, [mapDiff]);

  if (!primaryMap || !primaryMap.data || primaryMap.data.length === 0) {
    return (
      <div className="map-table-empty">
        <p>No data available for this map</p>
      </div>
    );
  }

  const maxRows = Math.max(data1.length, data2.length);
  const maxCols = Math.max(
    data1[0]?.length || 0,
    data2[0]?.length || 0
  );

  // Determine which map to display (prefer file2/new values when comparing)
  const displayData = map2 && map2.data ? data2 : data1;
  const isComparing = map1 && map2;

  // Calculate heatmap color range from all displayed values
  const heatmapRange = useMemo(() => {
    return calculateDataRange(displayData);
  }, [displayData]);

  // Get column and row order (sorted if index data exists)
  const colOrder = sortedIndices.colSortOrder || Array.from({ length: maxCols }, (_, i) => i);
  const rowOrder = sortedIndices.rowSortOrder || Array.from({ length: maxRows }, (_, i) => i);

  // Calculate optimal cell size to fit table in viewport
  useEffect(() => {
    const calculateCellSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      // Get parent container (map-view-content) to account for its padding
      const mapViewContent = container.closest('.map-view-content');
      const parentPadding = mapViewContent ? 
        (parseInt(getComputedStyle(mapViewContent).paddingTop || '32px', 10) * 2) : 64;
      
      const headerWidth = 80; // Row header width
      const headerHeight = 45; // Header row height (accounting for padding and border)
      const borderWidth = 2; // Border width
      
      // Available space (accounting for headers and borders)
      // Parent padding is already accounted for in containerRect
      const availableWidth = containerRect.width - headerWidth - borderWidth;
      const availableHeight = containerRect.height - headerHeight - borderWidth;
      
      // Calculate cell dimensions
      const numCols = colOrder.length;
      const numRows = rowOrder.length;
      
      if (numCols > 0 && numRows > 0 && availableWidth > 0 && availableHeight > 0) {
        const cellWidth = Math.max(40, Math.floor(availableWidth / numCols)); // Min 40px
        const cellHeight = Math.max(30, Math.floor(availableHeight / numRows)); // Min 30px
        
        setCellSize({ width: cellWidth, height: cellHeight });
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(calculateCellSize, 100);
    calculateCellSize();
    
    // Recalculate on window resize
    const handleResize = () => {
      calculateCellSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for more accurate container size tracking
    let resizeObserver = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(calculateCellSize);
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [colOrder.length, rowOrder.length, maxCols, maxRows]);

  // Helper to get sorted index value for display
  const getColIndexValue = (displayIndex) => {
    const originalCol = colOrder[displayIndex];
    return colIndexData && colIndexData[originalCol] !== undefined
      ? formatNumber(colIndexData[originalCol])
      : originalCol;
  };

  const getRowIndexValue = (displayIndex) => {
    const originalRow = rowOrder[displayIndex];
    return rowIndexData && rowIndexData[originalRow] !== undefined
      ? formatNumber(rowIndexData[originalRow])
      : originalRow;
  };

  return (
    <div className="map-table-container" ref={containerRef}>
      <div className="map-table-wrapper">
        <table className="map-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th className="row-header" style={{ width: '80px', height: `${cellSize.height}px` }}></th>
              {colOrder.map((originalCol, displayIndex) => (
                <th 
                  key={displayIndex} 
                  className="col-header"
                  style={{ 
                    width: `${cellSize.width}px`,
                    minWidth: `${cellSize.width}px`,
                    maxWidth: `${cellSize.width}px`,
                    height: `${cellSize.height}px`
                  }}
                >
                  {getColIndexValue(displayIndex)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowOrder.map((originalRow, displayRowIndex) => (
              <tr key={displayRowIndex}>
                <td 
                  className="row-header"
                  style={{ 
                    width: '80px',
                    height: `${cellSize.height}px`
                  }}
                >
                  {getRowIndexValue(displayRowIndex)}
                </td>
                {colOrder.map((originalCol, displayColIndex) => {
                  const val1 = data1[originalRow]?.[originalCol];
                  const val2 = data2[originalRow]?.[originalCol];
                  const diffKey = `${originalRow},${originalCol}`;
                  const diff = diffLookup.get(diffKey);

                  // Use file2 value when comparing, otherwise use available value
                  const displayVal = isComparing ? val2 : (val2 !== undefined ? val2 : val1);
                  
                  const diffClass = diff ? getDifferenceColorClass(diff.type) : '';

                  // Calculate heatmap background color
                  const heatmapColor = displayVal !== undefined && typeof displayVal === 'number' && isFinite(displayVal)
                    ? valueToHeatmapColor(displayVal, heatmapRange.min, heatmapRange.max)
                    : null;

                  // Calculate change display based on toggle (only when comparing)
                  let changeDisplay = null;
                  let changeTitle = '';
                  
                  if (isComparing && diff && diff.type === 'modified' && val1 !== undefined && val2 !== undefined) {
                    if (showPercentChange) {
                      // Show percent change (handles division by zero in formatter)
                      if (val1 !== 0) {
                        changeDisplay = formatPercentageChange(val1, val2);
                        changeTitle = `${formatDelta(val1, val2)} (${changeDisplay})`;
                      } else if (val2 !== 0) {
                        // val1 is 0 but val2 is not - show as infinite change
                        changeDisplay = '∞%';
                        changeTitle = `${formatDelta(val1, val2)} (${changeDisplay})`;
                      } else {
                        // Both are 0 - no change
                        changeDisplay = '0%';
                        changeTitle = formatDelta(val1, val2);
                      }
                    } else if (diff.delta !== null) {
                      // Show absolute change
                      changeDisplay = `${diff.delta >= 0 ? '+' : ''}${formatNumber(diff.delta, dataPrecision)}`;
                      changeTitle = `${formatDelta(val1, val2)}`;
                    }
                  }

                  // Build style object with heatmap background
                  // Heatmap color already includes opacity (0.75 = 50% more opaque)
                  const cellStyle = heatmapColor ? {
                    backgroundColor: heatmapColor,
                    opacity: diff && diffClass ? 0.85 : 1 // Keep full opacity for normal cells, slightly reduced for diff cells
                  } : {};

                  // Combine heatmap style with calculated cell size
                  const combinedStyle = {
                    ...cellStyle,
                    width: `${cellSize.width}px`,
                    minWidth: `${cellSize.width}px`,
                    maxWidth: `${cellSize.width}px`,
                    height: `${cellSize.height}px`,
                    minHeight: `${cellSize.height}px`,
                    maxHeight: `${cellSize.height}px`,
                    fontSize: cellSize.width < 50 ? '0.7rem' : cellSize.width < 60 ? '0.75rem' : '0.9rem'
                  };

                  return (
                    <td
                      key={displayColIndex}
                      className={`map-cell ${diffClass} ${displayVal !== undefined ? '' : 'empty'}`}
                      style={combinedStyle}
                      title={changeTitle || (isComparing && diff ? formatDelta(val1, val2) : '')}
                    >
                      {displayVal !== undefined ? (
                        <>
                          {formatNumber(displayVal, dataPrecision)}
                          {unitsString && <span className="cell-units"> {unitsString}</span>}
                        </>
                      ) : '—'}
                      {changeDisplay && (
                        <span className="delta-indicator">
                          {changeDisplay}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MapTable;

