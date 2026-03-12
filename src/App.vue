<template>
  <div class="app">
    <header class="app-header">
      <h1>{{ t('app.title') }}</h1>
      <button class="lang-switch" @click="toggleLanguage" :title="t('language.switch')">
        {{ locale === 'en' ? '中文' : 'EN' }}
      </button>
    </header>

    <div class="main-layout">
      <!-- Top Toolbar -->
      <div class="top-toolbar">
        <div class="toolbar-section tools-section">
          <DrawingTools
            :current-tool="currentTool"
            @tool-change="(tool) => currentTool = tool"
            @brush-size-change="(size) => brushSize = size"
            @action="handleToolAction"
          />
        </div>
        <div class="toolbar-section colors-section">
          <ColorPalette
            :current-color="currentColor"
            @color-change="(color) => currentColor = color"
          />
        </div>
        <div class="toolbar-section actions-section">
          <ExportPanel
            :grid-data="gridData"
            :width="canvasWidth"
            :height="canvasHeight"
            :board-width="boardWidth"
            :board-height="boardHeight"
            :show-split-lines="showSplitLines"
            @export="handleExport"
            @print="handlePrint"
          />
        </div>
      </div>

      <div class="content-area">
        <!-- Left Panel - Basic Settings -->
        <div class="left-panel">
          <div class="panel-section">
            <div class="section-label">{{ t('settings.canvasSize') }}</div>
            <div class="size-inputs">
              <input type="number" v-model.number="canvasWidth" min="1" max="500" class="size-input" />
              <span>×</span>
              <input type="number" v-model.number="canvasHeight" min="1" max="500" class="size-input" />
            </div>
          </div>

          <div class="panel-section">
            <div class="section-label">{{ t('settings.presets') }}</div>
            <div class="preset-buttons">
              <button class="btn btn-sm btn-secondary" @click="applyPreset(20, 20)">20×20</button>
              <button class="btn btn-sm btn-secondary" @click="applyPreset(29, 29)">29×29</button>
              <button class="btn btn-sm btn-secondary" @click="applyPreset(50, 50)">50×50</button>
            </div>
          </div>

          <div class="panel-section">
            <label class="checkbox-row">
              <input type="checkbox" v-model="showGrid" />
              <span>{{ t('settings.showGrid') }}</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" v-model="showSplitLines" />
              <span>{{ t('settings.showSplitLines') }}</span>
            </label>
          </div>

          <div class="panel-section" v-if="showSplitLines">
            <div class="section-label">{{ t('settings.boardSize') }}</div>
            <div class="size-inputs">
              <input type="number" v-model.number="boardWidth" min="10" max="100" class="size-input" />
              <span>×</span>
              <input type="number" v-model.number="boardHeight" min="10" max="100" class="size-input" />
            </div>
            <div class="split-info" v-if="splitInfo">
              {{ splitInfo.cols }} × {{ splitInfo.rows }} = {{ splitInfo.total }} {{ t('settings.boards') }}
            </div>
          </div>

          <div class="panel-section">
            <div class="section-label">{{ t('settings.image') }}</div>
            <input type="file" ref="imageInput" accept="image/*" @change="handleFileSelect" style="display: none" />
            <button class="btn btn-sm btn-secondary" @click="$refs.imageInput.click()" style="width: 100%">
              📷 {{ t('settings.importImage') }}
            </button>
            <button class="btn btn-sm btn-danger" @click="handleCanvasClear" style="width: 100%; margin-top: 0.25rem;">
              🗑️ {{ t('settings.clearCanvas') }}
            </button>
          </div>
        </div>

        <!-- Canvas Area -->
        <div class="canvas-area">
          <CanvasGrid
            ref="canvasGridRef"
            :width="canvasWidth"
            :height="canvasHeight"
            :show-grid="showGrid"
            :bg-color="bgColor"
            :current-color="currentColor"
            :current-tool="currentTool"
            :brush-size="brushSize"
            @draw="handleCanvasDraw"
            @erase="handleCanvasErase"
            @color-pick="handleColorPick"
            :grid-data="gridData"
            :reference-image="referenceImage"
            :show-reference="showReference"
            :reference-opacity="referenceOpacity"
            :board-width="boardWidth"
            :board-height="boardHeight"
            :show-split-lines="showSplitLines"
          />
        </div>
      </div>

      <!-- Color Statistics Bar -->
      <div class="color-stats-bar" v-if="colorStats.length > 0">
        <div class="stats-header">
          <span class="stats-title">{{ t('stats.colorStatistics') }} ({{ colorStats.length }} {{ t('stats.colors') }}, {{ totalBeads }} {{ t('stats.beads') }})</span>
        </div>
        <div class="stats-content">
          <div
            v-for="stat in colorStats"
            :key="stat.hex"
            class="stat-item"
            :title="`${stat.code}: ${stat.name}`"
            @click="currentColor = stat.hex"
          >
            <div class="stat-color" :style="{ backgroundColor: stat.hex }"></div>
            <div class="stat-info">
              <span class="stat-code">{{ stat.code }}</span>
              <span class="stat-count">{{ stat.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CanvasSettings from './components/CanvasSettings.vue'
import ColorPalette from './components/ColorPalette.vue'
import DrawingTools from './components/DrawingTools.vue'
import CanvasGrid from './components/CanvasGrid.vue'
import ExportPanel from './components/ExportPanel.vue'
import { findClosestColor, PERLER_COLORS, getColorByHex } from './utils/colors'

// i18n
const { t, locale } = useI18n()

function toggleLanguage() {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
  localStorage.setItem('perler-language', locale.value)
}

// Canvas state
const canvasWidth = ref(20)
const canvasHeight = ref(20)
const showGrid = ref(true)
const bgColor = ref('#ffffff')
const currentColor = ref('#000000')
const currentTool = ref('pen')
const gridData = ref(Array(canvasHeight.value).fill(null).map(() => Array(canvasWidth.value).fill(null)))
const referenceImage = ref(null)
const showReference = ref(true)
const referenceOpacity = ref(50)

// Board split settings
const boardWidth = ref(29)
const boardHeight = ref(29)
const showSplitLines = ref(false)

// Brush settings
const brushSize = ref(1)

// Split info computed
const splitInfo = computed(() => {
  if (!showSplitLines.value) return null
  const cols = Math.ceil(canvasWidth.value / boardWidth.value)
  const rows = Math.ceil(canvasHeight.value / boardHeight.value)
  return { cols, rows, total: cols * rows }
})

// Preset sizes
function applyPreset(w, h) {
  canvasWidth.value = w
  canvasHeight.value = h
}

// File select handler
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        referenceImage.value = img
        convertImageToBeads(img)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// Color statistics computed
const colorStats = computed(() => {
  const stats = {}
  if (!gridData.value || !gridData.value.length) return []

  for (let y = 0; y < gridData.value.length; y++) {
    for (let x = 0; x < gridData.value[y].length; x++) {
      const color = gridData.value[y][x]
      if (color && color !== 'transparent') {
        stats[color] = (stats[color] || 0) + 1
      }
    }
  }

  // Convert to array and map to color info
  return Object.entries(stats)
    .map(([hex, count]) => {
      let colorInfo = getColorByHex(hex)
      if (!colorInfo) {
        // Try to find closest color
        const rgb = hexToRgb(hex)
        if (rgb) {
          colorInfo = findClosestColor(rgb.r, rgb.g, rgb.b)
        }
      }
      return {
        hex,
        count,
        code: colorInfo?.code || '?',
        name: colorInfo?.name || 'Custom'
      }
    })
    .sort((a, b) => b.count - a.count)
})

const totalBeads = computed(() => {
  return colorStats.value.reduce((sum, stat) => sum + stat.count, 0)
})

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// History for undo/redo
const history = ref([])
const historyIndex = ref(-1)
const maxHistory = 20

function saveState() {
  // Remove any states after current index
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  // Add new state
  history.value.push({
    gridData: gridData.value.map(row => [...row]),
    width: canvasWidth.value,
    height: canvasHeight.value
  })

  // Limit history size
  if (history.value.length > maxHistory) {
    history.value.shift()
    historyIndex.value--
  }

  historyIndex.value++

  // Update DrawingTools buttons
  updateUndoRedoButtons()
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const state = history.value[historyIndex.value]
    gridData.value = state.gridData.map(row => [...row])
    canvasWidth.value = state.width
    canvasHeight.value = state.height
    updateUndoRedoButtons()
  }
}

function redo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const state = history.value[historyIndex.value]
    gridData.value = state.gridData.map(row => [...row])
    canvasWidth.value = state.width
    canvasHeight.value = state.height
    updateUndoRedoButtons()
  }
}

