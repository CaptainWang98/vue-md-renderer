import { time } from "console";
import { defineComponent, h, PropType } from "vue";

export default defineComponent({
  name: 'MyComp',
  props: {
    dava: {
      type: Number,
      required: true
    },
    timeout: {
      type: Number,
      required: false,
      default: 1000
    },
  },
  setup(props) {
    return () => h('div', props.dava);
  }
});
// Use factory function to create component
// const JsonSuspenseWrapper = createJsonSuspenseWrapper(
//   {
//     content: '{"name": "test", "age": 25}',
//     otherProp: 'some value'
//   },
//   TestComponent,
//   h('div', { style: 'color: orange;' }, 'JSON parsing failed, display fallback content')
// );