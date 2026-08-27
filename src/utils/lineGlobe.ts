import type { LonLat } from '@/data/world-outlines'

/**
 * 线状图纸地球的核心投影与几何纯函数（正交投影，无第三方依赖）。
 * 与 blueprint/svg.ts 的零依赖风格一致；组件只负责 UI 与交互。
 */

export interface GlobePoint {
  x: number
  y: number
  /** 球面前向（朝向观察者），用于裁剪背面 */
  visible: boolean
}

/**
 * 正交投影：经纬度 + 球心 (centerLon, centerLat) → SVG 平面坐标。
 * 返回坐标系以 (cx, cy) 为圆心、radius 为半径。
 */
export function ortho(
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
  cx: number,
  cy: number,
  radius: number,
): GlobePoint {
  const lambda = (lon - centerLon) * Math.PI / 180
  const phi = lat * Math.PI / 180
  const phi0 = centerLat * Math.PI / 180
  const cosPhi = Math.cos(phi)
  const sinPhi = Math.sin(phi)
  const cosPhi0 = Math.cos(phi0)
  const sinPhi0 = Math.sin(phi0)
  const x = cosPhi * Math.sin(lambda)
  const y = cosPhi0 * sinPhi - sinPhi0 * cosPhi * Math.cos(lambda)
  const z = sinPhi0 * sinPhi + cosPhi0 * cosPhi * Math.cos(lambda)
  return {
    x: cx + radius * x,
    y: cy - radius * y,
    visible: z > 0.02,
  }
}

/** 海岸线多边形 → SVG path（背面可见时断开，形成裁剪） */
export function coastPath(
  polygon: LonLat[],
  centerLon: number,
  centerLat: number,
  cx: number,
  cy: number,
  radius: number,
): string {
  let d = ''
  let pen = false
  for (const [lon, lat] of polygon) {
    const p = ortho(lon, lat, centerLon, centerLat, cx, cy, radius)
    if (!p.visible) {
      pen = false
      continue
    }
    d += pen ? `L${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    pen = true
  }
  return d
}

/** 经线（每 step 度一条，从 -90 到 90 纬度采样） */
export function meridianPaths(
  centerLon: number,
  centerLat: number,
  cx: number,
  cy: number,
  radius: number,
  step = 30,
): string[] {
  const out: string[] = []
  for (let lon = -180; lon < 180; lon += step) {
    let d = ''
    let pen = false
    for (let lat = -90; lat <= 90; lat += 4) {
      const p = ortho(lon, lat, centerLon, centerLat, cx, cy, radius)
      if (!p.visible) {
        pen = false
        continue
      }
      d += pen ? `L${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      pen = true
    }
    if (d)
      out.push(d)
  }
  return out
}

/** 纬线（每 step 度一条，经度全周采样） */
export function parallelPaths(
  centerLon: number,
  centerLat: number,
  cx: number,
  cy: number,
  radius: number,
  step = 30,
): string[] {
  const out: string[] = []
  for (let lat = -80; lat <= 80; lat += step) {
    let d = ''
    let pen = false
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = ortho(lon, lat, centerLon, centerLat, cx, cy, radius)
      if (!p.visible) {
        pen = false
        continue
      }
      d += pen ? `L${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `M${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      pen = true
    }
    if (d)
      out.push(d)
  }
  return out
}

/**
 * 节点坐标 → 投影点；背面返回 null。
 * 注意：coord 为 [lat, lng]（Komari 节点/聚合簇的坐标顺序），内部交换为 (lon, lat)。
 */
export function projectNode(
  coord: LonLat,
  centerLon: number,
  centerLat: number,
  cx: number,
  cy: number,
  radius: number,
): GlobePoint | null {
  const p = ortho(coord[1], coord[0], centerLon, centerLat, cx, cy, radius)
  return p.visible ? p : null
}

export interface GlobeLabelRow {
  side: 'left' | 'right'
  name: string
  anchorX: number
  textY: number
  dotX: number
  dotY: number
}

/**
 * 左右标签布局（防重叠：每侧按投影 y 排序后以固定行高堆叠）。
 * 输入：节点点 + 文本；输出：左右侧标签行（含引线两端坐标）。
 */
export function layoutLabels(
  items: Array<{ name: string, point: GlobePoint, side: 'left' | 'right' }>,
  cx: number,
  cy: number,
  radius: number,
  rowHeight: number,
): GlobeLabelRow[] {
  const left: Array<{ name: string, point: GlobePoint, side: 'left' | 'right' }> = []
  const right: Array<{ name: string, point: GlobePoint, side: 'left' | 'right' }> = []
  for (const item of items)
    (item.side === 'left' ? left : right).push(item)
  const pack = (rows: typeof left, alignLeft: boolean): GlobeLabelRow[] => rows
    .sort((a, b) => a.point.y - b.point.y)
    .map((item, index) => {
      const y = topOf(rows.length, index, cy, rowHeight)
      const anchorX = alignLeft ? cx - radius - 8 : cx + radius + 8
      return {
        side: item.side,
        name: item.name,
        anchorX: alignLeft ? anchorX : anchorX,
        textY: y,
        dotX: item.point.x,
        dotY: item.point.y,
      }
    })
  return [...pack(left, true), ...pack(right, false)]
}

function topOf(count: number, index: number, cy: number, rowHeight: number): number {
  const half = (count - 1) * rowHeight / 2
  return cy - half + index * rowHeight
}
