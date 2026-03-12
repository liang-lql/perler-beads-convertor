<template>
  <div class="export-panel">
    <button class="btn btn-primary btn-sm" @click="exportImage">
      📥 {{ t('export.export') }}
    </button>
    <button class="btn btn-secondary btn-sm" @click="printPattern">
      🖨️ {{ t('export.print') }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PERLER_COLORS } from '../utils/colors'

const { t } = useI18n()

const emit = defineEmits(['export', 'print'])

const props = defineProps({
  gridData: {
    type: Array,
    required: true
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
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
  }
})

const exportFormat = ref('png')
const exportMode = ref('whole')
const includeGrid = ref(false)
const includeStats = ref(true)
const includeBoardLabel = ref(true)
const includeColorCode = ref(true)
const fileName = ref('perler-pattern')
const scale = ref(2)
const quality = ref(0.9)

// Calculate split info
const splitInfo = computed(() => {
  const cols = Math.ceil(props.width / props.boardWidth)
  const rows = Math.ceil(props.height / props.boardHeight)
  return { cols, rows, total: cols * rows }
})

const colorStats = computed(() => {
  const stats = {}
  if (!props.gridData.length) return stats

  for (let y = 0; y < props.gridData.length; y++) {
    for (let x = 0; x < props.gridData[y].length; x++) {
      const color = props.gridData[y][x]
      if (color && color !== 'transparent') {
        stats[color] = (stats[color] || 0) + 1
      }
    }
  }
  return stats
})

function exportImage() {
  if (exportMode.value === 'split') {
    exportSplitBoards()
  } else {
    exportWholeImage()
  }
}

function exportWholeImage() {
  const options = {
    format: exportFormat.value,
    includeGrid: includeGrid.value,
    scale: scale.value,
    quality: quality.value,
    fileName: fileName.value,
    includeStats: includeStats.value,
    colorStats: colorStats.value,
    width: props.width,
    height: props.height
  }

  emit('export', options)

  const exportCanvas = createExportCanvas(options, 0, 0, props.width, props.height)

  exportCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${options.fileName}.${options.format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, `image/${options.format === 'jpg' ? 'jpeg' : 'png'}`, quality.value)
}

function exportSplitBoards() {
  const cols = splitInfo.value.cols
  const rows = splitInfo.value.rows

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const label = `${r + 1}-${c + 1}` // 1-1, 1-2, 2-1...
      const startX = c * props.boardWidth
      const startY = r * props.boardHeight
      const boardW = Math.min(props.boardWidth, props.width - startX)
      const boardH = Math.min(props.boardHeight, props.height - startY)

      const options = {
        format: exportFormat.value,
        includeGrid: includeGrid.value,
        scale: scale.value,
        quality: quality.value,
        fileName: `${fileName.value}_board_${label}`,
        includeStats: includeStats.value,
        colorStats: {},
        width: boardW,
        height: boardH
      }

      const exportCanvas = createExportCanvas(options, startX, startY, boardW, boardH)

      // Add board label if enabled
      if (includeBoardLabel.value) {
        const ctx = exportCanvas.getContext('2d')
        const cellSize = 20 * scale.value
        ctx.fillStyle = 'rgba(231, 76, 60, 0.9)'
        ctx.font = `bold ${Math.max(16, cellSize)}px Arial`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`Board: ${label}`, 10, 10)
      }

      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${options.fileName}.${options.format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, `image/${options.format === 'jpg' ? 'jpeg' : 'png'}`, quality.value)
    }
  }
}

