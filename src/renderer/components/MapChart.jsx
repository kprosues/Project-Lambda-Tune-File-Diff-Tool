import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { calculateDataRange, valueToHeatmapColor } from '../utils/formatters';

// OrbitControls wrapper for react-three/fiber
function OrbitControls(props) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    const controls = new ThreeOrbitControls(camera, gl.domElement);
    controls.enableDamping = props.enableDamping !== false;
    controls.dampingFactor = props.dampingFactor || 0.05;
    if (props.minDistance !== undefined) controls.minDistance = props.minDistance;
    if (props.maxDistance !== undefined) controls.maxDistance = props.maxDistance;
    
    controlsRef.current = controls;

    return () => {
      controls.dispose();
    };
  }, [camera, gl, props.enableDamping, props.dampingFactor, props.minDistance, props.maxDistance]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return null;
}


function SurfaceMesh({ data, rowIndexData, colIndexData, heatmapRange, mapDiff, data1, data2, isComparing, meshRef, cellMapRef }) {

  // Prepare 3D surface geometry
  const surfaceGeometry = useMemo(() => {
    if (!data || data.length === 0) return null;

    const rows = data.length;
    const cols = data[0]?.length || 0;
    
    if (rows === 0 || cols === 0) return null;
    
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const colors = [];

    // Scale factor for Z axis (depth/height) - cell values
    const minVal = heatmapRange.min;
    const maxVal = heatmapRange.max;
    const valueRange = maxVal - minVal || 1;
    // Reduced Z scaling for subtler depth visualization
    const heightScale = valueRange > 0 ? (10 / valueRange) : 1;
    
    // Use actual index values if available, otherwise use array indices
    // X axis: column index values (from colIndexData)
    // Y axis: row index values (from rowIndexData)
    // Z axis: cell values (depth/height)
    
    // Get the actual index values
    const xValues = colIndexData && colIndexData.length === cols 
      ? colIndexData 
      : Array.from({ length: cols }, (_, i) => i);
    const yValues = rowIndexData && rowIndexData.length === rows 
      ? rowIndexData 
      : Array.from({ length: rows }, (_, i) => i);
    
    // Calculate scaling for X and Y axes to normalize them
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const xRange = xMax - xMin || 1;
    const xScale = 10 / xRange; // Normalize to reasonable size
    
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yRange = yMax - yMin || 1;
    const yScale = 10 / yRange; // Normalize to reasonable size

    // Calculate center offsets to center the surface around origin
    const xCenter = ((xMax + xMin) / 2 - xMin) * xScale;
    const yCenter = ((yMax + yMin) / 2 - yMin) * yScale;
    const zCenter = (maxVal + minVal) / 2 - minVal; // Center of Z values

    // Generate vertices for each cell
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = data[row]?.[col];
        const actualValue = typeof value === 'number' && isFinite(value) ? value : minVal;
        
        // Use actual index values for X and Y, cell value for Z
        // Center around origin
        const x = (xValues[col] - xMin) * xScale - xCenter;
        const y = (yValues[row] - yMin) * yScale - yCenter; // Y is row index values
        const z = (actualValue - minVal) * heightScale - zCenter * heightScale; // Z is cell value (depth/height), centered
        
        vertices.push(x, y, z);

        // Get color based on value
        const heatmapColor = valueToHeatmapColor(actualValue, minVal, maxVal);
        // Parse rgba color
        const match = heatmapColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
          const r = parseInt(match[1]) / 255;
          const g = parseInt(match[2]) / 255;
          const b = parseInt(match[3]) / 255;
          colors.push(r, g, b);
        } else {
          colors.push(0.5, 0.5, 0.5); // Default gray
        }
      }
    }

    // Create faces (triangles) connecting adjacent vertices
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const i = row * cols + col;
        const i1 = i + 1;
        const i2 = (row + 1) * cols + col;
        const i3 = i2 + 1;

        // First triangle
        indices.push(i, i2, i1);
        // Second triangle
        indices.push(i1, i2, i3);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Create a mapping from face index to cell data for hover detection
    const cellMap = new Map();
    let faceIndex = 0;
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const value = data[row]?.[col];
        const actualValue = typeof value === 'number' && isFinite(value) ? value : minVal;
        const colValue = xValues[col];
        const rowValue = yValues[row];
        
        // Each quad has 2 triangles, map both to the same cell
        cellMap.set(faceIndex, { row, col, value: actualValue, colValue, rowValue });
        cellMap.set(faceIndex + 1, { row, col, value: actualValue, colValue, rowValue });
        faceIndex += 2;
      }
    }
    cellMapRef.current = cellMap;

    return geometry;
  }, [data, heatmapRange, rowIndexData, colIndexData]);


  if (!surfaceGeometry) {
    return null;
  }

  // Create grid lines geometry by connecting vertices along cell boundaries
  const gridLinesGeometry = useMemo(() => {
    if (!data || data.length === 0 || !surfaceGeometry) return null;

    const rows = data.length;
    const cols = data[0]?.length || 0;
    if (rows === 0 || cols === 0) return null;

    const positions = [];
    const positionsAttr = surfaceGeometry.attributes.position;

    // Helper to get vertex position from index
    const getVertex = (index) => {
      if (index < positionsAttr.count) {
        return new THREE.Vector3(
          positionsAttr.getX(index),
          positionsAttr.getY(index),
          positionsAttr.getZ(index)
        );
      }
      return null;
    };

    // Draw horizontal grid lines (along rows)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const idx1 = row * cols + col;
        const idx2 = row * cols + col + 1;
        const v1 = getVertex(idx1);
        const v2 = getVertex(idx2);
        if (v1 && v2) {
          positions.push(v1.x, v1.y, v1.z);
          positions.push(v2.x, v2.y, v2.z);
        }
      }
    }

    // Draw vertical grid lines (along columns)
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows - 1; row++) {
        const idx1 = row * cols + col;
        const idx2 = (row + 1) * cols + col;
        const v1 = getVertex(idx1);
        const v2 = getVertex(idx2);
        if (v1 && v2) {
          positions.push(v1.x, v1.y, v1.z);
          positions.push(v2.x, v2.y, v2.z);
        }
      }
    }

    if (positions.length === 0) return null;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }, [surfaceGeometry, data]);

  return (
    <group>
      {/* Main surface mesh */}
      <mesh 
        ref={meshRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        geometry={surfaceGeometry}
      >
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      {/* Grid lines overlay */}
      {gridLinesGeometry && gridLinesGeometry.attributes.position.count > 0 && (
        <lineSegments 
          rotation={[-Math.PI / 2, 0, 0]} 
          geometry={gridLinesGeometry}
        >
          <lineBasicMaterial 
            color="#cccccc" 
            opacity={0.8} 
            transparent 
            depthTest={true}
            depthWrite={false}
          />
        </lineSegments>
      )}
    </group>
  );
}

