import type { BlueprintHistorySeries } from './types'
import { computed, ref, watch } from 'vue'
import { loadNodeLoadRecords, loadPingRecordsWithTasks } from '@/services'

/**
 * 加载单节点 24h CPU 历史与延迟历史,供明细图纸测量曲线使用。
 * 依赖 history.service 的模块级 SharedCache,不在此处重复缓存。
 */
export function useBlueprintHistory(uuid: () => string | undefined, enabled: () => boolean) {
  const cpu = ref<number[]>([])
  const ping = ref<number[]>([])
  const ready = ref(false)

  watch(
    [uuid, enabled],
    async ([id, on]) => {
      if (!on || !id) {
        ready.value = false
        return
      }
      ready.value = false
      const [loads, pings] = await Promise.all([
        loadNodeLoadRecords(id, 24, 288),
        loadPingRecordsWithTasks(24, 288, id).catch(() => ({ records: [], tasks: [] })),
      ])
      cpu.value = loads.map(r => r.cpu ?? 0)
      // 同一时间桶多任务取均值;-1(丢包)计为断点,不入序列
      const byTime = new Map<number, number[]>()
      for (const r of pings.records) {
        if (r.client !== id || r.value < 0)
          continue
        const bucket = Math.floor(new Date(r.time).getTime() / 300_000)
        byTime.set(bucket, [...(byTime.get(bucket) ?? []), r.value])
      }
      ping.value = [...byTime.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, vs]) => Math.round(vs.reduce((a, b) => a + b, 0) / vs.length))
      ready.value = true
    },
    { immediate: true },
  )

  const series = computed<BlueprintHistorySeries>(() => ({
    cpu: cpu.value,
    ping: ping.value,
    ready: ready.value,
  }))

  return { series }
}
