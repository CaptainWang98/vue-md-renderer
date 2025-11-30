<script lang="ts" setup>
// import { ElScrollbar } from 'element-plus';
import { computed } from 'vue'

export interface HighLightCodeProps {
  code: string[]
  lang: string
  enableCodeLineNumber: boolean
}

const props = defineProps<HighLightCodeProps>()

const codeClass = computed(() => `language-${props.lang || 'text'}`)
</script>

<template>
  <div style="display: flex; background: transparent; overflow: hidden">
    <!-- <div v-if="props.enableCodeLineNumber" class="line-numbers">
      <span
        v-for="(_line, index) in props.code"
        :key="index"
        class="line-number"
      >
        {{ index + 1 }}
      </span>
    </div> -->
    <!-- <ElScrollbar class="elx-highlight-code-scrollbar"> -->
    <div style="white-space: pre" :class="codeClass">
      <span
        v-for="(line, index) in props.code"
        :key="index"
        style="width: max-content; display: block"
        v-html="line"
      />
    </div>
    <!-- </ElScrollbar> -->
  </div>
</template>

<style lang="css">
:deep(.line) {
  width: max-content;
  display: inline-block;
  white-space: pre;
  span {
    display: inline-block;
  }
}
</style>
