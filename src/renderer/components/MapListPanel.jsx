import React, { useMemo, useState, useCallback } from 'react';
import { getDifferenceColorClass, formatMapId } from '../utils/formatters';
import { groupMaps, getGroupInfo, getAllGroupIds } from '../utils/mapGroups';

function MapListPanel({ comparison, selectedMapId, onMapSelect, showDifferencesOnly }) {
  // State for tracking which groups are expanded/collapsed
  const [expandedGroups, setExpandedGroups] = useState(() => {
    // Initialize all groups as expanded
    const allGroups = getAllGroupIds();
    const expanded = {};
    allGroups.forEach(groupId => {
      expanded[groupId] = true;
    });
    expanded['uncategorized'] = true;
    return expanded;
  });

  // Toggle group expansion
  const toggleGroup = useCallback((groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  }, []);

  // Group and sort maps
  const groupedMaps = useMemo(() => {
    if (!comparison || !comparison.maps) return {};

    const maps = Object.entries(comparison.maps).map(([id, diff]) => ({
      id,
      ...diff
    }));

    // Group maps by category
    const grouped = groupMaps(maps);

    // Sort maps within each group
    const typeOrder = { modified: 0, added: 1, removed: 2, unchanged: 3 };
    
    Object.keys(grouped).forEach(groupId => {
      grouped[groupId] = grouped[groupId].sort((a, b) => {
        const orderA = typeOrder[a.type] || 99;
        const orderB = typeOrder[b.type] || 99;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.id.localeCompare(b.id);
      });
    });

    return grouped;
  }, [comparison]);

  // Get total map count
  const totalMapCount = useMemo(() => {
    return Object.values(groupedMaps).reduce((sum, maps) => sum + maps.length, 0);
  }, [groupedMaps]);

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

  // Render a single map item
  const renderMapItem = (map) => {
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
  };

  // Render a group section
  const renderGroup = (groupId, maps) => {
    if (maps.length === 0) return null;

    const groupInfo = getGroupInfo(groupId);
    if (!groupInfo) return null;

    const isExpanded = expandedGroups[groupId] !== false;
    const hasDifferences = maps.some(map => map.type !== 'unchanged');

    return (
      <div key={groupId} className="map-group">
        <div
          className="map-group-header"
          onClick={() => toggleGroup(groupId)}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <div className="map-group-header-left">
            <span className="map-group-toggle">
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="map-group-name">{groupInfo.name}</span>
          </div>
          <div className="map-group-header-right">
            <span className="map-group-count">{maps.length}</span>
            {hasDifferences && (
              <span className="map-group-badge">Modified</span>
            )}
          </div>
        </div>
        {isExpanded && (
          <div className="map-group-content">
            {maps.map(map => renderMapItem(map))}
          </div>
        )}
      </div>
    );
  };

  // Get ordered group IDs (prioritize groups with differences, then alphabetical)
  const orderedGroupIds = useMemo(() => {
    const groups = Object.keys(groupedMaps).filter(gid => groupedMaps[gid].length > 0);
    
    // Separate groups with and without differences
    const withDifferences = [];
    const withoutDifferences = [];
    
    groups.forEach(groupId => {
      const hasDiff = groupedMaps[groupId].some(map => map.type !== 'unchanged');
      if (hasDiff) {
        withDifferences.push(groupId);
      } else {
        withoutDifferences.push(groupId);
      }
    });

    // Sort each list by group name
    const sortByGroupName = (a, b) => {
      const nameA = getGroupInfo(a)?.name || '';
      const nameB = getGroupInfo(b)?.name || '';
      return nameA.localeCompare(nameB);
    };

    return [...withDifferences.sort(sortByGroupName), ...withoutDifferences.sort(sortByGroupName)];
  }, [groupedMaps]);

  return (
    <div className="map-list-panel">
      <div className="panel-header">
        <h2>Maps</h2>
        <div className="map-count">
          {totalMapCount} {totalMapCount === 1 ? 'map' : 'maps'}
        </div>
      </div>
      <div className="panel-content">
        <div className="map-list">
          {totalMapCount === 0 ? (
            <div className="no-maps">
              <p>No {showDifferencesOnly ? 'differences' : 'maps'} found</p>
            </div>
          ) : (
            orderedGroupIds.map(groupId => renderGroup(groupId, groupedMaps[groupId]))
          )}
        </div>
      </div>
    </div>
  );
}

export default MapListPanel;

