// deep合并传递的参数,对未传递参数使用默认值

import { computed } from 'vue';
import { merge } from 'lodash-es';
import type { PanelConfig } from '../types/index';
export const useMergeConfig = (
  propsConfig: PanelConfig | undefined,
  defaultConfig: PanelConfig
) => {
  if (!propsConfig) propsConfig = {};
  const mergedConfig = computed(() => {
    return merge({}, defaultConfig, propsConfig || {});
  });

  return {
    mergedConfig
  };
};
