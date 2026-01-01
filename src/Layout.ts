import m from "mithril";
import { App } from "./App.ts";
import { ToastCard } from "./views/ToastCard.ts";
import { Nav } from "./views/Nav.ts";

// Create the app context once
const appContext = App();

export interface LayoutAttrs {
  // Page component will be passed as children
}

export const Layout: m.Component<LayoutAttrs> = {
  view: ({ children }) => {
    const { 
      state, 
      dismissUpdate, 
      applyUpdate, 
      dismissToast 
    } = appContext;

    return [
      // PWA update dialog
      state.needRefresh ? m("dialog[open]", [
        m("article", [
          m("header",
            m("button[aria-label=Close][rel=prev]", {
              onclick: dismissUpdate,
            }),
            m("p", m("strong", "🔄 Update Available")),
          ),
          m("p", "A new version of Tournicano is ready. Update now to get the latest features and improvements."),
          m("p", m("a", {
            href: "https://github.com/alimfeld/tournicano/commits/main/",
            target: "_blank",
            rel: "noopener noreferrer"
          }, "View changes")),
          m("footer", [
            m("button.secondary", {
              onclick: dismissUpdate,
              disabled: state.isUpdating
            }, "Later"),
            m("button", {
              onclick: applyUpdate,
              disabled: state.isUpdating,
              "aria-busy": state.isUpdating ? "true" : "false",
            }, state.isUpdating ? "Updating..." : "Update Now")
          ])
        ])
      ]) : null,
      // Page content
      children,
      // Toast notifications
      m(ToastCard, { message: state.toast.message, type: state.toast.type, onDismiss: dismissToast }),
      // Navigation (hidden in fullscreen mode)
      !state.fullscreen ? m(Nav) : null,
    ];
  },
};

// Export the app context for pages to use
export { appContext };
