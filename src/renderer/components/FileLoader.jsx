import React, { useState, useCallback } from 'react';

function FileLoader({ onFileLoad, file1, file2, loading, error, onClear }) {
  const [dragging, setDragging] = useState({ left: false, right: false });

  const handleFileSelect = useCallback(async (side) => {
    try {
      const fileData = await window.electronAPI.openFileDialog();
      if (fileData && fileData.data) {
        onFileLoad(fileData, side);
      } else if (fileData === null) {
        // User cancelled dialog - no error needed
        return;
      } else {
        console.error('Invalid file data received from dialog');
      }
    } catch (err) {
      console.error('Error opening file dialog:', err);
      // Error will be shown by parent component
    }
  }, [onFileLoad]);

  const handleDragOver = useCallback((e, side) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(prev => ({ ...prev, [side]: true }));
  }, []);

  const handleDragLeave = useCallback((e, side) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(prev => ({ ...prev, [side]: false }));
  }, []);

  const handleDrop = useCallback(async (e, side) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(prev => ({ ...prev, [side]: false }));

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.tune') || file.name.endsWith('.json')) {
        try {
          if (!file.path) {
            console.error('File path not available. Please use the file picker.');
            return;
          }
          const fileData = await window.electronAPI.readFile(file.path);
          if (fileData && fileData.data) {
            onFileLoad(fileData, side);
          } else {
            console.error('Invalid file data received');
          }
        } catch (err) {
          console.error('Error reading dropped file:', err);
          // Error will be handled by parent component
        }
      } else {
        console.warn('Invalid file type. Please drop a .tune or .json file.');
      }
    }
  }, [onFileLoad]);

  return (
    <div className="file-loader">
      <div className="file-loader-header">
        <h1>ECU Tune File Compare</h1>
        <p>Load two .tune files to compare their configurations</p>
      </div>

      <div className="file-loader-grid">
        <div
          className={`file-drop-zone ${dragging.left ? 'dragging' : ''} ${file1 ? 'loaded' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'left')}
          onDragLeave={(e) => handleDragLeave(e, 'left')}
          onDrop={(e) => handleDrop(e, 'left')}
        >
          <div className="drop-zone-content">
            {file1 ? (
              <>
                <div className="file-icon">✓</div>
                <div className="file-name">{file1.name}</div>
                <div className="file-info">
                  <div>Maps: {file1.maps?.length || 0}</div>
                  <div>Version: {file1.version || 'N/A'}</div>
                </div>
                <button 
                  className="btn-change"
                  onClick={() => handleFileSelect('left')}
                  disabled={loading}
                >
                  Change File
                </button>
              </>
            ) : (
              <>
                <div className="file-icon">📁</div>
                <h3>File 1</h3>
                <p>Drag & drop a .tune file here</p>
                <p className="or-text">or</p>
                <button 
                  className="btn-primary"
                  onClick={() => handleFileSelect('left')}
                  disabled={loading}
                >
                  Browse Files
                </button>
              </>
            )}
          </div>
        </div>

        <div className="vs-divider">
          <span>VS</span>
        </div>

        <div
          className={`file-drop-zone ${dragging.right ? 'dragging' : ''} ${file2 ? 'loaded' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'right')}
          onDragLeave={(e) => handleDragLeave(e, 'right')}
          onDrop={(e) => handleDrop(e, 'right')}
        >
          <div className="drop-zone-content">
            {file2 ? (
              <>
                <div className="file-icon">✓</div>
                <div className="file-name">{file2.name}</div>
                <div className="file-info">
                  <div>Maps: {file2.maps?.length || 0}</div>
                  <div>Version: {file2.version || 'N/A'}</div>
                </div>
                <button 
                  className="btn-change"
                  onClick={() => handleFileSelect('right')}
                  disabled={loading}
                >
                  Change File
                </button>
              </>
            ) : (
              <>
                <div className="file-icon">📁</div>
                <h3>File 2</h3>
                <p>Drag & drop a .tune file here</p>
                <p className="or-text">or</p>
                <button 
                  className="btn-primary"
                  onClick={() => handleFileSelect('right')}
                  disabled={loading}
                >
                  Browse Files
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading file...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {(file1 || file2) && (
        <div className="file-loader-actions">
          <button className="btn-secondary" onClick={onClear}>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

export default FileLoader;

