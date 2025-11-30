import { defineComponent, h } from 'vue'

export default defineComponent({
  name: 'MyComp',
  props: {
    dava: {
      type: Number,
      required: true,
    },
    timeout: {
      type: Number,
      required: false,
      default: 1000,
    },
  },
  setup(props) {
    return () => h('div', `我是自定义组件${props.dava}`)
  },
})
