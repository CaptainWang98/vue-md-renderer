import { computed, defineComponent, h, PropType, toRefs } from 'vue'
import { useMarkdownProcessor } from './processor'
import { PluggableList } from 'unified'
import { type Options as RehypeOptions } from 'remark-rehype'
import { useComponentRegistry, useDefaultComponents } from './hooks/useComponents'
import { render } from './hast-to-vnode'
import { useShiki } from './hooks/useShiki'
import { ComponentRenderer } from './components/componentRegistry'

export default defineComponent({
  name: 'MarkdownRenderer',
  props: {
    content: { type: String, required: true },
    preRemarkPlugins: {
      type: Array as PropType<PluggableList>,
      required: false,
      default: () => [],
    },
    remarkPlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
    rehypeOptions: { type: Object as PropType<RehypeOptions>, required: false },
    rehypePlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
  },
  setup(props, { slots, attrs }) {
    const componentsDefault = useDefaultComponents()
    const componentsRegistry = useComponentRegistry()
    // register default components
    componentsRegistry.regist(componentsDefault)
    // register slot components
    if (slots && Object.keys(slots).length > 0) {
      const slotComponents: Record<string, ComponentRenderer> = {}
      for (const [name, slotFn] of Object.entries(slots)) {
        if (slotFn instanceof Function) {
          slotComponents[name] = (props: Record<string, unknown>) => slotFn(props)
        }
      }
      componentsRegistry.regist(slotComponents)
    }

    // init shiki
    useShiki()

    return () => h(MarkdownRendererImpl, { ...props, attrs })
  },
})

const MarkdownRendererImpl = defineComponent({
  name: 'MarkdownRendererImpl',
  props: {
    content: { type: String, required: true },
    preRemarkPlugins: {
      type: Array as PropType<PluggableList>,
      required: false,
      default: () => [],
    },
    remarkPlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
    rehypeOptions: {
      type: Object as PropType<RehypeOptions>,
      required: false,
      default: () => ({}),
    },
    rehypePlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
  },
  setup(props, { attrs }) {
    const { content, preRemarkPlugins, remarkPlugins, rehypePlugins, rehypeOptions } = toRefs(props)

    const processor = useMarkdownProcessor({
      preRemarkPlugins: preRemarkPlugins.value,
      remarkPlugins: remarkPlugins.value,
      rehypePlugins: rehypePlugins.value,
      rehypeOptions: rehypeOptions.value,
    })

    const mdast = computed(() => processor.value.parse(content.value))
    const hast = computed(() => processor.value.runSync(mdast.value))

    return () => {
      return render(hast.value, attrs)
    }
  },
})