function createExportCanvas(options, startX, startY, boardW, boardH) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const cellSize = 20 * options.scale

  // Add space for coordinate labels
  const headerSize = Math.max(20, cellSize * 0.8) // Space for column numbers
  const rowLabelSize = Math.max(20, cellSize * 0.6) // Space for row numbers

  let canvasWidth = boardW * cellSize + rowLabelSize
  let canvasHeight = boardH * cellSize + headerSize

  canvas.width = canvasWidth
  canvas.height = canvasHeight

  // Fill background
  ctx.fillStyle = options.format === 'jpg' ? '#FFFFFF' : '#F5F5F5'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw coordinate labels background
  ctx.fillStyle = '#E8E8E8'
  ctx.fillRect(0, 0, canvasWidth, headerSize) // Top header
  ctx.fillRect(0, 0, rowLabelSize, canvasHeight) // Left header

  // Draw column numbers (top)
  ctx.fillStyle = '#333333'
  ctx.font = `bold ${Math.max(10, cellSize * 0.4)}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let x = 0; x < boardW; x++) {
    const colNum = startX + x + 1 // Column number (1-based)
    const centerX = rowLabelSize + x * cellSize + cellSize / 2
    ctx.fillText(colNum.toString(), centerX, headerSize / 2)
  }

  // Draw row numbers (left)
  for (let y = 0; y < boardH; y++) {
    const rowNum = startY + y + 1 // Row number (1-based)
    const centerY = headerSize + y * cellSize + cellSize / 2
    ctx.fillText(rowNum.toString(), rowLabelSize / 2, centerY)
  }

  // Draw beads
  for (let y = 0; y < boardH; y++) {
    for (let x = 0; x < boardW; x++) {
      const color = props.gridData[startY + y] && props.gridData[startY + y][startX + x]
      const drawX = rowLabelSize + x * cellSize
      const drawY = headerSize + y * cellSize

      if (color && color !== 'transparent') {
        ctx.fillStyle = color
        ctx.fillRect(
          drawX + 1,
          drawY + 1,
          cellSize - 2,
          cellSize - 2
        )

        // Draw color code if enabled and cell is big enough
        if (includeColorCode.value && cellSize >= 16) {
          const colorInfo = getColorInfo(color)
          if (colorInfo) {
            ctx.fillStyle = getContrastColor(color)
            ctx.font = `bold ${Math.max(6, cellSize / 3)}px Arial`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(
              colorInfo.code,
              drawX + cellSize / 2,
              drawY + cellSize / 2
            )
          }
        }
      }
    }
  }

  // Draw grid if enabled
  if (options.includeGrid) {
    ctx.strokeStyle = '#D0D0D0'
    ctx.lineWidth = 1

    for (let x = 0; x <= boardW; x++) {
      ctx.beginPath()
      ctx.moveTo(rowLabelSize + x * cellSize, headerSize)
      ctx.lineTo(rowLabelSize + x * cellSize, canvasHeight)
      ctx.stroke()
    }

    for (let y = 0; y <= boardH; y++) {
      ctx.beginPath()
      ctx.moveTo(rowLabelSize, headerSize + y * cellSize)
      ctx.lineTo(canvasWidth, headerSize + y * cellSize)
      ctx.stroke()
    }
  }

  return canvas
}

// Get color info from hex value
function getColorInfo(hexColor) {
  if (!hexColor) return null
  return PERLER_COLORS.find(c => c.hex.toUpperCase() === hexColor.toUpperCase())
}

// Get contrasting text color
function getContrastColor(hexColor) {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return '#000000'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

function printPattern() {
  const options = {
    includeGrid: includeGrid.value,
    includeStats: includeStats.value,
    colorStats: colorStats.value
  }

  emit('print', options)

  const printCanvas = createExportCanvas({
    ...options,
    format: 'png',
    scale: 2,
    width: props.width,
    height: props.height
  }, 0, 0, props.width, props.height)

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    const img = printWindow.document.createElement('img')
    img.src = printCanvas.toDataURL('image/png')
    printWindow.document.body.appendChild(img)
    printWindow.document.close()

    img.onload = () => {
      printWindow.print()
    }
  }
}
</script>

<style scoped>
.export-panel {
  display: flex;
  gap: 0.25rem;
}
</style>