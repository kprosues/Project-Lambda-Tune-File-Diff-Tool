/**
 * Map grouping configuration based on ECU_TUNE_FILE_MODEL.md
 * Groups tune maps by their functional categories (28 sections)
 */

/**
 * Map groups with their display names and map ID patterns
 * Patterns can be:
 * - Exact string match
 * - Prefix match (ends with '*')
 * - Suffix match (starts with '*')
 * - Contains match (has '*' in middle)
 */
export const MAP_GROUPS = [
  {
    id: 'barometric',
    name: 'Barometric Pressure Calibration',
    patterns: ['baro_offset', 'baro_slope']
  },
  {
    id: 'spark',
    name: 'Spark/Ignition Timing',
    patterns: [
      'base_spark_',
      'base_spark_rpm_index',
      'base_spark_map_index',
      'base_spark_coolant',
      'closed_throttle_spark',
      'learned_spark_',
      'learning_enable',
      'spark_fine_learn_',
      'spark_charge_temp',
      'spark_cyl',
      'spark_min',
      'spark_min_rpm',
      'rev_limit_spark'
    ]
  },
  {
    id: 'knock',
    name: 'Knock Detection and Retard',
    patterns: [
      'knock_sensitivity',
      'knock_sampling_',
      'knock_retard_',
      'knock_rpm_min',
      'knock_average_tolerance',
      'knock_sensitivity_logging_rate'
    ]
  },
  {
    id: 'fuel',
    name: 'Fuel Delivery',
    patterns: [
      'fuel_base',
      'fuel_ect',
      'fuel_startup',
      'fuel_accel_enrich',
      'inj_pw_',
      'inj_latency_'
    ]
  },
  {
    id: 'boost',
    name: 'Boost Control',
    patterns: [
      'boost_target',
      'boost_target_',
      'boost_limit',
      'boost_error_index',
      'boost_iat_enable_',
      'boost_prop_enable',
      'boost_doubler'
    ]
  },
  {
    id: 'wastegate',
    name: 'Wastegate Control',
    patterns: [
      'wastegate_enable',
      'wg_'
    ]
  },
  {
    id: 'maf',
    name: 'Mass Airflow (MAF) Sensor',
    patterns: [
      'maf_scale',
      'maf_bias',
      'maf_limit',
      'maf_delete'
    ]
  },
  {
    id: 'map',
    name: 'Manifold Absolute Pressure (MAP) Sensor',
    patterns: [
      'map_offset',
      'map_slope',
      'map_filter',
      'map_rpm_min',
      'map_ad0_enable'
    ]
  },
  {
    id: 'iat',
    name: 'Intake Air Temperature (IAT) Sensor',
    patterns: [
      'iat_scale',
      'iat_ad0_enable',
      'iat_comp_ratio',
      'iat_comp_ratio_index'
    ]
  },
  {
    id: 'ect',
    name: 'Engine Coolant Temperature (ECT) Sensor',
    patterns: [
      'ect_scale'
    ]
  },
  {
    id: 'idle',
    name: 'Idle Air Control',
    patterns: [
      'idle_target_',
      'idle_air_'
    ]
  },
  {
    id: 'pe',
    name: 'Power Enrichment (PE) / Lambda Targets',
    patterns: [
      'pe_'
    ]
  },
  {
    id: 've',
    name: 'Volumetric Efficiency (VE) Table',
    patterns: [
      've',
      've_map_index',
      've_baro_comp',
      've_throttle_comp'
    ]
  },
  {
    id: 'sd_blend',
    name: 'Speed-Density Blending',
    patterns: [
      'sd_blend_ratio',
      'sd_blend_ratio_index'
    ]
  },
  {
    id: 'coil',
    name: 'Coil/Ignition System',
    patterns: [
      'coil_dwell_',
      'cop_enable'
    ]
  },
  {
    id: 'dfco',
    name: 'Deceleration Fuel Cut-Off (DFCO)',
    patterns: [
      'dfco_'
    ]
  },
  {
    id: 'rev_limit',
    name: 'Rev Limiting',
    patterns: [
      'rev_limit'
    ]
  },
  {
    id: 'speed_limit',
    name: 'Speed Limiting',
    patterns: [
      'speed_limit',
      'vss_failsafe'
    ]
  },
  {
    id: 'launch',
    name: 'Launch Control',
    patterns: [
      'launch_'
    ]
  },
  {
    id: 'vdc',
    name: 'Traction Control (VDC)',
    patterns: [
      'vdc_',
      'fuel_base_traction'
    ]
  },
  {
    id: 'load',
    name: 'Load Management',
    patterns: [
      'load_max'
    ]
  },
  {
    id: 'iam',
    name: 'Ignition Advance Multiplier (IAM)',
    patterns: [
      'iam_'
    ]
  },
  {
    id: 'wideband',
    name: 'Wideband Oxygen Sensor',
    patterns: [
      'wideband_'
    ]
  },
  {
    id: 'fan',
    name: 'Fan Control',
    patterns: [
      'fan_temp'
    ]
  },
  {
    id: 'fuel_pump',
    name: 'Fuel Pump Control',
    patterns: [
      'fp_duty_'
    ]
  },
  {
    id: 'gear',
    name: 'Gear Detection',
    patterns: [
      'gear_ratios_'
    ]
  },
  {
    id: 'engine',
    name: 'Engine Displacement',
    patterns: [
      'engine_disp'
    ]
  },
  {
    id: 'misc',
    name: 'Miscellaneous Features',
    patterns: [
      'immo_',
      'stft_enable',
      'fpc_enable',
      'cpc_enable_'
    ]
  }
];