function updateUndoRedoButtons() {
  const toolsComponent = document.querySelector('.drawing-tools')
  if (toolsComponent) {
    const undoBtn = toolsComponent.querySelector('[data-action="undo"]')
    const redoBtn = toolsComponent.querySelector('[data-action="redo"]')

    if (undoBtn) {
      undoBtn.disabled = historyIndex.value <= 0
    }

    if (redoBtn) {
      redoBtn.disabled = historyIndex.value >= history.value.length - 1
    }
  }
}

function handleCanvasDraw(x, y, color) {
  if (gridData.value[y] && gridData.value[y][x] !== undefined) {
    if (gridData.value[y][x] !== color) {
      gridData.value[y][x] = color
      saveState()
    }
  }
}

function handleCanvasErase(x, y) {
  if (gridData.value[y] && gridData.value[y][x] !== undefined) {
    if (gridData.value[y][x] !== null) {
      gridData.value[y][x] = null
      saveState()
    }
  }
}

function handleColorPick(color) {
  if (color) {
    currentColor.value = color
    // Switch to pen after picking color
    currentTool.value = 'pen'
  }
}

function handleToolAction(action) {
  if (action === 'undo') {
    undo()
  } else if (action === 'redo') {
    redo()
  } else if (action === 'fill') {
    // Fill action handled by CanvasGrid
    if (canvasGridRef.value) {
      canvasGridRef.value.fillArea(currentColor.value)
    }
  }
}

