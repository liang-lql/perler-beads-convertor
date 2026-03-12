# Perler Beads Pattern Generator

[中文文档](README_CN.md) | English

A web-based application for creating Perler bead patterns. This tool allows users to design, customize, and export printable patterns for Perler bead crafts.

**[Live Demo](https://perler-beads-convertor.vercel.app/)**

## Features

- **Canvas Drawing**: Draw on a customizable grid canvas
- **Color Palette**: Preset colors plus custom color selection
- **Export Options**: Export as PNG or JPG with customizable settings
- **Print Support**: Print patterns with grid lines and statistics
- **Local Storage**: Automatically saves your work locally

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## Development

### Project Structure

```
src/
├── main.js           # Vue app entry point
├── App.vue           # Main app component
└── components/
    ├── CanvasGrid.vue      # Canvas with grid and drawing
    ├── CanvasSettings.vue  # Canvas size and settings
    ├── ColorPalette.vue    # Color selection
    ├── DrawingTools.vue   # Drawing tools
    └── ExportPanel.vue    # Export and print options
```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.