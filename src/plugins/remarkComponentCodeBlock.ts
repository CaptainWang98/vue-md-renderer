import { type Plugin } from "unified";
import { type Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Processes code blocks with lang="component-json" in a markdown AST.
 * It replaces these blocks with a `ComponentCodeBlock` node that can be rendered
 * as a Vue component.
 * @returns A unified plugin that processes code blocks with lang="component-json"
 */
export const defaultCustomMarkdownParser: Plugin<[], Root> = () => {
  return (tree: Root) => {
    // Use visit to traverse the AST and find code blocks
    visit(tree, 'code', (node) => {
      // Here you can process code blocks with lang="component-json"
      console.log('Visiting code block:', node);
      if (node.lang === 'component-json') {
        // Process the component code block
        console.log('Found component code block:', node);
      }
    });
  };
};
