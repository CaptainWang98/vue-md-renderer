import { effectScope, onScopeDispose } from 'vue'

/**
 * @description 创建共享的 composable，遵循 Vue RFC 0041 的 Shared Composable 模式
 *
 * 该工具函数可以将任何 composable 转换为共享版本，实现以下功能：
 * - 多个组件可以共享同一个 composable 实例
 * - 自动管理订阅者计数
 * - 当所有订阅者都卸载时，自动清理资源
 * - 使用 effectScope 管理生命周期，避免内存泄漏
 *
 * @example
 * ```ts
 * function useMouse() {
 *   const x = ref(0)
 *   const y = ref(0)
 *
 *   function handler(e: MouseEvent) {
 *     x.value = e.x
 *     y.value = e.y
 *   }
 *
 *   window.addEventListener('mousemove', handler)
 *   onScopeDispose(() => {
 *     window.removeEventListener('mousemove', handler)
 *   })
 *
 *   return { x, y }
 * }
 *
 * // 创建共享版本
 * export const useSharedMouse = createSharedComposable(useMouse)
 * ```
 *
 * @see https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md#example-a-shared-composable
 * @param composable - 要转换为共享版本的 composable 函数
 * @returns 共享版本的 composable 函数
 */
export function createSharedComposable<T>(composable: () => T) {
  let subscribers = 0
  let state: T | undefined
  let scope: ReturnType<typeof effectScope> | undefined

  const dispose = () => {
    if (scope && --subscribers <= 0) {
      scope.stop()
      state = undefined
      scope = undefined
    }
  }

  return (): T => {
    subscribers++
    if (!state) {
      scope = effectScope(true) // detached scope，不会被父级 scope 收集
      state = scope.run(composable)
    }
    onScopeDispose(dispose)
    return state!
  }
}
