// Standard Perler Bead Colors with codes
// Based on common Perler bead palette
export const PERLER_COLORS = [
  { code: 'P01', name: 'White', hex: '#FFFFFF' },
  { code: 'P02', name: 'Black', hex: '#000000' },
  { code: 'P03', name: 'Red', hex: '#E63946' },
  { code: 'P04', name: 'Dark Red', hex: '#9D0208' },
  { code: 'P05', name: 'Orange', hex: '#FB8500' },
  { code: 'P06', name: 'Yellow', hex: '#FFBE0B' },
  { code: 'P07', name: 'Light Yellow', hex: '#FFF75E' },
  { code: 'P08', name: 'Green', hex: '#2D6A4F' },
  { code: 'P09', name: 'Light Green', hex: '#74C69D' },
  { code: 'P10', name: 'Dark Green', hex: '#1B4332' },
  { code: 'P11', name: 'Blue', hex: '#1D3557' },
  { code: 'P12', name: 'Light Blue', hex: '#A8DADC' },
  { code: 'P13', name: 'Sky Blue', hex: '#457B9D' },
  { code: 'P14', name: 'Purple', hex: '#7B2CBF' },
  { code: 'P15', name: 'Light Purple', hex: '#C77DFF' },
  { code: 'P16', name: 'Pink', hex: '#FF85A1' },
  { code: 'P17', name: 'Hot Pink', hex: '#F72585' },
  { code: 'P18', name: 'Brown', hex: '#774936' },
  { code: 'P19', name: 'Light Brown', hex: '#A98A6F' },
  { code: 'P20', name: 'Tan', hex: '#D4A373' },
  { code: 'P21', name: 'Beige', hex: '#FAEDCD' },
  { code: 'P22', name: 'Gray', hex: '#6C757D' },
  { code: 'P23', name: 'Light Gray', hex: '#ADB5BD' },
  { code: 'P24', name: 'Dark Gray', hex: '#495057' },
  { code: 'P25', name: 'Turquoise', hex: '#2A9D8F' },
  { code: 'P26', name: 'Teal', hex: '#264653' },
  { code: 'P27', name: 'Lavender', hex: '#E0AAFF' },
  { code: 'P28', name: 'Peach', hex: '#FFCDB2' },
  { code: 'P29', name: 'Coral', hex: '#FF6B6B' },
  { code: 'P30', name: 'Mint', hex: '#B7E4C7' },
  { code: 'P31', name: 'Olive', hex: '#606C38' },
  { code: 'P32', name: 'Gold', hex: '#D4AF37' },
  { code: 'P33', name: 'Silver', hex: '#C0C0C0' },
  { code: 'P34', name: 'Burgundy', hex: '#800020' },
  { code: 'P35', name: 'Navy', hex: '#001D3D' },
  { code: 'P36', name: 'Cream', hex: '#FFFDD0' }
]

// Convert hex to RGB
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// Convert RGB to hex
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

// Parse RGB string to RGB object
export function parseRgbString(rgbStr) {
  if (!rgbStr) return null
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3])
    }
  }
  return null
}

// Calculate color distance (Euclidean distance in RGB space)
function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  )
}

// Find the closest Perler color to a given RGB color
export function findClosestColor(r, g, b) {
  const inputColor = { r, g, b }
  let closestColor = PERLER_COLORS[0]
  let minDistance = Infinity

  for (const perlerColor of PERLER_COLORS) {
    const perlerRgb = hexToRgb(perlerColor.hex)
    const distance = colorDistance(inputColor, perlerRgb)

    if (distance < minDistance) {
      minDistance = distance
      closestColor = perlerColor
    }
  }

  return closestColor
}

// Get color info by hex value
export function getColorByHex(hex) {
  return PERLER_COLORS.find(c => c.hex.toUpperCase() === hex.toUpperCase())
}

// Get color info by code
export function getColorByCode(code) {
  return PERLER_COLORS.find(c => c.code === code.toUpperCase())
}