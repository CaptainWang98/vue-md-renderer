import { type Plugin } from "unified";

/**
 * Processes code blocks with lang="component-json" in a markdown AST.
 * It replaces these blocks with a `ComponentCodeBlock` node that can be rendered
 * as a Vue component.
 * @returns A unified plugin that processes code blocks with lang="component-json"
 */
export const defaultCustomMarkdownParser: Plugin<[], any, void> = () => {
  return (tree) => {};
};
