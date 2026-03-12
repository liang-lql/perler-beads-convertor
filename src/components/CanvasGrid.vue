<template>
  <div
    class="canvas-container"
    ref="containerRef"
    @wheel="handleWheel"
    @mousedown="handleContainerMouseDown"
    @mousemove="handleContainerMouseMove"
    @mouseup="handleContainerMouseUp"
    @mouseleave="handleContainerMouseUp"
  >
    <div class="grid-wrapper" :style="gridWrapperStyle">
      <!-- Column headers (top) -->
      <div class="column-headers" v-if="showHeaders" :style="columnHeadersStyle">
        <div
          v-for="x in props.width"
          :key="'col-' + x"
          class="header-cell"
          :style="{ width: cellSize + 'px', height: headerSize + 'px' }"
        >
          {{ getColumnLabel(x - 1) }}
        </div>
      </div>

      <!-- Main content: row headers + canvas -->
      <div class="main-row">
        <!-- Row headers (left) -->
        <div class="row-headers" v-if="showHeaders" :style="rowHeadersStyle">
          <div
            v-for="y in props.height"
            :key="'row-' + y"
            class="header-cell"
            :style="{ width: headerSize + 'px', height: cellSize + 'px' }"
          >
            {{ y }}
          </div>
        </div>

        <!-- Canvas -->
        <canvas
          ref="canvas"
          :style="canvasStyle"
        >
          Your browser does not support the canvas element.
        </canvas>
      </div>
    </div>

    <!-- Zoom controls -->
    <div class="zoom-controls">
      <button class="btn btn-sm btn-secondary" @click="zoomOut" title="Zoom Out">−</button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button class="btn btn-sm btn-secondary" @click="zoomIn" title="Zoom In">+</button>
      <button class="btn btn-sm btn-secondary" @click="resetView" title="Reset View">Reset</button>
    </div>

    <!-- Current position -->
    <div class="position-info" v-if="currentPosition">
      {{ currentPosition }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { getColorByHex, findClosestColor, parseRgbString, hexToRgb } from '../utils/colors'

const props = defineProps({
  width: {
    type: Number,
    default: 20,
    required: true
  },
  height: {
    type: Number,
    default: 20,
    required: true
  },
  showGrid: {
    type: Boolean,
    default: true
  },
  bgColor: {
    type: String,
    default: '#ffffff'
  },
  currentColor: {
    type: String,
    default: '#000000'
  },
  gridData: {
    type: Array,
    default: () => []
  },
  referenceImage: {
    type: Object,
    default: null
  },
  showReference: {
    type: Boolean,
    default: true
  },
  referenceOpacity: {
    type: Number,
    default: 50
  },
  boardWidth: {
    type: Number,
    default: 29
  },
  boardHeight: {
    type: Number,
    default: 29
  },
  showSplitLines: {
    type: Boolean,
    default: false
  },
  currentTool: {
    type: String,
    default: 'pen'
  },
  brushSize: {
    type: Number,
    default: 1
  }
})

const emit = defineEmits(['draw', 'erase', 'cellClick', 'color-pick'])

const canvas = ref(null)
const containerRef = ref(null)

// Zoom and pan
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)

// Interaction states
const isDrawing = ref(false)
const isPanning = ref(false)
const longPressTimer = ref(null)
const startPos = ref({ x: 0, y: 0 })
const hasMoved = ref(false)
const currentPosition = ref('')

// Container size
const containerWidth = ref(600)
const containerHeight = ref(600)

// Show headers only when cell is big enough
const showHeaders = computed(() => cellSize.value >= 15)
const headerSize = computed(() => showHeaders.value ? cellSize.value : 0)

// Cell size calculations
const baseCellSize = computed(() => {
  const availableWidth = containerWidth.value - 20
  const availableHeight = containerHeight.value - 20
  const maxCellWidth = Math.floor(availableWidth / props.width)
  const maxCellHeight = Math.floor(availableHeight / props.height)
  return Math.max(2, Math.min(maxCellWidth, maxCellHeight, 50))
})
const cellSize = computed(() => Math.max(2, baseCellSize.value * zoom.value))