/**
 * Match a map ID to a group based on patterns
 * @param {string} mapId - The map ID to match
 * @returns {string|null} - The group ID, or null if no match
 */
export function getMapGroup(mapId) {
  if (!mapId) return null;

  // Check each group's patterns
  for (const group of MAP_GROUPS) {
    for (const pattern of group.patterns) {
      if (matchesPattern(mapId, pattern)) {
        return group.id;
      }
    }
  }

  return null;
}

/**
 * Check if a map ID matches a pattern
 * @param {string} mapId - The map ID to check
 * @param {string} pattern - The pattern to match against
 * @returns {boolean} - True if matches
 */
function matchesPattern(mapId, pattern) {
  if (pattern.endsWith('_')) {
    // Prefix match: pattern ends with '_', so match if mapId starts with pattern
    return mapId.startsWith(pattern);
  } else if (pattern.startsWith('*')) {
    // Suffix match: pattern starts with '*', so match if mapId ends with pattern (without *)
    return mapId.endsWith(pattern.substring(1));
  } else if (pattern.includes('*')) {
    // Contains match: pattern has '*' in middle
    const parts = pattern.split('*');
    return mapId.startsWith(parts[0]) && mapId.endsWith(parts[1]);
  } else {
    // Exact match
    return mapId === pattern;
  }
}

/**
 * Get all maps grouped by their functional category
 * @param {Array} maps - Array of map objects with 'id' property
 * @returns {Object} - Object with group IDs as keys and arrays of maps as values
 */
export function groupMaps(maps) {
  const grouped = {};
  const uncategorized = [];

  // Initialize all groups
  MAP_GROUPS.forEach(group => {
    grouped[group.id] = [];
  });

  // Group maps
  maps.forEach(map => {
    const groupId = getMapGroup(map.id);
    if (groupId && grouped[groupId]) {
      grouped[groupId].push(map);
    } else {
      uncategorized.push(map);
    }
  });

  // Add uncategorized group if there are any
  if (uncategorized.length > 0) {
    grouped['uncategorized'] = uncategorized;
  }

  return grouped;
}

/**
 * Get group information by ID
 * @param {string} groupId - The group ID
 * @returns {Object|null} - The group object or null
 */
export function getGroupInfo(groupId) {
  if (groupId === 'uncategorized') {
    return {
      id: 'uncategorized',
      name: 'Uncategorized'
    };
  }
  return MAP_GROUPS.find(g => g.id === groupId) || null;
}

/**
 * Get all group IDs in order
 * @returns {Array} - Array of group IDs
 */
export function getAllGroupIds() {
  return MAP_GROUPS.map(g => g.id);
}

