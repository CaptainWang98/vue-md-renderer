import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueMdRenderer',
      // 只构建 ES 模块格式
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        // 对于 ES 模块，不内联动态导入以便代码分割
        inlineDynamicImports: false,
        // 配置chunk分组，将shiki相关文件放到单独目录
        manualChunks(id) {
          // Shiki 语言文件
          if (id.includes('@shikijs/langs') || id.includes('shiki/dist/langs')) {
            return 'shiki/langs'
          }
          // Shiki 主题文件
          if (id.includes('@shikijs/themes') || id.includes('shiki/dist/themes')) {
            return 'shiki/themes'
          }
          // Shiki 核心和其他文件
          if (id.includes('@shikijs/') || id.includes('shiki/')) {
            return 'shiki/core'
          }
          // WASM 文件
          if (id.includes('.wasm')) {
            return 'shiki/wasm'
          }
        },
        // 配置chunk文件名格式
        chunkFileNames: chunkInfo => {
          // 如果已经通过 manualChunks 设置了路径，保持原样
          if (chunkInfo.name.includes('/')) {
            return `${chunkInfo.name}-[hash].mjs`
          }
          return '[name]-[hash].mjs'
        },
        // 确保 CSS 被提取为单独的文件
        assetFileNames: assetInfo => {
          if (assetInfo.name === 'style.css') {
            return 'vue-md-renderer.css'
          }
          // WASM 文件放到 shiki 目录
          if (assetInfo.name && assetInfo.name.endsWith('.wasm')) {
            return 'shiki/[name]-[hash][extname]'
          }
          return assetInfo.name || ''
        },
      },
    },
    outDir: 'lib',
    // 确保 CSS 被提取
    cssCodeSplit: false,
  },
})
