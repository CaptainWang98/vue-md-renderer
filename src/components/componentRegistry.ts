import type { VNode } from 'vue'

export type ComponentRenderer = (props: Record<string, unknown>) => VNode | VNode[]

export type ComponentRecord = { [key: string]: ComponentRenderer }

export class ComponentRegistry {
  private _components: { [key: string]: ComponentRenderer }

  constructor() {
    this._components = {}
  }

  public regist(c: ComponentRecord) {
    // Defensive: test null or empty object
    if (!c || Object.keys(c).length === 0) {
      console.warn('[ComponentRegistry] Attempted to register an empty component.')
      return false
    }

    // Append to the registry
    this._components = { ...this._components, ...c }

    return true
  }

  public has(name: string) {
    return name in this._components
  }

  public get(name: string): ComponentRenderer | undefined {
    return this._components[name]
  }

  public remove(name: string) {
    if (this.has(name)) {
      delete this._components[name]
      return true
    }
    return false
  }
}
