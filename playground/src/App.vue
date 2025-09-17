<script setup lang="ts">
import { ref } from 'vue'
import VueMdRenderer from 'vue-md-renderer'

const markdown = ref(`# Markdown Test

## Code Block
\`\`\`js
console.log('Hello, world!');
\`\`\`

## Structure

## Autolink literals

www.example.com, https://example.com, and contact@example.com.

## Footnote

A note[^1]

[^1]: Big note.

## Strikethrough

~one~ or ~~two~~ tildes.

## Table

| a | b  |  c |  d  |
| - | - | - | - |
| 1 | 2 | 3 | 4 |

## Tasklist

* [ ] to do
* [x] done

## Raw
<div class="note">

A mix of *markdown* and <em>HTML</em>.

</div>

## Math
Lift($$L$$) can be determined by Lift Coefficient ($$C_L$$) like the following
equation.
$$
L = \\frac{1}{2} \\rho v^2 S C_L
$$

## Vue Slot
<div>
<slot slot-name="header" value="123">I am slot</slot>
</div>

## Svg
<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="150" width="100" height="100" fill="#f0f0f0" stroke="#333" stroke-width="5"/>
  <text x="100" y="200" text-anchor="middle" font-family="Arial" font-size="14">Input</text>
</svg>

## Code
This code \`console.log{:js}\` will be highlighted in \`<VueMarkdownAsync />{:html}\`.
`)

</script>

<template>
  <VueMdRenderer :content="markdown" />
  <h1>You did it!</h1>
  <p>
    Visit <a href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a> to read the
    documentation
  </p>
</template>

<style scoped></style>
