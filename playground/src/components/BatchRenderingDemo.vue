<template>
  <div class="batch-rendering-demo">
    <h1>智能批量渲染示例（流式渲染）</h1>

    <div class="controls">
      <div class="control-group">
        <label>
          <input v-model="enabled" type="checkbox" :disabled="isStreaming" />
          启用批量渲染
        </label>
      </div>

      <div class="control-group">
        <label>
          初始批次大小:
          <input
            v-model.number="initialBatchSize"
            type="number"
            min="1"
            max="200"
            :disabled="isStreaming"
          />
        </label>
      </div>

      <div class="control-group">
        <label>
          批次大小:
          <input
            v-model.number="batchSize"
            type="number"
            min="1"
            max="200"
            :disabled="isStreaming"
          />
        </label>
      </div>

      <div class="control-group">
        <label>
          批次延迟 (ms):
          <input
            v-model.number="batchDelay"
            type="number"
            min="0"
            max="100"
            :disabled="isStreaming"
          />
        </label>
      </div>

      <div class="control-group">
        <label>
          生成节点数:
          <input
            v-model.number="nodeCount"
            type="number"
            min="10"
            max="2000"
            step="10"
            :disabled="isStreaming"
          />
        </label>
      </div>

      <div class="control-group">
        <label>
          流式渲染速度 (ms/块):
          <input
            v-model.number="streamDelay"
            type="number"
            min="10"
            max="500"
            step="10"
            :disabled="isStreaming"
          />
        </label>
      </div>

      <div class="button-group">
        <button @click="startStreaming" class="generate-btn" :disabled="isStreaming">
          {{ isStreaming ? '流式渲染中...' : '开始流式渲染' }}
        </button>

        <button v-if="isStreaming" @click="pauseStreaming" class="pause-btn">
          {{ isPaused ? '继续' : '暂停' }}
        </button>

        <button v-if="isStreaming || markdownContent" @click="resetStreaming" class="reset-btn">
          重新开始
        </button>
      </div>

      <div class="stats">
        <p>
          流式进度: <strong>{{ streamProgress }}%</strong>
        </p>
        <p>
          已生成内容: <strong>{{ currentChunks }} / {{ totalChunks }} 块</strong>
        </p>
        <p>
          渲染时间: <strong>{{ renderTime }}ms</strong>
        </p>
        <p>
          内容长度: <strong>{{ markdownContent.length }} 字符</strong>
        </p>
      </div>

      <div class="batch-size-monitor" v-if="enabled">
        <h3>🔄 自适应批次大小监控</h3>
        <div class="batch-info">
          <div class="info-item">
            <label>配置批次大小:</label>
            <span class="value">{{ batchSize }}</span>
          </div>
          <div class="info-item">
            <label>当前批次大小:</label>
            <span class="value adaptive" :class="getBatchSizeClass()">
              {{ currentAdaptiveBatchSize }}
            </span>
          </div>
          <div class="info-item">
            <label>调整比例:</label>
            <span class="value">{{ adaptiveRatio }}%</span>
          </div>
        </div>

        <div class="batch-size-bar">
          <div class="bar-background">
            <div
              class="bar-fill"
              :style="{ width: adaptiveRatio + '%' }"
              :class="getBatchSizeClass()"
            ></div>
          </div>
          <div class="bar-labels">
            <span>{{ Math.floor(batchSize / 4) }}</span>
            <span>{{ batchSize }}</span>
          </div>
        </div>

        <div class="batch-explanation">
          <p v-if="currentAdaptiveBatchSize < batchSize * 0.8" class="warning">
            ⚠️ 批次大小已减小，渲染性能未达预期
          </p>
          <p v-else-if="currentAdaptiveBatchSize >= batchSize" class="success">
            ✅ 批次大小保持最优，渲染性能良好
          </p>
          <p v-else class="info">ℹ️ 批次大小自适应调整中</p>
        </div>
      </div>

      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: streamProgress + '%' }"></div>
      </div>
    </div>

    <div class="preview">
      <MarkdownRenderer
        :content="markdownContent"
        :batch-rendering="enabled"
        :initial-render-batch-size="initialBatchSize"
        :render-batch-size="batchSize"
        :render-batch-delay="batchDelay"
        @batch-size-change="handleBatchSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import MarkdownRenderer from '../../../src/MarkdownRenderer'

const enabled = ref(true)
const initialBatchSize = ref(40)
const batchSize = ref(80)
const batchDelay = ref(16)
const nodeCount = ref(200)
const streamDelay = ref(50) // 流式渲染延迟
const markdownContent = ref('')
const renderTime = ref(0)