// Canvas Grid ref
const canvasGridRef = ref(null)

function handleCanvasClear() {
  gridData.value = Array(canvasHeight.value).fill(null).map(() => Array(canvasWidth.value).fill(null))
}

function handleImageImport(img) {
  referenceImage.value = img
  // Auto-convert image to beads
  convertImageToBeads(img)
}

function convertImageToBeads(img) {
  console.log('Converting image to beads...', canvasWidth.value, 'x', canvasHeight.value)

  // Create a temporary canvas to process the image
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')

  // Set canvas size to match grid dimensions (1 pixel per bead)
  tempCanvas.width = canvasWidth.value
  tempCanvas.height = canvasHeight.value

  // Calculate scaling to fit image to grid while preserving aspect ratio
  const scaleX = canvasWidth.value / img.width
  const scaleY = canvasHeight.value / img.height
  const scale = Math.min(scaleX, scaleY)

  const width = img.width * scale
  const height = img.height * scale
  const x = (canvasWidth.value - width) / 2
  const y = (canvasHeight.value - height) / 2

  // Clear canvas with transparent background
  tempCtx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  // Draw the image scaled to fit the grid
  tempCtx.drawImage(img, x, y, width, height)

  // Get image data
  const imageData = tempCtx.getImageData(0, 0, canvasWidth.value, canvasHeight.value)
  const data = imageData.data

  // Create new grid array
  const newGridData = Array(canvasHeight.value).fill(null).map(() => Array(canvasWidth.value).fill(null))

  // Process each pixel (each pixel = one bead)
  const totalPixels = canvasWidth.value * canvasHeight.value
  let processedPixels = 0

  for (let py = 0; py < canvasHeight.value; py++) {
    for (let px = 0; px < canvasWidth.value; px++) {
      const index = (py * canvasWidth.value + px) * 4
      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]
      const a = data[index + 3]

      // Only set color if pixel is not transparent
      if (a > 128) {
        // Find the closest Perler bead color
        const perlerColor = findClosestColor(r, g, b)
        newGridData[py][px] = perlerColor.hex
      }
      processedPixels++
    }
  }

  console.log('Processed', processedPixels, 'of', totalPixels, 'pixels')

  // Update gridData with new array
  gridData.value = newGridData

  // Clear reference image after conversion
  referenceImage.value = null

  console.log('Grid data updated, triggering save...')

  nextTick(() => {
    saveState()
    console.log('Conversion complete!')
  })
}

