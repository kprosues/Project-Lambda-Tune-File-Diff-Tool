# ECU Tune File Compare

A desktop application built with Electron to visually compare automotive ECU configuration files (.tune format). Features comprehensive comparison tools, visual difference highlighting, filtering options, and both 2D table and 3D surface visualization for map data.

## Features

### File Comparison
- **Dual File Comparison**: Compare two .tune files side-by-side with automatic comparison on load
- **Difference Filtering**: Toggle between showing all maps or only maps with differences
- **Comparison Statistics**: View counts of modified, added, removed, and unchanged maps

### Table View
- **2D Table Visualization**: View map data as interactive 2D tables with sorted row/column headers
- **Heatmap Backgrounds**: All cells colored by value (dark blue = lowest, bright red = highest) with 30% opacity
- **Visual Difference Highlighting**: 
  - Modified cells shown with borders (bold and italic text)
  - Color-coded indicators (green=added, red=removed, yellow=modified)
- **Units Display**: Map units shown next to cell values
- **Automatic Precision**: Decimal precision automatically adjusted based on data
- **Dynamic Sizing**: Tables automatically fit viewport without scrolling
- **Change Display**: Toggle between absolute value changes and percentage changes
- **Sorted Headers**: Columns and rows sorted in ascending order based on index values

### 3D Chart View
- **3D Surface Plot**: Interactive 3D visualization where cell height (Z-axis) represents cell value
- **Axis Mapping**:
  - X-axis: Column index values
  - Y-axis: Row index values
  - Z-axis: Cell values (height/depth)
- **Hover Tooltips**: Display row index, column index, and cell value with units on hover
- **Grid Lines**: Visual grid lines along cell boundaries for easy reference
- **Interactive Controls**: Rotate, zoom, and pan using mouse/trackpad
- **Auto-Fit Camera**: Default zoom fills container height for optimal viewing
- **Color-Coded Surface**: 3D surface uses heatmap colors matching table view

### File Loading
- **Drag & Drop**: Easy file loading via drag-and-drop zones
- **File Picker**: Browse and select files using native file dialogs
- **Error Handling**: User-friendly error messages for invalid files

### User Interface
- **Modern Dark Theme**: Clean, professional interface optimized for automotive tuning workflows
- **Responsive Layout**: Adaptive design that scales with window size
- **Keyboard Navigation**: Navigate between maps and views efficiently

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

### Available Scripts

- **`npm run dev`**: Build and start the Electron app in development mode (auto-builds before start)
- **`npm run dev:watch`**: Run webpack in watch mode for continuous rebuilds (run in separate terminal)
- **`npm run dev:start`**: Manual build and start (alternative to `npm run dev`)
- **`npm run build`**: Build the React app for production (outputs to `dist/`)
- **`npm run watch`**: Watch for file changes and rebuild automatically
- **`npm start`**: Start Electron with the built app (requires `npm run build` first)

### Development Workflow

1. **Single Terminal**: Use `npm run dev` which automatically builds before starting
2. **Two Terminals** (recommended for faster iteration):
   - Terminal 1: `npm run dev:watch` (continuous webpack builds)
   - Terminal 2: `npm run dev` (runs Electron)

This will start the Electron app with DevTools enabled. Changes to React components will require a rebuild, which happens automatically with the watch commands.

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

### Troubleshooting

- **Symlink errors on Windows**: If you encounter "Cannot create symbolic link" errors during packaging, run `npm run clean:cache` first, or run the command prompt as Administrator.
- **GPU process errors**: GPU acceleration is disabled by default to prevent compatibility issues. This is configured in `main.js`.
- **Blank window**: Ensure `npm run build` or `npm run predev` has been run to generate the `dist/` folder before starting the app.

## Usage

1. **Launch the application** (either via `npm run dev` for development or run the packaged executable)
2. **Load Files**:
   - Drag and drop two `.tune` files onto the respective drop zones (File 1 and File 2)
   - Or click "Browse Files" to use the native file picker
   - Files are automatically compared when both are loaded
3. **View Comparison**:
   - The left panel shows all maps (or filtered to differences only)
   - Maps with changes are highlighted with color indicators
   - Select any map from the list to view detailed comparison
4. **Explore Maps**:
   - Use the **Table** button to view data as a 2D table with heatmap colors
   - Use the **Chart** button to view data as an interactive 3D surface plot
   - In 3D view: Click and drag to rotate, scroll to zoom, right-click and drag to pan
   - Hover over cells in 3D view to see row, column, and value with units
5. **Customize View**:
   - Check "Show differences only" to filter the map list
   - Toggle between "Abs" (absolute changes) and "%" (percentage changes) to change how differences are displayed
   - Modified cells are shown in bold and italic with colored borders

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
      "data": ["value1, value2, value3", "value4, value5, value6"],
      "units": "unit",
      "rows": 2,
      "cols": 3
    }
  ]
}
```

### Map Structure

- **id**: Unique identifier for the map
- **data**: Array of strings containing comma-separated numeric values (each string represents a row)
- **units**: Optional unit string (e.g., "kPa", "RPM", "°C")
- **rows/cols**: Optional dimensions (auto-detected if not present)
- **Index Arrays**: Row and column index arrays are automatically detected by matching map IDs or dimensions

### Comparison Logic

- Maps are compared by their `id` field
- Numeric values are compared with tolerance for floating-point precision
- Differences are categorized as:
  - **Added**: Maps present in File 2 but not in File 1
  - **Removed**: Maps present in File 1 but not in File 2
  - **Modified**: Maps with different values between files
  - **Unchanged**: Identical maps in both files

## Technical Stack

- **Framework**: Electron 27.0
- **UI Library**: React 18.2
- **3D Visualization**: Three.js 0.158 with React Three Fiber 8.18
- **Build Tool**: Webpack 5.89 with Babel
- **Packaging**: Electron Builder 24.9
- **Styling**: CSS with modern dark theme and CSS variables

### Key Libraries
- `three`: 3D graphics library for surface plots
- `@react-three/fiber`: React renderer for Three.js
- `react` / `react-dom`: UI component framework
- `electron`: Desktop application framework
- `webpack`: Module bundler and build tool
- `electron-builder`: Application packaging and distribution

## Project Structure

```
ecu-tune-compare/
├── main.js                    # Electron main process
├── preload.js                 # IPC bridge for secure file access
├── index.html                 # Main HTML template
├── webpack.config.js          # Webpack build configuration
├── .babelrc                   # Babel transpilation config
├── .electron-builder.config.js # Electron Builder packaging config
├── package.json               # Dependencies and scripts
├── dist/                      # Webpack build output (generated)
├── release/                   # Packaged executables (generated)
└── src/
    └── renderer/
        ├── main.js            # React application entry point
        ├── components/
        │   ├── App.jsx        # Root component
        │   ├── FileLoader.jsx # File drag-drop and picker
        │   ├── ComparisonView.jsx # Main comparison interface
        │   ├── MapListPanel.jsx   # Map selection sidebar
        │   ├── MapView.jsx    # Map view container with mode toggle
        │   ├── MapTable.jsx   # 2D table visualization
        │   ├── MapChart.jsx   # 3D surface plot visualization
        │   └── DiffView.jsx   # Diff visualization utilities
        ├── utils/
        │   ├── parser.js      # .tune file parsing and validation
        │   ├── comparator.js  # Comparison and diffing logic
        │   ├── formatters.js  # Number formatting, heatmap colors, precision detection
        │   └── mapGroups.js   # Map grouping utilities
        └── styles/
            └── main.css       # Global styles and theme
```

## License

MIT