// Canvas dimensions
const canvasPixelWidth = computed(() => props.width * cellSize.value)
const canvasPixelHeight = computed(() => props.height * cellSize.value)

// Styles for grid wrapper and headers
const gridWrapperStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px)`,
  cursor: isPanning.value ? 'grabbing' : (isDrawing.value ? 'crosshair' : 'grab')
}))

const columnHeadersStyle = computed(() => ({
  marginLeft: headerSize.value + 'px',
  fontSize: Math.max(8, Math.min(12, cellSize.value / 3)) + 'px'
}))

const rowHeadersStyle = computed(() => ({
  fontSize: Math.max(8, Math.min(12, cellSize.value / 3)) + 'px'
}))

const canvasStyle = computed(() => ({}))

// Convert column index to label (1, 2, 3, ...)
function getColumnLabel(index) {
  return index + 1
}

// Grid state
const gridState = ref([])

// Initialize grid state
function initGridState() {
  if (props.gridData && props.gridData.length > 0) {
    gridState.value = props.gridData.map(row => row ? [...row] : [])
  } else {
    gridState.value = Array(props.height).fill(null).map(() => Array(props.width).fill(null))
  }
}

// Get color info for a cell
function getCellColorInfo(colorValue) {
  if (!colorValue) return null
  let colorInfo = getColorByHex(colorValue)
  if (!colorInfo) {
    const rgb = parseRgbString(colorValue)
    if (rgb) {
      colorInfo = findClosestColor(rgb.r, rgb.g, rgb.b)
    }
  }
  return colorInfo
}

// Get contrasting text color
function getContrastColor(hexColor) {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return '#000000'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

function draw() {
  if (!canvas.value) {
    console.log('draw: canvas not ready')
    return
  }

  console.log('draw: starting, grid size:', props.width, 'x', props.height)

  const ctx = canvas.value.getContext('2d')

  // Set canvas dimensions
  canvas.value.width = canvasPixelWidth.value
  canvas.value.height = canvasPixelHeight.value

  ctx.clearRect(0, 0, canvasPixelWidth.value, canvasPixelHeight.value)

  // Draw background
  ctx.fillStyle = props.bgColor === 'transparent' ? '#ffffff' : props.bgColor
  ctx.fillRect(0, 0, canvasPixelWidth.value, canvasPixelHeight.value)

  // Draw reference image if enabled
  if (props.referenceImage && props.showReference) {
    ctx.globalAlpha = props.referenceOpacity / 100
    drawReferenceImage(ctx)
    ctx.globalAlpha = 1
  }

  // Draw filled cells
  for (let y = 0; y < props.height; y++) {
    for (let x = 0; x < props.width; x++) {
      const colorValue = gridState.value[y] && gridState.value[y][x]
      if (colorValue) {
        const colorInfo = getCellColorInfo(colorValue)
        const fillColor = colorInfo ? colorInfo.hex : colorValue

        ctx.fillStyle = fillColor
        const border = cellSize.value >= 4 ? 1 : 0.5
        ctx.fillRect(
          x * cellSize.value + border,
          y * cellSize.value + border,
          cellSize.value - border * 2,
          cellSize.value - border * 2
        )

        // Draw color code if cell is big enough
        if (cellSize.value >= 20) {
          const code = colorInfo ? colorInfo.code : ''
          if (code) {
            ctx.fillStyle = getContrastColor(fillColor)
            ctx.font = `bold ${Math.max(6, cellSize.value / 3)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(
              code,
              x * cellSize.value + cellSize.value / 2,
              y * cellSize.value + cellSize.value / 2
            )
          }
        }
      }
    }
  }

  // Draw grid
  if (props.showGrid && cellSize.value >= 3) {
    // Draw normal grid lines first
    ctx.strokeStyle = cellSize.value >= 10 ? 'rgba(200, 200, 200, 0.4)' : 'rgba(220, 220, 220, 0.2)'
    ctx.lineWidth = cellSize.value >= 10 ? 0.3 : 0.2

    // Vertical lines (non-5x lines)
    for (let x = 0; x <= props.width; x++) {
      if (x % 5 !== 0) {
        ctx.beginPath()
        ctx.moveTo(x * cellSize.value, 0)
        ctx.lineTo(x * cellSize.value, canvasPixelHeight.value)
        ctx.stroke()
      }
    }

    // Horizontal lines (non-5x lines)
    for (let y = 0; y <= props.height; y++) {
      if (y % 5 !== 0) {
        ctx.beginPath()
        ctx.moveTo(0, y * cellSize.value)
        ctx.lineTo(canvasPixelWidth.value, y * cellSize.value)
        ctx.stroke()
      }
    }

    // Draw 5-cell markers (thicker lines)
    ctx.strokeStyle = cellSize.value >= 10 ? 'rgba(120, 120, 120, 0.7)' : 'rgba(150, 150, 150, 0.4)'
    ctx.lineWidth = cellSize.value >= 10 ? 1 : 0.5

    // Vertical 5x lines
    for (let x = 0; x <= props.width; x += 5) {
      ctx.beginPath()
      ctx.moveTo(x * cellSize.value, 0)
      ctx.lineTo(x * cellSize.value, canvasPixelHeight.value)
      ctx.stroke()
    }

    // Horizontal 5x lines
    for (let y = 0; y <= props.height; y += 5) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellSize.value)
      ctx.lineTo(canvasPixelWidth.value, y * cellSize.value)
      ctx.stroke()
    }
  }

  // Draw board split lines and labels
  if (props.showSplitLines && props.boardWidth > 0 && props.boardHeight > 0) {
    const cols = Math.ceil(props.width / props.boardWidth)
    const rows = Math.ceil(props.height / props.boardHeight)

    // Draw split lines
    ctx.strokeStyle = '#E74C3C'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])

    // Vertical split lines
    for (let c = 1; c < cols; c++) {
      const x = c * props.boardWidth * cellSize.value
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvasPixelHeight.value)
      ctx.stroke()
    }

    // Horizontal split lines
    for (let r = 1; r < rows; r++) {
      const y = r * props.boardHeight * cellSize.value
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvasPixelWidth.value, y)
      ctx.stroke()
    }

    ctx.setLineDash([])

    // Draw board labels (only if cells are big enough)
    if (cellSize.value >= 8) {
      ctx.fillStyle = 'rgba(231, 76, 60, 0.8)'
      ctx.font = `bold ${Math.max(12, Math.min(20, cellSize.value * 2))}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const label = `${r + 1}-${c + 1}` // 1-1, 1-2, 2-1, 2-2...
          const centerX = (c * props.boardWidth + Math.min(props.boardWidth, props.width - c * props.boardWidth) / 2) * cellSize.value
          const centerY = (r * props.boardHeight + Math.min(props.boardHeight, props.height - r * props.boardHeight) / 2) * cellSize.value

          // Draw label background
          const labelWidth = ctx.measureText(label).width + 10
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
          ctx.fillRect(centerX - labelWidth / 2, centerY - 12, labelWidth, 24)

          // Draw label text
          ctx.fillStyle = '#E74C3C'
          ctx.fillText(label, centerX, centerY)
        }
      }
    }
  }

  console.log('draw: complete')
}

function drawReferenceImage(ctx) {
  const img = props.referenceImage
  const scaleX = canvasPixelWidth.value / img.width
  const scaleY = canvasPixelHeight.value / img.height
  const scale = Math.min(scaleX, scaleY)

  const width = img.width * scale
  const height = img.height * scale
  const x = (canvasPixelWidth.value - width) / 2
  const y = (canvasPixelHeight.value - height) / 2

  ctx.drawImage(img, x, y, width, height)
}

function getGridPosition(event) {
  const rect = canvas.value.getBoundingClientRect()
  const scaleX = canvas.value.width / rect.width
  const scaleY = canvas.value.height / rect.height

  const x = (event.clientX - rect.left) * scaleX
  const y = (event.clientY - rect.top) * scaleY

  const gridX = Math.floor(x / cellSize.value)
  const gridY = Math.floor(y / cellSize.value)

  return { gridX, gridY }
}

// Long press detection
const LONG_PRESS_DURATION = 200 // ms
const pendingDraw = ref(null) // Store pending draw position

function handleContainerMouseDown(event) {
  if (event.button !== 0) return

  startPos.value = { x: event.clientX, y: event.clientY }
  hasMoved.value = false

  // Handle different tools
  const pos = getGridPosition(event)

  if (props.currentTool === 'picker') {
    // Color picker - pick color from grid immediately
    if (pos.gridX >= 0 && pos.gridX < props.width && pos.gridY >= 0 && pos.gridY < props.height) {
      const color = gridState.value[pos.gridY] && gridState.value[pos.gridY][pos.gridX]
      if (color) {
        emit('color-pick', color)
      }
    }
  } else if (['pen', 'eraser', 'brush'].includes(props.currentTool)) {
    // Start long press timer for panning
    longPressTimer.value = setTimeout(() => {
      if (!hasMoved.value) {
        // Long press - start panning
        isPanning.value = true
        pendingDraw.value = null
      }
    }, LONG_PRESS_DURATION)

    // Store pending draw position (will execute if not panning)
    if (pos.gridX >= 0 && pos.gridX < props.width && pos.gridY >= 0 && pos.gridY < props.height) {
      pendingDraw.value = pos
    }
  }
}

function applyTool(gridX, gridY) {
  const color = props.currentColor || '#000000'

  if (props.currentTool === 'brush') {
    // Brush - draw multiple cells
    const halfSize = Math.floor(props.brushSize / 2)
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      for (let dx = -halfSize; dx <= halfSize; dx++) {
        const x = gridX + dx
        const y = gridY + dy
        if (x >= 0 && x < props.width && y >= 0 && y < props.height) {
          if (gridState.value[y] && gridState.value[y][x] !== color) {
            gridState.value[y][x] = color
            emit('draw', x, y, color)
          }
        }
      }
    }
  } else if (props.currentTool === 'pen') {
    // Pen - draw single cell
    if (gridState.value[gridY] && gridState.value[gridY][gridX] !== color) {
      gridState.value[gridY][gridX] = color
      emit('draw', gridX, gridY, color)
    }
  } else if (props.currentTool === 'eraser') {
    // Eraser - erase single cell
    if (gridState.value[gridY] && gridState.value[gridY][gridX] !== null) {
      gridState.value[gridY][gridX] = null
      emit('erase', gridX, gridY)
    }
  }

  draw()
}

function handleContainerMouseMove(event) {
  // Check if mouse has moved significantly
  const dx = event.clientX - startPos.value.x
  const dy = event.clientY - startPos.value.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance > 5) {
    hasMoved.value = true
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }

    // If we had a pending draw and moved, start drawing
    if (pendingDraw.value && !isPanning.value && !isDrawing.value) {
      isDrawing.value = true
      applyTool(pendingDraw.value.gridX, pendingDraw.value.gridY)
      pendingDraw.value = null
    }
  }

  // Handle panning
  if (isPanning.value) {
    panX.value += event.movementX
    panY.value += event.movementY
    return
  }

  // Update position info
  const pos = getGridPosition(event)
  if (pos.gridX >= 0 && pos.gridX < props.width && pos.gridY >= 0 && pos.gridY < props.height) {
    currentPosition.value = `${getColumnLabel(pos.gridX)}-${pos.gridY + 1}`
  } else {
    currentPosition.value = ''
  }

  // Handle drawing
  if (isDrawing.value && event.buttons === 1 && !isPanning.value) {
    if (pos.gridX >= 0 && pos.gridX < props.width && pos.gridY >= 0 && pos.gridY < props.height) {
      applyTool(pos.gridX, pos.gridY)
    }
  }
}

function handleContainerMouseUp(event) {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }

  // If we had a pending draw and didn't move or pan, execute the draw (single click)
  if (pendingDraw.value && !hasMoved.value && !isPanning.value) {
    applyTool(pendingDraw.value.gridX, pendingDraw.value.gridY)
  }

  pendingDraw.value = null
  isDrawing.value = false
  isPanning.value = false
}

function handleWheel(event) {
  event.preventDefault()

  const rect = containerRef.value.getBoundingClientRect()
  const mouseX = event.clientX - rect.left
  const mouseY = event.clientY - rect.top

  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newZoom = Math.max(0.5, Math.min(20, zoom.value * delta))
  const zoomRatio = newZoom / zoom.value

  panX.value = mouseX - (mouseX - panX.value) * zoomRatio
  panY.value = mouseY - (mouseY - panY.value) * zoomRatio

  zoom.value = newZoom
  nextTick(() => draw())
}

function zoomIn() {
  const rect = containerRef.value.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const newZoom = Math.min(20, zoom.value * 1.2)
  const zoomRatio = newZoom / zoom.value

  panX.value = centerX - (centerX - panX.value) * zoomRatio
  panY.value = centerY - (centerY - panY.value) * zoomRatio

  zoom.value = newZoom
  nextTick(() => draw())
}

function zoomOut() {
  const rect = containerRef.value.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const newZoom = Math.max(0.5, zoom.value / 1.2)
  const zoomRatio = newZoom / zoom.value

  panX.value = centerX - (centerX - panX.value) * zoomRatio
  panY.value = centerY - (centerY - panY.value) * zoomRatio

  zoom.value = newZoom
  nextTick(() => draw())
}

function resetView() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
  nextTick(() => draw())
}

function clearCanvas() {
  gridState.value = Array(props.height).fill(null).map(() => Array(props.width).fill(null))
  draw()
}

function getGridData() {
  return gridState.value
}

function setGridData(data) {
  gridState.value = data.map(row => row ? [...row] : [])
  draw()
}

function fillArea(color) {
  // Fill all empty cells with the current color
  for (let y = 0; y < props.height; y++) {
    for (let x = 0; x < props.width; x++) {
      if (!gridState.value[y][x]) {
        gridState.value[y][x] = color
      }
    }
  }
  draw()
}

function updateContainerSize() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
  }
}

// Expose methods to parent
defineExpose({
  clearCanvas,
  getGridData,
  setGridData,
  draw,
  fillArea
})

// Resize observer
let resizeObserver = null

onMounted(() => {
  initGridState()

  nextTick(() => {
    updateContainerSize()
    draw()
  })

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize()
      draw()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  isDrawing.value = false
  isPanning.value = false
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
  }
})

// Watch for props changes
watch(
  () => [props.showGrid, props.bgColor, props.boardWidth, props.boardHeight, props.showSplitLines],
  () => {
    nextTick(() => draw())
  }
)

// Watch for dimension changes - need to resize gridState
watch(
  () => [props.width, props.height],
  () => {
    // Resize gridState while preserving data
    const oldState = gridState.value
    gridState.value = Array(props.height).fill(null).map((_, y) =>
      Array(props.width).fill(null).map((_, x) =>
        oldState[y] && oldState[y][x] !== undefined ? oldState[y][x] : null
      )
    )
    nextTick(() => draw())
  }
)

// Watch for reference image changes separately
watch(
  () => [props.referenceImage, props.showReference, props.referenceOpacity],
  () => {
    nextTick(() => draw())
  }
)

watch(
  () => props.gridData,
  (newData) => {
    console.log('gridData changed, length:', newData?.length)
    if (newData && newData.length > 0) {
      // Use requestAnimationFrame for large grids
      if (newData.length > 100) {
        requestAnimationFrame(() => {
          gridState.value = newData.map(row => row ? [...row] : [])
          requestAnimationFrame(() => draw())
        })
      } else {
        gridState.value = newData.map(row => row ? [...row] : [])
        nextTick(() => draw())
      }
    } else {
      // Initialize empty grid if no data
      gridState.value = Array(props.height).fill(null).map(() => Array(props.width).fill(null))
      nextTick(() => draw())
    }
  },
  { deep: true }
)
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #e8e8e8;
  border-radius: 8px;
  user-select: none;
}

.grid-wrapper {
  display: flex;
  flex-direction: column;
}

.main-row {
  display: flex;
}

.column-headers {
  display: flex;
  background: #f5f5f5;
  border-left: 1px solid #ccc;
  border-right: 1px solid #ccc;
}

.row-headers {
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  border-left: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: #555;
  flex-shrink: 0;
}

canvas {
  border: 1px solid #ccc;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.zoom-controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.zoom-level {
  font-size: 0.75rem;
  min-width: 45px;
  text-align: center;
  font-weight: 500;
}

.position-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  font-size: 0.75rem;
  color: #333;
  background: rgba(255,255,255,0.95);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
}
</style>