import { computed, markRaw, nextTick, ref, watch, type ComputedRef, type Ref } from 'vue'

/**
 * 批量渲染配置选项
 */
export interface BatchRenderingOptions {
  /** 初始渲染批次大小（首次渲染的节点数） */
  initialRenderBatchSize?: number
  /** 后续批次大小 */
  renderBatchSize?: number
  /** 批次之间的延迟（ms） */
  renderBatchDelay?: number
  /** 每批渲染的时间预算（ms），用于自适应调整批次大小 */
  renderBatchBudgetMs?: number
  /** requestIdleCallback 超时时间（ms） */
  renderBatchIdleTimeoutMs?: number
  /** 是否启用批量渲染 */
  enabled?: boolean
}

/**
 * 批量渲染返回接口
 */
export interface BatchRenderingReturn {
  /** 当前应该渲染的节点数量 */
  renderedCount: Ref<number>
  /** 是否正在渲染 */
  isRendering: Ref<boolean>
  /** 渲染进度 (0-1) */
  renderProgress: ComputedRef<number>
  /** 当前自适应批次大小 */
  currentBatchSize: Ref<number>
  /** 手动触发下一批渲染 */
  renderNextBatch: () => void
  /** 重置渲染状态 */
  reset: () => void
  /** 取消当前的渲染调度 */
  cancelSchedule: () => void
}

/** 默认配置 */
const DEFAULT_OPTIONS: Required<BatchRenderingOptions> = {
  enabled: true,
  initialRenderBatchSize: 40,
  renderBatchSize: 80,
  renderBatchDelay: 16,
  renderBatchBudgetMs: 6,
  renderBatchIdleTimeoutMs: 120,
}

/**
 * 智能批量渲染 Hook
 *
 * 通过分批次渲染节点，避免一次性渲染大量内容导致的 UI 阻塞
 * 支持自适应批次大小调整，在保证性能的同时提供最佳用户体验
 *
 * @param totalNodes - 总节点数（响应式）
 * @param options - 批量渲染配置选项
 * @returns 批量渲染控制接口
 *
 * @example
 * ```ts
 * const { renderedCount, renderProgress, reset } = useBatchRendering(
 *   () => nodes.value.length,
 *   { initialRenderBatchSize: 50 }
 * )
 * ```
 */
