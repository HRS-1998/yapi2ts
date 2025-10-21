// selection 相关逻辑可提取为独立 hook
import { type Ref, ref } from 'vue';
import { type ListItem } from '../types/index';

type FieldType = Required<ListItem>;
export function useFieldSelection(filteredList: Ref<FieldType[]>) {
  const lastSelectedField = ref<string | number | null>(null);
  const currentSelectedList = ref<FieldType[]>([]);

  // 获取已选中的字段
  const getSelectedFields = () => {
    return filteredList.value.filter((item) => item.selected);
  };

  // 清除所有字段选中状态
  const clearSelectedFields = () => {
    filteredList.value.forEach((field) => {
      field.selected = false;
    });
  };

  // 获取字段索引
  const getFieldIndex = (fieldId: string | number) => {
    return filteredList.value.findIndex((item) => item.id === fieldId);
  };

  // 判断字段是否被选中
  const isFieldSelected = (fieldId: string | number): boolean => {
    const fieldIndex = getFieldIndex(fieldId);
    return fieldIndex !== -1 && filteredList.value[fieldIndex].selected;
  };

  // 更新最后选中字段
  const updateLastSelectedField = (fieldId: string | number) => {
    lastSelectedField.value = isFieldSelected(fieldId) ? fieldId : null;
  };

  return {
    lastSelectedField,
    currentSelectedList,
    getSelectedFields,
    clearSelectedFields,
    getFieldIndex,
    isFieldSelected,
    updateLastSelectedField
  };
}
