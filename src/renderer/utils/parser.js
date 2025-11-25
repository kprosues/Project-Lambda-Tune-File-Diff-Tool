/**
 * Parser utility for .tune files
 * Parses and validates ECU configuration files
 */

/**
 * Parse a tune file's data array into a 2D array
 * Handles comma-separated values in string arrays
 * @param {string[]} dataArray - Array of strings containing comma-separated values
 * @returns {number[][]} - 2D array of parsed numbers
 */
export function parseMapData(dataArray) {
  if (!Array.isArray(dataArray)) {
    return [];
  }

  return dataArray.map(row => {
    if (typeof row === 'string') {
      // Split by comma and parse each value
      return row.split(',').map(val => {
        const trimmed = val.trim();
        // Handle "inf" as Infinity
        if (trimmed.toLowerCase() === 'inf') {
          return Infinity;
        }
        const parsed = parseFloat(trimmed);
        return isNaN(parsed) ? 0 : parsed;
      });
    } else if (typeof row === 'number') {
      // Single value
      return [row];
    } else if (Array.isArray(row)) {
      // Already an array, just parse values
      return row.map(val => {
        if (typeof val === 'number') return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      });
    }
    return [];
  });
}

/**
 * Validate tune file structure
 * @param {Object} tuneData - Parsed JSON data
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTuneFile(tuneData) {
  const errors = [];

  if (!tuneData || typeof tuneData !== 'object') {
    errors.push('Invalid tune file: not an object');
    return { valid: false, errors };
  }

  if (!tuneData.maps || !Array.isArray(tuneData.maps)) {
    errors.push('Invalid tune file: missing or invalid maps array');
  }

  if (tuneData.maps) {
    tuneData.maps.forEach((map, index) => {
      if (!map.id) {
        errors.push(`Map at index ${index} is missing an id`);
      }
      if (!map.data) {
        errors.push(`Map "${map.id || index}" is missing data`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Parse and normalize a tune file
 * @param {Object} tuneData - Raw parsed JSON
 * @returns {Object} - Normalized tune file structure
 */
export function parseTuneFile(tuneData) {
  const validation = validateTuneFile(tuneData);
  
  if (!validation.valid) {
    throw new Error(`Invalid tune file: ${validation.errors.join(', ')}`);
  }

  // Parse all maps
  const parsedMaps = tuneData.maps.map(map => ({
    id: map.id,
    units: map.units || '',
    data: parseMapData(map.data),
    rawData: map.data // Keep original for comparison
  }));

  return {
    calId: tuneData['.cal_id'] || '',
    carId: tuneData['.car_id'] || '',
    romId: tuneData['.rom_id'] || '',
    version: tuneData['.version'] || '',
    meta: tuneData['.meta'] || {},
    maps: parsedMaps,
    raw: tuneData // Keep raw for reference
  };
}

/**
 * Find index arrays for a map (rpm_index, map_index, etc.)
 * @param {Object} tuneFile - Parsed tune file
 * @param {string} mapId - ID of the map
 * @param {number} expectedRows - Expected number of rows (optional, for validation)
 * @param {number} expectedCols - Expected number of columns (optional, for validation)
 * @returns {{rowIndex: string|null, colIndex: string|null}}
 */
export function findIndexArrays(tuneFile, mapId, expectedRows = null, expectedCols = null) {
  let rowIndex = null;
  let colIndex = null;

  if (!tuneFile || !tuneFile.maps || !mapId) {
    return { rowIndex: null, colIndex: null };
  }

  // Get the map to check dimensions if needed
  const map = tuneFile.maps.find(m => m.id === mapId);
  const mapRows = map?.data?.length || expectedRows;
  const mapCols = map?.data?.[0]?.length || expectedCols;

  // Common naming patterns for index arrays
  // Remove _index suffix if present, remove _at/_mt suffix for variant maps
  const baseId = mapId.replace(/_index$/, '');
  const baseWithoutVariant = baseId.replace(/_at$|_mt$/, '');
  
  // Try to find row index (usually rpm_index)
  const possibleRowIndices = [
    // Try map-specific first: {base}_rpm_index
    `${baseId}_rpm_index`,
    // Try without variant: base_spark_rpm_index for base_spark_at/mt
    `${baseWithoutVariant}_rpm_index`,
    // Common shared indices
    'base_spark_rpm_index',
    'boost_target_rpm_index',
    'pe_rpm_index',
    'wg_rpm_index',
    'coil_dwell_rpm_index'
  ];

  // Try to find column index (varies: map_index, tps_index, load_index, etc.)
  const possibleColIndices = [
    // Try map-specific first
    `${baseId}_map_index`,
    `${baseId}_tps_index`,
    `${baseId}_load_index`,
    `${baseId}_iat_index`,
    // Try without variant
    `${baseWithoutVariant}_map_index`,
    `${baseWithoutVariant}_tps_index`,
    `${baseWithoutVariant}_load_index`,
    // Common shared indices
    'base_spark_map_index',
    'boost_target_tps_index',
    'pe_load_index',
    'wg_tps_index',
    'coil_dwell_voltage_index',
    'boost_target_iat_index'
  ];

  // Helper to validate index array dimensions
  const isValidIndexArray = (indexMap, expectedCount) => {
    if (!indexMap || !indexMap.data || indexMap.data.length === 0) {
      return false;
    }
    
    // Index arrays are stored as 2D arrays with one row: [[val1, val2, ...]]
    // Extract the first row which contains all the index values
    const indexArray = Array.isArray(indexMap.data[0]) 
      ? indexMap.data[0] 
      : (Array.isArray(indexMap.data) ? indexMap.data : []);
    
    const indexCount = indexArray.length;
    
    // Must have at least some values
    if (indexCount === 0) {
      return false;
    }
    
    // If we have expected count, validate it matches (allow >= for extra breakpoints)
    // Most tune files have exact matches, so we check for exact match or at least the expected count
    if (expectedCount !== null) {
      // Accept if it matches exactly or has at least the expected count (extra breakpoints)
      if (indexCount < expectedCount) {
        return false;
      }
    }
    
    return true;
  };

  // Find row index
  for (const idxId of possibleRowIndices) {
    const indexMap = tuneFile.maps.find(m => m.id === idxId);
    if (isValidIndexArray(indexMap, mapRows)) {
      rowIndex = idxId;
      break;
    }
  }

  // Find column index
  for (const idxId of possibleColIndices) {
    const indexMap = tuneFile.maps.find(m => m.id === idxId);
    if (isValidIndexArray(indexMap, mapCols)) {
      colIndex = idxId;
      break;
    }
  }

  return { rowIndex, colIndex };
}

