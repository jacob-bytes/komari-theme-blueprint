# Blueprint 蓝图视图移植实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `prototypes/blueprint.html` 的工程蓝图风格监控视图移植为 komari-theme-Glassmorphism 内的新「蓝图」工具 Tab,复用现有 service/composable 数据层,渲染真实后端节点数据。

**Architecture:** 蓝图视图是自包含组件子树 `src/components/blueprint/`,通过纯函数 mapper 把 `stores/nodes.ts` 的 `NodeData` 映射为 `BlueprintNode`;历史数据(CPU/延迟)按需经现有 `useNodeLoadStats` / `history.service` 获取;视觉上以 `.bp-root` 作用域 CSS 变量实现白图(默认,跟随 light 主题)/晒图蓝(dark)双纸模式,不触碰全局毛玻璃 token。

**Tech Stack:** Vue 3 `<script setup lang="ts">` + Tailwind v4(CSS-first)+ 现有 reka-ui 组件;SVG 内联渲染拓扑/图表(无新依赖);Playwright 视觉回归。

## Global Constraints

- 分层链不可绕过:`Component -> Composable -> Service -> RequestManager / CacheService -> API / RPC`(src/AGENTS.md:9-13)
- 禁止引入:Naive UI、UnoCSS、SCSS、`lucide-vue-next`、任何新组件库(src/AGENTS.md:86)
- 图标一律 `@iconify/vue`(src/AGENTS.md:88);本视图基本不需要图标
- 无单元测试套件,**不要发明**;验证 = `bun run lint` + `bun run build` + `bun run test:visual`(src/AGENTS.md:124)
- 版本唯一来源是 komari-theme.json,禁止加 package.json.version
- 路由视图单元素根;HomeView 保留 `defineOptions({ name: 'HomeView' })`(KeepAlive 依赖)
- 组件不得直接解析 raw `theme_settings`,须经 `stores/app.ts`
- 缓存 key 必须含全部维度(record type / uuid / hours / maxCount)
- 包管理 bun;所有命令在 `repo-analysis/` 目录执行
- 原型移植源:`/Users/jlthzy/Documents/kmemos/komari-theme/prototypes/blueprint.html`(下称「原型」),几何常量、SVG 渲染逻辑、文案以它为准

---

### Task 1: 蓝图设计令牌与基础样式

**Files:**

- Create: `src/components/blueprint/blueprint.css`
- Modify: `index.html`(字体 link)

**Interfaces:**

- Produces: `.bp-root` 作用域类,内含全部 CSS 变量;`.dark .bp-root` 覆盖为晒图蓝。后续所有蓝图组件根元素挂 `class="bp-root"`。

- [ ] **Step 1: 建组件目录并写 blueprint.css**

从原型 `<style>` 块移植,改动点:① 所有选择器收敛到 `.bp-root` 前缀下;② 变量默认值 = 白图,`.dark .bp-root` = 晒图蓝(不再用 data-mode 属性,跟随全局主题);③ 字体改为页面级引入,不放在组件 CSS。

