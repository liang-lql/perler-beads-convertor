<template>
  <div class="drawing-tools">
    <div class="tool-buttons">
      <button
        v-for="tool in tools"
        :key="tool.name"
        :class="['btn', 'btn-sm', currentTool === tool.name ? 'btn-primary' : 'btn-secondary']"
        @click="selectTool(tool.name)"
        :title="tool.description"
      >
        {{ tool.icon }}
      </button>
    </div>

    <div v-if="currentTool === 'brush'" class="brush-size">
      <label>Size: {{ brushSize }}</label>
      <input
        type="range"
        min="1"
        max="5"
        v-model="brushSize"
        @input="updateBrushSize"
      />
    </div>

    <div class="divider"></div>

    <div class="action-buttons">
      <button
        class="btn btn-sm btn-secondary"
        @click="performAction('undo')"
        title="Undo"
      >
        ↶
      </button>
      <button
        class="btn btn-sm btn-secondary"
        @click="performAction('redo')"
        title="Redo"
      >
        ↷
      </button>
      <button
        class="btn btn-sm btn-secondary"
        @click="performAction('fill')"
        title="Fill Area"
      >
        🪣
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const emit = defineEmits(['tool-change', 'action', 'brush-size-change'])

const props = defineProps({
  currentTool: {
    type: String,
    default: 'pen'
  },
  canUndo: {
    type: Boolean,
    default: false
  },
  canRedo: {
    type: Boolean,
    default: false
  }
})

const currentTool = ref(props.currentTool)
const brushSize = ref(1)

const tools = [
  { name: 'pen', label: 'Pen', icon: '✏️', description: 'Draw single bead' },
  { name: 'brush', label: 'Brush', icon: '🖌️', description: 'Draw multiple beads' },
  { name: 'picker', label: 'Picker', icon: '💉', description: 'Pick color from canvas' },
  { name: 'eraser', label: 'Eraser', icon: '🧹', description: 'Erase beads' }
]

function selectTool(tool) {
  currentTool.value = tool
  emit('tool-change', tool)
}

function performAction(action) {
  emit('action', action)
}

function updateBrushSize() {
  emit('brush-size-change', parseInt(brushSize.value))
}

watch(() => props.currentTool, (newVal) => {
  currentTool.value = newVal
})
</script>

<style scoped>
.drawing-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tool-buttons {
  display: flex;
  gap: 0.25rem;
}

.brush-size {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.brush-size label {
  font-size: 0.75rem;
  white-space: nowrap;
}

.brush-size input[type="range"] {
  width: 60px;
}

.divider {
  width: 1px;
  height: 24px;
  background: #ddd;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}
</style>