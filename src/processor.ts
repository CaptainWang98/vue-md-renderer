import { PluggableList, unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { defaultCustomMarkdownParser } from "./plugins/remarkComponentCodeBlock";
import remarkRehype, { type Options as RehypeOptions } from "remark-rehype";
import { computed } from "vue";

interface useMarkdownProcessorOptions {
  preRemarkPlugins?: PluggableList;
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  rehypeOptions?: RehypeOptions;
}

/**
 * @fileoverview Create a unified processor with remark and rehype plugins
 */
export function useMarkdownProcessor(options: useMarkdownProcessorOptions) {
  return computed(() => {
    return createProcessor(options);
  })
}
/**
 * Factory function to create a unified processor with options 
 * @returns 
 */
function createProcessor(options?: useMarkdownProcessorOptions) {
  const unifiedProcessor = unified()
    // parse markdown to AST
    .use(options?.preRemarkPlugins ?? [])
    .use(remarkParse)
    // support GitHub Flavored Markdown (GFM)
    .use([remarkGfm, ...(options?.remarkPlugins ?? [])])
    // parse specific Markdown syntax to custom AST nodes
    .use(defaultCustomMarkdownParser)
    // convert Markdown AST to HTML AST
    .use(remarkRehype)
    // apply rehype plugins if any
    .use(options?.rehypePlugins ?? []);
  return unifiedProcessor;
}
