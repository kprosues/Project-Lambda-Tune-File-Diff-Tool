/**
 * Comparison engine for tune files
 * Implements diff algorithm to compare metadata and maps
 */

const NUMERIC_TOLERANCE = 0.0001; // For floating point comparisons

/**
 * Compare two values with tolerance for floating point
 * @param {number|string} a - First value
 * @param {number|string} b - Second value
 * @returns {boolean}
 */
function valuesEqual(a, b) {
  if (a === b) return true;
  
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  
  if (!isNaN(numA) && !isNaN(numB)) {
    return Math.abs(numA - numB) < NUMERIC_TOLERANCE;
  }
  
  return false;
}

/**
 * Compare two arrays of numbers
 * @param {number[]} arr1
 * @param {number[]} arr2
 * @returns {Array<{index: number, old: number, new: number}>}
 */
function compareArrays(arr1, arr2) {
  const diffs = [];
  const maxLength = Math.max(arr1.length, arr2.length);

  for (let i = 0; i < maxLength; i++) {
    const val1 = arr1[i];
    const val2 = arr2[i];

    if (i >= arr1.length) {
      // Added value
      diffs.push({ index: i, type: 'added', old: undefined, new: val2 });
    } else if (i >= arr2.length) {
      // Removed value
      diffs.push({ index: i, type: 'removed', old: val1, new: undefined });
    } else if (!valuesEqual(val1, val2)) {
      // Modified value
      diffs.push({ index: i, type: 'modified', old: val1, new: val2 });
    }
  }

  return diffs;
}

/**
 * Compare two 2D arrays (map data)
 * @param {number[][]} data1
 * @param {number[][]} data2
 * @returns {Array<{row: number, col: number, type: string, old: number, new: number}>}
 */
function compareMapData(data1, data2) {
  const diffs = [];
  const maxRows = Math.max(data1.length, data2.length);

  for (let row = 0; row < maxRows; row++) {
    const row1 = data1[row] || [];
    const row2 = data2[row] || [];
    const maxCols = Math.max(row1.length, row2.length);

    for (let col = 0; col < maxCols; col++) {
      const val1 = row1[col];
      const val2 = row2[col];

      if (row >= data1.length) {
        // Added row
        diffs.push({ row, col, type: 'added', old: undefined, new: val2 });
      } else if (row >= data2.length) {
        // Removed row
        diffs.push({ row, col, type: 'removed', old: val1, new: undefined });
      } else if (col >= row1.length) {
        // Added column
        diffs.push({ row, col, type: 'added', old: undefined, new: val2 });
      } else if (col >= row2.length) {
        // Removed column
        diffs.push({ row, col, type: 'removed', old: val1, new: undefined });
      } else if (!valuesEqual(val1, val2)) {
        // Modified value
        const delta = typeof val2 === 'number' && typeof val1 === 'number' 
          ? val2 - val1 
          : null;
        diffs.push({ row, col, type: 'modified', old: val1, new: val2, delta });
      }
    }
  }

  return diffs;
}

/**
 * Compare metadata between two tune files
 * @param {Object} file1
 * @param {Object} file2
 * @returns {Object}
 */
export function compareMetadata(file1, file2) {
  const diffs = {};

  const metadataFields = ['calId', 'carId', 'romId', 'version'];
  
  metadataFields.forEach(field => {
    if (file1[field] !== file2[field]) {
      diffs[field] = {
        old: file1[field],
        new: file2[field],
        type: 'modified'
      };
    }
  });

  // Compare meta object
  const meta1 = file1.meta || {};
  const meta2 = file2.meta || {};
  const metaKeys = new Set([...Object.keys(meta1), ...Object.keys(meta2)]);
  
  metaKeys.forEach(key => {
    if (meta1[key] !== meta2[key]) {
      if (!diffs.meta) diffs.meta = {};
      diffs.meta[key] = {
        old: meta1[key],
        new: meta2[key],
        type: 'modified'
      };
    }
  });

  return diffs;
}

/**
 * Compare two maps by ID
 * @param {Object} map1
 * @param {Object} map2
 * @returns {Object|null}
 */
function compareMap(map1, map2) {
  if (!map1 && !map2) return null;
  if (!map1) {
    return {
      id: map2.id,
      type: 'added',
      map: map2
    };
  }
  if (!map2) {
    return {
      id: map1.id,
      type: 'removed',
      map: map1
    };
  }

  // Compare units
  const unitsChanged = map1.units !== map2.units;

  // Compare data
  const dataDiffs = compareMapData(map1.data, map2.data);

  if (dataDiffs.length === 0 && !unitsChanged) {
    return null; // No differences
  }

  return {
    id: map1.id,
    type: 'modified',
    unitsChanged,
    units: { old: map1.units, new: map2.units },
    dataDiffs,
    map1,
    map2
  };
}

/**
 * Compare two complete tune files
 * @param {Object} file1 - First parsed tune file
 * @param {Object} file2 - Second parsed tune file
 * @returns {Object}
 */
export function compareTuneFiles(file1, file2) {
  if (!file1 || !file2) {
    throw new Error('Both tune files are required for comparison');
  }

  const result = {
    metadata: compareMetadata(file1, file2),
    maps: {},
    statistics: {
      totalMaps: 0,
      addedMaps: 0,
      removedMaps: 0,
      modifiedMaps: 0,
      unchangedMaps: 0,
      totalDifferences: 0
    }
  };

  // Create maps by ID
  const maps1 = new Map(file1.maps.map(m => [m.id, m]));
  const maps2 = new Map(file2.maps.map(m => [m.id, m]));
  
  // Get all unique map IDs
  const allMapIds = new Set([...maps1.keys(), ...maps2.keys()]);
  result.statistics.totalMaps = allMapIds.size;

  // Compare each map
  allMapIds.forEach(mapId => {
    const map1 = maps1.get(mapId);
    const map2 = maps2.get(mapId);
    
    const diff = compareMap(map1, map2);
    
    if (diff) {
      result.maps[mapId] = diff;
      
      if (diff.type === 'added') {
        result.statistics.addedMaps++;
      } else if (diff.type === 'removed') {
        result.statistics.removedMaps++;
      } else if (diff.type === 'modified') {
        result.statistics.modifiedMaps++;
        result.statistics.totalDifferences += diff.dataDiffs.length;
      }
    } else {
      result.maps[mapId] = {
        id: mapId,
        type: 'unchanged',
        map: map1
      };
      result.statistics.unchangedMaps++;
    }
  });

  // Add metadata differences count
  const metadataDiffCount = Object.keys(result.metadata).length;
  result.statistics.totalDifferences += metadataDiffCount;

  return result;
}

/**
 * Filter comparison result to show only differences
 * @param {Object} comparison - Comparison result
 * @returns {Object}
 */
export function filterDifferences(comparison) {
  const filtered = {
    metadata: {},
    maps: {},
    statistics: comparison.statistics
  };

  // Filter metadata differences
  Object.keys(comparison.metadata).forEach(key => {
    if (Object.keys(comparison.metadata[key]).length > 0) {
      filtered.metadata[key] = comparison.metadata[key];
    }
  });

  // Filter maps with differences
  Object.keys(comparison.maps).forEach(mapId => {
    const mapDiff = comparison.maps[mapId];
    if (mapDiff.type !== 'unchanged') {
      filtered.maps[mapId] = mapDiff;
    }
  });

  return filtered;
}

