<template>
  <div class="drag-bg" v-show="dragBgShow" ref="dragBgRef">
    <div v-for="(item, index) in list" :key="index">
      <slot name="custom-item" :field="item"> {{ item.title }}</slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import type { ListItem } from '../types/index';
defineProps<{
  list: Required<ListItem>[];
}>();

const dragBgShow = defineModel({
  type: Boolean,
  default: false
});

const dragBgRef = ref<HTMLElement>();
const animationFrameId = ref<number>(0);
const cancelAFrame = () => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value);
    animationFrameId.value = 0;
  }
};
const updatePosition = (event: MouseEvent) => {
  const clientX = event.clientX;
  const clientY = event.clientY;
  console.log(clientX, clientY);
  cancelAFrame();
  animationFrameId.value = requestAnimationFrame(() => {
    if (!dragBgRef.value) return;
    if (clientX !== 0 && clientY !== 0) {
      dragBgRef.value.style.left = `${clientX - 10}px`;
      dragBgRef.value.style.top = `${clientY - 10}px`;
    }
  });
  //   setTimeout(() => {
  //     if (!dragBgRef.value) return;
  //     if (clientX !== 0 && clientY !== 0) {
  //       dragBgRef.value.style.left = `${clientX - 10}px`;
  //       dragBgRef.value.style.top = `${clientY - 10}px`;
  //     }
  //   }, 16);
};

defineExpose({
  updatePosition,
  cancelAFrame
});
</script>
<style lang="scss" scoped>
.drag-bg {
  position: fixed;
  z-index: 9999;
  transform: translate(0, 0);
  pointer-events: none; // 不影响点击
  opacity: 0.8;
  user-select: none;
  div {
    padding: 8px 12px;
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
    margin: 2px;
    font-size: 12px;
    color: #155724;
  }
}
</style>
