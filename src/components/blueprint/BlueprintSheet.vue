<script setup lang="ts">
import type { BlueprintData } from './types'
import { ref } from 'vue'
import BlueprintDetails from './BlueprintDetails.vue'
import BlueprintGa from './BlueprintGa.vue'
import BlueprintSchedule from './BlueprintSchedule.vue'
import BlueprintTitleBlock from './BlueprintTitleBlock.vue'
import BlueprintZoneSheet from './BlueprintZoneSheet.vue'
import './blueprint.css'

const props = defineProps<{ data: BlueprintData }>()

const drilledZone = ref<string | null>(null)
const focusUuid = ref<string | null>(null)

const today = new Date().toISOString().slice(0, 10)

const multiZone = () => props.data.zones.length > 1

function onDrill(zone: string) {
  drilledZone.value = zone
}

function onOpen(uuid: string) {
  focusUuid.value = uuid
}
</script>

<template>
  <div class="bp-root">
    <div class="bp-ref t" style="left:25%">
      B
    </div>
    <div class="bp-ref t" style="left:50%">
      C
    </div>
    <div class="bp-ref t" style="left:75%">
      D
    </div>
    <div class="bp-ref b" style="left:25%">
      B
    </div>
    <div class="bp-ref b" style="left:50%">
      C
    </div>
    <div class="bp-ref b" style="left:75%">
      D
    </div>
    <div class="bp-ref l" style="top:25%">
      2
    </div>
    <div class="bp-ref l" style="top:50%">
      3
    </div>
    <div class="bp-ref l" style="top:75%">
      4
    </div>
    <div class="bp-ref r" style="top:25%">
      2
    </div>
    <div class="bp-ref r" style="top:50%">
      3
    </div>
    <div class="bp-ref r" style="top:75%">
      4
    </div>

    <header>
      <div class="bp-head-l">
        <h1>基础设施蓝图</h1>
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
      <span><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="var(--bp-ink)" stroke-width="1.5" /></svg>在线</span>
      <span><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="var(--bp-warn)" stroke-width="2.5" /></svg>高负载</span>
      <span><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="var(--bp-faint)" stroke-width="1.5" stroke-dasharray="4 4" /></svg>离线</span>
      <span><svg width="34" height="10"><line x1="0" y1="2" x2="34" y2="2" stroke="var(--bp-ink)" stroke-width="1.2" /><line x1="0" y1="7" x2="34" y2="7" stroke="var(--bp-ink)" stroke-width="1.2" /></svg>中转干线</span>
      <span><svg width="34" height="8"><line x1="0" y1="4" x2="34" y2="4" stroke="var(--bp-ink)" stroke-width="3" /></svg>分组边界</span>
      <span><svg width="30" height="14"><path d="M2,3 a3,3 0 0 1 6,0 a3,3 0 0 1 6,0 a3,3 0 0 1 6,0 a3,3 0 0 1 6,0" fill="none" stroke="var(--bp-alert)" stroke-width="1.2" /></svg>修订云线</span>
      <span><svg width="16" height="14"><circle cx="8" cy="7" r="6" fill="none" stroke="var(--bp-ink)" stroke-width="1.2" /></svg>详图索引</span>
    </div>

    <div class="bp-sect">
      <span class="bp-no">DWG-01</span><h2>拓扑总图</h2><span class="bp-rule" />
    </div>
    <BlueprintGa :data="data" @drill="onDrill" />

    <template v-if="multiZone()">
      <div class="bp-sect">
        <span class="bp-no">DWG-01-01…</span><h2>分区图</h2><span class="bp-rule" /><span class="bp-sub" style="letter-spacing:.1em">点击总图分区下钻 · 异常分区默认展开</span>
      </div>
      <BlueprintZoneSheet :data="data" :drilled-zone="drilledZone" @open="onOpen" />
    </template>

    <div class="bp-sect">
      <span class="bp-no">DWG-02</span><h2>设备表</h2><span class="bp-rule" />
    </div>
    <BlueprintSchedule :data="data" @open="onOpen" />

    <div class="bp-sect">
      <span class="bp-no">DWG-03…</span><h2>节点明细图</h2><span class="bp-rule" /><span class="bp-sub" style="letter-spacing:.1em">点击展开 · 默认仅展开告警图纸</span>
    </div>
    <BlueprintDetails :data="data" :focus-uuid="focusUuid" />

    <BlueprintTitleBlock :data="data" />

    <div class="bp-fine">
      <span>—— 本图纸由 Komari Monitor 自动绘制</span>
      <span>线断,即机失联</span>
    </div>
  </div>
</template>
