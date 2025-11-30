<script lang="ts">
import { defineComponent, PropType, ref, watch } from 'vue'

export default defineComponent({
  props: {
    children: {
      type: Array,
      default: () => [],
    },
    class: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    content: {
      type: String,
      default: '',
    },
    inline: {
      type: Boolean,
      default: false,
    },
    codeKey: {
      type: String,
      default: '',
    },
    language: {
      type: String,
      default: '',
    },
    languageOriginal: {
      type: String,
      default: '',
    },
  },
  async setup(props) {
    const contentRef = ref(props.content)
    return new Promise(resolve => {
      const stopWatch = watch(contentRef, val => {
        // resolve until json-content is ready
        try {
          const json = JSON.parse(val)
          resolve(json)
          stopWatch() // stop watching
        } catch {
          // Ignore parse errors
        }
      })
    })
  },
})
</script>
<template>
  <Suspense>
    <!-- render default slot -->
    <template #default>
      <div class="custom-suspense">
        <slot />
      </div>
    </template>
    <!-- fallback content while waiting for the default slot to be ready -->
    <template #fallback>
      <div class="custom-suspense-fallback">Loading...</div>
    </template>
  </Suspense>
</template>
