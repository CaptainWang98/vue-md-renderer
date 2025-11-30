<script lang="ts" setup>
import { useShiki } from '../../hooks/useShiki'
import type { BundledLanguage } from 'shiki'
import type { RawProps } from './types'
import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers'
import { computed, ref, watch } from 'vue'
import HighLightCode from '../HighLightCode/index.vue'
import { SHIKI_SUPPORT_LANGS } from '../../shared/shikiHighlighter'

const props = withDefaults(
  defineProps<{
    raw?: RawProps
  }>(),
  {
    raw: () => ({}),
  }
)

// Copy functionality
const copied = ref(false)
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.raw?.content || '')
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

const renderLines = ref<string[]>([])
const preStyle = ref<string | null>(null)
const preClass = ref<string | null>(null)

const nowCodeLanguage = ref<BundledLanguage>()
const codeAttrs = {}

const shikiTransformers = [
  transformerNotationDiff(),
  transformerNotationErrorLevel(),
  transformerNotationFocus(),
  transformerNotationHighlight(),
  transformerNotationWordHighlight(),
]

const { codeToHtml } = useShiki()
// Generate highlighted HTML
async function generateHtml() {
  const { language: rawLanguage = 'text', content = '' } = props.raw || {}
  const language = (SHIKI_SUPPORT_LANGS as readonly string[]).includes(rawLanguage)
    ? rawLanguage
    : 'text'
  nowCodeLanguage.value = language as BundledLanguage
  const html = await codeToHtml(content.trim(), {
    lang: language as BundledLanguage,
    // TODO: Support theme configuration in the future
    themes: { light: 'github-light', dark: 'github-dark' },
    colorReplacements: {},
    transformers: shikiTransformers,
  })
  const parse = new DOMParser()
  const doc = parse.parseFromString(html, 'text/html')
  const preElement = doc.querySelector('pre')
  preStyle.value = preElement?.getAttribute('style') ?? null
  const preClassNames = preElement?.className
  preClass.value = preClassNames ?? ''
  const codeElement = doc.querySelector('pre code')
  if (codeElement) {
    const lines = codeElement.querySelectorAll('.line') // Get all code lines
    renderLines.value = Array.from(lines).map(line => line.outerHTML) // Store HTML for each line
  }
}

// TODO: watch language change
watch(
  () => props.raw?.content,
  async content => {
    if (content) {
      await generateHtml()
    }
  },
  { immediate: true }
)

// Computed properties
const computedClass = computed(() => `pre-md ${preClass.value} is-expanded`)
const codeClass = computed(() => `language-${props.raw?.language || 'text'} code-styled`)

// Get whether to show line numbers
const enableCodeLineNumber = computed(() => {
  // return context?.value?.codeXProps?.enableCodeLineNumber ?? false;
  return false
})
</script>

<template>
  <div :key="props.raw?.codeKey" :class="computedClass" :style="preStyle">
    <!-- Header with language and copy button -->
    <div class="markdown-elxLanguage-header-div">
      <div class="markdown-elxLanguage-header-space-start">
        <span class="markdown-elxLanguage-header-span">
          {{ props.raw?.language || 'text' }}
        </span>
      </div>
      <div class="markdown-elxLanguage-header-space">
        <button
          class="shiki-header-button"
          :class="{ copied: copied }"
          @click="copyCode"
          :title="copied ? 'Copied!' : 'Copy code'"
        >
          <svg
            v-if="!copied"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Code content -->
    <code
      :class="codeClass"
      :style="{
        display: 'block',
        overflowX: 'auto',
      }"
      v-bind="codeAttrs"
    >
      <HighLightCode
        :enable-code-line-number="enableCodeLineNumber"
        :lang="props.raw?.language ?? 'text'"
        :code="renderLines"
      />
    </code>
  </div>
</template>

<style scoped>
.shiki-header-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 24px;
}

.shiki-header-button svg {
  display: block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
</style>
