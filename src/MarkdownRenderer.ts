import { computed, defineComponent, h, PropType, provide, toRefs } from 'vue'
import { useMarkdownProcessor } from './processor'
import { PluggableList } from 'unified'
import { type Options as RehypeOptions } from 'remark-rehype'
import {
  COMPONENT_REGISTRY_KEY,
  useComponentRegistry,
  useDefaultComponents,
} from './components/useComponents'
import { render } from './hast-to-vnode'
import { useShiki } from './hooks/useShiki'

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
    const componentsRegistry = {
      ...componentsDefault,
      // extract named slots as components, only if slot is function
      ...(Object.fromEntries(
        Object.entries(slots).filter(([_, v]) => typeof v === 'function')
      ) as Record<string, () => unknown>),
    }
    provide(COMPONENT_REGISTRY_KEY, componentsRegistry)
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

    const componentRegistry = useComponentRegistry()
    const mdast = computed(() => processor.value.parse(content.value))
    const hast = computed(() => processor.value.runSync(mdast.value))

    return () => {
      return render(hast.value, attrs, componentRegistry)
    }
  },
})