function handleAlignImageToGrid(img) {
  convertImageToBeads(img)
}

// Handle export
function handleExport(options) {
  // Export functionality will be implemented later
  console.log('Export options:', options)
}

function handlePrint(options) {
  // Print functionality will be implemented later
  console.log('Print options:', options)
}

// Watch for canvas size changes
watch([canvasWidth, canvasHeight], ([newWidth, newHeight]) => {
  // Preserve existing data when resizing
  const oldData = gridData.value
  gridData.value = Array(newHeight).fill(null).map((_, y) =>
    Array(newWidth).fill(null).map((_, x) =>
      oldData[y] && oldData[y][x] !== undefined ? oldData[y][x] : null
    )
  )
})

// Load from localStorage on mount
onMounted(() => {
  const saved = localStorage.getItem('perlerCanvas')
  if (saved) {
    try {
      const data = JSON.parse(saved)
      // Validate and limit dimensions
      const w = Math.min(Math.max(data.width || 20, 1), 500)
      const h = Math.min(Math.max(data.height || 20, 1), 500)
      canvasWidth.value = w
      canvasHeight.value = h
      if (data.gridData && Array.isArray(data.gridData)) {
        gridData.value = data.gridData.slice(0, h).map(row =>
          row ? row.slice(0, w) : null
        )
      }
    } catch (e) {
      console.error('Failed to load saved data:', e)
      localStorage.removeItem('perlerCanvas')
    }
  }

  // Save initial state
  saveState()
})

// Save to localStorage when data changes
watch([canvasWidth, canvasHeight, gridData], () => {
  localStorage.setItem('perlerCanvas', JSON.stringify({
    width: canvasWidth.value,
    height: canvasHeight.value,
    gridData: gridData.value
  }))
})

// Keyboard shortcuts
onMounted(() => {
  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})

function handleKeyboard(event) {
  // Ctrl+Z or Cmd+Z for undo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undo()
  }

  // Ctrl+Shift+Z or Cmd+Shift+Z for redo
  if ((event.ctrlKey || event.metaKey) && event.key === 'z' && event.shiftKey) {
    event.preventDefault()
    redo()
  }

  // Ctrl+Y or Cmd+Y for redo
  if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
    event.preventDefault()
    redo()
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  background-color: #4a90e2;
  color: white;
  padding: 0.75rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.app-header h1 {
  font-size: 1.25rem;
  margin: 0;
}

.lang-switch {
  position: absolute;
  right: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: background 0.2s;
}

.lang-switch:hover {
  background: rgba(255, 255, 255, 0.3);
}

.main-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  height: calc(100vh - 56px);
  min-height: 0;
  overflow: hidden;
}

.top-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: white;
  border-radius: 8px;
  padding: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tools-section {
  flex-shrink: 0;
}

.colors-section {
  flex: 1;
  min-width: 300px;
}

.actions-section {
  flex-shrink: 0;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.content-area {
  flex: 1;
  display: flex;
  gap: 0.5rem;
  min-height: 0;
}

.left-panel {
  width: 160px;
  min-width: 160px;
  background: white;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
}

.size-inputs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.size-input {
  width: 50px;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.85rem;
  text-align: center;
}

.preset-buttons {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.split-info {
  font-size: 0.75rem;
  color: #4a90e2;
  font-weight: 500;
  background: #f0f7ff;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-align: center;
}

.canvas-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-width: 0;
  min-height: 0;
}

.color-stats-bar {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 0.75rem;
  max-height: 150px;
  overflow-y: auto;
  flex-shrink: 0;
}

.stats-header {
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.5rem;
}

.stats-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a90e2;
}

.stats-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.stat-item:hover {
  background: #e8e8e8;
}

.stat-color {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid #ddd;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.stat-code {
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
}

.stat-count {
  font-size: 0.65rem;
  color: #666;
}

@media (max-width: 900px) {
  .top-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-section {
    flex-wrap: wrap;
  }

  .colors-section {
    min-width: auto;
  }

  .content-area {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    min-width: auto;
    max-height: 150px;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .panel-section {
    flex-direction: column;
  }

  .canvas-area {
    min-height: 250px;
  }

  .color-stats-bar {
    max-height: 120px;
  }
}
</style>