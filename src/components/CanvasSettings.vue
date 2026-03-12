<template>
  <div class="canvas-settings">
    <h3 class="card-header">Canvas Settings</h3>

    <div class="input-group">
      <label for="width">Width (beads)</label>
      <input
        type="number"
        id="width"
        :value="localWidth"
        @input="localWidth = $event.target.valueAsNumber"
        :min="1"
        :max="500"
        @change="updateSize"
      />
    </div>

    <div class="input-group">
      <label for="height">Height (beads)</label>
      <input
        type="number"
        id="height"
        :value="localHeight"
        @input="localHeight = $event.target.valueAsNumber"
        :min="1"
        :max="500"
        @change="updateSize"
      />
    </div>

    <div class="preset-sizes">
      <button
        v-for="size in presetSizes"
        :key="size.name"
        class="btn btn-secondary btn-sm"
        @click="applyPreset(size)"
      >
        {{ size.name }} ({{ size.width }}×{{ size.height }})
      </button>
    </div>

    <div class="section-title">Board Split (拼豆板拆分)</div>

    <div class="checkbox-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="showSplitLines"
          @change="toggleSplitLines"
        />
        <span>Show Split Lines</span>
      </label>
    </div>

    <div class="input-group">
      <label for="boardWidth">Single Board Width</label>
      <input
        type="number"
        id="boardWidth"
        :value="localBoardWidth"
        @input="localBoardWidth = $event.target.valueAsNumber"
        :min="10"
        :max="100"
        @change="updateBoardSize"
      />
    </div>

    <div class="input-group">
      <label for="boardHeight">Single Board Height</label>
      <input
        type="number"
        id="boardHeight"
        :value="localBoardHeight"
        @input="localBoardHeight = $event.target.valueAsNumber"
        :min="10"
        :max="100"
        @change="updateBoardSize"
      />
    </div>

    <div class="split-info" v-if="splitInfo">
      <div class="split-count">{{ splitInfo.cols }} × {{ splitInfo.rows }} = {{ splitInfo.total }} boards</div>
    </div>

    <div class="section-title">Display Options</div>

    <div class="checkbox-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="showGrid"
          @change="updateGridDisplay"
        />
        <span>Show Grid</span>
      </label>
    </div>

    <div class="input-group">
      <label for="bgColor">Background Color</label>
      <div class="color-picker-wrapper">
        <input
          type="color"
          id="bgColor"
          :value="bgColor"
          @input="bgColor = $event.target.value"
        />
        <input
          type="text"
          :value="bgColor"
          @input="bgColor = $event.target.value"
          class="color-input"
        />
      </div>
    </div>

    <div class="checkbox-group">
      <label class="checkbox-label">
        <input
          type="checkbox"
          :checked="isTransparent"
          @change="updateBgColor"
        />
        <span>Transparent Background</span>
      </label>
    </div>

    <div class="section-title">Image Import</div>

    <div class="input-group">
      <label for="imageUpload">Upload Reference Image</label>
      <input
        type="file"
        id="imageUpload"
        ref="imageUpload"
        accept="image/*"
        @change="handleImageUpload"
        style="display: none;"
      />
      <button class="btn btn-secondary btn-sm" @click="triggerImageUpload">
        📷 Choose Image
      </button>
      <button v-if="referenceImage" class="btn btn-danger btn-sm" @click="clearReferenceImage">
        🗑️ Remove
      </button>
    </div>

    <div v-if="referenceImage" class="reference-image-container">
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="showReference"
            @change="updateShowReference"
          />
          <span>Show Reference</span>
        </label>
      </div>

      <div class="input-group">
        <label for="opacity">Reference Opacity</label>
        <input
          type="range"
          id="opacity"
          :value="referenceOpacity"
          @input="updateReferenceOpacity"
          min="0"
          max="100"
        />
        <span>{{ referenceOpacity }}%</span>
      </div>

      <button class="btn btn-primary btn-sm" @click="alignImageToGrid" style="width: 100%; margin-top: 0.5rem;">
        Convert to Beads
      </button>
    </div>

    <button class="btn btn-danger btn-sm" @click="clearCanvas" style="margin-top: 1rem; width: 100%;">
      Clear Canvas
    </button>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const emit = defineEmits(['update:width', 'update:height', 'update:showGrid', 'update:bgColor', 'clear', 'import-image', 'update:showReference', 'update:referenceOpacity', 'update:boardWidth', 'update:boardHeight', 'update:showSplitLines'])

