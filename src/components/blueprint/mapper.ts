import type { BlueprintData, BlueprintNode, BlueprintStatus, BlueprintZone } from './types'
import type { NodeData } from '@/stores/nodes'

export const BLUEPRINT_WARN_THRESHOLD = 85

function fmtDiskText(n: NodeData): string {
  const total = n.disk_total ?? 0
  const used = (total * (n.disk ?? 0)) / 100
  return `${(used / 1024 ** 3).toFixed(0)}/${(total / 1024 ** 3).toFixed(0)} GiB`
}

function relativeLastSeen(iso?: string): string {
  if (!iso)
    return '未知'
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0)
    return '未知'
  const h = Math.floor(diff / 3600_000)
  if (h >= 1)
    return `${h} 小时前`
  return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`
}

function deriveStatus(n: NodeData): BlueprintStatus {
  if (!n.online)
    return 'offline'
  return (n.cpu >= BLUEPRINT_WARN_THRESHOLD || n.ram >= BLUEPRINT_WARN_THRESHOLD) ? 'warn' : 'ok'
}

export function mapNode(n: NodeData, pingAvg?: number | null): BlueprintNode {
  const status = deriveStatus(n)
  const load: [number, number, number] | null = n.online && n.load != null
    ? [n.load, n.load5, n.load15]
    : null
  return {
    uuid: n.uuid,
    tag: n.name,
    host: n.remark || n.uuid.slice(0, 8),
    region: n.region || '未分区',
    group: n.group || null,
    cpu: n.cpu ?? 0,
    mem: n.ram ?? 0,
    disk: n.disk ?? 0,
    diskText: fmtDiskText(n),
    netIn: n.net_in ?? 0,
    netOut: n.net_out ?? 0,
    ping: pingAvg != null && pingAvg > 0 ? Math.round(pingAvg) : null,
    status,
    os: n.os || '未知系统',
    kernel: n.kernel_version || '—',
    arch: n.arch || '—',
    virt: n.virtualization || '—',
    uptimeDays: n.uptime != null ? Math.floor(n.uptime / 86400) : 0,
    load,
    proc: n.online ? (n.process ?? null) : null,
    tcp: n.online ? (n.connections ?? null) : null,
    udp: n.online ? (n.connections_udp ?? null) : null,
    online: n.online,
    lastSeen: n.online ? '' : relativeLastSeen(n.status_updated_at ?? n.time),
  }
}

/** pingAvgByUuid:节点平均延迟(由 ping composable 层提供);缺省时延迟列为 null */
export function mapNodes(nodes: NodeData[], pingAvgByUuid?: Map<string, number | null>): BlueprintData {
  const flat = nodes.map(n => mapNode(n, pingAvgByUuid?.get(n.uuid) ?? null))
  const byRegion = new Map<string, BlueprintNode[]>()
  for (const n of flat) {
    const list = byRegion.get(n.region) ?? []
    list.push(n)
    byRegion.set(n.region, list)
  }
  const zones: BlueprintZone[] = Array.from(byRegion.entries(), ([name, ns]) => ({
    name,
    nodes: ns,
    online: ns.filter(x => x.status !== 'offline').length,
    warn: ns.filter(x => x.status === 'warn').length,
    offline: ns.filter(x => x.status === 'offline').length,
  }))
    .sort((a, b) => b.nodes.length - a.nodes.length)
  return {
    zones,
    flat,
    totals: {
      online: flat.filter(n => n.status !== 'offline').length,
      warn: flat.filter(n => n.status === 'warn').length,
      offline: flat.filter(n => n.status === 'offline').length,
    },
  }
}
