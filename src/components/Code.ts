import { defineComponent, h } from 'vue'
import { useComponentRegistry } from '../hooks/useComponents'
import CodeLine from './CodeLine/index'
import CodeBlock from './CodeBlock/index.vue'
// import { useMarkdownContext } from '../MarkdownProvider';

export default defineComponent({
  name: 'CodeComponentWrapper',
  props: {
    raw: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    // TODO: implement code renderer logic
    const componentRegistry = useComponentRegistry()
    return (): ReturnType<typeof h> | null => {
      if (props.raw.inline) {
        if (componentRegistry && componentRegistry.has('inline')) {
          const renderer = componentRegistry.get('inline')
          if (renderer && typeof renderer === 'function') {
            return renderer(props)
          }
          if (renderer) {
            return h(renderer, props)
          }
        }
        return h(CodeLine, { raw: props.raw })
      }
      const { language } = props.raw
      if (componentRegistry && componentRegistry.has(language)) {
        const renderer = componentRegistry.get(language)

        if (renderer && typeof renderer === 'function') {
          return renderer(props)
        }
        if (renderer) {
          return h(renderer, props)
        }
      }

      return h(CodeBlock, props)
    }
  },
})