// 用于监控自适应批次大小（仅用于UI显示）
const currentAdaptiveBatchSize = ref(80)

// 处理批次大小变化事件
function handleBatchSizeChange(newSize: number) {
  currentAdaptiveBatchSize.value = newSize
}

// 计算自适应批次大小比例
const adaptiveRatio = computed(() => {
  const min = Math.floor(batchSize.value / 4)
  const max = batchSize.value
  const current = currentAdaptiveBatchSize.value
  return Math.round(((current - min) / (max - min)) * 100)
})

// 获取批次大小状态样式类
function getBatchSizeClass() {
  const ratio = currentAdaptiveBatchSize.value / batchSize.value
  if (ratio < 0.8) return 'low'
  if (ratio >= 1.0) return 'optimal'
  return 'medium'
}

// 流式渲染状态
const isStreaming = ref(false)
const isPaused = ref(false)
const currentChunks = ref(0)
const totalChunks = ref(0)
const streamStartTime = ref(0)

let streamTimer: number | null = null
let allChunks: string[] = []

// 计算流式进度
const streamProgress = computed(() => {
  if (totalChunks.value === 0) return 0
  return Math.round((currentChunks.value / totalChunks.value) * 100)
})

// 生成所有 Markdown 块
function generateAllChunks() {
  const chunks: string[] = []

  // 添加标题
  chunks.push('# 大型 Markdown 文档示例\n\n')
  chunks.push('> 这是一个用于测试智能批量渲染的大型文档。\n\n')

  // 生成内容
  for (let i = 1; i <= nodeCount.value; i++) {
    // 每 10 个节点添加一个大标题
    if (i % 10 === 1 && i > 1) {
      chunks.push(`\n## 第 ${Math.floor(i / 10) + 1} 部分\n\n`)
    }

    // 段落
    chunks.push(`这是第 ${i} 段文本。`)
    chunks.push(`包含一些 **粗体** 和 *斜体* 内容。`)
    chunks.push(`还有一些 \`内联代码\` 和 [链接](https://example.com)。\n\n`)

    // 添加列表
    if (i % 15 === 0) {
      chunks.push('### 功能特性\n\n')
      chunks.push('- ✅ 智能批量渲染\n')
      chunks.push('- ✅ 流式内容更新\n')
      chunks.push('- ✅ 自适应批次大小\n')
      chunks.push('- ✅ 性能优化\n\n')
    }

    // 添加代码块
    if (i % 20 === 0) {
      chunks.push('```javascript\n')
      chunks.push(`// 示例函数 ${i}\n`)
      chunks.push(`function example${i}() {\n`)
      chunks.push('  const result = {\n')
      chunks.push('    status: "success",\n')
      chunks.push('    data: [1, 2, 3, 4, 5]\n')
      chunks.push('  }\n')
      chunks.push('  return result\n')
      chunks.push('}\n')
      chunks.push('```\n\n')
    }

    // 添加表格
    if (i % 30 === 0) {
      chunks.push('### 数据表格\n\n')
      chunks.push('| 序号 | 名称 | 状态 | 备注 |\n')
      chunks.push('|------|------|------|------|\n')
      chunks.push(`| ${i} | 项目A | ✅ | 已完成 |\n`)
      chunks.push(`| ${i + 1} | 项目B | 🔄 | 进行中 |\n`)
      chunks.push(`| ${i + 2} | 项目C | ⏸️ | 暂停 |\n\n`)
    }

    // 添加引用
    if (i % 25 === 0) {
      chunks.push(`> 💡 提示 ${i}: 批量渲染可以显著提升大型文档的渲染性能。\n\n`)
    }
  }

  chunks.push('\n---\n\n')
  chunks.push('## 总结\n\n')
  chunks.push(`本文档共包含 ${nodeCount.value} 个节点，`)
  chunks.push('演示了智能批量渲染在处理大型文档时的优势。\n\n')
  chunks.push('**主要优势**:\n\n')
  chunks.push('1. 首屏渲染快速\n')
  chunks.push('2. 不阻塞用户交互\n')
  chunks.push('3. 自适应性能调整\n')
  chunks.push('4. 流畅的用户体验\n')

  return chunks
}

// 开始流式渲染
function startStreaming() {
  // 重置状态
  markdownContent.value = ''
  currentChunks.value = 0
  isStreaming.value = true
  isPaused.value = false
  streamStartTime.value = performance.now()

  // 生成所有块
  allChunks = generateAllChunks()
  totalChunks.value = allChunks.length

  // 开始流式添加
  streamNextChunk()
}