```css
/* src/components/blueprint/blueprint.css */
.bp-root {
  /* 白图(默认,light 主题) */
  --bp-paper: #f6f8fb;
  --bp-paper-deep: #eef2f7;
  --bp-ink: #1d4e89;
  --bp-faint: rgba(29, 78, 137, 0.55);
  --bp-ghost: rgba(29, 78, 137, 0.28);
  --bp-grid: rgba(29, 78, 137, 0.055);
  --bp-grid-major: rgba(29, 78, 137, 0.1);
  --bp-warn: #a86e00;
  --bp-alert: #c62f2f;
  --bp-frame: var(--bp-ink);
  background-color: var(--bp-paper);
  background-image:
    radial-gradient(120% 90% at 50% 0%, transparent 55%, var(--bp-paper-deep) 100%),
    repeating-linear-gradient(0deg, var(--bp-grid) 0, var(--bp-grid) 1px, transparent 1px, transparent 12px),
    repeating-linear-gradient(90deg, var(--bp-grid) 0, var(--bp-grid) 1px, transparent 1px, transparent 12px),
    repeating-linear-gradient(
      0deg,
      var(--bp-grid-major) 0,
      var(--bp-grid-major) 1px,
      transparent 1px,
      transparent 60px
    ),
    repeating-linear-gradient(
      90deg,
      var(--bp-grid-major) 0,
      var(--bp-grid-major) 1px,
      transparent 1px,
      transparent 60px
    );
  color: var(--bp-ink);
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 13px;
  line-height: 1.55;
  border: 1.5px solid var(--bp-frame);
  outline: 2.5px solid var(--bp-frame);
  outline-offset: 5px;
  margin: 9px;
  padding: 26px 28px 22px;
  position: relative;
}
.dark .bp-root {
  /* 晒图蓝(dark 主题) */
  --bp-paper: #143d72;
  --bp-paper-deep: #0f3160;
  --bp-ink: #e9f2ff;
  --bp-faint: rgba(233, 242, 255, 0.48);
  --bp-ghost: rgba(233, 242, 255, 0.22);
  --bp-grid: rgba(233, 242, 255, 0.045);
  --bp-grid-major: rgba(233, 242, 255, 0.09);
  --bp-warn: #ffb000;
  --bp-alert: #ff8f86;
}
```

其余规则(图框 `.bp-ref`、印章 `.bp-stamp`、设备表 `.bp-sched`、明细 `.bp-detail` 系列、铭牌 `.bp-nplate`、参数行 `.bp-params`、图表 `.bp-chartwrap/.bp-ctitle`)按原型逐一移植,类名加 `bp-` 前缀、选择器挂 `.bp-root` 下;原型中 `var(--ink)` 等全部改名 `var(--bp-ink)` 系列。

- [ ] **Step 2: index.html 引入字体**

在 `<head>` 现有字体/样式引用之后加:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Oswald:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 3: 验证**

Run: `bun run lint && bun run build`
Expected: 均通过(css 未被引用可能有 unused 警告则忽略;Task 3 引入后消除)

- [ ] **Step 4: Commit**

```bash
git add src/components/blueprint/blueprint.css index.html
git commit -m "feat(blueprint): 蓝图视图设计令牌与基础样式"
```

---

### Task 2: 类型定义与数据映射

**Files:**

- Create: `src/components/blueprint/types.ts`
- Create: `src/components/blueprint/mapper.ts`

**Interfaces:**

- Consumes: `NodeData`(src/stores/nodes.ts:11-70)
- Produces: `BlueprintNode`、`BlueprintZone`、`mapNodes(nodes: NodeData[]): { zones: BlueprintZone[]; flat: BlueprintNode[] }`(Task 3-8 依赖)

- [ ] **Step 1: 写 types.ts**

```ts
// src/components/blueprint/types.ts
export type BlueprintStatus = 'ok' | 'warn' | 'offline'

export interface BlueprintNode {
  uuid: string
  tag: string // 位号 = node.name
  host: string // 副行 = remark || uuid.slice(0, 8)
  region: string // 分区名 = region || '未分区'
  group: string | null // 分组 = group 字段,null 归入「未分组」
  cpu: number
  mem: number
  disk: number
  diskText: string // '84/200 GiB'
  netIn: number // B/s
  netOut: number // B/s
  ping: number | null // 最新平均延迟 ms,无 ping 任务为 null
  status: BlueprintStatus
  os: string
  kernel: string
  arch: string
  virt: string
  uptimeDays: number
  load: [number, number, number] | null
  proc: number | null
  tcp: number | null
  udp: number | null
  online: boolean
  lastSeen: string // 离线时相对时间,在线为 ''
}

export interface BlueprintZone {
  name: string
  nodes: BlueprintNode[]
  online: number
  warn: number
  offline: number
}

export interface BlueprintData {
  zones: BlueprintZone[]
  flat: BlueprintNode[]
  totals: { online: number, warn: number, offline: number }
}
```