const props = defineProps({
  width: {
    type: Number,
    default: 20
  },
  height: {
    type: Number,
    default: 20
  },
  showGrid: {
    type: Boolean,
    default: true
  },
  bgColor: {
    type: String,
    default: '#ffffff'
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
  }
})

const localWidth = ref(props.width)
const localHeight = ref(props.height)
const localBoardWidth = ref(props.boardWidth)
const localBoardHeight = ref(props.boardHeight)
const isTransparent = ref(false)
const bgColor = ref(props.bgColor)
const showReference = ref(props.showReference)
const referenceOpacity = ref(props.referenceOpacity)
const showSplitLines = ref(props.showSplitLines)

const presetSizes = [
  { name: 'Small', width: 10, height: 10 },
  { name: 'Medium', width: 20, height: 20 },
  { name: 'Large', width: 30, height: 30 },
  { name: 'Rectangle', width: 15, height: 30 },
  { name: 'Wide', width: 30, height: 20 }
]

// Calculate split info
const splitInfo = computed(() => {
  if (!showSplitLines.value) return null
  const cols = Math.ceil(localWidth.value / localBoardWidth.value)
  const rows = Math.ceil(localHeight.value / localBoardHeight.value)
  return { cols, rows, total: cols * rows }
})

function updateSize() {
  const w = Math.max(1, Math.min(500, localWidth.value || 1))
  const h = Math.max(1, Math.min(500, localHeight.value || 1))
  localWidth.value = w
  localHeight.value = h
  emit('update:width', w)
  emit('update:height', h)
}

function updateBoardSize() {
  const bw = Math.max(10, Math.min(100, localBoardWidth.value || 29))
  const bh = Math.max(10, Math.min(100, localBoardHeight.value || 29))
  localBoardWidth.value = bw
  localBoardHeight.value = bh
  emit('update:boardWidth', bw)
  emit('update:boardHeight', bh)
}

function toggleSplitLines() {
  showSplitLines.value = !showSplitLines.value
  emit('update:showSplitLines', showSplitLines.value)
}

function applyPreset(size) {
  localWidth.value = size.width
  localHeight.value = size.height
  updateSize()
}

function updateGridDisplay() {
  emit('update:showGrid', props.showGrid)
}

function updateBgColor() {
  if (isTransparent.value) {
    bgColor.value = 'transparent'
  }
  emit('update:bgColor', bgColor.value)
}

const referenceImage = ref(null)

function clearCanvas() {
  emit('clear')
}

function triggerImageUpload() {
  document.getElementById('imageUpload').click()
}

function handleImageUpload(event) {
  const file = event.target.files[0]
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        referenceImage.value = img
        emit('import-image', img)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

function clearReferenceImage() {
  referenceImage.value = null
  emit('import-image', null)
}

function updateShowReference(event) {
  showReference.value = event.target.checked
  emit('update:showReference', showReference.value)
}

function updateReferenceOpacity(event) {
  referenceOpacity.value = Number(event.target.value)
  emit('update:referenceOpacity', referenceOpacity.value)
}

function alignImageToGrid() {
  if (referenceImage.value) {
    emit('align-image-to-grid', referenceImage.value)
  }
}

watch(() => props.bgColor, (newVal) => {
  bgColor.value = newVal
  isTransparent.value = newVal === 'transparent'
})

watch(() => props.boardWidth, (newVal) => {
  localBoardWidth.value = newVal
})

watch(() => props.boardHeight, (newVal) => {
  localBoardHeight.value = newVal
})

watch(() => props.showSplitLines, (newVal) => {
  showSplitLines.value = newVal
})
</script>

<style scoped>
.canvas-settings {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preset-sizes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.color-picker-wrapper {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-input {
  width: 60px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
  margin-top: 0.5rem;
  border-top: 1px solid #eee;
  padding-top: 0.5rem;
}

.split-info {
  background: #f0f7ff;
  padding: 0.5rem;
  border-radius: 4px;
  text-align: center;
}

.split-count {
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a90e2;
}

.reference-image-container {
  margin-top: 0.5rem;
}
</style>