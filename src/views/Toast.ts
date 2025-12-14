import m from "mithril";
import "./Toast.css";

export interface ToastAttrs {
  message: string | null;
  onDismiss?: () => void;
}

export const Toast: m.Component<ToastAttrs> = {
  view: ({ attrs: { message, onDismiss } }) => {
    if (!message) {
      return null;
    }

    return m("div.toast", {
      onclick: onDismiss,
    }, message);
  },
};
