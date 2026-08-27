<script setup lang="ts">
import type { NodeData } from '@/stores/nodes'
import type { GlobePoint } from '@/utils/lineGlobe'
import { useDocumentVisibility, useElementVisibility, useRafFn } from '@vueuse/core'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { esc } from '@/components/blueprint/svg'
import { useNodeGeoClusters } from '@/composables/useNodeGeoClusters'
import { WORLD_OUTLINES } from '@/data/world-outlines'
import { useAppStore } from '@/stores/app'
import { coastPath, layoutLabels, meridianPaths, parallelPaths, projectNode } from '@/utils/lineGlobe'

const props = defineProps<{ nodes?: NodeData[] }>()
const appStore = useAppStore()

const containerRef = ref<HTMLDivElement>()
const documentVisibility = useDocumentVisibility()
const elementVisible = useElementVisibility(containerRef)
const shouldRender = computed(() => documentVisibility.value === 'visible' && elementVisible.value)
const shouldAutoRotate = computed(() => !appStore.stopEarth)

const VIEW_W = 560
const VIEW_H = 320
const CX = VIEW_W / 2
const CY = VIEW_H / 2
const R = 150

/** 初始视角：面向亚洲（东经 100，北纬 20） */
const INITIAL_LON = 100
const INITIAL_LAT = 18
let globeLon = INITIAL_LON
let globeLat = INITIAL_LAT
let isDragging = false
let lastPointerX = 0
let lastPointerY = 0

const clampLat = (v: number) => Math.min(65, Math.max(-65, v))
const wrapLon = (v: number) => ((v + 540) % 360) - 180

const { regionClusters, totalServers } = useNodeGeoClusters({ nodes: () => props.nodes })

interface LabelItem {
  name: string
  coord: [number, number]
}

const labelItems = computed<LabelItem[]>(() => regionClusters.value.map(cluster => ({
  name: cluster.label,
  coord: cluster.coord,
})))

const svg = computed(() => {
  const color = appStore.isDark
    ? { coast: 'var(--globe-coast)', grid: 'var(--globe-grid)', rim: 'var(--globe-rim)', point: 'var(--globe-point)', text: 'var(--globe-text)' }
    : { coast: 'var(--globe-coast)', grid: 'var(--globe-grid)', rim: 'var(--globe-rim)', point: 'var(--globe-point)', text: 'var(--globe-text)' }
  const s: string[] = []

  // 球体轮廓（外圈）
  s.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${color.rim}" stroke-width="1.5"/>`)
  // 内部淡轮
  s.push(`<circle cx="${CX}" cy="${CY}" r="${R - 2}" fill="none" stroke="${color.grid}" stroke-width="0.75"/>`)

  // 经纬网格
  for (const d of meridianPaths(globeLon, globeLat, CX, CY, R, 30))
    s.push(`<path d="${d}" fill="none" stroke="${color.grid}" stroke-width="0.6"/>`)
  for (const d of parallelPaths(globeLon, globeLat, CX, CY, R, 30))
    s.push(`<path d="${d}" fill="none" stroke="${color.grid}" stroke-width="0.6"/>`)
  // 赤道强调
  for (const d of parallelPaths(globeLon, globeLat, CX, CY, R, 30).length ? [] : [])
    s.push(d)

  // 海岸线（面向大陆）
  for (const polygon of WORLD_OUTLINES)
    s.push(`<path d="${coastPath(polygon, globeLon, globeLat, CX, CY, R)}" fill="none" stroke="${color.coast}" stroke-width="1.1" stroke-linejoin="round" opacity="0.9"/>`)

  // 地区节点标记
  const pts: Array<{ name: string, coord: [number, number], point: GlobePoint }> = []
  for (const item of labelItems.value) {
    const p = projectNode(item.coord, globeLon, globeLat, CX, CY, R)
    if (p)
      pts.push({ name: item.name, coord: item.coord, point: p })
  }

  if (pts.length) {
    for (const item of pts)
      s.push(`<circle cx="${item.point.x.toFixed(1)}" cy="${item.point.y.toFixed(1)}" r="3" fill="${color.point}" stroke="${color.rim}" stroke-width="0.8"/>`)

    const rows = layoutLabels(pts.map(item => ({
      name: item.name,
      point: item.point,
      side: item.point.x < CX ? 'left' : 'right',
    })), CX, CY, R, 24)

    for (const row of rows) {
      s.push(`<line x1="${row.dotX.toFixed(1)}" y1="${row.dotY.toFixed(1)}" x2="${row.anchorX}" y2="${row.textY}" stroke="${color.grid}" stroke-width="0.7" stroke-dasharray="3 3"/>`)
      const anchor = row.side === 'left' ? 'start' : 'end'
      s.push(`<text x="${row.anchorX}" y="${row.textY + 4}" font-size="11" fill="${color.text}" text-anchor="${anchor}" font-weight="600">${esc(row.name)}</text>`)
    }
  }

  s.push(`<text x="${CX}" y="${VIEW_H - 8}" font-size="9" fill="${color.grid}" text-anchor="middle" letter-spacing="2">KOMARI · LINE GLOBE · ${totalServers.value} NODES</text>`)
  return s.join('')
})

function onPointerDown(e: PointerEvent) {
  isDragging = true
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging)
    return
  const dx = e.clientX - lastPointerX
  const dy = e.clientY - lastPointerY
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  globeLon = wrapLon(globeLon - dx * 0.36)
  globeLat = clampLat(globeLat + dy * 0.3)
}

function onPointerUp() {
  isDragging = false
}

const { pause: pauseRaf, resume: resumeRaf } = useRafFn(() => {
  if (!shouldRender.value)
    return
  if (!isDragging && shouldAutoRotate.value)
    globeLon = wrapLon(globeLon + 0.06)
}, { immediate: false })

onMounted(() => {
  if (shouldRender.value)
    resumeRaf()
})
onBeforeUnmount(() => {
  pauseRaf()
})
</script>

<template>
  <div ref="containerRef" class="line-globe-host relative h-full w-full select-none touch-none">
    <svg
      :viewBox="`0 0 ${VIEW_W} ${VIEW_H}`"
      class="line-globe-svg absolute inset-0 h-full w-full"
      role="img"
      aria-label="线状图纸地球"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      v-html="svg"
    />
  </div>
</template>

<style scoped>
.line-globe-svg {
  contain: layout paint;
  cursor: grab;
  transition: opacity 0.45s ease;
}
.line-globe-svg:active {
  cursor: grabbing;
}
</style>
