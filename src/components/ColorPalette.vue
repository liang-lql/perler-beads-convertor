<template>
  <div class="color-palette">
    <div class="selected-info" v-if="selectedColorInfo">
      <div class="selected-preview" :style="{ backgroundColor: selectedColorInfo.hex }"></div>
      <span class="selected-code">{{ selectedColorInfo.code }}</span>
    </div>

    <div class="color-scroll">
      <div class="preset-colors">
        <div
          v-for="color in perlerColors"
          :key="color.code"
          :class="['color-item', currentColor === color.hex ? 'active' : '']"
          :style="{ backgroundColor: color.hex }"
          @click="selectColor(color.hex)"
          :title="`${color.code}: ${color.name}`"
        >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { PERLER_COLORS, hexToRgb, getColorByHex, findClosestColor, parseRgbString } from '../utils/colors'

const emit = defineEmits(['color-change'])

const props = defineProps({
  currentColor: {
    type: String,
    default: '#000000'
  }
})

const currentColor = ref(props.currentColor)
const recentColors = ref([])
const perlerColors = PERLER_COLORS

const selectedColorInfo = computed(() => {
  if (!currentColor.value) return null
  let color = getColorByHex(currentColor.value)
  if (!color) {
    // If it's an RGB string, parse and find closest
    const rgb = parseRgbString(currentColor.value)
    if (rgb) {
      color = findClosestColor(rgb.r, rgb.g, rgb.b)
    }
  }
  return color
})

function getTextColor(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'
  // Calculate luminance to determine text color
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

function selectColor(color) {
  currentColor.value = color
  emit('color-change', color)

  // Add to recent colors
  const colorInfo = getColorByHex(color) || findClosestColor(...Object.values(hexToRgb(color) || {r:0,g:0,b:0}))
  if (colorInfo && !recentColors.value.find(c => c.hex === colorInfo.hex)) {
    recentColors.value.unshift(colorInfo)
    if (recentColors.value.length > 10) {
      recentColors.value.pop()
    }
  }
}

onMounted(() => {
  // Load recent colors from localStorage
  const saved = localStorage.getItem('perlerRecentColors')
  if (saved) {
    recentColors.value = JSON.parse(saved)
  }
})

// Save recent colors when they change
watch(() => recentColors.value, (newVal) => {
  localStorage.setItem('perlerRecentColors', JSON.stringify(newVal))
}, { deep: true })
</script>

<style scoped>
.color-palette {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.selected-preview {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 2px solid #4a90e2;
}

.selected-code {
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
}

.color-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 400px;
}

.preset-colors {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.color-item {
  width: 24px;
  height: 24px;
  border-radius: 3px;
  cursor: pointer;
  border: 1px solid rgba(0,0,0,0.1);
  transition: transform 0.1s, box-shadow 0.1s;
  flex-shrink: 0;
}

.color-item:hover {
  transform: scale(1.15);
  z-index: 1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

.color-item.active {
  box-shadow: 0 0 0 2px #4a90e2;
  transform: scale(1.1);
}
</style>