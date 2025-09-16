import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { defaultCustomMarkdownParser } from "./plugins/remarkComponentCodeBlock";
import remarkRehype from "remark-rehype";
import { defineComponent } from "vue";

defineComponent({
  setup(props) {
    const unifiedProcessor = unified()
      // parse markdown to AST
      .use(remarkParse)
      // support GitHub Flavored Markdown (GFM)
      .use(remarkGfm)
      // parse specific Markdown syntax to custom AST nodes
      .use(defaultCustomMarkdownParser)
      // convert Markdown AST to HTML AST
      .use(remarkRehype);
  },
});
