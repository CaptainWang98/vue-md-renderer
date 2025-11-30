# Vue Markdown Renderer

<div align="center">

[![npm version](https://img.shields.io/npm/v/vue-md-renderer.svg)](https://www.npmjs.com/package/vue-md-renderer)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A modern Vue 3 Markdown renderer based on AST parsing, supporting streaming rendering, custom components, and intelligent batch rendering.

English | [简体中文](./README.zh-CN.md)

</div>

---

> ⚠️ **Warning: Under Development**
>
> This library is currently in early development stage (v0.0.x). The API may change frequently, and there may be various bugs and untested features.
>
> **Not recommended for production use** unless you are willing to accept potential risks and breaking changes.
>
> Feel free to try it out and provide feedback, but use with caution in production projects!

---

## ✨ Core Features

### 🌳 AST-Based Parsing

Built on the [unified](https://unifiedjs.com/) ecosystem, parsing and transforming Markdown through Abstract Syntax Trees (AST):

- **Remark**: Parses Markdown into MDAST (Markdown Abstract Syntax Tree)
- **Rehype**: Transforms MDAST into HAST (HTML Abstract Syntax Tree)
- **VNode Rendering**: Converts HAST directly to Vue VNodes instead of HTML strings
- **Plugin Architecture**: Supports rich remark and rehype plugin ecosystem

#### 🚀 Performance Advantages

Compared to traditional `v-html` or `dangerouslySetInnerHTML` approaches, AST-based rendering offers significant performance benefits:

**Problems with Traditional Approach:**

```vue
<!-- ❌ Traditional approach: using v-html -->
<div v-html="htmlString"></div>
```

- ❌ Bypasses Vue's reactivity system, directly manipulating DOM
- ❌ Requires full re-parsing and rendering of HTML string on every update
- ❌ Cannot leverage Vue's Virtual DOM diff algorithm
- ❌ Causes page flicker and reflow during streaming updates

**Our AST Approach:**

```typescript
// ✅ AST → VNode: Fully leverages Vue's reactivity and diff algorithm
const hast = computed(() => markRaw(processor.value.runSync(mdast.value)))
return render(hast.value) // Directly returns VNode
```

- ✅ **Precise Updates**: Vue's Virtual DOM diff only updates nodes that actually changed
- ✅ **Reactivity Integration**: AST tree is reactive, content changes automatically trigger minimal updates
- ✅ **Stream-Friendly**: Incremental content only triggers rendering of new nodes, existing content remains stable
- ✅ **Component-Based**: Can map AST nodes directly to Vue components, enjoying full component lifecycle

**Performance Comparison:**

| Scenario                | v-html Approach                  | AST VNode Approach                                 |
| ----------------------- | -------------------------------- | -------------------------------------------------- |
| Initial Render          | Parse HTML string → Create DOM   | Parse AST → Create VNode → Render                  |
| Content Append (Stream) | Completely re-render entire HTML | Only render new AST nodes                          |
| Partial Update          | Completely re-render entire HTML | Vue diff algorithm precisely updates changed nodes |
| Memory Usage            | High (keeps full HTML string)    | Low (AST can be optimized with markRaw)            |

This architecture not only provides better performance but also lays the foundation for advanced features like custom component rendering and plugin extensions.

### 🎨 Custom Vue Component Rendering

Through the slot mechanism, you can render specific Markdown elements as custom Vue components:

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

- Support for any custom components
- Complete props passing
- Provides `AsyncWrapper` for async component loading

### ⚡ Lazy Initialization

Adopts lazy loading strategy to optimize initial load performance:

- **Shiki On-Demand Loading**: Syntax highlighting engine initializes only when needed
- **Language and Theme Lazy Loading**: Load language packs and themes via dynamic imports
- **Shared Instance Management**: Multiple component instances share the same Shiki highlighter

```typescript
// Using Shared Composable pattern
export const useShiki = createSharedComposable(createShikiInstance)
```

### 🛡️ Memory Safety

Carefully designed memory management mechanism to avoid memory leaks:

- **markRaw Optimization**: Uses Vue 3's `markRaw` to avoid deep reactive conversion of large AST trees
- **Auto Cleanup**: Automatic resource cleanup via `onScopeDispose`
- **Smart Scheduler Management**: Wraps scheduler state with `markRaw` to avoid unnecessary reactive overhead

```typescript
// Avoid reactive conversion of AST
const hast = computed(() => markRaw(processor.value.runSync(mdast.value)))

// Prevent scheduler state from being tracked by reactivity system
const schedulers = markRaw({
  rafId: null,
  timeoutId: null,
  idleCallbackId: null,
})
```

### 🚀 Intelligent Batch Rendering

Renders large documents in batches to avoid UI blocking and provide smooth user experience:

- **Adaptive Batch Size**: Dynamically adjusts batch size based on actual rendering performance
- **Idle Time Scheduling**: Prioritizes `requestIdleCallback`, falls back to `requestAnimationFrame`
- **Performance Budget Control**: Adjustment strategy based on TCP congestion control algorithm
  - 50% overtime → reduce batch by 25% (multiplicative decrease)
  - 40% remaining → increase batch by 15% (additive increase)
- **Stream Support**: Automatically detects content increments without resetting state

```typescript
const { renderedCount, renderProgress } = useBatchRendering(() => nodes.value.length, {
  initialRenderBatchSize: 40, // Render 40 nodes in first batch
  renderBatchSize: 80, // 80 nodes per subsequent batch
  renderBatchBudgetMs: 6, // 6ms budget per batch
})
```

### 💎 Other Features

- ✅ **TypeScript Support**: Complete type definitions
- 🎯 **Code Highlighting**: Syntax highlighting based on [Shiki](https://shiki.style/)
- 📊 **Math Formulas**: Support for KaTeX / MathJax (via plugins)
- 🔌 **Plugin System**: Compatible with remark/rehype ecosystem
- 🌊 **Stream Rendering**: Support for streaming Markdown input (e.g., AI-generated content)

---

## 📦 Installation

> ⚠️ **Note**: This library has not been published to npm yet.
>
> To experience it, please visit the online demo: [https://captainwang98.github.io/vue-md-renderer/](https://captainwang98.github.io/vue-md-renderer/)
>
> Or download the source code and build it yourself.

---

## 🗺️ Roadmap

We are actively developing the following features:

### 🚧 Coming Soon

- [ ] **Streaming Markdown Intermediate State Error Tolerance**
  - Handle incomplete Markdown syntax (e.g., unclosed code blocks, emphasis syntax)
  - "Intermediate state" during streaming causes page jitter and poor UX
  - Provide more elegant intermediate state rendering
  - Support real-time syntax fixing and hints

- [ ] **Incremental Rendering Optimization**
  - Only re-render changed AST nodes
  - Demonstrated in "Intelligent Batch Rendering"
  - Diff algorithm optimization to reduce DOM updates
  - More efficient streaming update strategy

### 💡 Long-term Plans

- [ ] **SSR (Server-Side Rendering) Support**
- [ ] **More Built-in Components** (alerts, tabs, charts, etc.)
- [ ] **Theme System**
- [ ] **Markdown Editor Integration**
- [ ] **Performance Monitoring and Analysis Tools**
- [ ] **More Comprehensive Unit Test Coverage**

---

## 🚀 Quick Start

### Basic Usage

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

### Using Plugins

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

### Custom Components

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

### Stream Rendering Example

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import VueMdRenderer from 'vue-md-renderer'

const markdown = ref('')

// Simulate streaming input (e.g., AI generation)
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

### Batch Rendering Configuration

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

## 📖 API Documentation

### Props

| Property                   | Type            | Default      | Description                            |
| -------------------------- | --------------- | ------------ | -------------------------------------- |
| `content`                  | `string`        | **Required** | Markdown content                       |
| `preRemarkPlugins`         | `PluggableList` | `[]`         | Remark plugins executed before parsing |
| `remarkPlugins`            | `PluggableList` | `[]`         | Remark plugin list                     |
| `rehypePlugins`            | `PluggableList` | `[]`         | Rehype plugin list                     |
| `rehypeOptions`            | `RehypeOptions` | `{}`         | Rehype transformation options          |
| `batchRendering`           | `boolean`       | `true`       | Enable batch rendering                 |
| `initialRenderBatchSize`   | `number`        | `40`         | Number of nodes in first render        |
| `renderBatchSize`          | `number`        | `80`         | Nodes per subsequent batch             |
| `renderBatchDelay`         | `number`        | `16`         | Delay between batches (ms)             |
| `renderBatchBudgetMs`      | `number`        | `6`          | Time budget per batch (ms)             |
| `renderBatchIdleTimeoutMs` | `number`        | `120`        | `requestIdleCallback` timeout          |

### Events

| Event             | Parameters          | Description                                |
| ----------------- | ------------------- | ------------------------------------------ |
| `batchSizeChange` | `(newSize: number)` | Triggered when adaptive batch size changes |

### Slots

Named slots can be used to register custom components, with slot names corresponding to specific identifiers in Markdown.

---

## 🤝 Contributing

Contributions are welcome! Since the project is in early stage, we especially welcome:

- 🐛 Bug reports and fixes
- 💡 Feature suggestions and discussions
- 📝 Documentation improvements
- ✅ Test cases

Before submitting a PR, please ensure:

1. Code passes ESLint check: `pnpm lint`
2. Code is formatted: `pnpm format`
3. Type check passes: `pnpm type-check`

---

## 🙏 Acknowledgments

This project is based on the following excellent open source projects:

- [unified](https://unifiedjs.com/) - Text processing ecosystem
- [Shiki](https://shiki.style/) - Syntax highlighter
- [Vue 3](https://vuejs.org/) - Progressive JavaScript framework
- [remark](https://github.com/remarkjs/remark) - Markdown processor
- [rehype](https://github.com/rehypejs/rehype) - HTML processor
- [Element-Plus-X](https://github.com/element-plus-x/Element-Plus-X) - Design inspiration
- [stream-markdown](https://github.com/Simon-He95/stream-markdown) - Stream rendering reference

---

<div align="center">

**If this project helps you, please give it a ⭐️!**

</div>
