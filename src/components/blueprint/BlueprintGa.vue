<script setup lang="ts">
import type { BlueprintData, BlueprintZone } from './types'
import { computed } from 'vue'
import { ALERT, FAINT, GHOST, INK, seg, txt, WARN } from './svg'

const props = defineProps<{ data: BlueprintData }>()
const emit = defineEmits<{ (e: 'drill', zone: string): void }>()

const ZX = [70, 385, 700]
const ZY = [170, 360]
const ZW = 270
const ZH = 150
const PER_ROW = 3
const RE_TAG_PREFIX = /^[A-Z]+/i

const viewH = computed(() => 90 + Math.ceil(props.data.zones.length / PER_ROW) * (ZH + 40) + 40)

const svg = computed(() => {
  const { zones, totals } = props.data
  const s: string[] = []
  s.push(`<g class="bp-draw" style="--len:2000">`)
  s.push(`<rect x="60" y="46" width="920" height="22" fill="none" stroke="${INK}" stroke-width="2"/>`)
  s.push(`<rect x="66" y="52" width="908" height="10" fill="none" stroke="${GHOST}" stroke-width="1"/>`)
  s.push(`</g>`)
  s.push(txt(70, 61, `总线 · komari-core · 轮询 5s · ${totals.online + totals.warn + totals.offline} 台 · 正常 ${totals.online} · 告警 ${totals.warn} · 离线 ${totals.offline}`, 11, INK, 'start', 700, 2))
  // 左侧干线
  const rows = Math.ceil(zones.length / PER_ROW)
  const spineEnd = 68 + rows * (ZH + 40) - 20
  s.push(seg(45, 68, 45, spineEnd))
  for (let r = 0; r < rows; r++) {
    const mid = 90 + r * (ZH + 40) + ZH / 2
    s.push(seg(45, mid, 70, mid))
  }
  zones.forEach((z, i) => {
    const x = ZX[i % PER_ROW]!
    const y = ZY[0]! + Math.floor(i / PER_ROW) * (ZH + 40)
    const warn = z.warn > 0
    const off = z.offline > 0
    s.push(`<g class="bp-zsym" data-zone="${z.name}" tabindex="0" role="button" aria-label="打开分区 ${z.name}">`)
    s.push(`<rect class="bp-zb" x="${x}" y="${y}" width="${ZW}" height="${ZH}" stroke="${warn ? WARN : INK}" stroke-width="${warn ? 2 : 1.5}"${off ? ' stroke-dasharray="8 4"' : ''}/>`)
    s.push(txt(x + 14, y + 30, z.name, 16, INK, 'start', 700, 2))
    s.push(txt(x + 14, y + 52, `${prefixOf(z)} · ${z.nodes.length} 台`, 11, FAINT, 'start', 400, 1))
    s.push(txt(x + 14, y + 88, `×${z.nodes.length} 台`, 12, INK, 'start', 700, 1.5))
    s.push(txt(x + 14, y + 118, `● ${z.online}`, 12, INK, 'start', 700, 1))
    if (z.warn)
      s.push(txt(x + 100, y + 118, `▲ ${z.warn}`, 12, WARN, 'start', 700, 1))
    if (z.offline)
      s.push(txt(x + 170, y + 118, `✕ ${z.offline}`, 12, ALERT, 'start', 700, 1))
    s.push(txt(x + 14, y + 142, `第 ${i + 1} 张 →`, 9, FAINT, 'start', 400, 1))
    s.push(`</g>`)
    s.push(`<g class="bp-bubble" data-zone="${z.name}" tabindex="0" role="button" aria-label="打开分区 ${z.name}">`)
    s.push(`<circle cx="${x + ZW - 2}" cy="${y + ZH - 2}" r="11" stroke="${INK}" stroke-width="1.5" fill="var(--bp-paper)"/>`)
    s.push(txt(x + ZW - 2, y + ZH + 2, String(i + 1), 11, INK, 'middle', 700))
    s.push(`</g>`)
  })
  s.push(txt(1020, viewH.value - 6, 'KOM-26-001 · 总图', 9, FAINT, 'end', 400, 2))
  return s.join('')
})

function prefixOf(z: BlueprintZone): string {
  const tags = z.nodes.map(n => n.tag).filter(Boolean)
  if (!tags.length)
    return '-*'
  const first = tags[0]!
  const m = first.match(RE_TAG_PREFIX)
  return `${m ? m[0].toLowerCase() : first.slice(0, 2).toLowerCase()}-*`
}

function onClick(e: Event) {
  const t = (e.target as Element).closest('[data-zone]')
  if (t)
    emit('drill', (t as HTMLElement).dataset.zone!)
}
</script>

<template>
  <div class="bp-ga-wrap">
    <svg :viewBox="`0 0 1040 ${viewH}`" role="img" aria-label="节点拓扑总图" @click="onClick" @keydown.enter="onClick" v-html="svg" />
  </div>
</template>
