import { atom } from "recoil";

const defaultZoomButtonPressedState = false;
const defaultZoomState = 1;

export const zoomButtonPressedState = atom({
    key: "zoomButtonPressedState",
    default: defaultZoomButtonPressedState
});

export const searchIsFocusedState = atom({
    key: "searchIsFocusedState",
    default: false,
});

