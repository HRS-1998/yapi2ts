// 拖拽预览背景  --用于遮盖默认拖拽背景

import { ref, render, h } from 'vue';
import DragBg from '../components/dragbg.vue';
export const useDragPreview = () => {
  const dragPreview = ref<HTMLElement | null>(null);
  let container: HTMLElement | null = null;
  const containerStyle = {
    backgroundColor: '#409eff',
    padding: '6px 10px',
    borderRadius: '4px',
    color: '#fff'
  };
  // 创建拖拽预览
  const createDragPreview = (list: any[], customItemSlot: (props: { item: any }) => any) => {
    // 先清理之前的预览
    removeDragPreview();

    // 创建主容器
    dragPreview.value = document.createElement('div');
    Object.assign(dragPreview.value.style, {
      position: 'absolute',
      top: '-1000px',
      zIndex: '9999',
      pointerEvents: 'none',
      //   background: 'transparent',
      maxWidth: '150px' // 限制最大宽度
    });

    // 创建用于渲染 Vue 组件的容器
    container = document.createElement('div');
    dragPreview.value.appendChild(container);

    // if (list.length === 1) {
    // 创建 DragBg 组件的 VNode，包含自定义 slot
    const vnode = h(
      DragBg,
      { list: list },
      {
        'custom-item': customItemSlot
      }
    );
    // 渲染 VNode 到容器中
    render(vnode, container);
    console.log('list', list);
    // } else {
    //   Object.assign(container.style, containerStyle);
    //   container.textContent = `已选择${list.length}项`;
    // }

    document.body.appendChild(dragPreview.value);
  };

  // 图片预览时，保证图片加载完成再展示预览
  const waitForImagesAndReturnPreview = (): Promise<HTMLElement | null> => {
    return new Promise((resolve) => {
      if (!dragPreview.value) {
        resolve(null);
        return;
      }

      const images = dragPreview.value.querySelectorAll('img');
      if (images.length === 0) {
        // 没有图片，直接返回
        resolve(dragPreview.value);
        return;
      }

      let loadedCount = 0;
      const totalImages = images.length;

      const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount >= totalImages) {
          resolve(dragPreview.value);
        }
      };

      // 为每个图片添加加载事件监听
      images.forEach((img) => {
        if (img.complete) {
          // 图片已经加载完成
          checkAllLoaded();
        } else {
          // 监听图片加载完成事件
          img.addEventListener('load', checkAllLoaded);
          img.addEventListener('error', checkAllLoaded); // 即使加载失败也继续
        }
      });

      // 设置超时，避免无限等待
      setTimeout(() => {
        resolve(dragPreview.value);
      }, 1000);
    });
  };

  // 移除拖拽预览
  const removeDragPreview = () => {
    if (container) {
      render(null, container); // 清空
      container = null;
    }
    if (dragPreview.value) {
      if (dragPreview.value.parentNode) {
        dragPreview.value.parentNode.removeChild(dragPreview.value);
      }
      dragPreview.value = null;
    }
  };

  return {
    dragPreview,
    createDragPreview,
    removeDragPreview,
    waitForImagesAndReturnPreview
  };
};
