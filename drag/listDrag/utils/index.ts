import { cloneDeep } from 'lodash-es';
import { isReactive, toRaw } from 'vue';
export const bigObjDeepClone = (data: any) => {
  if (!data) return data;
  if (!structuredClone) {
    return cloneDeep(data);
  }
  try {
    const rawData = isReactive(data) ? toRaw(data) : data;
    return structuredClone(rawData);
  } catch (error) {
    return cloneDeep(data);
  }
};

export const isCtrlPressed = (event: MouseEvent | KeyboardEvent) => {
  return event.ctrlKey || event.metaKey;
};

export const isShiftPressed = (event: MouseEvent | KeyboardEvent) => {
  return event.shiftKey;
};
