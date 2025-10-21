// 拖拽预览背景  --用于遮盖默认拖拽背景

import { ref } from 'vue';
export const useDragPreview = () => {
  const dragPreview = ref<HTMLElement | null>(null);

  // 创建拖拽预览
  const createDragPreview = () => {
    dragPreview.value = document.createElement('div');
    const style = {
      width: '1px',
      height: '1px',
      opacity: '0',
      position: 'absolute',
      top: '-1000px'
    };
    Object.assign(dragPreview.value.style, style);
    document.body.appendChild(dragPreview.value);
  };

  // 移除拖拽预览
  const removeDragPreview = () => {
    if (dragPreview.value) {
      document.body.removeChild(dragPreview.value);
      dragPreview.value = null;
    }
  };

  return {
    dragPreview,
    createDragPreview,
    removeDragPreview
  };
};
