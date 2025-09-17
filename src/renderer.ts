import { defineComponent, h, PropType } from "vue";
import { useMarkdownProcessor } from "./processor";
import { PluggableList } from "unified";
import { type Options as RehypeOptions } from "remark-rehype";

export default defineComponent({
  props: {
    content: { type: String, required: true },
    preRemarkPlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
    remarkPlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
    
    rehypeOptions: { type: Object as PropType<RehypeOptions>, required: false },
    rehypePlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
  },
  setup(props) {
    const { content, preRemarkPlugins, remarkPlugins, rehypePlugins, rehypeOptions } = props;
    const processor = useMarkdownProcessor({
      preRemarkPlugins,
      remarkPlugins,
      rehypePlugins,
      rehypeOptions
    });
    const mdast = processor.value.parse(content);
    const hast = processor.value.runSync(mdast);
    console.log('hast', hast, 'mdast', mdast);
    return () => h("div");
  },
});
