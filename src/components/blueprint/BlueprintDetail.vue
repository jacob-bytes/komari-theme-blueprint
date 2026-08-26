<script setup lang="ts">
import type { BlueprintNode } from './types'
import { computed, ref, watch } from 'vue'
import { ALERT, downsample, FAINT, GHOST, INK, txt, WARN } from './svg'
import { useBlueprintHistory } from './useBlueprintHistory'

const props = defineProps<{ node: BlueprintNode, index: number, total: number, focus: boolean }>()

const open = ref(props.node.status === 'warn')

watch(
  () => props.focus,
  (f) => {
    if (f) {
      open.value = true
      requestAnimationFrame(() => {
        document.getElementById(`bp-detail-${props.node.uuid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  },
)

const { series } = useBlueprintHistory(
  () => props.node.uuid,
  () => open.value && props.node.status !== 'offline',
)

const f = (v: number | null | undefined) => (v == null ? '—' : String(v))

/* ---- 尺寸标注线 ---- */
function dimLine(label: string, val: number, unit: string, max: number, warnAt: number): string {
  const W = 560
  const H = 26
  const x0 = 86
  const x1 = W - 70
  const y = 17
  const fx = x0 + (x1 - x0) * Math.min(1, val / max)
  const hot = val >= warnAt
  const col = hot ? WARN : INK
  const s: string[] = []
  s.push(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} ${val}${unit}">`)
  s.push(`<line x1="${x0}" y1="6" x2="${x0}" y2="${H - 3}" stroke="${FAINT}" stroke-width="1"/>`)
  s.push(`<line x1="${x1}" y1="6" x2="${x1}" y2="${H - 3}" stroke="${FAINT}" stroke-width="1"/>`)
  s.push(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${GHOST}" stroke-width="1"/>`)
  s.push(`<polygon points="${x0},${y} ${x0 + 7},${y - 3} ${x0 + 7},${y + 3}" fill="${FAINT}"/>`)
  s.push(`<polygon points="${x1},${y} ${x1 - 7},${y - 3} ${x1 - 7},${y + 3}" fill="${FAINT}"/>`)
  s.push(`<line x1="${x0}" y1="${y}" x2="${fx}" y2="${y}" stroke="${col}" stroke-width="2.5"/>`)
  s.push(txt(0, y + 4, label, 10.5, FAINT, 'start', 400, 1))
  s.push(`<text x="${W}" y="${y + 4}" font-size="11" fill="${col}" text-anchor="end" font-weight="700">${val}<tspan font-size="8.5" fill="${FAINT}">${unit}</tspan></text>`)
  s.push(`</svg>`)
  return s.join('')
}

/* ---- 24h 测量曲线 ---- */
function chart(seriesData: number[], unit: string, fixedScale: boolean, limit?: number): string {
  const W = 560
  const H = 132
  const L = 46
  const R = 8
  const T = 12
  const B = 22
  const iw = W - L - R
  const ih = H - T - B
  const pts = downsample(seriesData, 112)
  let lo: number
  let hi: number
  if (fixedScale) {
    lo = 0
    hi = 100
  }
  else {
    const vs = pts.filter(v => v != null) as number[]
    if (!vs.length) {
      lo = 0
      hi = 1
    }
    else {
      const mn = Math.min(...vs)
      const mx = Math.max(...vs)
      const pad = (mx - mn) || mx * 0.3 || 1
      lo = Math.max(0, Math.floor(mn - pad * 0.3))
      hi = Math.ceil(mx + pad * 0.3)
    }
  }
  const X = (i: number) => L + (i / (pts.length - 1)) * iw
  const Y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * ih
  const s: string[] = []
  s.push(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="24h ${unit} curve">`)
  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4
    s.push(`<line x1="${L}" y1="${Y(v)}" x2="${W - R}" y2="${Y(v)}" stroke="${k === 0 ? FAINT : GHOST}" stroke-width="1"/>`)
    s.push(txt(L - 5, Y(v) + 3.5, String(Math.round(v)), 8.5, FAINT, 'end', 400, 1))
  }
  s.push(txt(L - 5, T - 3, unit, 8, FAINT, 'end', 400, 1))
  for (let h = 0; h <= 24; h += 4) {
    const x = L + (h / 24) * iw
    s.push(`<line x1="${x}" y1="${T}" x2="${x}" y2="${T + ih}" stroke="${GHOST}" stroke-width="1"/>`)
    s.push(txt(x, H - 6, `${String(h).padStart(2, '0')}:00`, 8.5, FAINT, 'middle', 400, 1))
  }
  if (limit != null && limit >= lo && limit <= hi) {
    s.push(`<line x1="${L}" y1="${Y(limit)}" x2="${W - R}" y2="${Y(limit)}" stroke="${ALERT}" stroke-width="1" stroke-dasharray="5 4"/>`)
    s.push(txt(W - R, Y(limit) - 4, `阈值 ${limit}`, 8.5, ALERT, 'end', 400, 1))
  }
  let d = ''
  let peak: number | null = null
  let pi = 0
  pts.forEach((v, i) => {
    if (v == null)
      return
    if (peak == null || v > peak) {
      peak = v
      pi = i
    }
  })
  pts.forEach((v, i) => {
    if (v == null)
      return
    d += `${d ? ' L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`
  })
  if (d)
    s.push(`<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.6"/>`)
  if (peak != null) {
    s.push(`<circle cx="${X(pi)}" cy="${Y(peak)}" r="3" fill="none" stroke="${WARN}" stroke-width="1.5"/>`)
    const anchor = pi > pts.length - 14 ? 'end' : 'start'
    s.push(txt(X(pi) + (anchor === 'end' ? -6 : 6), Y(peak) - 5, `峰 ${Math.round(peak)}${unit}`, 9, WARN, anchor, 700, 1))
  }
  s.push(`</svg>`)
  return s.join('')
}

const cpuChart = computed(() => chart(series.value.cpu, '%', true, 85))
const pingChart = computed(() => chart(series.value.ping, 'ms', false))

const loadText = computed(() => {
  const l = props.node.load
  if (!l)
    return `负载 1m <b>—</b> · 5m <b>—</b> · 15m <b>—</b>`
  return `负载 1m <b>${l[0]}</b> · 5m <b>${l[1]}</b> · 15m <b>${l[2]}</b>`
})

const nameplateHtml = computed(() => `<table class="bp-nplate"><tbody>
  <tr><td class="bp-k">系统</td><td>${props.node.os}</td><td class="bp-k">架构</td><td>${props.node.arch}</td></tr>
  <tr><td class="bp-k">内核</td><td>${props.node.kernel}</td><td class="bp-k">虚拟化</td><td>${props.node.virt}</td></tr>
  <tr><td class="bp-k">连续运行</td><td>${props.node.uptimeDays} 天</td><td class="bp-k">磁盘空间</td><td>${props.node.disk}% · ${props.node.diskText}</td></tr>
</tbody></table>`)

const dimsHtml = computed(() => [
  dimLine('CPU 占用', props.node.cpu, '%', 100, 85),
  dimLine('内存', props.node.mem, '%', 100, 85),
  dimLine('硬盘', props.node.disk, '%', 100, 85),
  dimLine('延迟', props.node.ping ?? 0, 'ms', 300, 150),
].join(''))

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <div :id="`bp-detail-${node.uuid}`" class="bp-detail" :class="{ 'bp-open': open }">
    <div class="bp-dhead" tabindex="0" role="button" :aria-expanded="open ? 'true' : 'false'" @click="toggle" @keydown.enter="toggle">
      <span class="bp-bub">{{ String.fromCharCode(64 + index + 1) }}</span>
      <h2>明细 {{ String.fromCharCode(64 + index + 1) }} · {{ node.tag }}</h2>
      <span class="bp-meta">{{ node.host }} · {{ node.region }} · 比例 1:1</span>
      <span v-if="node.status === 'offline'" class="bp-stamp">已离线</span>
      <span v-else-if="node.status === 'warn'" class="bp-stamp">负载偏高</span>
      <span v-else class="bp-stamp ok">正常</span>
      <span class="bp-tw">+</span>
    </div>
    <div class="bp-dbody">
      <div v-if="node.status === 'offline'" class="bp-voidbox">
        <span class="bp-stamp big">作废</span>
        <span>无数据 — 最后在线 {{ node.lastSeen }} · 详图作废,待复测重绘</span>
      </div>
      <template v-else>
        <div class="bp-specs">
          <div v-html="nameplateHtml" />
          <div class="bp-params">
            <span v-html="loadText" />
            <span>进程数 <b>{{ f(node.proc) }}</b></span>
            <span>TCP 链接 <b>{{ f(node.tcp) }}</b></span>
            <span>UDP 链接 <b>{{ f(node.udp) }}</b></span>
          </div>
        </div>
        <div class="bp-dims" v-html="dimsHtml" />
        <div class="bp-chartwrap">
          <div class="bp-ctitle">
            测量记录 · CPU 24h
          </div>
          <template v-if="series.ready">
            <span v-html="cpuChart" />
          </template>
          <div v-else class="bp-voidbox" style="min-height:132px">
            <span>测量数据加载中…</span>
          </div>
        </div>
        <div class="bp-chartwrap">
          <div class="bp-ctitle">
            测量记录 · 延迟 24h
          </div>
          <template v-if="series.ready">
            <span v-html="pingChart" />
          </template>
          <div v-else class="bp-voidbox" style="min-height:132px">
            <span>测量数据加载中…</span>
          </div>
        </div>
        <div class="bp-dfoot">
          <div>图号 KOM-26-00{{ index + 3 }}</div>
          <div>第 {{ index + 3 }} 张 / 共 {{ total }} 张</div>
          <div>KOMARI 绘制</div>
        </div>
      </template>
    </div>
  </div>
</template>
