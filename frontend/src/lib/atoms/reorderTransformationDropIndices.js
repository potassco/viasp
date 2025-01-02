import { atom, selector } from "recoil";  
import { proxyTransformationStateFamily } from "./transformationsState";

const defaultReorderTransformationDropIndices = null;


export const draggableListSelectedItem = atom({
    key: 'draggableListSelectedItem',
    default: null,
});

export const reorderTransformationDropIndicesState = selector({
    key: 'reorderTransformationDropIndices',
    get: ({ get }) => {
        const selectedItem = get(draggableListSelectedItem);
        if (!selectedItem) {
            return defaultReorderTransformationDropIndices;
        }
        const transformation = get(proxyTransformationStateFamily(selectedItem));
        return transformation.adjacent_sort_indices;
    },
}); 