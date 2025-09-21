import { defineComponent, h, PropType, computed, Component } from "vue";
import { useMarkdownProcessor } from "./processor";
import { PluggableList } from "unified";
import { type Options as RehypeOptions } from "remark-rehype";
import { VFile } from "vfile";
import { type Nodes } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "vue/jsx-dev-runtime";
import { VmdCustomComponent } from "./plugins/remarkComponentCodeBlock";

export default defineComponent({
  props: {
    content: { type: String, required: true },
    preRemarkPlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
    remarkPlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
    
    rehypeOptions: { type: Object as PropType<RehypeOptions>, required: false },
    rehypePlugins: { type: Array as PropType<PluggableList>, required: false, default: () => [] },
  },
  setup(props, { slots }) {
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

    const componentsToUse = computed(() => ({
      ...(slots as Record<string, () => Component>),
    }))

    const createFile = (md: string) => {
      const file = new VFile()
      file.value = md
      return file
    }

    // TODO: 手动转换 hast -> vnode
    const generateVNode = (hast: Nodes) => {
      const vueVnode = toJsxRuntime(hast, {
        components: {
          VmdCustomComponent,
          ...componentsToUse.value,
        },
        Fragment,
        jsx: jsx,
        jsxs: jsxs,
        passKeys: true,
        passNode: false,
      });
      return vueVnode;
    }

    const computedVNode = computed(() => {
      const file = createFile(content);
      return generateVNode(processor.value.runSync(processor.value.parse(file), file));
    });

    return () => h(computedVNode.value);
  },
});
