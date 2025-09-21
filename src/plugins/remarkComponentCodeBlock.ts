import { type Plugin } from "unified";
import { type Root } from "mdast";
import { visit } from "unist-util-visit";
import { defineComponent } from "vue";

export let VMD_CUSTOM_COMPONENT_KEY = 'VmdCustomComponent';
export const setDefaultCustomComponentKey = (key: string) => VMD_CUSTOM_COMPONENT_KEY = key;

export interface IncompleteComponentData {
  error: string;
}


/**
 * Processes code blocks with lang="component-json" in a markdown AST.
 * It replaces these blocks with a `ComponentCodeBlock` node that can be rendered
 * as a Vue component.
 * @returns A unified plugin that processes code blocks with lang="component-json"
 */
export const defaultCustomMarkdownParser: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang === VMD_CUSTOM_COMPONENT_KEY) {
        try {
          const componentData = JSON.parse(node.value);
          Object.assign(node, {
            type: VMD_CUSTOM_COMPONENT_KEY,
            data: componentData
          });
        } catch (error) {
          Object.assign(node, {
            type: VMD_CUSTOM_COMPONENT_KEY,
            data: { error: 'Invalid JSON' } as IncompleteComponentData
          });
        } finally {
          if (parent && typeof index === 'number') parent.children.splice(index, 1, node);
        }
      }
    });
  };
};

export const useRehypeHandler = () => {
  return remarkRehypeHandlers;
}

const remarkRehypeHandlers = {
  [VMD_CUSTOM_COMPONENT_KEY]: (_state: any, node: any) => {
    console.log('Custom component node:', node, _state);
    return {
      type: 'element',
      tagName: 'VmdCustomComponent',
      properties: node.data,
      children: node.data.children || [],
    };
  }
}

export const VmdCustomComponent = defineComponent({
  name: 'VmdCustomComponent',
  props: {
    data: Object
  },
  setup(props) {

    return () => {
      if (props.data && 'error' in props.data) {
        return `Error: ${props.data.error}`;
      }
      if (props.data && 'data' in props.data) {
        const componentData = props.data.data;
        return `Custom Component: ${componentData.component} with props: ${JSON.stringify(componentData.props)}`;
      }
      return 'This is a custom component from markdown!';
    }
  }
})