// 流式添加下一个块
function streamNextChunk() {
  if (!isStreaming.value || isPaused.value) return

  if (currentChunks.value < allChunks.length) {
    // 添加当前块
    markdownContent.value += allChunks[currentChunks.value]
    currentChunks.value++

    // 调度下一个块
    streamTimer = window.setTimeout(() => {
      streamNextChunk()
    }, streamDelay.value)
  } else {
    // 完成流式渲染
    finishStreaming()
  }
}

// 暂停流式渲染
function pauseStreaming() {
  isPaused.value = !isPaused.value

  if (!isPaused.value) {
    // 继续渲染
    streamNextChunk()
  } else {
    // 暂停渲染
    if (streamTimer !== null) {
      clearTimeout(streamTimer)
      streamTimer = null
    }
  }
}

// 完成流式渲染
function finishStreaming() {
  isStreaming.value = false
  isPaused.value = false

  const endTime = performance.now()
  renderTime.value = Math.round((endTime - streamStartTime.value) * 100) / 100

  if (streamTimer !== null) {
    clearTimeout(streamTimer)
    streamTimer = null
  }
}

// 重新开始
function resetStreaming() {
  // 清理定时器
  if (streamTimer !== null) {
    clearTimeout(streamTimer)
    streamTimer = null
  }

  // 重置所有状态
  markdownContent.value = ''
  currentChunks.value = 0
  totalChunks.value = 0
  isStreaming.value = false
  isPaused.value = false
  renderTime.value = 0
  allChunks = []
}

// 组件卸载时清理
onUnmounted(() => {
  if (streamTimer !== null) {
    clearTimeout(streamTimer)
  }
})
</script>

<style scoped>
.batch-rendering-demo {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.controls {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.control-group input[type='number'] {
  width: 100px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.control-group input[type='checkbox'] {
  width: 18px;
  height: 18px;
}

.control-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generate-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  margin-top: 10px;
}

.generate-btn:hover:not(:disabled) {
  background: #33a06f;
}

.generate-btn:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.pause-btn,
.reset-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.pause-btn {
  background: #f39c12;
  color: white;
}

.pause-btn:hover {
  background: #e67e22;
}

.reset-btn {
  background: #e74c3c;
  color: white;
}

.reset-btn:hover {
  background: #c0392b;
}

.stats {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #ddd;
}

.progress-bar {
  margin-top: 15px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #42b983, #35a06f);
  transition: width 0.3s ease;
}

.stats p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.stats strong {
  color: #2c3e50;
}

/* 批次大小监控样式 */
.batch-size-monitor {
  margin-top: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.batch-size-monitor h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.batch-info {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item label {
  font-size: 12px;
  opacity: 0.9;
}

.info-item .value {
  font-size: 20px;
  font-weight: bold;
}

.info-item .value.adaptive {
  font-size: 24px;
}

.info-item .value.adaptive.low {
  color: #ff6b6b;
  animation: pulse 1s ease-in-out infinite;
}

.info-item .value.adaptive.medium {
  color: #ffd93d;
}

.info-item .value.adaptive.optimal {
  color: #6bcf7f;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.batch-size-bar {
  position: relative;
  margin-bottom: 15px;
}

.bar-background {
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition:
    width 0.3s ease,
    background 0.3s ease;
  border-radius: 10px;
}

.bar-fill.low {
  background: linear-gradient(90deg, #ff6b6b, #ee5a52);
}

.bar-fill.medium {
  background: linear-gradient(90deg, #ffd93d, #f5c02c);
}

.bar-fill.optimal {
  background: linear-gradient(90deg, #6bcf7f, #51b56d);
}

.bar-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 11px;
  opacity: 0.8;
}

.batch-explanation {
  margin-top: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
}

.batch-explanation p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.batch-explanation .warning {
  color: #ff6b6b;
}

.batch-explanation .success {
  color: #6bcf7f;
}

.batch-explanation .info {
  color: #ffd93d;
}

.preview {
  background: white;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  min-height: 400px;
}

.preview :deep(h2) {
  color: #42b983;
  border-bottom: 2px solid #42b983;
  padding-bottom: 10px;
  margin-top: 30px;
  margin-bottom: 15px;
}

.preview :deep(h3) {
  color: #35495e;
  margin-top: 20px;
  margin-bottom: 10px;
}

.preview :deep(code) {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.preview :deep(pre) {
  background: #2c3e50;
  color: #fff;
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
}

.preview :deep(ul) {
  padding-left: 20px;
}

.preview :deep(li) {
  margin: 5px 0;
}

.preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 15px 0;
}

.preview :deep(th),
.preview :deep(td) {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.preview :deep(th) {
  background: #f5f5f5;
  font-weight: bold;
}
</style>
