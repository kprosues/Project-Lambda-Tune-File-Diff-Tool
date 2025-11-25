/**
 * Formatting utilities for displaying values
 */

/**
 * Calculate the decimal precision of a number
 * @param {number} value
 * @returns {number} - Number of decimal places
 */
function getDecimalPrecision(value) {
  if (value === undefined || value === null || !isFinite(value)) {
    return 0;
  }
  
  // Convert to string to check decimal places
  const str = value.toString();
  if (str.includes('e') || str.includes('E')) {
    // Scientific notation - parse it
    const parts = str.split(/[eE]/);
    const decimalPart = parts[0].split('.');
    const exponent = parseInt(parts[1], 10);
    const decimalPlaces = decimalPart[1] ? decimalPart[1].length : 0;
    return Math.max(0, decimalPlaces - exponent);
  }
  
  // Regular decimal notation
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) {
    return 0;
  }
  
  // Count significant decimal places (remove trailing zeros)
  const decimalPart = str.substring(decimalIndex + 1);
  return decimalPart.replace(/0+$/, '').length;
}

/**
 * Detect the maximum decimal precision in a 2D array of numbers
 * @param {number[][]} dataArray
 * @returns {number} - Maximum decimal places found
 */
export function detectDataPrecision(dataArray) {
  if (!dataArray || !Array.isArray(dataArray)) {
    return 2; // Default precision
  }
  
  let maxPrecision = 0;
  
  for (const row of dataArray) {
    if (Array.isArray(row)) {
      for (const value of row) {
        if (typeof value === 'number' && isFinite(value)) {
          const precision = getDecimalPrecision(value);
          maxPrecision = Math.max(maxPrecision, precision);
        }
      }
    }
  }
  
  // Cap at reasonable precision (6 decimal places max)
  // If no decimals found, use default of 2
  return maxPrecision > 0 ? Math.min(maxPrecision, 6) : 2;
}

/**
 * Format a number with appropriate precision
 * @param {number} value
 * @param {number} precision - Decimal places (if not provided, will auto-detect)
 * @returns {string}
 */
export function formatNumber(value, precision = null) {
  if (value === undefined || value === null) return '—';
  if (value === Infinity) return '∞';
  if (value === -Infinity) return '-∞';
  
  if (typeof value === 'number') {
    // For whole numbers, don't show decimals
    if (value % 1 === 0) {
      return value.toString();
    }
    
    // If precision not specified, detect it
    if (precision === null) {
      precision = getDecimalPrecision(value);
      // Use at least 1 decimal place if it's not a whole number
      precision = Math.max(precision, 1);
    }
    
    return value.toFixed(precision);
  }
  
  return String(value);
}

/**
 * Format delta (difference) between two values
 * @param {number} oldVal
 * @param {number} newVal
 * @param {string} units - Units for display
 * @param {number} precision - Decimal places (optional, will auto-detect if not provided)
 * @returns {string}
 */
export function formatDelta(oldVal, newVal, units = '', precision = null) {
  if (oldVal === undefined || newVal === undefined) return '—';
  
  const delta = newVal - oldVal;
  const sign = delta >= 0 ? '+' : '';
  const formatted = formatNumber(delta, precision);
  
  return `${sign}${formatted}${units ? ' ' + units : ''}`;
}

/**
 * Format percentage change
 * @param {number} oldVal
 * @param {number} newVal
 * @returns {string}
 */
export function formatPercentageChange(oldVal, newVal) {
  if (oldVal === undefined || newVal === undefined) return '—';
  if (oldVal === 0) return newVal !== 0 ? '∞%' : '0%';
  
  const percent = ((newVal - oldVal) / oldVal) * 100;
  const sign = percent >= 0 ? '+' : '';
  
  return `${sign}${formatNumber(percent, 1)}%`;
}

/**
 * Get color class for difference type
 * @param {string} type - 'added', 'removed', 'modified', 'unchanged'
 * @returns {string}
 */
export function getDifferenceColorClass(type) {
  switch (type) {
    case 'added':
      return 'diff-added';
    case 'removed':
      return 'diff-removed';
    case 'modified':
      return 'diff-modified';
    default:
      return '';
  }
}

/**
 * Format map ID for display (remove underscores, capitalize)
 * @param {string} mapId
 * @returns {string}
 */
export function formatMapId(mapId) {
  if (!mapId) return '';
  return mapId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Calculate min and max values from a 2D data array
 * @param {number[][]} dataArray
 * @returns {{min: number, max: number}} - Min and max values
 */
export function calculateDataRange(dataArray) {
  if (!dataArray || dataArray.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = -Infinity;

  for (const row of dataArray) {
    if (Array.isArray(row)) {
      for (const value of row) {
        if (typeof value === 'number' && isFinite(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }
  }

  // If no valid numbers found, return defaults
  if (min === Infinity || max === -Infinity || min === max) {
    return { min: 0, max: 1 };
  }

  return { min, max };
}

/**
 * Convert a value to a color based on its position in a range
 * Creates a gradient from dark blue (low) to bright red (high)
 * @param {number} value - The value to convert
 * @param {number} min - Minimum value in range
 * @param {number} max - Maximum value in range
 * @param {number} opacity - Opacity value (0-1), default 0.75 for 50% more opacity
 * @returns {string} - RGBA color string
 */
export function valueToHeatmapColor(value, min, max, opacity = 0.3) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return `rgba(128, 128, 128, ${opacity})`; // Gray for invalid values
  }

  // Handle case where min === max
  if (min === max) {
    return `rgba(128, 0, 128, ${opacity})`; // Purple for single value
  }

  // Normalize value to 0-1 range
  const normalized = (value - min) / (max - min);
  // Clamp to [0, 1]
  const clamped = Math.max(0, Math.min(1, normalized));

  // Create gradient from dark blue to bright red
  // Dark blue: rgb(0, 0, 139) -> Cyan -> Yellow -> Bright red: rgb(255, 0, 0)
  let r, g, b;

  if (clamped < 0.25) {
    // Dark blue to cyan (0 -> 0.25)
    const t = clamped * 4;
    r = Math.floor(0 * (1 - t) + 0 * t);
    g = Math.floor(0 * (1 - t) + 255 * t);
    b = Math.floor(139 * (1 - t) + 255 * t);
  } else if (clamped < 0.5) {
    // Cyan to green (0.25 -> 0.5)
    const t = (clamped - 0.25) * 4;
    r = Math.floor(0 * (1 - t) + 0 * t);
    g = 255;
    b = Math.floor(255 * (1 - t) + 0 * t);
  } else if (clamped < 0.75) {
    // Green to yellow (0.5 -> 0.75)
    const t = (clamped - 0.5) * 4;
    r = Math.floor(0 * (1 - t) + 255 * t);
    g = 255;
    b = 0;
  } else {
    // Yellow to bright red (0.75 -> 1.0)
    const t = (clamped - 0.75) * 4;
    r = 255;
    g = Math.floor(255 * (1 - t) + 0 * t);
    b = 0;
  }

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

