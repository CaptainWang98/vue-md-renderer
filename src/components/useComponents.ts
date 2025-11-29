import { h, inject } from 'vue'
import CodeComponent from './Code'

export function useDefaultComponents() {
  const components = {
    code: (raw: any) => h(CodeComponent, { raw }),
  }
  return components
}

export const COMPONENT_REGISTRY_KEY = '_vmd_componentsRegistry'
export function useComponentRegistry() {
  const registry = inject<Record<string, (raw: any) => ReturnType<typeof h>>>(
    COMPONENT_REGISTRY_KEY,
    {}
  )
  return registry
}
