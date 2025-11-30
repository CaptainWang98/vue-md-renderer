import { Component, defineComponent, h, PropType } from 'vue'

// AsyncWrapper component - uses slot to pass in component
export const AsyncWrapper = defineComponent({
  name: 'JsonSuspenseWrapper',
  props: {
    raw: {
      type: Object as PropType<Record<string, unknown> & { content: string }>,
      required: true,
    },
    fallbackMessage: {
      type: String,
      default: 'Loading...',
    },
  },
  // Accept any other props
  inheritAttrs: false,
  setup(props, { slots, attrs }) {
    return () => {
      try {
        // Clean content: remove leading/trailing whitespace, newlines, etc.
        const cleanedContent = props.raw.content.trim()
        // Try to parse JSON on every render
        const parsedContent = JSON.parse(cleanedContent)

        return slots.default?.({ ...attrs, ...parsedContent }) || null
      } catch {
        return (
          slots.fallback?.() ||
          h('div', { style: { color: '#888', fontStyle: 'italic' } }, props.fallbackMessage)
        )
      }
    }
  },
})

// 保留工厂函数以向后兼容
export const createJsonSuspenseWrapper = (
  props: Record<string, unknown> & { content: string; fallbackMessage?: string },
  component: Component,
  fallback?: Component
) => {
  return defineComponent({
    setup() {
      return () =>
        h(
          AsyncWrapper,
          {
            raw: props,
            fallbackMessage: props.fallbackMessage || 'Loading...',
          },
          {
            default: (slotProps: Record<string, unknown>) =>
              h(component, { ...props, ...slotProps }),
            fallback: () =>
              fallback ? h(fallback) : h('div', { style: { color: '#888' } }, 'Loading...'),
          }
        )
    },
  })
}