export function useBatchRendering(
  totalNodes: () => number,
  options: BatchRenderingOptions = {}
): BatchRenderingReturn {
  // 合并配置并确保所有数值都是有效的正数
  const config: Required<BatchRenderingOptions> = {
    enabled: options.enabled ?? DEFAULT_OPTIONS.enabled,
    initialRenderBatchSize: Math.max(
      1,
      options.initialRenderBatchSize ?? DEFAULT_OPTIONS.initialRenderBatchSize
    ),
    renderBatchSize: Math.max(1, options.renderBatchSize ?? DEFAULT_OPTIONS.renderBatchSize),
    renderBatchDelay: Math.max(0, options.renderBatchDelay ?? DEFAULT_OPTIONS.renderBatchDelay),
    renderBatchBudgetMs: Math.max(
      1,
      options.renderBatchBudgetMs ?? DEFAULT_OPTIONS.renderBatchBudgetMs
    ),
    renderBatchIdleTimeoutMs: Math.max(
      1,
      options.renderBatchIdleTimeoutMs ?? DEFAULT_OPTIONS.renderBatchIdleTimeoutMs
    ),
  }

  // 响应式状态
  const renderedCount = ref(0)
  const isRendering = ref(false)
  const adaptiveBatchSize = ref(config.renderBatchSize)

  // 用于测量实际渲染时间
  let batchStartTime = 0

  // 使用 markRaw 避免不必要的响应式转换
  const schedulers = markRaw({
    rafId: null as number | null,
    timeoutId: null as number | null,
    idleCallbackId: null as number | null,
  })

  // 计算渲染进度
  const renderProgress = computed(() => {
    const total = totalNodes()
    return total > 0 ? Math.min(renderedCount.value / total, 1) : 0
  })

  /**
   * 取消所有待处理的调度
   */
  function cancelSchedule() {
    if (schedulers.rafId !== null) {
      cancelAnimationFrame(schedulers.rafId)
      schedulers.rafId = null
    }
    if (schedulers.timeoutId !== null) {
      clearTimeout(schedulers.timeoutId)
      schedulers.timeoutId = null
    }
    if (schedulers.idleCallbackId !== null) {
      if (typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(schedulers.idleCallbackId)
      }
      schedulers.idleCallbackId = null
    }
    isRendering.value = false
  }

  /**
   * 自适应调整批次大小
   * 根据实际渲染时间动态调整批次大小，保持性能最优
   *
   * 调整策略说明：
   * 1. 阈值设计：
   *    - 超时阈值 1.5x：允许一定的性能波动
   *    - 快速阈值 0.6x：显著低于预算时才增加，避免过度激进
   *
   * 2. 调整系数：
   *    - 减小系数 0.75（-25%）：温和降低，避免过度收缩（参考 TCP 拥塞控制的乘性减）
   *    - 增加系数 1.15（+15%）：保守增长，避免突然超时（参考 TCP 的加性增）
   *    - 采用不对称设计：减小快于增加，优先保证性能稳定性
   *
   * 3. 边界控制：
   *    - 最小值：maxSize / 4（保证至少有一定批次大小）
   *    - 最大值：maxSize（不超过配置的上限）
   */
  function adjustBatchSize(elapsedMs: number) {
    const budget = config.renderBatchBudgetMs
    const maxSize = config.renderBatchSize
    const minSize = Math.max(1, Math.floor(maxSize / 4))

    // 性能指标：实际耗时与预算的比值
    const performanceRatio = elapsedMs / budget

    if (performanceRatio > 1.5) {
      // 严重超时（超过预算 50%）：减小批次
      // 使用 0.75 系数：参考 TCP 拥塞控制的 multiplicative decrease
      const newSize = Math.floor(adaptiveBatchSize.value * 0.75)
      adaptiveBatchSize.value = Math.max(minSize, newSize)
    } else if (performanceRatio < 0.6 && adaptiveBatchSize.value < maxSize) {
      // 性能充裕（低于预算 40%）：增加批次
      // 使用 1.15 系数：参考 TCP 的 additive increase，保守增长
      const newSize = Math.ceil(adaptiveBatchSize.value * 1.15)
      adaptiveBatchSize.value = Math.min(maxSize, newSize)
    }
  }

  /**
   * 执行一批渲染
   */
  async function executeBatch(batchSize: number): Promise<number> {
    const total = totalNodes()
    batchStartTime = performance.now()

    // 更新渲染数量
    const newCount = Math.min(renderedCount.value + batchSize, total)
    renderedCount.value = newCount

    // 等待 Vue 完成 DOM 更新后再测量时间
    await nextTick()
    const elapsedMs = performance.now() - batchStartTime

    // 调整批次大小
    adjustBatchSize(elapsedMs)

    return elapsedMs
  }

  /**
   * 调度下一批渲染
   */
  function scheduleNextBatch() {
    const total = totalNodes()

    // 检查是否需要继续渲染
    if (renderedCount.value >= total) {
      isRendering.value = false
      return
    }

    const batchSize = Math.max(1, Math.round(adaptiveBatchSize.value))

    // 优先使用 requestIdleCallback (如果可用)
    if (typeof requestIdleCallback !== 'undefined') {
      schedulers.idleCallbackId = requestIdleCallback(
        async deadline => {
          schedulers.idleCallbackId = null

          // 在空闲时间内尽可能多地渲染
          while (
            renderedCount.value < total &&
            (deadline.timeRemaining() > config.renderBatchBudgetMs * 0.5 || deadline.didTimeout)
          ) {
            await executeBatch(batchSize)
          }

          // 如果还没渲染完，继续调度
          if (renderedCount.value < total) {
            scheduleNextBatch()
          } else {
            isRendering.value = false
          }
        },
        { timeout: config.renderBatchIdleTimeoutMs }
      )
    } else {
      // 降级使用 requestAnimationFrame + setTimeout
      schedulers.rafId = requestAnimationFrame(() => {
        schedulers.rafId = null

        if (config.renderBatchDelay > 0) {
          schedulers.timeoutId = setTimeout(async () => {
            schedulers.timeoutId = null
            await executeBatch(batchSize)
            scheduleNextBatch()
          }, config.renderBatchDelay) as unknown as number
        } else {
          executeBatch(batchSize).then(() => {
            scheduleNextBatch()
          })
        }
      })
    }
  }

  /**
   * 手动触发下一批渲染
   */
  function renderNextBatch() {
    if (!config.enabled) {
      renderedCount.value = totalNodes()
      return
    }

    const total = totalNodes()
    if (renderedCount.value >= total) {
      return
    }

    if (!isRendering.value) {
      isRendering.value = true
    }

    scheduleNextBatch()
  }

  /**
   * 重置渲染状态
   */
  function reset() {
    cancelSchedule()
    renderedCount.value = 0
    adaptiveBatchSize.value = config.renderBatchSize
    isRendering.value = false
  }

  /**
   * 初始化渲染
   */
  function initialize() {
    if (!config.enabled) {
      renderedCount.value = totalNodes()
      return
    }

    const total = totalNodes()
    if (total === 0) {
      renderedCount.value = 0
      return
    }

    // 首次渲染初始批次
    const initialBatch = Math.min(config.initialRenderBatchSize, total)
    renderedCount.value = initialBatch

    // 如果还有未渲染的内容，开始批量渲染
    if (initialBatch < total) {
      isRendering.value = true
      scheduleNextBatch()
    }
  }

  // 监听总节点数变化，自动重新初始化
  watch(
    totalNodes,
    (newTotal, oldTotal) => {
      // 节点数量变化时的处理
      if (newTotal !== oldTotal) {
        if (newTotal === 0) {
          // 内容被清空，完全重置
          reset()
          return
        }

        if (oldTotal !== undefined && newTotal > oldTotal) {
          // 内容增加（流式场景）- 不重置，继续从当前位置渲染
          if (!isRendering.value && renderedCount.value < newTotal) {
            // 如果当前没有在渲染，且有新内容需要渲染，则开始渲染
            isRendering.value = true
            scheduleNextBatch()
          }
        } else {
          // 内容减少或首次初始化 - 完全重置
          reset()
          initialize()
        }
      }
    },
    { immediate: true }
  )

  return {
    renderedCount,
    isRendering,
    renderProgress,
    currentBatchSize: adaptiveBatchSize,
    renderNextBatch,
    reset,
    cancelSchedule,
  }
}