- [ ] **Step 2: 写 mapper.ts(纯函数,便于视觉回归断言)**

```ts
import type { BlueprintData, BlueprintNode, BlueprintZone } from './types'
// src/components/blueprint/mapper.ts
import type { NodeData } from '@/stores/nodes'
import { formatUptime } from '@/utils/helper'

const WARN_THRESHOLD = 85

function fmtDiskText(n: NodeData): string {
  const total = n.disk_total ?? 0
  const used = (total * (n.status?.disk ?? 0)) / 100
  return `${(used / 1024 ** 3).toFixed(0)}/${(total / 1024 ** 3).toFixed(0)} GiB`
}

export function mapNode(n: NodeData): BlueprintNode {
  const s = n.status
  const online = s?.online ?? false
  const cpu = s?.cpu ?? 0
  const mem = s?.ram ?? 0
  const status = !online
    ? 'offline'
    : (cpu >= WARN_THRESHOLD || mem >= WARN_THRESHOLD) ? 'warn' : 'ok'
  const load = s?.load != null ? [s.load, s.load5, s.load15] as [number, number, number] : null
  return {
    uuid: n.uuid,
    tag: n.name,
    host: n.remark || n.uuid.slice(0, 8),
    region: n.region || '未分区',
    group: n.group || null,
    cpu,
    mem,
    disk: s?.disk ?? 0,
    diskText: fmtDiskText(n),
    netIn: s?.net_in ?? 0,
    netOut: s?.net_out ?? 0,
    ping: s?.ping != null ? avgPing(s.ping) : null,
    status,
    os: n.os || '未知系统',
    kernel: n.kernel_version || '—',
    arch: n.arch || '—',
    virt: n.virtualization || '—',
    uptimeDays: s?.uptime != null ? Math.floor(s.uptime / 86400) : 0,
    load: online ? load : null,
    proc: online ? (s?.process ?? null) : null,
    tcp: online ? (s?.connections ?? null) : null,
    udp: online ? (s?.connections_udp ?? null) : null,
    online,
    lastSeen: online ? '' : relativeLastSeen(s?.status_updated_at),
  }
}

function avgPing(ping: NonNullable<NodeData['status']>['ping']): number | null {
  const vals = Object.values(ping ?? {}).map(p => p.avg).filter(v => v > 0)
  if (!vals.length)
    return null
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function relativeLastSeen(iso?: string): string {
  if (!iso)
    return '未知'
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600_000)
  return h >= 1 ? `${h} 小时前` : `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`
}

export function mapNodes(nodes: NodeData[]): BlueprintData {
  const flat = nodes.map(mapNode)
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
```

注意:字段名以 src/stores/nodes.ts:11-70 为准,若 `status` 为可选联合类型需按现有代码的取用方式(参考 NodeCard.vue 的空值处理)加保护。

- [ ] **Step 3: 验证**

Run: `bun run lint && bun run type-check`
Expected: 通过

- [ ] **Step 4: Commit**

```bash
git add src/components/blueprint/types.ts src/components/blueprint/mapper.ts
git commit -m "feat(blueprint): BlueprintNode 类型与 NodeData 映射"
```

---

### Task 3: 图纸骨架 BlueprintSheet.vue

**Files:**

- Create: `src/components/blueprint/BlueprintSheet.vue`
- Create: `src/components/blueprint/index.ts`

**Interfaces:**

- Consumes: `BlueprintData`(Task 2)
- Produces: `<BlueprintSheet :data="BlueprintData" />` 根组件;内部向 Task 4-8 组件分发 props;`index.ts` 导出 `BlueprintSheet`(懒加载入口)

- [ ] **Step 1: 写组件骨架**

结构移植原型 `<div class="sheet">`:图框参考字母(4 组 `.bp-ref`)、页眉(标题「基础设施蓝图」/ 图号 KOM-26-001 / 版本 C / 日期 / 比例)、图例(`renderLegend` 的 7 项,改为静态 HTML+inline SVG)、四个章节插槽位。日期用 `new Date()` 格式化 YYYY-MM-DD。

