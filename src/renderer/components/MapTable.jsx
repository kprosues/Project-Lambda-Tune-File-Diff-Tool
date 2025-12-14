import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { formatNumber, formatDelta, formatPercentageChange, getDifferenceColorClass, detectDataPrecision, calculateDataRange, valueToHeatmapColor } from '../utils/formatters';

function MapTable({ map1, map2, mapDiff, rowIndexData, colIndexData, showPercentChange = false }) {
  const containerRef = useRef(null);
  const tableRef = useRef(null);
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

  // Use layout effect to measure and adjust after content is rendered
  useLayoutEffect(() => {
    const checkAndAdjust = () => {
      if (!tableRef.current || !containerRef.current) return;
      
      const table = tableRef.current;
      const container = containerRef.current;
      
      // Measure actual table dimensions after content is rendered
      const tableRect = table.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Allow table to be larger than viewport for scrolling
      // Only adjust cell sizes if table is unreasonably large (more than 50% larger than viewport)
      // This allows scrolling while preventing extremely oversized tables
      const maxReasonableWidth = containerRect.width * 1.5;
      const maxReasonableHeight = containerRect.height * 1.5;
      const overflowsWidth = tableRect.width > maxReasonableWidth;
      const overflowsHeight = tableRect.height > maxReasonableHeight;
      
      // Only adjust if table is unreasonably large - otherwise allow scrolling
      if (overflowsWidth || overflowsHeight) {
        // Table overflows, recalculate cell sizes more aggressively
        const mapViewContent = container.closest('.map-view-content');
        const parentStyle = mapViewContent ? getComputedStyle(mapViewContent) : null;
        const parentPaddingLeft = parentStyle ? parseInt(parentStyle.paddingLeft || '32px', 10) : 32;
        const parentPaddingRight = parentStyle ? parseInt(parentStyle.paddingRight || '32px', 10) : 32;
        const parentPaddingTop = parentStyle ? parseInt(parentStyle.paddingTop || '32px', 10) : 32;
        const parentPaddingBottom = parentStyle ? parseInt(parentStyle.paddingBottom || '32px', 10) : 32;
        
        const mapViewHeader = container.closest('.map-view')?.querySelector('.map-view-header');
        const headerHeight = mapViewHeader ? mapViewHeader.getBoundingClientRect().height : 0;
        
        const rowHeaderWidth = 80;
        const scrollbarWidth = 17;
        const margin = 4;
        // Account for table header row in height calculation
        const tableHeader = tableRef.current?.querySelector('thead');
        const tableHeaderHeight = tableHeader?.getBoundingClientRect().height || cellSize.height;
        
        const availableWidth = Math.max(0, containerRect.width - parentPaddingLeft - parentPaddingRight - rowHeaderWidth - scrollbarWidth - margin);
        const availableHeight = Math.max(0, containerRect.height - parentPaddingTop - parentPaddingBottom - headerHeight - scrollbarWidth - margin - tableHeaderHeight);
        
        const numCols = colOrder.length;
        const numRows = rowOrder.length;
        
        if (numCols > 0 && numRows > 0 && availableWidth > 0 && availableHeight > 0) {
          // Calculate cell sizes to fit exactly
          const cellWidth = Math.max(15, Math.floor(availableWidth / numCols));
          const cellHeight = Math.max(15, Math.floor(availableHeight / numRows));
          
          // Only update if different to avoid infinite loops
          if (cellWidth !== cellSize.width || cellHeight !== cellSize.height) {
            setCellSize({ width: cellWidth, height: cellHeight });
          }
        } else if (numCols > 0 && numRows > 0 && availableWidth > 0) {
          // If height calculation failed, at least ensure width fits
          const cellWidth = Math.max(15, Math.floor(availableWidth / numCols));
          if (cellWidth !== cellSize.width) {
            setCellSize(prev => ({ ...prev, width: cellWidth }));
          }
        }
      }
    };
    
    // Check immediately after layout
    checkAndAdjust();
    
    // Also check after a short delay to catch any delayed rendering
    const timeout1 = setTimeout(checkAndAdjust, 0);
    const timeout2 = setTimeout(checkAndAdjust, 50);
    const timeout3 = setTimeout(checkAndAdjust, 200);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [colOrder.length, rowOrder.length, data1, data2]);

  // Calculate optimal cell size to fit table in viewport
  useEffect(() => {
    const calculateCellSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      let containerRect = container.getBoundingClientRect();
      
      // If container has no dimensions, try to get dimensions from parent
      if (containerRect.width === 0 || containerRect.height === 0) {
        const mapViewContent = container.closest('.map-view-content');
        if (mapViewContent) {
          containerRect = mapViewContent.getBoundingClientRect();
        }
      }
      
      // Fallback to window dimensions if still no size
      if (containerRect.width === 0 || containerRect.height === 0) {
        containerRect = {
          width: window.innerWidth,
          height: window.innerHeight
        };
      }
      
      // Get parent container (map-view-content) to account for its padding
      const mapViewContent = container.closest('.map-view-content');
      const parentStyle = mapViewContent ? getComputedStyle(mapViewContent) : null;
      const parentPaddingTop = parentStyle ? parseInt(parentStyle.paddingTop || '32px', 10) : 32;
      const parentPaddingBottom = parentStyle ? parseInt(parentStyle.paddingBottom || '32px', 10) : 32;
      const parentPaddingLeft = parentStyle ? parseInt(parentStyle.paddingLeft || '32px', 10) : 32;
      const parentPaddingRight = parentStyle ? parseInt(parentStyle.paddingRight || '32px', 10) : 32;
      
      // Get header height from map-view-header if it exists
      const mapViewHeader = container.closest('.map-view')?.querySelector('.map-view-header');
      const headerHeight = mapViewHeader ? mapViewHeader.getBoundingClientRect().height : 0;
      
      const rowHeaderWidth = 80; // Row header width
      const borderWidth = 2; // Border width
      
      // Calculate available space
      // Use container dimensions minus padding and headers
      // Account for scrollbar width (typically 15-17px) if overflow is enabled
      const scrollbarWidth = 17;
      const availableWidth = Math.max(0, containerRect.width - parentPaddingLeft - parentPaddingRight - rowHeaderWidth - borderWidth - scrollbarWidth);
      const availableHeight = Math.max(0, containerRect.height - parentPaddingTop - parentPaddingBottom - headerHeight - borderWidth - scrollbarWidth);
      
      // Calculate cell dimensions
      const numCols = colOrder.length;
      const numRows = rowOrder.length;
      
      if (numCols > 0 && numRows > 0 && availableWidth > 0 && availableHeight > 0) {
        // Calculate cell width - ensure it fits within available space
        let cellWidth = Math.floor(availableWidth / numCols);
        
        // Apply minimum constraints but allow smaller if needed to fit
        const minCellWidth = 30;
        if (cellWidth < minCellWidth && availableWidth < numCols * minCellWidth) {
          // If we can't fit with minimum, use what we have
          cellWidth = Math.max(20, Math.floor(availableWidth / numCols));
        } else {
          cellWidth = Math.max(minCellWidth, cellWidth);
        }
        
        // Calculate cell height - ensure it fits within available space
        let cellHeight = Math.floor(availableHeight / numRows);
        
        // Apply minimum constraints but allow smaller if needed to fit
        const minCellHeight = 25;
        if (cellHeight < minCellHeight && availableHeight < numRows * minCellHeight) {
          // If we can't fit with minimum, use what we have
          cellHeight = Math.max(20, Math.floor(availableHeight / numRows));
        } else {
          cellHeight = Math.max(minCellHeight, cellHeight);
        }
        
        // Recalculate to ensure table fits - account for all borders
        // Each cell has 1px border on each side = 2px per cell, but borders collapse
        // So we only count borders on the outer edges
        const outerBorderWidth = 2; // 1px on each side
        const totalTableWidth = (cellWidth * numCols) + rowHeaderWidth + outerBorderWidth;
        const totalTableHeight = (cellHeight * numRows) + 45 + outerBorderWidth; // 45 is header height
        
        // Get the actual available container dimensions (already accounting for padding)
        // availableWidth and availableHeight already account for padding and headers
        const maxAvailableWidth = availableWidth + rowHeaderWidth; // Add back header since table includes it
        const maxAvailableHeight = availableHeight + 45; // Add back header height
        
        // If table would exceed available space, scale down proportionally
        // Use a small margin to ensure we don't overflow
        const widthMargin = 2;
        const heightMargin = 2;
        
        if (totalTableWidth > (maxAvailableWidth - widthMargin)) {
          const scaleFactor = (maxAvailableWidth - widthMargin - outerBorderWidth) / (totalTableWidth - outerBorderWidth);
          cellWidth = Math.max(15, Math.floor(cellWidth * scaleFactor));
        }
        
        if (totalTableHeight > (maxAvailableHeight - heightMargin)) {
          const scaleFactor = (maxAvailableHeight - heightMargin - outerBorderWidth) / (totalTableHeight - outerBorderWidth);
          cellHeight = Math.max(15, Math.floor(cellHeight * scaleFactor));
        }
        
        // Ensure minimum sizes but allow smaller if absolutely necessary to fit
        const absoluteMinWidth = 15;
        const absoluteMinHeight = 15;
        cellWidth = Math.max(absoluteMinWidth, cellWidth);
        cellHeight = Math.max(absoluteMinHeight, cellHeight);
        
        setCellSize({ width: cellWidth, height: cellHeight });
      } else {
        // Fallback to reasonable defaults if calculation fails
        setCellSize({ width: 80, height: 40 });
      }
    };

    // Calculate immediately and also after a short delay to ensure DOM is ready
    calculateCellSize();
    const timeoutId = setTimeout(calculateCellSize, 50);
    const timeoutId2 = setTimeout(calculateCellSize, 200);
    
    // Debounced resize handler for better performance
    let resizeTimeout = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        calculateCellSize();
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Also handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(calculateCellSize, 200);
    });
    
    // Use ResizeObserver for more accurate container size tracking
    let resizeObserver = null;
    if (containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        // Debounce ResizeObserver callbacks too
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }
        resizeTimeout = setTimeout(() => {
          calculateCellSize();
        }, 50);
      });
      resizeObserver.observe(containerRef.current);
      
      // Also observe the parent container for better tracking
      const mapViewContent = containerRef.current.closest('.map-view-content');
      if (mapViewContent) {
        resizeObserver.observe(mapViewContent);
      }
    }
    
    // Function to check if table overflows and recalculate if needed
    const checkTableOverflow = () => {
      if (!tableRef.current || !containerRef.current) return;
      
      const table = tableRef.current;
      const container = containerRef.current;
      const tableRect = table.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Check if table overflows container (with small tolerance)
      const tolerance = 2;
      const overflowsWidth = tableRect.width > (containerRect.width + tolerance);
      const overflowsHeight = tableRect.height > (containerRect.height + tolerance);
      
      if (overflowsWidth || overflowsHeight) {
        // Table overflows, recalculate cell sizes with more aggressive scaling
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        let containerRect = container.getBoundingClientRect();
        
        if (containerRect.width === 0 || containerRect.height === 0) {
          const mapViewContent = container.closest('.map-view-content');
          if (mapViewContent) {
            containerRect = mapViewContent.getBoundingClientRect();
          }
        }
        
        const mapViewContent = container.closest('.map-view-content');
        const parentStyle = mapViewContent ? getComputedStyle(mapViewContent) : null;
        const parentPaddingTop = parentStyle ? parseInt(parentStyle.paddingTop || '32px', 10) : 32;
        const parentPaddingBottom = parentStyle ? parseInt(parentStyle.paddingBottom || '32px', 10) : 32;
        const parentPaddingLeft = parentStyle ? parseInt(parentStyle.paddingLeft || '32px', 10) : 32;
        const parentPaddingRight = parentStyle ? parseInt(parentStyle.paddingRight || '32px', 10) : 32;
        
        const mapViewHeader = container.closest('.map-view')?.querySelector('.map-view-header');
        const headerHeight = mapViewHeader ? mapViewHeader.getBoundingClientRect().height : 0;
        
        const rowHeaderWidth = 80;
        const scrollbarWidth = 17;
        const availableWidth = Math.max(0, containerRect.width - parentPaddingLeft - parentPaddingRight - rowHeaderWidth - scrollbarWidth);
        const availableHeight = Math.max(0, containerRect.height - parentPaddingTop - parentPaddingBottom - headerHeight - scrollbarWidth);
        
        const numCols = colOrder.length;
        const numRows = rowOrder.length;
        
        if (numCols > 0 && numRows > 0 && availableWidth > 0 && availableHeight > 0) {
          // More aggressive scaling to ensure table fits
          const cellWidth = Math.max(15, Math.floor((availableWidth - 4) / numCols));
          const cellHeight = Math.max(15, Math.floor((availableHeight - 4) / numRows));
          setCellSize({ width: cellWidth, height: cellHeight });
        }
      }
    };
    
    // Use MutationObserver to detect when table content is added/changed
    let mutationObserver = null;
    const setupTableObserver = () => {
      if (tableRef.current) {
        mutationObserver = new MutationObserver(() => {
          // Wait for next frame to ensure content is rendered
          requestAnimationFrame(() => {
            setTimeout(checkTableOverflow, 50);
          });
        });
        mutationObserver.observe(tableRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'width', 'height']
        });
        
        // Also observe table with ResizeObserver
        if (resizeObserver) {
          resizeObserver.observe(tableRef.current);
        }
      }
    };
    
    // Setup observer after a delay to ensure table is rendered
    const setupTimeout = setTimeout(setupTableObserver, 100);
    
    // Check for overflow after content is rendered (multiple attempts)
    const checkOverflowDelays = [150, 400, 600, 800];
    checkOverflowDelays.forEach(delay => {
      setTimeout(() => {
        checkTableOverflow();
        calculateCellSize();
      }, delay);
    });

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      clearTimeout(setupTimeout);
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
        if (tableRef.current) {
          resizeObserver.unobserve(tableRef.current);
        }
        const mapViewContent = containerRef.current.closest('.map-view-content');
        if (mapViewContent) {
          resizeObserver.unobserve(mapViewContent);
        }
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
    };
  }, [colOrder.length, rowOrder.length, maxCols, maxRows, data1, data2, displayData]);

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

  // Calculate total table dimensions based on cell sizes
  const totalTableWidth = (cellSize.width * colOrder.length) + 80; // 80 for row header
  // Total height = header row + all data rows
  const totalTableHeight = cellSize.height + (cellSize.height * rowOrder.length);
  
  // Don't constrain table dimensions - allow it to be larger than viewport for scrolling
  // The container will handle overflow with scrolling

  return (
    <div className="map-table-container" ref={containerRef}>
      <div className="map-table-wrapper" style={{ maxWidth: '100%', overflow: 'auto' }}>
        <table 
          ref={tableRef}
          className="map-table" 
          style={{ 
            tableLayout: 'fixed',
            width: `${totalTableWidth}px`,
            height: `${totalTableHeight}px`
          }}
        >
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
                    fontSize: cellSize.width < 50 ? '0.6rem' : cellSize.width < 60 ? '0.65rem' : '0.75rem'
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

