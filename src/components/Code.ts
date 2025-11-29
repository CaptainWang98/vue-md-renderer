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
        if (componentRegistry && componentRegistry.inline) {
          const renderer = componentRegistry.inline
          if (typeof renderer === 'function') {
            return renderer(props)
          }
          return h(renderer, props)
        }
        return h(CodeLine, { raw: props.raw })
      }
      const { language } = props.raw
      if (componentRegistry && componentRegistry[language]) {
        const renderer = componentRegistry[language]

        if (typeof renderer === 'function') {
          return renderer(props)
        }
        return h(renderer, props)
      }

      return h(CodeBlock, props)
    }
  },
})
