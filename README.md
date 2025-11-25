# ECU Tune File Compare

A desktop application built with Electron to visually compare automotive ECU configuration files (.tune format). Features side-by-side comparison, visual difference highlighting, filtering options, and both table and chart visualization for map data.

## Features

- **Side-by-Side Comparison**: Compare two .tune files simultaneously
- **Visual Difference Highlighting**: Color-coded differences (green=added, red=removed, yellow=modified)
- **Filtering Options**: Toggle between showing all maps or only differences
- **Table Visualization**: View map data as 2D tables with row/column headers
- **Chart Visualization**: Optional chart/graph views for map data
- **Drag & Drop**: Easy file loading via drag-and-drop or file picker
- **Modern UI**: Clean, dark-themed interface optimized for automotive tuning workflows

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To run the application in development mode:

```bash
npm run dev
```

This will start the Electron app with hot reloading and DevTools enabled.

## Building

To build the application for production:

```bash
npm run build
npm start
```

## Packaging for Distribution

To create a standalone executable that can be run without npm:

**Note**: If you encounter symlink permission errors on Windows, run `npm run clean:cache` first, or run the command prompt as Administrator.

### Windows

```bash
npm run dist:win
```

This creates:
- **Installer**: `release/ECU Tune Compare Setup x.x.x.exe` (NSIS installer)
- **Portable**: `release/ECU Tune Compare x.x.x.exe` (standalone executable)

### macOS

```bash
npm run dist:mac
```

This creates a DMG file in the `release/` directory.

### Linux

```bash
npm run dist:linux
```

This creates AppImage and DEB packages in the `release/` directory.

### All Platforms

```bash
npm run dist
```

This builds for the current platform.

### Test Build (No Installer)

```bash
npm run pack
```

This creates an unpacked app in `release/` that you can test without creating an installer.

**Note**: After packaging, the executable will be in the `release/` directory. The installer/executable can be distributed and run on any compatible Windows system without requiring Node.js or npm.

## Usage

1. Launch the application
2. Load two .tune files using:
   - Drag and drop files onto the drop zones
   - Click "Browse Files" to use the file picker
3. The application automatically compares the files when both are loaded
4. Select a map from the left panel to view detailed comparison
5. Toggle between table and chart views using the buttons in the map view
6. Use the "Show differences only" checkbox to filter the map list

## File Format

The application expects `.tune` files in JSON format with the following structure:

```json
{
  ".cal_id": "AF041",
  ".car_id": "subaru_gc8g_sti",
  ".meta": {
    "Author": "",
    "Comments": "..."
  },
  ".rom_id": "1604690505",
  ".version": "1.6.36.2",
  "maps": [
    {
      "id": "map_id",
      "data": ["value1, value2, ..."],
      "units": "unit"
    }
  ]
}
```

## Technical Stack

- **Framework**: Electron
- **UI Library**: React
- **Charts**: Chart.js with react-chartjs-2
- **Build Tool**: Webpack
- **Styling**: CSS with modern dark theme

## Project Structure

```
ecu-tune-compare/
├── main.js                 # Electron main process
├── preload.js             # IPC bridge
├── index.html             # Main HTML
├── webpack.config.js      # Webpack configuration
├── package.json           # Dependencies
└── src/
    └── renderer/
        ├── main.js        # React entry point
        ├── components/    # React components
        ├── utils/         # Utilities (parser, comparator, formatters)
        └── styles/        # CSS styles
```

## License

MIT

