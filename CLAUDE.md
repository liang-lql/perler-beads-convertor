# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Perler beads pattern generator tool - a pure frontend web application for children and craft enthusiasts. It creates downloadable, printable Perler bead patterns with features like canvas-based drawing, color selection, image import, and export functionality. The application will be deployed to Vercel.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Technical Architecture

### Frontend Stack
- Vue 3 with Composition API
- Vite for build tooling
- Canvas API for grid rendering and drawing operations
- LocalStorage for persistence

### Key Components
1. **CanvasGrid** - Core canvas component with grid rendering, zoom/pan (0.5x-5x), and drawing operations
   - Handles mouse/touch events for drawing
   - Maintains grid state in 2D array
   - Supports drag drawing and eraser modes
   - Displays reference images with adjustable opacity

2. **CanvasSettings** - Manages canvas dimensions and display options
   - Custom width/height (1-100 beads)
   - Preset size shortcuts
   - Grid toggle and background color
   - Image import and alignment to grid

3. **ColorPalette** - Color selection system
   - 24 preset Perler bead colors
   - Custom color picker
   - Recent colors (stored in localStorage)

4. **DrawingTools** - Tool selection and actions
   - Pen/Eraser tools
   - Undo/redo with history (20 steps)
   - Keyboard shortcuts: Ctrl+Z/Cmd+Z for undo, Ctrl+Shift+Z/Cmd+Shift+Z or Ctrl+Y/Cmd+Y for redo

5. **ExportPanel** - Export and print functionality
   - PNG/JPG export options
   - Scale settings (1x-10x)
   - Print preview with statistics
   - Color bead count display

## Data Flow

1. **Grid State**: Maintained in App.vue as 2D array (gridData)
2. **Color Management**: Current color stored in App.vue, passed to all components
3. **Canvas Updates**: Drawing events bubble up from CanvasGrid to App.vue
4. **Persistence**: Canvas state saved to localStorage automatically

## Implementation Notes

### Canvas Coordinate System
- Each cell represents one Perler bead
- Grid coordinates (x, y) map to canvas pixels (x * cellSize, y * cellSize)
- Zoom/pan handled via CSS transform on canvas wrapper

### Performance Considerations
- Canvas redraws on every state change
- Large grids (100x100) may have 300ms response time
- Use v-show for frequently toggled components

### Future Enhancements
- Image import with grid alignment
- Undo/redo with history stack
- Symmetry drawing modes
- Layer management for reference images
- Advanced shape tools

## Browser Compatibility
- Chrome, Firefox, Edge, Safari (modern browsers)
- Responsive design for desktop (320px-1920px)
- Touch support for mobile/tablet devices

## File Structure
```
/
├── src/
│   ├── main.js          # Vue app entry
│   ├── App.vue          # Main app component
│   └── components/
│       ├── CanvasGrid.vue       # Core canvas
│       ├── CanvasSettings.vue   # Canvas settings
│       ├── ColorPalette.vue     # Color selection
│       ├── DrawingTools.vue     # Drawing tools
│       └── ExportPanel.vue      # Export/print
├── styles/
│   └── main.css         # Global styles
├── index.html           # HTML entry
├── package.json         # Dependencies
├── vite.config.js       # Vite config
└── CLAUDE.md            # This file
```