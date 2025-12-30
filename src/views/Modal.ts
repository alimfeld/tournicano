import m from "mithril";
import "./Modal.css";

export interface ModalAttrs {
  onClose: () => void;
  className?: string;
}

export const Modal: m.Component<ModalAttrs> = {
  view: ({ attrs: { onClose, className }, children }) => {
    return m(`dialog.modal${className ? '.' + className : ''}`, {
      oncreate: (vnode) => {
        (vnode.dom as HTMLDialogElement).showModal();
        document.documentElement.classList.add('modal-is-open');
      },
      onremove: () => {
        document.documentElement.classList.remove('modal-is-open');
      },
      onclick: (e: MouseEvent) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }
    }, children);
  }
};
