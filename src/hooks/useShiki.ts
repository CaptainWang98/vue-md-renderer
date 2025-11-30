import type { Root } from 'hast'
import type {
  BundledHighlighterOptions,
  CodeToHastOptions,
  CodeToTokensBaseOptions,
  CodeToTokensOptions,
  CodeToTokensWithThemesOptions,
  GrammarState,
  HighlighterGeneric,
  RequireKeys,
  ThemedToken,
  ThemedTokenWithVariants,
  TokensResult,
} from 'shiki'
import { createdBundledHighlighter, createOnigurumaEngine, createSingletonShorthands } from 'shiki'
import { onScopeDispose, provide, ref } from 'vue'
import { createSharedComposable } from './createSharedComposable'
import { languageLoaders, themeLoaders } from './shiki-loader'

export const GLOBAL_SHIKI_KEY = Symbol('GLOBAL_SHIKI_KEY')

export interface GlobalShiki {
  codeToHtml: (code: string, options: CodeToHastOptions<string, string>) => Promise<string>
  codeToHast: (code: string, options: CodeToHastOptions<string, string>) => Promise<Root>
  codeToTokensBase: (
    code: string,
    options: RequireKeys<CodeToTokensBaseOptions<string, string>, 'theme' | 'lang'>
  ) => Promise<ThemedToken[][]>
  codeToTokens: (
    code: string,
    options: CodeToTokensOptions<string, string>
  ) => Promise<TokensResult>
  codeToTokensWithThemes: (
    code: string,
    options: RequireKeys<CodeToTokensWithThemesOptions<string, string>, 'lang' | 'themes'>
  ) => Promise<ThemedTokenWithVariants[][]>
  getSingletonHighlighter: (
    options?: Partial<BundledHighlighterOptions<string, string>>
  ) => Promise<HighlighterGeneric<string, string>>
  getLastGrammarState:
    | ((element: ThemedToken[][] | Root) => GrammarState)
    | ((code: string, options: CodeToTokensBaseOptions<string, string>) => Promise<GrammarState>)
}

/**
 * @description Shiki 管理器（单例 + 懒初始化）
 */
class ShikiManager {
  private static instance: ShikiManager | null = null

  private shikiInstance: GlobalShiki | null = null

  private constructor() {}

  static getInstance(): ShikiManager {
    if (!ShikiManager.instance) {
      ShikiManager.instance = new ShikiManager()
    }
    return ShikiManager.instance
  }

  public getShiki(): GlobalShiki {
    if (this.shikiInstance) return this.shikiInstance

    const highlighterFactory = createdBundledHighlighter({
      langs: languageLoaders,
      themes: themeLoaders,
      engine: () => createOnigurumaEngine(import('shiki/wasm')),
    })

    const {
      codeToHtml,
      codeToHast,
      codeToTokensBase,
      codeToTokens,
      codeToTokensWithThemes,
      getSingletonHighlighter,
      getLastGrammarState,
    } = createSingletonShorthands(highlighterFactory)

    this.shikiInstance = {
      codeToHtml,
      codeToHast,
      codeToTokensBase,
      codeToTokens,
      codeToTokensWithThemes,
      getSingletonHighlighter,
      getLastGrammarState,
    }
    return this.shikiInstance
  }

  public dispose() {
    this.shikiInstance = null
    ShikiManager.instance = null
  }
}

/**
 * @description 创建 Shiki 实例的内部 composable
 */
function createShikiInstance() {
  const shikiManager = ShikiManager.getInstance()
  const shikiInstance = shikiManager.getShiki()
  const shikiRef = ref<GlobalShiki>(shikiInstance)

  // 在 scope dispose 时清理
  onScopeDispose(() => {
    shikiManager.dispose()
  })

  // 提供给子组件使用
  provide(GLOBAL_SHIKI_KEY, shikiRef)

  return shikiInstance
}

/**
 * @description 在 Vue 中提供 Shiki 实例（支持多组件实例）
 *
 * 使用 Shared Composable 模式管理生命周期：
 * - 多个组件共享同一个 Shiki 实例
 * - 自动管理订阅者计数和资源清理
 * - 完全无全局状态，避免引用计数的竞态问题
 *
 * @see https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md
 */
export const useShiki = createSharedComposable(createShikiInstance)
