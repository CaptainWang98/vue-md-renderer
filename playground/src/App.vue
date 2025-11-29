<script setup lang="ts">
import { onMounted, ref } from 'vue'
import VueMdRenderer, { AsyncWrapper } from 'vue-md-renderer'
import MyComp from './components/MyComp'
import BatchRenderingDemo from './components/BatchRenderingDemo.vue'
// support latex
// import "katex/dist/katex.min.css";
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

// 切换演示模式
const demoMode = ref<'stream' | 'batch'>('stream')

function createStream(text: string, chunkSize = 10, delay = 50) {
  let position = 0
  return new ReadableStream({
    pull(controller) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (position >= text.length) {
            controller.close()
            resolve()
            return
          }

          const chunk = text.slice(position, position + chunkSize)
          position += chunkSize
          controller.enqueue(chunk)

          resolve()
        }, delay)
      })
    },
  })
}
const mdText = ref('')
const isRender = ref(true)
async function clickHandle() {
  mdText.value = ''
  isRender.value = true
  const res = await fetch('./md.md')
  const md = await res.text()

  const formatMd = convertLatexDelimiters(md)

  const stream = createStream(formatMd)
  // ios doesn't support Symbol.asyncIterator
  const reader = stream.getReader()
  while (true) {
    const { done, value: chunk } = await reader.read()
    if (done) break
    mdText.value += chunk
  }
  isRender.value = false
}
onMounted(clickHandle)
function convertLatexDelimiters(text: string) {
  const pattern = /(```[\S\s]*?```|`.*?`)|\\\[([\S\s]*?[^\\])\\]|\\\((.*?)\\\)/g
  return text.replaceAll(pattern, (match, codeBlock, squareBracket, roundBracket) => {
    if (codeBlock !== undefined) {
      return codeBlock
    } else if (squareBracket !== undefined) {
      return `$$${squareBracket}$$`
    } else if (roundBracket !== undefined) {
      return `$${roundBracket}$`
    }
    return match
  })
}
</script>

<template>
  <div class="app-container">
    <div class="demo-switcher">
      <button :class="{ active: demoMode === 'stream' }" @click="demoMode = 'stream'">
        流式渲染演示
      </button>
      <button :class="{ active: demoMode === 'batch' }" @click="demoMode = 'batch'">
        批量渲染演示
      </button>
    </div>

    <div v-if="demoMode === 'stream'" class="demo-content">
      <VueMdRenderer
        :content="mdText"
        :remark-plugins="[remarkMath]"
        :rehype-plugins="[rehypeKatex]"
      >
        <template #mycodd="props">
          <AsyncWrapper v-bind="props">
            <template #default="slotProps">
              <MyComp v-bind="slotProps" />
            </template>
          </AsyncWrapper>
        </template>
      </VueMdRenderer>
    </div>

    <div v-else class="demo-content">
      <BatchRenderingDemo />
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  min-height: 100vh;
}

.demo-switcher {
  display: flex;
  gap: 10px;
  padding: 20px;
  background: #f5f5f5;
  border-bottom: 2px solid #ddd;
}

.demo-switcher button {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.demo-switcher button:hover {
  background: #e9e9e9;
}

.demo-switcher button.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.demo-content {
  padding: 20px;
}
</style>
