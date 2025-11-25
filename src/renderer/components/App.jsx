import React, { useState, useCallback } from 'react';
import FileLoader from './FileLoader';
import ComparisonView from './ComparisonView';
import { parseTuneFile } from '../utils/parser';
import { compareTuneFiles } from '../utils/comparator';

function App() {
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileLoad = useCallback(async (fileData, side) => {
    try {
      setLoading(true);
      setError(null);

      if (!fileData || !fileData.data) {
        throw new Error('Invalid file data');
      }

      const parsed = parseTuneFile(fileData.data);
      const fileInfo = {
        ...parsed,
        path: fileData.path,
        name: fileData.name
      };

      if (side === 'left') {
        setFile1(fileInfo);
      } else {
        setFile2(fileInfo);
      }

      // If both files are loaded, compare them
      if (side === 'left' && file2) {
        try {
          const comparisonResult = compareTuneFiles(fileInfo, file2);
          setComparison(comparisonResult);
        } catch (compareErr) {
          setError(`Comparison failed: ${compareErr.message}`);
          console.error(compareErr);
        }
      } else if (side === 'right' && file1) {
        try {
          const comparisonResult = compareTuneFiles(file1, fileInfo);
          setComparison(comparisonResult);
        } catch (compareErr) {
          setError(`Comparison failed: ${compareErr.message}`);
          console.error(compareErr);
        }
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to load file. Please ensure it is a valid .tune file.';
      setError(errorMessage);
      console.error('File load error:', err);
    } finally {
      setLoading(false);
    }
  }, [file1, file2]);

  const handleCompare = useCallback(() => {
    if (!file1 || !file2) {
      setError('Please load both files before comparing');
      return;
    }

    try {
      const comparisonResult = compareTuneFiles(file1, file2);
      setComparison(comparisonResult);
      setError(null);
    } catch (err) {
      setError(`Comparison failed: ${err.message}`);
      console.error(err);
    }
  }, [file1, file2]);

  const handleClear = useCallback(() => {
    setFile1(null);
    setFile2(null);
    setComparison(null);
    setError(null);
  }, []);

  if (!file1 || !file2) {
    return (
      <div className="app-container">
        <FileLoader
          onFileLoad={handleFileLoad}
          file1={file1}
          file2={file2}
          loading={loading}
          error={error}
          onClear={handleClear}
        />
      </div>
    );
  }

  return (
    <div className="app-container">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
      <ComparisonView
        file1={file1}
        file2={file2}
        comparison={comparison}
        onFileLoad={handleFileLoad}
        onCompare={handleCompare}
        onClear={handleClear}
      />
    </div>
  );
}

export default App;

