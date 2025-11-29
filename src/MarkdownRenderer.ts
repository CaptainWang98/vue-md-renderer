import { computed, defineComponent, h, markRaw, PropType, toRefs, watch } from 'vue'
import { useMarkdownProcessor } from './processor'
import { PluggableList } from 'unified'
import { type Options as RehypeOptions } from 'remark-rehype'
import { useComponentRegistry, useDefaultComponents } from './hooks/useComponents'
import { render } from './hast-to-vnode'
import { useShiki } from './hooks/useShiki'
import { ComponentRenderer } from './components/componentRegistry'
import { useBatchRendering } from './hooks/useBatchRendering'
import type { Root, RootContent } from 'hast'

/**
 * 递归计算 HAST 树中的所有节点数量
 */
function countHastNodes(node: Root | RootContent): number {
  let count = 1 // 当前节点

  // 如果节点有 children 属性（Element 或 Root 类型）
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      count += countHastNodes(child)
    }
  }

  return count
}

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
    // 批量渲染相关配置
    batchRendering: { type: Boolean, default: true },
    initialRenderBatchSize: { type: Number, default: 40 },
    renderBatchSize: { type: Number, default: 80 },
    renderBatchDelay: { type: Number, default: 16 },
    renderBatchBudgetMs: { type: Number, default: 6 },
    renderBatchIdleTimeoutMs: { type: Number, default: 120 },
  },
  emits: ['batchSizeChange'],
  setup(props, { attrs, emit }) {
    const {
      content,
      preRemarkPlugins,
      remarkPlugins,
      rehypePlugins,
      rehypeOptions,
      batchRendering,
      initialRenderBatchSize,
      renderBatchSize,
      renderBatchDelay,
      renderBatchBudgetMs,
      renderBatchIdleTimeoutMs,
    } = toRefs(props)

    const processor = useMarkdownProcessor({
      preRemarkPlugins: preRemarkPlugins.value,
      remarkPlugins: remarkPlugins.value,
      rehypePlugins: rehypePlugins.value,
      rehypeOptions: rehypeOptions.value,
    })

    const mdast = computed(() => processor.value.parse(content.value))
    const hast = computed(() => markRaw(processor.value.runSync(mdast.value)))

    // 计算 HAST 树中所有节点的数量（递归统计）
    const totalNodes = computed(() => {
      if (!hast.value || !hast.value.children) {
        return 0
      }
      // 统计所有子节点（递归）
      let count = 0
      for (const child of hast.value.children) {
        count += countHastNodes(child)
      }
      return count
    })

    // 初始化批量渲染
    const { renderedCount, currentBatchSize } = useBatchRendering(() => totalNodes.value, {
      enabled: batchRendering.value,
      initialRenderBatchSize: initialRenderBatchSize.value,
      renderBatchSize: renderBatchSize.value,
      renderBatchDelay: renderBatchDelay.value,
      renderBatchBudgetMs: renderBatchBudgetMs.value,
      renderBatchIdleTimeoutMs: renderBatchIdleTimeoutMs.value,
    })

    // 监听批次大小变化并发出事件
    watch(currentBatchSize, (newSize: number) => {
      emit('batchSizeChange', newSize)
    })

    return () => {
      return render(hast.value, attrs, undefined, renderedCount.value)
    }
  },
})
