import { defineComponent, h, PropType } from 'vue'

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
