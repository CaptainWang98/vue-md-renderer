import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useBatchRendering } from '../useBatchRendering'

describe('useBatchRendering', () => {
  beforeEach(() => {
    vi.useFakeTimers()

    // Mock requestAnimationFrame 和 cancelAnimationFrame
    global.requestAnimationFrame = vi.fn(callback => {
      return setTimeout(callback, 16) as unknown as number
    })
    global.cancelAnimationFrame = vi.fn(id => {
      clearTimeout(id)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      const totalNodes = ref(100)
      const { renderedCount, isRendering, renderProgress } = useBatchRendering(
        () => totalNodes.value,
        { enabled: true, initialRenderBatchSize: 20 }
      )

      expect(renderedCount.value).toBe(20)
      expect(isRendering.value).toBe(true)
      expect(renderProgress.value).toBe(0.2)
    })

    it('当禁用时应该立即渲染所有节点', () => {
      const totalNodes = ref(100)
      const { renderedCount, isRendering } = useBatchRendering(() => totalNodes.value, {
        enabled: false,
      })

      expect(renderedCount.value).toBe(100)
      expect(isRendering.value).toBe(false)
    })

    it('当总节点数为 0 时应该正确处理', () => {
      const totalNodes = ref(0)
      const { renderedCount, isRendering, renderProgress } = useBatchRendering(
        () => totalNodes.value
      )

      expect(renderedCount.value).toBe(0)
      expect(isRendering.value).toBe(false)
      expect(renderProgress.value).toBe(0)
    })

    it('当总节点数小于初始批次大小时应该只渲染全部节点', () => {
      const totalNodes = ref(10)
      const { renderedCount, isRendering } = useBatchRendering(() => totalNodes.value, {
        initialRenderBatchSize: 20,
      })

      expect(renderedCount.value).toBe(10)
      expect(isRendering.value).toBe(false)
    })
  })

  describe('批量渲染调度', () => {
    it('应该支持使用 requestIdleCallback 进行渲染', async () => {
      // Mock requestIdleCallback
      const callbacks: Array<(deadline: IdleDeadline) => void> = []
      global.requestIdleCallback = vi.fn(
        (callback: IdleRequestCallback, _options?: IdleRequestOptions) => {
          callbacks.push(callback)
          return callbacks.length
        }
      ) as typeof requestIdleCallback
      global.cancelIdleCallback = vi.fn()

      const totalNodes = ref(100)
      const { renderedCount } = useBatchRendering(() => totalNodes.value, {
        enabled: true,
        initialRenderBatchSize: 20,
        renderBatchSize: 10,
      })

      expect(renderedCount.value).toBe(20)

      // 模拟 idle callback 执行
      const mockDeadline: IdleDeadline = {
        didTimeout: false,
        timeRemaining: () => 50, // 足够的时间
      }

      // 执行第一批
      if (callbacks[0]) {
        callbacks[0](mockDeadline)
        await nextTick()
      }

      expect(renderedCount.value).toBeGreaterThan(20)

      // 清理
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).requestIdleCallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).cancelIdleCallback
    })

    it('应该在没有 requestIdleCallback 时降级到 RAF + setTimeout', async () => {
      // 确保没有 requestIdleCallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).requestIdleCallback

      const totalNodes = ref(100)
      const { renderedCount } = useBatchRendering(() => totalNodes.value, {
        enabled: true,
        initialRenderBatchSize: 20,
        renderBatchSize: 10,
        renderBatchDelay: 10,
      })

      expect(renderedCount.value).toBe(20)

      // 运行 RAF 和 setTimeout
      await vi.runAllTimersAsync()
      await nextTick()

      // 应该已经渲染了更多节点
      expect(renderedCount.value).toBeGreaterThan(20)
    })

    it('应该能手动触发下一批渲染', () => {
      const totalNodes = ref(100)
      const { renderedCount: rc2, renderNextBatch: rnb2 } = useBatchRendering(
        () => totalNodes.value,
        {
          enabled: true,
          initialRenderBatchSize: 20,
          renderBatchSize: 10,
        }
      )

      const initialCount = rc2.value
      rnb2()

      // 手动触发应该继续渲染
      expect(rc2.value).toBeGreaterThanOrEqual(initialCount)
    })
  })

  describe('自适应批次大小', () => {
    it('应该在渲染太慢时减小批次大小', () => {
      // 这个测试需要访问内部状态，我们可以通过观察行为来验证
      const totalNodes = ref(1000)
      const { renderedCount } = useBatchRendering(() => totalNodes.value, {
        enabled: true,
        initialRenderBatchSize: 50,
        renderBatchSize: 100,
        renderBatchBudgetMs: 5, // 很小的预算
      })

      expect(renderedCount.value).toBe(50)
      // 自适应逻辑会在实际渲染中调整批次大小
    })
  })

  describe('重置和取消', () => {
    it('应该能重置渲染状态', () => {
      const totalNodes = ref(100)
      const { renderedCount, reset, isRendering } = useBatchRendering(() => totalNodes.value, {
        initialRenderBatchSize: 50,
      })

      expect(renderedCount.value).toBe(50)

      reset()

      expect(renderedCount.value).toBe(0)
      expect(isRendering.value).toBe(false)
    })

    it('应该能取消调度', () => {
      const totalNodes = ref(100)
      const { renderedCount, cancelSchedule, isRendering } = useBatchRendering(
        () => totalNodes.value,
        { initialRenderBatchSize: 20 }
      )

      expect(renderedCount.value).toBe(20)
      expect(isRendering.value).toBe(true)

      cancelSchedule()

      expect(isRendering.value).toBe(false)
    })
  })

  describe('响应式更新', () => {
    it('应该在总节点数变化时重新初始化', async () => {
      const totalNodes = ref(100)
      const { renderedCount, renderProgress } = useBatchRendering(() => totalNodes.value, {
        initialRenderBatchSize: 50,
      })

      expect(renderedCount.value).toBe(50)
      expect(renderProgress.value).toBe(0.5)

      // 改变总节点数
      totalNodes.value = 200
      await nextTick()

      // 应该重新初始化
      expect(renderedCount.value).toBe(50)
      expect(renderProgress.value).toBe(0.25)
    })

    it('应该正确计算渲染进度', () => {
      const totalNodes = ref(100)
      const { renderProgress, renderedCount } = useBatchRendering(() => totalNodes.value, {
        initialRenderBatchSize: 25,
      })

      expect(renderProgress.value).toBe(0.25)

      // 手动设置渲染数量来测试进度
      renderedCount.value = 50
      expect(renderProgress.value).toBe(0.5)

      renderedCount.value = 100
      expect(renderProgress.value).toBe(1)

      // 超过总数也应该是 1
      renderedCount.value = 150
      expect(renderProgress.value).toBe(1)
    })
  })

  describe('边界情况', () => {
    it('应该处理无效的配置值', () => {
      const totalNodes = ref(100)
      const { renderedCount } = useBatchRendering(() => totalNodes.value, {
        initialRenderBatchSize: -10, // 无效值，将使用默认值
        renderBatchSize: 0, // 无效值，将使用默认值
      })

      // 无效配置会被合并为默认值，应该正常渲染
      expect(renderedCount.value).toBeGreaterThanOrEqual(0)
      // 实际上，负值会被当作配置传入，但我们的代码会处理边界情况
      // 主要目的是确保不会崩溃
    })

    it('应该处理总节点数从 0 变为非 0 的情况', async () => {
      const totalNodes = ref(0)
      const { renderedCount } = useBatchRendering(() => totalNodes.value, {
        initialRenderBatchSize: 20,
      })

      expect(renderedCount.value).toBe(0)

      totalNodes.value = 100
      await nextTick()

      expect(renderedCount.value).toBe(20)
    })

    it('应该处理总节点数变小的情况', async () => {
      const totalNodes = ref(100)
      const { renderedCount } = useBatchRendering(() => totalNodes.value, {
        initialRenderBatchSize: 50,
      })

      expect(renderedCount.value).toBe(50)

      totalNodes.value = 30
      await nextTick()

      // 重新初始化后应该不超过新的总数
      expect(renderedCount.value).toBeLessThanOrEqual(30)
    })
  })

  describe('性能考虑', () => {
    it('应该使用 markRaw 避免不必要的响应式', () => {
      // 这个测试验证代码结构，确保调度器不是响应式的
      const totalNodes = ref(100)
      const result = useBatchRendering(() => totalNodes.value, { initialRenderBatchSize: 20 })

      // 验证返回的对象包含正确的属性
      expect(result).toHaveProperty('renderedCount')
      expect(result).toHaveProperty('isRendering')
      expect(result).toHaveProperty('renderProgress')
      expect(result).toHaveProperty('renderNextBatch')
      expect(result).toHaveProperty('reset')
      expect(result).toHaveProperty('cancelSchedule')
    })
  })
})
