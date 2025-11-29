import { defineComponent, h, computed } from 'vue'
import type { CodeLineProps } from './types'

export default defineComponent({
  name: 'CodeLine',
  props: {
    raw: {
      type: Object,
      default: () => ({}),
    },
    content: {
      type: String,
      default: '',
    },
  },
  setup(props: CodeLineProps) {
    // 获取实际内容
    const content = computed(() => {
      const result = props.raw?.content || props.content || ''
      return result
    })

    return () =>
      h(
        'span',
        {
          class: 'inline-code-tag',
          style: {
            display: 'inline',
            background: '#d7e2f8',
            color: '#376fde',
            padding: '0 4px',
            margin: '0 4px',
            borderRadius: '4px',
            fontWeight: '500',
            border: '1px solid #d7e2f8',
            wordWrap: 'break-word',
            wordBreak: 'break-all',
            lineHeight: '2',
          },
        },
        content.value
      )
  },
})
