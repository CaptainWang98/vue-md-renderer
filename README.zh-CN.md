# Vue Markdown Renderer

<div align="center">

[![npm version](https://img.shields.io/npm/v/vue-md-renderer.svg)](https://www.npmjs.com/package/vue-md-renderer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

一个现代化的 Vue 3 Markdown 渲染器，基于 AST 解析，支持流式渲染、自定义组件和智能批量渲染。

[English](./README.md) | 简体中文

</div>

---

> ⚠️ **警告：开发中**
>
> 此库目前处于早期开发阶段（v0.0.x），API 可能会频繁变更。可能存在各种 bug 和未经充分测试的功能。
>
> **不建议在生产环境中使用**，除非你愿意接受潜在的风险和破坏性更新。
>
> 欢迎尝试并提供反馈，但请在生产项目中谨慎使用！

---

## ✨ 核心特性

### 🌳 基于 AST 的解析

采用 [unified](https://unifiedjs.com/) 生态系统，通过抽象语法树（AST）进行 Markdown 解析和转换：

- **Remark**：将 Markdown 解析为 MDAST（Markdown Abstract Syntax Tree）
- **Rehype**：将 MDAST 转换为 HAST（HTML Abstract Syntax Tree）
- **VNode 渲染**：将 HAST 直接转换为 Vue VNode，而非 HTML 字符串
- **插件化架构**：支持丰富的 remark 和 rehype 插件生态

#### 🚀 性能优势

相比传统的 `v-html` 或 `dangerouslySetInnerHTML` 方案，基于 AST 的渲染具有显著的性能优势：

**传统方案的问题：**

```vue
<!-- ❌ 传统方案：使用 v-html -->
<div v-html="htmlString"></div>
```

- ❌ 绕过 Vue 的响应式系统，直接操作 DOM
- ❌ 每次更新都需要完全重新解析和渲染 HTML 字符串
- ❌ 无法利用 Vue 的虚拟 DOM diff 算法
- ❌ 流式更新时会导致页面闪烁和重排

**本库的 AST 方案：**

```typescript
// ✅ AST → VNode：充分利用 Vue 的响应式和 diff 算法
const hast = computed(() => markRaw(processor.value.runSync(mdast.value)))
return render(hast.value) // 直接返回 VNode
```

- ✅ **精确更新**：Vue 的虚拟 DOM diff 只更新实际变化的节点
- ✅ **响应式集成**：AST 树是响应式的，内容变化自动触发最小化更新
- ✅ **流式友好**：增量内容只触发新增节点的渲染，已有内容保持稳定
- ✅ **组件化**：可以将 AST 节点直接映射为 Vue 组件，享受完整的组件生命周期

**性能对比示例：**

| 场景             | v-html 方案                 | AST VNode 方案                  |
| ---------------- | --------------------------- | ------------------------------- |
| 首次渲染         | 解析 HTML 字符串 → 创建 DOM | 解析 AST → 创建 VNode → 渲染    |
| 内容追加（流式） | 完全重新渲染整个 HTML       | 仅渲染新增的 AST 节点           |
| 局部更新         | 完全重新渲染整个 HTML       | Vue diff 算法精确更新变化的节点 |
| 内存占用         | 高（保留完整 HTML 字符串）  | 低（AST 可被 markRaw 优化）     |

这种架构不仅提供了更好的性能，还为自定义组件渲染、插件扩展等高级功能奠定了基础。

### 🎨 自定义 Vue 组件渲染

通过插槽机制，可以将特定的 Markdown 元素渲染为自定义 Vue 组件：

```vue
<VueMdRenderer :content="markdown">
  <template #mycodd="props">
    <AsyncWrapper v-bind="props">
      <template #default="slotProps">
        <MyCustomComponent v-bind="slotProps" />
      </template>
    </AsyncWrapper>
  </template>
</VueMdRenderer>
```

- 支持任意自定义组件
- 完整的 props 传递
- 提供 `AsyncWrapper` 用于异步组件加载

### ⚡ 懒初始化设计

采用懒加载策略，优化初始加载性能：

- **Shiki 按需加载**：语法高亮引擎仅在需要时初始化
- **语言和主题懒加载**：通过 dynamic import 按需加载语言包和主题
- **共享实例管理**：多个组件实例共享同一个 Shiki highlighter

```typescript
// 使用 Shared Composable 模式
export const useShiki = createSharedComposable(createShikiInstance)
```

### 🛡️ 内存安全

精心设计的内存管理机制，避免内存泄漏：

- **markRaw 优化**：使用 Vue 3 的 `markRaw` 避免对大型 AST 树进行深度响应式转换
- **自动清理**：通过 `onScopeDispose` 自动清理资源
- **智能调度管理**：使用 `markRaw` 包装调度器状态，避免不必要的响应式开销

```typescript
// 避免对 AST 进行响应式转换
const hast = computed(() => markRaw(processor.value.runSync(mdast.value)))

// 避免调度器状态被响应式系统追踪
const schedulers = markRaw({
  rafId: null,
  timeoutId: null,
  idleCallbackId: null,
})
```

### 🚀 智能批量渲染

通过分批次渲染大型文档，避免 UI 阻塞，提供流畅的用户体验：

- **自适应批次大小**：根据实际渲染性能动态调整批次大小
- **空闲时间调度**：优先使用 `requestIdleCallback`，降级使用 `requestAnimationFrame`
- **性能预算控制**：基于 TCP 拥塞控制算法的调整策略
  - 超时 50% → 减小批次 25%（乘性减）
  - 剩余 40% → 增加批次 15%（加性增）
- **流式支持**：自动检测内容增量，无需重置状态

```typescript
const { renderedCount, renderProgress } = useBatchRendering(() => nodes.value.length, {
  initialRenderBatchSize: 40, // 首批渲染 40 个节点
  renderBatchSize: 80, // 后续每批 80 个节点
  renderBatchBudgetMs: 6, // 每批预算 6ms
})
```

### 💎 其他特性

- ✅ **TypeScript 支持**：完整的类型定义
- 🎯 **代码高亮**：基于 [Shiki](https://shiki.style/) 的语法高亮
- 📊 **数学公式**：支持 KaTeX / MathJax（通过插件）
- 🔌 **插件系统**：兼容 remark/rehype 生态
- 🌊 **流式渲染**：支持 Markdown 流式输入（如 AI 生成内容）

---

## 📦 安装

> ⚠️ **注意**：本库目前尚未发布到 npm。
>
> 如需体验，请访问在线演示：[https://captainwang98.github.io/vue-md-renderer/](https://captainwang98.github.io/vue-md-renderer/)
>
> 或自行下载源代码并打包使用。

---

## 🗺️ Roadmap

我们正在积极开发以下功能：

### 🚧 即将推出

- [ ] **流式 Markdown 中间态容错处理**
  - 处理不完整的 Markdown 语法（如未闭合的代码块，强调语法）
  - 流式过程中的"中间态"会导致页面抖动，用户体验差
  - 提供更优雅的中间态渲染
  - 支持实时语法修复和提示

- [ ] **增量渲染优化**
  - 仅重新渲染变更的 AST 节点
  - 在"智能批量渲染"的演示中
  - 差分算法优化，减少 DOM 更新
  - 更高效的流式更新策略

### 💡 长期计划

- [ ] **SSR（服务端渲染）支持**
- [ ] **更多内置组件**（提示框、标签页、图表等）
- [ ] **主题系统**
- [ ] **Markdown 编辑器集成**
- [ ] **性能监控和分析工具**
- [ ] **更完善的单元测试覆盖**

---

## 🚀 快速开始

### 基础用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import VueMdRenderer from 'vue-md-renderer'
import 'vue-md-renderer/style.css'

const markdown = ref('# Hello World\n\nThis is **Vue Markdown Renderer**!')
</script>

<template>
  <VueMdRenderer :content="markdown" />
</template>
```

### 使用插件

```vue
<script setup lang="ts">
import VueMdRenderer from 'vue-md-renderer'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const markdown = ref(`
# Math Example

Inline math: $E = mc^2$

Block math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`)
</script>

<template>
  <VueMdRenderer
    :content="markdown"
    :remark-plugins="[remarkGfm, remarkMath]"
    :rehype-plugins="[rehypeKatex]"
  />
</template>
```

### 自定义组件

```vue
<script setup lang="ts">
import VueMdRenderer, { AsyncWrapper } from 'vue-md-renderer'
import MyCustomComponent from './MyCustomComponent.vue'

const markdown = ref('...')
</script>

<template>
  <VueMdRenderer :content="markdown">
    <template #mycodd="props">
      <AsyncWrapper v-bind="props">
        <template #default="slotProps">
          <MyCustomComponent v-bind="slotProps" />
        </template>
      </AsyncWrapper>
    </template>
  </VueMdRenderer>
</template>
```

### 流式渲染示例

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import VueMdRenderer from 'vue-md-renderer'

const markdown = ref('')

// 模拟流式输入（例如 AI 生成）
async function simulateStream() {
  const text = '# Streaming Demo\n\nThis text appears gradually...'
  for (const char of text) {
    markdown.value += char
    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

onMounted(simulateStream)
</script>

<template>
  <VueMdRenderer :content="markdown" />
</template>
```

### 批量渲染配置

```vue
<template>
  <VueMdRenderer
    :content="largeMarkdown"
    :batch-rendering="true"
    :initial-render-batch-size="40"
    :render-batch-size="80"
    :render-batch-delay="16"
    :render-batch-budget-ms="6"
    @batch-size-change="handleBatchSizeChange"
  />
</template>

<script setup lang="ts">
const handleBatchSizeChange = (newSize: number) => {
  console.log('Adaptive batch size:', newSize)
}
</script>
```

---

## 📖 API 文档

### Props

| 属性                       | 类型            | 默认值   | 描述                           |
| -------------------------- | --------------- | -------- | ------------------------------ |
| `content`                  | `string`        | **必填** | Markdown 内容                  |
| `preRemarkPlugins`         | `PluggableList` | `[]`     | 在解析前执行的 remark 插件     |
| `remarkPlugins`            | `PluggableList` | `[]`     | remark 插件列表                |
| `rehypePlugins`            | `PluggableList` | `[]`     | rehype 插件列表                |
| `rehypeOptions`            | `RehypeOptions` | `{}`     | rehype 转换选项                |
| `batchRendering`           | `boolean`       | `true`   | 是否启用批量渲染               |
| `initialRenderBatchSize`   | `number`        | `40`     | 首次渲染的节点数               |
| `renderBatchSize`          | `number`        | `80`     | 后续每批渲染的节点数           |
| `renderBatchDelay`         | `number`        | `16`     | 批次间延迟（ms）               |
| `renderBatchBudgetMs`      | `number`        | `6`      | 每批时间预算（ms）             |
| `renderBatchIdleTimeoutMs` | `number`        | `120`    | `requestIdleCallback` 超时时间 |

### Events

| 事件              | 参数                | 描述                       |
| ----------------- | ------------------- | -------------------------- |
| `batchSizeChange` | `(newSize: number)` | 当自适应批次大小变化时触发 |

### Slots

可以通过具名插槽注册自定义组件，插槽名称对应 Markdown 中的特定标识。

---

## 🤝 贡献

欢迎贡献！由于项目还在早期阶段，我们特别欢迎：

- 🐛 Bug 报告和修复
- 💡 功能建议和讨论
- 📝 文档改进
- ✅ 测试用例

在提交 PR 之前，请确保：

1. 代码通过 ESLint 检查：`pnpm lint`
2. 代码格式化：`pnpm format`
3. 类型检查通过：`pnpm type-check`

---

## 🙏 致谢

本项目基于以下优秀的开源项目：

- [unified](https://unifiedjs.com/) - 文本处理生态系统
- [Shiki](https://shiki.style/) - 语法高亮器
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [remark](https://github.com/remarkjs/remark) - Markdown 处理器
- [rehype](https://github.com/rehypejs/rehype) - HTML 处理器
- [Element-Plus-X](https://github.com/element-plus-x/Element-Plus-X) - 设计灵感来源
- [stream-markdown](https://github.com/Simon-He95/stream-markdown) - 流式渲染参考

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ 支持一下！**

</div>