// Canvas-level hover handler component
function CanvasHoverHandler({ meshRef, cellMapRef, onHover }) {
  const { camera, gl, raycaster, pointer, size } = useThree();
  const meshIntersectRef = useRef(null);

  useFrame(() => {
    if (!meshRef.current || !cellMapRef.current || !cellMapRef.current.size) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(meshRef.current);
    
    if (intersects.length > 0 && intersects[0].faceIndex !== undefined) {
      const faceIndex = intersects[0].faceIndex;
      if (cellMapRef.current.has(faceIndex)) {
        const cellData = cellMapRef.current.get(faceIndex);
        if (!meshIntersectRef.current || meshIntersectRef.current !== cellData) {
          meshIntersectRef.current = cellData;
          const rect = gl.domElement.getBoundingClientRect();
          // Convert normalized pointer coordinates (-1 to 1) to screen coordinates
          const screenX = (pointer.x * (size.width / 2)) + (size.width / 2);
          const screenY = (-pointer.y * (size.height / 2)) + (size.height / 2);
          onHover(cellData, rect.left + screenX, rect.top + screenY);
        }
      }
    } else {
      if (meshIntersectRef.current !== null) {
        meshIntersectRef.current = null;
        onHover(null);
      }
    }
  });

  return null;
}

function MapChart({ map1, map2, mapDiff, rowIndexData, colIndexData }) {
  const data1 = map1?.data || [];
  const data2 = map2?.data || [];
  const displayData = map2 && map2.data ? data2 : data1;
  const isComparing = map1 && map2;
  
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
  
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const meshRef = useRef(null);
  const cellMapRef = useRef(null);

  const wrapperRef = useRef(null);

  const handleHover = useCallback((cellData, clientX, clientY) => {
    if (cellData && wrapperRef.current) {
      setHoveredCell(cellData);
      const rect = wrapperRef.current.getBoundingClientRect();
      setTooltipPosition({ 
        x: clientX - rect.left, 
        y: clientY - rect.top 
      });
    } else {
      setHoveredCell(null);
    }
  }, []);

  // Calculate heatmap color range
  const heatmapRange = useMemo(() => {
    return calculateDataRange(displayData);
  }, [displayData]);

  if (!displayData || displayData.length === 0) {
    return (
      <div className="map-chart-empty">
        <p>No chart data available</p>
      </div>
    );
  }

  // For 1D data, convert to 2D surface
  const surfaceData = useMemo(() => {
    if (displayData.length === 1) {
      // Convert 1D to 2D by creating a single row surface
      return displayData;
    }
    return displayData;
  }, [displayData]);

  const maxRows = surfaceData.length;
  const maxCols = surfaceData[0]?.length || 0;
  
  // Get index ranges for axis info
  const xValues = colIndexData && colIndexData.length === maxCols 
    ? colIndexData 
    : Array.from({ length: maxCols }, (_, i) => i);
  const yValues = rowIndexData && rowIndexData.length === maxRows 
    ? rowIndexData 
    : Array.from({ length: maxRows }, (_, i) => i);
  
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  
  // Calculate surface bounds for fitting to viewport
  // Surface is normalized: X and Y are ~10 units, Z varies by heightScale
  const valueRange = heatmapRange.max - heatmapRange.min || 1;
  const heightScale = valueRange > 0 ? (10 / valueRange) : 1;
  const surfaceHeight = valueRange * heightScale; // Height of surface in Z direction
  const surfaceWidth = 10; // Normalized X dimension
  const surfaceDepth = 10; // Normalized Y dimension
  
  // Calculate the maximum dimension for fitting
  const maxSurfaceDimension = Math.max(surfaceWidth, surfaceDepth, surfaceHeight);
  
  // State to track container dimensions
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  
  // Update container size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    
    // Use ResizeObserver for more accurate tracking
    let resizeObserver = null;
    if (wrapperRef.current) {
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(wrapperRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);
  
  // Calculate camera distance to fit surface to container height
  // For perspective camera with vertical FOV: visibleHeight = 2 * distance * tan(fov / 2)
  // We want the surface (maxSurfaceDimension) to fit within container height
  const fov = 50;
  const fovRad = (fov * Math.PI) / 180;
  
  // Calculate the distance needed so that visibleHeight contains the surface
  // visibleHeight = 2 * distance * tan(fov/2)
  // We want: maxSurfaceDimension <= fillRatio * visibleHeight
  // Solving: distance = maxSurfaceDimension / (fillRatio * 2 * tan(fov/2))
  const fillRatio = 0.9; // Fill 90% of viewport height
  const distance = maxSurfaceDimension / (fillRatio * 2 * Math.tan(fovRad / 2));
  
  // Ensure minimum distance to prevent zooming too close
  const minDistance = 5;
  const adjustedDistance = Math.max(distance, minDistance);

  return (
    <div className="map-chart-container">
      <div className="map-chart-3d-wrapper" ref={wrapperRef}>
        <Canvas camera={{ position: [adjustedDistance * 0.7, adjustedDistance * 0.7, adjustedDistance * 0.7], fov: fov }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={0.8} />
          <directionalLight position={[-10, 10, -5]} intensity={0.4} />
          <SurfaceMesh
            data={surfaceData}
            rowIndexData={rowIndexData}
            colIndexData={colIndexData}
            heatmapRange={heatmapRange}
            mapDiff={mapDiff}
            data1={data1}
            data2={data2}
            isComparing={isComparing}
            meshRef={meshRef}
            cellMapRef={cellMapRef}
          />
          <CanvasHoverHandler
            meshRef={meshRef}
            cellMapRef={cellMapRef}
            onHover={handleHover}
          />
          <OrbitControls 
            enableDamping 
            dampingFactor={0.05}
            minDistance={adjustedDistance * 0.5}
            maxDistance={adjustedDistance * 3}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Canvas>
        {hoveredCell && (
          <div 
            className="chart-tooltip"
            style={{
              position: 'absolute',
              left: `${tooltipPosition.x + 10}px`,
              top: `${tooltipPosition.y - 10}px`,
              pointerEvents: 'none',
            }}
          >
            <div className="tooltip-content">
              <div><strong>Row:</strong> {hoveredCell.rowValue.toFixed(2)}</div>
              <div><strong>Column:</strong> {hoveredCell.colValue.toFixed(2)}</div>
              <div><strong>Cell Value:</strong> {hoveredCell.value.toFixed(2)}{unitsString ? ` ${unitsString}` : ''}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapChart;
