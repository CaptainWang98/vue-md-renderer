<script setup lang="ts">
import { ref } from 'vue'
import VueMdRenderer from 'vue-md-renderer'

const markdown = ref(`# Markdown Test

## Code Block
\`\`\`js
console.log('Hello, world!');
\`\`\`

## vmd custom component
\`\`\`VmdCustomComponent
{"type":"vmd-custom-component","children":{"type":"vmd-custom-component","data":{"component":"MyComponent","props":{"msg":"Hello from custom component!"}}},"data":{"component":"MyComponent","props":{"msg":"Hello from custom component!"}}}
\`\`\`

## vmd custom component1
\`\`\`MyComp
{"type":"MyComp","data":{"component":"MyComponent","props":{"msg":"Hello from custom component!"}}}
\`\`\`
`)

</script>

<template>
  <VueMdRenderer :content="markdown">
    <template #MyComp>
      Hello MyComp!
    </template>
  </VueMdRenderer>
  <h1>You did it!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
  </p>
</template>

<style scoped></style>
