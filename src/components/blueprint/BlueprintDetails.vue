<script setup lang="ts">
import type { BlueprintData } from './types'
import { watch } from 'vue'
import BlueprintDetail from './BlueprintDetail.vue'

const props = defineProps<{ data: BlueprintData, focusUuid: string | null }>()

const total = () => 2 + props.data.zones.length + props.data.flat.length

// 滚动到焦点节点
watch(
  () => props.focusUuid,
  (uuid) => {
    if (uuid) {
      requestAnimationFrame(() => {
        document.getElementById(`bp-detail-${uuid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  },
)
</script>

<template>
  <div>
    <BlueprintDetail
      v-for="(n, i) in data.flat"
      :key="n.uuid"
      :node="n"
      :index="i"
      :total="total()"
      :focus="focusUuid === n.uuid"
    />
  </div>
</template>
