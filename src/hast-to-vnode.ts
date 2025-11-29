import type { Element, Root, RootContent, Text } from 'hast'
import type { MaybeRefOrGetter, VNode, VNodeArrayChildren } from 'vue'
import type { AliasList, Attributes, Context, CustomAttrs, CustomAttrsObjectResult } from './types'
import { find, html, svg } from 'property-information'
import { h, toValue } from 'vue'
import { useComponentRegistry } from './hooks/useComponents'

export function render(
  hast: Root,
  attrs: Record<string, unknown>,
  customAttrs?: MaybeRefOrGetter<CustomAttrs>,
  maxNodes?: number
): VNode {
  // 7、render root
  return h(
    'div',
    attrs,
    renderChildren(
      hast.children,
      { listDepth: -1, listOrdered: false, listItemIndex: -1, svg: false },
      hast,
      toValue(customAttrs) ?? {},
      maxNodes
    )
  )
}

// 8、recursively render children
export function renderChildren(
  nodeList: (RootContent | Root)[],
  ctx: Context,
  parent: Element | Root,
  customAttrs: CustomAttrs,
  maxNodes?: number
): VNodeArrayChildren {
  const keyCounter: {
    [key: string]: number
  } = {}

  // 如果设置了 maxNodes，只渲染前 maxNodes 个节点
  const nodesToRender = maxNodes !== undefined ? nodeList.slice(0, maxNodes) : nodeList

  return nodesToRender.map(node => {
    switch (node.type) {
      case 'text':
        return node.value
      case 'raw':
        // TODO: remove extra `span` wrapper
        return h('span', { innerHTML: node.value, style: { display: 'contents' } })
      case 'root':
        return renderChildren(node.children, ctx, parent, customAttrs, maxNodes)
      case 'element': {
        const vnodeInfo = getVNodeInfos(node, parent, ctx, keyCounter, customAttrs)

        const { attrs, context, aliasList, vnodeProps } = vnodeInfo
        for (let i = aliasList.length - 1; i >= 0; i--) {
          // 10. If there's a suitable component, render it directly
          const componentRegistry = useComponentRegistry()
          const renderer = componentRegistry.get(aliasList[i])

          if (renderer) {
            return renderer({
              ...vnodeProps,
              ...attrs,
              children: () => renderChildren(node.children, context, node, customAttrs, maxNodes),
            })
          }
        }

        return h(
          node.tagName,
          attrs,
          renderChildren(node.children, context, node, customAttrs, maxNodes)
        )
      }
      default:
        return null
    }
  })
}

export function getVNodeInfos(
  node: RootContent,
  parent: Element | Root,
  context: Context,
  keyCounter: Record<string, number>,
  customAttrs: CustomAttrs
): {
  attrs: Record<string, unknown>
  context: Context
  aliasList: AliasList
  vnodeProps: Record<string, any>
} {
  // 9. aliasList collects tag names for possible component names
  const aliasList: AliasList = []

  let attrs: Record<string, unknown> = {}
  const vnodeProps: Record<string, any> = {}
  const ctx = { ...context }

  if (node.type === 'element') {
    aliasList.push(node.tagName)
    keyCounter[node.tagName] = (keyCounter[node.tagName] || 0) + 1
    // generate key for list rendering
    vnodeProps.codeKey = `${node.tagName}-${keyCounter[node.tagName]}`
    node.properties = node.properties || {}

    if (node.tagName === 'svg') {
      ctx.svg = true
    }

    attrs = Object.entries(node.properties).reduce<Record<string, any>>((acc, [hastKey, value]) => {
      const attrInfo = find(ctx.svg ? svg : html, hastKey)
      acc[attrInfo.attribute] = value

      return acc
    }, {})

    switch (node.tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        vnodeProps.level = Number.parseFloat(node.tagName.slice(1))
        aliasList.push('heading')
        break
      // TODO: maybe use <pre> instead for customizing from <pre> not <code> ?
      case 'code':
        vnodeProps.languageOriginal = Array.isArray(attrs.class)
          ? attrs.class.find(cls => cls.startsWith('language-'))
          : ''
        vnodeProps.language = vnodeProps.languageOriginal
          ? vnodeProps.languageOriginal.replace('language-', '')
          : ''
        vnodeProps.inline = 'tagName' in parent && parent.tagName !== 'pre'

        // when tagName is code, it definitely has children and the first child is text
        // https://github.com/syntax-tree/mdast-util-to-hast/blob/main/lib/handlers/code.js
        vnodeProps.content = (node.children[0] as unknown as Text)?.value ?? ''

        aliasList.push(vnodeProps.inline ? 'inline-code' : 'block-code')
        break
      case 'thead':
      case 'tbody':
        ctx.currentContext = node.tagName
        break
      case 'td':
      case 'th':
      case 'tr':
        vnodeProps.isHead = context.currentContext === 'thead'
        break

      case 'ul':
      case 'ol':
        ctx.listDepth = context.listDepth + 1
        ctx.listOrdered = node.tagName === 'ol'
        ctx.listItemIndex = -1
        vnodeProps.ordered = ctx.listOrdered
        vnodeProps.depth = ctx.listDepth

        aliasList.push('list')
        break

      case 'li':
        ctx.listItemIndex++

        vnodeProps.ordered = ctx.listOrdered
        vnodeProps.depth = ctx.listDepth
        vnodeProps.index = ctx.listItemIndex
        aliasList.push('list-item')

        break
      case 'slot':
        if (typeof node.properties['slot-name'] === 'string') {
          aliasList.push(`${node.properties['slot-name']}`)
          delete node.properties['slot-name']
        }
        break
      default:
        break
    }

    attrs = computeAttrs(
      node,
      aliasList,
      vnodeProps,
      { ...attrs } as Attributes, // TODO: fix this
      customAttrs
    )
  }

  return {
    attrs,
    context: ctx,
    aliasList,
    vnodeProps,
  }
}

/**
 * TODO:
 * @param node - hast node
 * @param aliasList - html tag list. The earlier alias has higher priority. ?
 * @param attrs - attrs
 * @param customAttrs - custom attrs object
 * @returns attrs
 */
function computeAttrs(
  node: Element,
  aliasList: AliasList,
  vnodeProps: Record<string, any>,
  attrs: Attributes,
  customAttrs: CustomAttrs
): CustomAttrsObjectResult {
  const result: CustomAttrsObjectResult = {
    ...attrs,
  }
  for (let i = aliasList.length - 1; i >= 0; i--) {
    const name = aliasList[i]

    if (name in customAttrs) {
      const customAttr = customAttrs[name]
      return {
        ...result,
        ...(typeof customAttr === 'function'
          ? customAttr(node, { ...attrs, ...vnodeProps })
          : customAttr),
      }
    }
  }
  return result
}
