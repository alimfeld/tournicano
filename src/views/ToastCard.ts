import m from "mithril";
import "./ToastCard.css";

export interface ToastCardAttrs {
  message: string | null;
  type?: "success" | "error" | "info";
  onDismiss?: () => void;
  fullscreen: boolean;
  position?: "top" | "middle" | "bottom";  // Default: "bottom"
}

export const ToastCard: m.Component<ToastCardAttrs> = {
  view: ({ attrs: { message, type = "info", onDismiss, fullscreen, position = "bottom" } }) => {
    if (!message) {
      return null;
    }

    // Unicode symbols for visual feedback
    const icon = type === "success" ? "✓ " : type === "error" ? "⚠ " : "ⓘ ";
    const classes = (type !== "info" ? `toast-card ${type}` : "toast-card") + (fullscreen
      ? " fullscreen"
      : "") + ` ${position}`;

    return m(`article.${classes}`, {
      onclick: onDismiss,
    }, icon + message);
  },
};
