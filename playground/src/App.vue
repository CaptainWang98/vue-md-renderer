<script setup lang="ts">
import { onMounted, ref, h } from 'vue'
import VueMdRenderer, { AsyncWrapper } from 'vue-md-renderer'
import MyComp from './components/MyComp';
// support latex
// import "katex/dist/katex.min.css";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

function createStream(text: string, chunkSize = 10, delay = 50) {
  let position = 0;
  return new ReadableStream({
    pull(controller) {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (position >= text.length) {
            controller.close();
            resolve();
            return;
          }

          const chunk = text.slice(position, position + chunkSize);
          position += chunkSize;
          controller.enqueue(chunk);

          resolve();
        }, delay);
      });
    },
  });
}
const mdText = ref("");
const isRender = ref(true);
async function clickHandle() {
  mdText.value = "";
  isRender.value = true;
  const res = await fetch("./md.md");
  const md = await res.text();

  const formatMd = convertLatexDelimiters(md);

  const stream = createStream(formatMd);
  // ios doesn't support Symbol.asyncIterator
  const reader = stream.getReader();
  while (true) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    mdText.value += chunk;
  }
  isRender.value = false;
}
onMounted(clickHandle);
function convertLatexDelimiters(text: string) {
  const pattern =
    /(```[\S\s]*?```|`.*?`)|\\\[([\S\s]*?[^\\])\\]|\\\((.*?)\\\)/g;
  return text.replaceAll(
    pattern,
    (match, codeBlock, squareBracket, roundBracket) => {
      if (codeBlock !== undefined) {
        return codeBlock;
      } else if (squareBracket !== undefined) {
        return `$$${squareBracket}$$`;
      } else if (roundBracket !== undefined) {
        return `$${roundBracket}$`;
      }
      return match;
    }
  );
}
</script>

<template>
  <VueMdRenderer
    :content="mdText"
    :remark-plugins="[remarkMath]"
    :rehype-plugins="[rehypeKatex]"
  >
    <template #mycodd="props">
      <AsyncWrapper v-bind="props">
        <template #default="slotProps">
          <MyComp v-bind="slotProps"/>
        </template>
      </AsyncWrapper>
    </template>
  </VueMdRenderer>
</template>

<style scoped></style>
