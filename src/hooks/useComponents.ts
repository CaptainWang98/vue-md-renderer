import { h } from 'vue'
import CodeComponent from '../components/Code'
import { ComponentRegistry } from '../components/componentRegistry'

export function useDefaultComponents() {
  const components = {
    code: (raw: any) => h(CodeComponent, { raw }),
  }
  return components
}

let componentRegistrySingleton: ComponentRegistry | null = null

export function useComponentRegistry() {
  if (!componentRegistrySingleton) componentRegistrySingleton = new ComponentRegistry()

  return componentRegistrySingleton
}