```vue
<!-- src/components/blueprint/BlueprintSheet.vue(骨架,样式块 import './blueprint.css') -->
<script setup lang="ts">
import type { BlueprintData } from './types'
import BlueprintDetails from './BlueprintDetails.vue'
import BlueprintGa from './BlueprintGa.vue'
import BlueprintSchedule from './BlueprintSchedule.vue'
import BlueprintTitleBlock from './BlueprintTitleBlock.vue'
import BlueprintZoneSheet from './BlueprintZoneSheet.vue'
import './blueprint.css'

defineProps<{ data: BlueprintData }>()
const today = new Date().toISOString().slice(0, 10)
</script>

<template>
  <div class="bp-root">
    <div v-for="r in ['B', 'C', 'D']" :key="`t${r}`" class="bp-ref bp-ref-t" :style="{ left: `${25 * (+r - 1)}%` }">
      {{ r }}
    </div>
    <!-- ...底部/左右参考字母同理,移植原型 .ref 结构... -->
    <header class="bp-head">
      <div>
        <h1 class="bp-h1">
          基础设施蓝图
        </h1>
        <div class="bp-sub">
          KOMARI INFRASTRUCTURE · 服务器监控总图
        </div>
      </div>
      <div class="bp-head-r">
        图号 <b>KOM-26-001</b> · 版本 <b>C</b> · {{ today }}<br>
        比例 1:1 · 单位 % / ms
      </div>
    </header>
    <div class="bp-legend">
      <!-- 7 项图例,移植原型 renderLegend -->
    </div>
    <div class="bp-sect">
      <span class="bp-no">DWG-01</span><h2>拓扑总图</h2><span class="bp-rule" />
    </div>
    <BlueprintGa :data="data" />
    <template v-if="data.zones.length > 1">
      <div class="bp-sect">
        <span class="bp-no">DWG-01-01…</span><h2>分区图</h2><span class="bp-rule" /><span class="bp-sub2">点击总图分区下钻 · 异常分区默认展开</span>
      </div>
      <BlueprintZoneSheet :data="data" />
    </template>
    <div class="bp-sect">
      <span class="bp-no">DWG-02</span><h2>设备表</h2><span class="bp-rule" />
    </div>
    <BlueprintSchedule :data="data" />
    <div class="bp-sect">
      <span class="bp-no">DWG-03…</span><h2>节点明细图</h2><span class="rule" /><span class="bp-sub2">点击展开 · 默认仅展开告警图纸</span>
    </div>
    <BlueprintDetails :data="data" />
    <BlueprintTitleBlock :data="data" />
    <div class="bp-fine">
      <span>—— 本图纸由 Komari Monitor 自动绘制</span>
      <span>线断,即机失联</span>
    </div>
  </div>
</template>
```

图例 7 项(在线/高负载/离线/中转干线/分组边界/修订云线/详图索引)从原型 `renderLegend()` 移植为模板静态标记。单分区时(所有节点同 region)跳过分区图层,总图直接展示设备符号布局(见 Task 4 的 `simple` 模式)。

- [ ] **Step 2: index.ts 桶导出**

```ts
// src/components/blueprint/index.ts
export { default as BlueprintSheet } from './BlueprintSheet.vue'
```

- [ ] **Step 3: 验证 + Commit**

Run: `bun run type-check && bun run lint && bun run build`
Expected: 通过(子组件未建会报错,故本任务可与 Task 4-8 同分支连续实施,先建空壳组件再逐个填充;空壳 = 仅 props 声明 + 空 template)

```bash
git add src/components/blueprint/
git commit -m "feat(blueprint): 图纸骨架 BlueprintSheet"
```

---

### Task 4: 拓扑总图 BlueprintGa.vue

**Files:**

- Create: `src/components/blueprint/BlueprintGa.vue`

**Interfaces:**

- Consumes: `BlueprintData`
- Produces: `emit('drill', zoneName: string)`(点击分区符号 → Task 5 展开对应分区图)

- [ ] **Step 1: 移植总图渲染**

移植原型 `renderGAStress()`(聚合分区符号路径,**只保留这一条代码路径**,不再实现 std 全符号模式 —— 分区符号路径对任意节点数成立):

- 布局常量照抄:`ZX=[70,385,700], ZY=[170,360], ZW=270, ZH=150`,viewBox `0 0 1040 560`,总线/左侧干线/跳线逻辑照抄
- 分区符号内容:大标题 = `zone.name`,副行 = 主机前缀推断(取区内节点 tag 首段公共前缀小写 + `-*)`、`×N 台`、`正常 n / 告警 n / 离线 n` 汇总、`第 N 张 →`
- 告警分区琥珀边框(warn>0)、离线分区虚线(offline>0)
- 气泡 = 分区序号,`data-zone` → emit drill
- 分区数 > 6 时折行(每行 3 个,行数自动扩高 viewBox)
- 单分区 `simple` 模式(所有节点同区):直接渲染 Task 5 的设备符号网格,无分区符号

Vue 实现方式:`computed` 生成 SVG 字符串后 `v-html` 注入 `<svg>`(与原型同构,避免手写大量模板节点);交互元素用事件委托挂在 `<svg @click>` 上,`data-zone`/`data-host` 取参。`v-html` 内容全部来自本地 mapper,无用户富文本,XSS 面可控;`host/tag` 含特殊字符时经 `esc()` 转义(移植原型 `esc`)。

- [ ] **Step 2: 验证 + Commit**

Run: `bun run lint && bun run build && bun run dev`(手动检查:总图渲染、点击气泡 emit)
Expected: 通过

```bash
git add src/components/blueprint/BlueprintGa.vue
git commit -m "feat(blueprint): 拓扑总图分区符号渲染"
```

---

### Task 5: 分区图 BlueprintZoneSheet.vue

**Files:**

- Create: `src/components/blueprint/BlueprintZoneSheet.vue`

**Interfaces:**

- Consumes: `BlueprintData`;props `drilledZone: string | null`(Task 4 drill 事件回传)
- Produces: 无(叶子)

- [ ] **Step 1: 移植分区图**

移植原型 `renderZoneSheets()`:

- 每分区一个手风琴 `.bp-detail`(复用原型 `.detail` 结构改 `bp-` 前缀),标题行 = 分区名 + 台数/正常/告警/离线 + 图号 `DWG-01-0N` + 张次 + 状态章 + `+` 指示
- 默认展开第一个含告警/离线的分区;`drilledZone` 变化时展开并滚动到对应分区(`scrollIntoView`)
- 框内分组:按 `node.group` 分组,组 = 虚线边界框(2 列节点网格,396px 框宽),`中转`/`relay` 组名命中时琥珀实线框;无组节点归「未分组」框;框连接线走框后(paper fill 遮蔽,移植原型 stubs-first 技巧)
- 紧凑设备符号 172×46:位号 + 主机 + CPU% + 状态标记(●/▲/✕)
- SVG 字符串 + `v-html`,同 Task 4 模式

- [ ] **Step 2: 验证 + Commit**

Run: `bun run lint && bun run build`
Expected: 通过

```bash
git add src/components/blueprint/BlueprintZoneSheet.vue
git commit -m "feat(blueprint): 分区图分组边界框与紧凑设备符号"
```

---

### Task 6: 设备表 BlueprintSchedule.vue

**Files:**

- Create: `src/components/blueprint/BlueprintSchedule.vue`

**Interfaces:**

- Consumes: `BlueprintData`
- Produces: `emit('open', uuid: string)`(行点击 → Task 7 展开明细)

- [ ] **Step 1: 移植设备表**

- 多分区(>1)时按 group 分节(`▉ 组名 · N 台 · 正常 n · 告警 n · 离线 n` 节头行,`.bp-gsec`);单分区平铺
- 列:位号/主机/区域/系统/CPU%/内存%/硬盘%(双行:百分比+diskText)/网络 ↓↑/延迟 ms/状态章
- 热值着色:`>=85` alert、`>=70` warn(移植 `hot()`);离线行整行 faint
- 行点击 emit open;表格容器 `overflow-x:auto`

- [ ] **Step 2: 验证 + Commit**

Run: `bun run lint && bun run build`
Expected: 通过

```bash
git add src/components/blueprint/BlueprintSchedule.vue
git commit -m "feat(blueprint): 设备表按组分节"
```

---

### Task 7: 明细图 BlueprintDetails.vue(含历史数据接入)

**Files:**

- Create: `src/components/blueprint/BlueprintDetails.vue`
- Create: `src/components/blueprint/BlueprintDetail.vue`(单张明细图纸)
- Create: `src/components/blueprint/useBlueprintHistory.ts`

**Interfaces:**

- Consumes: `BlueprintData`;`loadSharedNodeLoadRecords(hours, maxCount)`(history.service);`loadPingRecordsWithTasks(hours, maxCount, uuid)`(history.service:168);props `focusUuid: string | null`
- Produces: `useBlueprintHistory(uuid: Ref<string>, enabled: Ref<boolean>)` → `{ cpuSeries: Ref<number[]>, pingSeries: Ref<number[]>, ready: Ref<boolean> }`

- [ ] **Step 1: 写 useBlueprintHistory.ts**

```ts
import type { Ref } from 'vue'
// src/components/blueprint/useBlueprintHistory.ts
import { ref, watch } from 'vue'
import { loadNodeLoadRecords, loadPingRecordsWithTasks } from '@/services'

export function useBlueprintHistory(uuid: Ref<string>, enabled: Ref<boolean>) {
  const cpuSeries = ref<number[]>([])
  const pingSeries = ref<number[]>([])
  const ready = ref(false)

  watch([uuid, enabled], async ([id, on]) => {
    if (!on || !id)
      return
    ready.value = false
    const [loads, pings] = await Promise.all([
      loadNodeLoadRecords(id, 24, 288),
      loadPingRecordsWithTasks(24, 288, id).catch(() => ({ records: [], tasks: [] })),
    ])
    cpuSeries.value = loads.map(r => r.cpu ?? 0)
    // 同一时间桶多任务取均值;-1(丢包)计为 null 断点
    const byTime = new Map<number, number[]>()
    for (const r of pings.records.filter(p => p.client === id)) {
      if (r.value < 0)
        continue
      const bucket = Math.floor(new Date(r.time).getTime() / 300_000)
      byTime.set(bucket, [...(byTime.get(bucket) ?? []), r.value])
    }
    pingSeries.value = [...byTime.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, vs]) => Math.round(vs.reduce((a, b) => a + b, 0) / vs.length))
    ready.value = true
  }, { immediate: true })

  return { cpuSeries, pingSeries, ready }
}
```

注意:`loadNodeLoadRecords` 返回的 `StatusRecord` 时间字段与 cpu 字段名以 rpc.ts:200-227 为准;`loadPingRecordsWithTasks` 签名见 history.service.ts:168。缓存已由 service 层 SharedCache 承担,此处不重复缓存。

- [ ] **Step 2: 移植明细图纸组件**

`BlueprintDetail.vue`(单节点,props `node: BlueprintNode`,内部调 `useBlueprintHistory`):

- 手风琴结构同 Task 5;默认展开 `status==='warn'`;`focusUuid` 命中时展开+滚动
- 离线:作废章 + 「无数据 — 最后在线 X」
- 在线:**铭牌表**(系统/架构/内核/虚拟化/连续运行/磁盘空间)+ **参数行**(负载 1m/5m/15m、进程数、TCP、UDP)+ 4 条**尺寸标注线**(CPU/内存/硬盘/延迟,移植 `dimLine`,SVG 字符串)+ **双测量曲线**(CPU 固定 0-100 刻度+阈值 85 线;延迟自适应刻度,移植 `chart()` 改为接收 `series: number[]` + `unit` + 刻度模式)
- 图表在 `ready` 前显示骨架占位(虚线框 + 「测量数据加载中」)

`BlueprintDetails.vue`:渲染 `data.flat` 全部节点的 `BlueprintDetail`(手风琴折叠,行内只显示标题行,24+ 节点可承受)。

- [ ] **Step 3: 验证 + Commit**

Run: `bun run lint && bun run build && bun run dev`(手动:展开明细,确认 CPU/延迟曲线出图)
Expected: 通过

```bash
git add src/components/blueprint/BlueprintDetails.vue src/components/blueprint/BlueprintDetail.vue src/components/blueprint/useBlueprintHistory.ts
git commit -m "feat(blueprint): 明细图纸铭牌/参数/尺寸线/双测量曲线"
```

---

### Task 8: 图签与修订记录 BlueprintTitleBlock.vue

**Files:**

- Create: `src/components/blueprint/BlueprintTitleBlock.vue`

**Interfaces:**

- Consumes: `BlueprintData`
- Produces: 无

- [ ] **Step 1: 移植图签 + 修订记录**

- 修订记录表:动态生成 —— 版本 A「首次发行 · N 台 · M 分区」;版本 B/C 为当前异常节点条目(每个 warn 节点一条「负载偏高 · 增补修订云线」、每个 offline 一条「信号中断 · 盖作废章」),无异常时只有 A 条目
- 图签:图名 KOMARI 基础设施监控 / 图号 / 版本 C / 日期 / 比例 1:1 / 张次(第 1 张 / 共 `2 + zones + nodes` 张)/ 审核章(有告警 → 「有告警 · 待复测」,否则「审核通过」)
- 页脚细字:本图纸由 Komari Monitor 自动绘制 / 线断,即机失联

- [ ] **Step 2: 验证 + Commit**

Run: `bun run lint && bun run build`
Expected: 通过

```bash
git add src/components/blueprint/BlueprintTitleBlock.vue
git commit -m "feat(blueprint): 图签与动态修订记录"
```

---

### Task 9: HomeView 集成

**Files:**

- Modify: `src/views/HomeView.vue`(工具 Tab 注册区约 L442-534、异步组件声明区 L48-57、TabsContent 区 L534-590)
- Modify: `src/locales/**`(若仓库存在 i18n 结构;否则文案直接中文,与现有 Panel 文案策略一致)

**Interfaces:**

- Consumes: `BlueprintSheet`(Task 3);`stores/nodes.ts` 的节点响应式列表
- Produces: 首页新工具 Tab「蓝图」

- [ ] **Step 1: 注册异步组件**

在 HomeView 异步组件声明区(L48-57)按现有模式加:

```ts
const BlueprintSheet = defineAsyncComponent(() => import('@/components/blueprint/BlueprintSheet.vue'))
```

- [ ] **Step 2: 注册工具 Tab 与内容区**

在工具 Tab 注册处(参照 NodeComparePanel / HealthSummaryPanel 条目的现有写法,HomeView.vue:442-534)增加 `blueprint` 工具项(TabsTrigger 文案「蓝图」,图标 `iconify:tabler:blueprint` 不存在则用 `tabler:chart-infographic`),并加:

```vue
<TabsContent value="blueprint" class="mt-4">
  <BlueprintSheet :data="blueprintData" />
</TabsContent>
```

`blueprintData` 用 computed 接 store:

```ts
const blueprintData = computed(() => mapNodes(nodesStore.nodes ?? []))
```

(`nodesStore.nodes` 的实际取用写法参照 HomeView 中现有 NodeList 数据来源。)

- [ ] **Step 3: 验证 + Commit**

Run: `bun run type-check && bun run lint && bun run build && bun run dev`
Expected: 构建通过;浏览器切到蓝图 Tab,真实后端数据渲染;切到 card/list Tab 再切回,KeepAlive 不破(单元素根已保证)

```bash
git add src/views/HomeView.vue
git commit -m "feat(blueprint): 首页集成蓝图工具 Tab"
```

---

### Task 10: Playwright 视觉回归

**Files:**

- Modify: `tests/visual/visual.spec.ts`
- Modify: `tests/visual/fixtures/komari.ts`(如需 blueprint 专用选项;预计不需要,直接点 Tab)

**Interfaces:**

- Consumes: `installKomariFixture(page)`(fixtures/komari.ts:3,12 节点固定数据)

- [ ] **Step 1: 新增用例**

```ts
// tests/visual/visual.spec.ts 追加
test('blueprint view renders master ga and schedule', async ({ page }) => {
  await installKomariFixture(page)
  await page.goto('/')
  await page.getByRole('tab', { name: '蓝图' }).click()
  await expect(page.getByText('基础设施蓝图')).toBeVisible()
  await expect(page.getByText('总线 · komari-core')).toBeVisible()
  await expect(page.getByText('DWG-02')).toBeVisible()
  await expect(page).toHaveScreenshot('blueprint-home.png')
})

test('blueprint detail sheet expands with nameplate', async ({ page }) => {
  await installKomariFixture(page)
  await page.goto('/')
  await page.getByRole('tab', { name: '蓝图' }).click()
  const row = page.locator('.bp-sched tbody tr').first()
  await row.click()
  await expect(page.getByText('系统').first()).toBeVisible()
  await expect(page.locator('.bp-nplate').first()).toBeVisible()
})
```

注意:fixture 节点 region 分布决定分区图是否出现;断言用「基础设施蓝图」「DWG-02」等稳定文案,不用分区名(随 fixture 数据变动)。快照首跑 `bun run test:visual -- --update-snapshots` 生成基准。

- [ ] **Step 2: 运行视觉回归**

Run: `bun run test:visual`
Expected: 新旧用例全绿(webServer 自动起 vite preview)

- [ ] **Step 3: Commit**

```bash
git add tests/visual/
git commit -m "test(blueprint): 蓝图视图视觉回归"
```

---

### Task 11: 文档与收尾

**Files:**

- Modify: `AICACHE.md`(当前任务条目)
- Modify: `README.md`(功能列表加蓝图视图一句 + 截图)

- [ ] **Step 1: 更新 AICACHE.md**

按其格式追加「当前任务」:状态 done、范围(新增蓝图工具 Tab,不改数据层/发布契约)、验证记录(lint/build/test:visual 结果)、不做事项(独立主题包、机柜聚合、中转干线推导 —— 留待后续里程碑)。

- [ ] **Step 2: 全量终验**

Run: `bun run lint && bun run build && bun run test:visual`
Expected: 全绿

- [ ] **Step 3: Commit**

```bash
git add AICACHE.md README.md
git commit -m "docs(blueprint): 蓝图视图文档收尾"
```

---

## 明确不做(YAGNI,留待后续里程碑)

- 独立主题包拆分(若未来蓝图与毛玻璃样式冲突再议)
- 机柜聚合(>15 台/区分组为 RACK 符号)—— 分区符号已保证总图不爆
- 中转→落地干线推导(需标签约定,等真实数据有此标签再实现)
- 图纸模式(白图/晒图蓝)独立于主题明暗的后台配置项 —— MVP 跟随 `.dark`
- GPU 信息、流量配额进度条在明细图的呈现(数据已有,版面留白待定)

## 自查记录

- 覆盖:原型全部区块(总图/分区图/设备表/明细/图签/修订/图例/双纸模式)均有对应 Task;数据字段(os/kernel/arch/virt/uptime/load/proc/tcp/udp/ping/disk 绝对值)在 Task 2 mapper + Task 6/7 呈现
- 类型一致:`BlueprintData/BlueprintNode/BlueprintZone` 在 Task 2 定义,Task 3-8 props 均引用同名
- 测试策略符合仓库约束(无 invented unit test,视觉回归走现有 fixture)
