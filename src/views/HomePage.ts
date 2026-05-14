import m from "mithril";
import { Header } from "./Header.ts";
import { HelpCard } from "./HelpCard.ts";

/** Detects iOS or Android for platform-specific install guidance */
function getMobilePlatform(): "ios" | "android" | "unknown" {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "unknown";
}

/** Returns platform-specific install guidance */
function getInstallGuidance(platform: "ios" | "android" | "unknown"): m.Children {
  if (platform === "ios") {
    return [
      "Tap the ",
      m("strong", "Share button"),
      " in Safari, then tap ",
      m("strong", "Add to Home Screen"),
    ];
  }
  if (platform === "android") {
    return [
      "Tap the ",
      m("strong", "menu"),
      " (three dots), then tap ",
      m("strong", "Add to Home Screen"),
      " or ",
      m("strong", "Install App"),
    ];
  }
  return "Look for \"Add to Home Screen\" in your browser menu";
}

export const HomePage: m.Component = {
  view() {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const mobilePlatform = getMobilePlatform();

    return [
      m(Header, {
        title: "Tournicano",
        actions: [
          {
            icon: "↗",
            label: "View on GitHub",
            onclick: () => {
              window.open("https://github.com/alimfeld/tournicano", "_blank", "noopener,noreferrer");
            }
          }
        ]
      }),
      m(
        "main.home.container",
        m(
          "p",
          "Quickly set up and run doubles tournaments with flexible formats and automatic pairings."
        ),
        !isStandalone && mobilePlatform !== "unknown"
          ? m(HelpCard, {
            title: "📱 Add to Home Screen",
            message: [
              "For the best experience, add Tournicano to your home screen: ",
              getInstallGuidance(mobilePlatform),
            ],
          })
          : null,
        m("h2", "Quick Start"),
        m(
          "p",
          "Setup ⚙️ → Add 🤖 → Play 🚀 → View 🏆"
        ),
        m("h2", "Key Features"),
        m(
          "ul",
          m("li", [m("strong", "Flexible formats"), " — Various formats with matching based on variety, performance, and group constraints"]),
          m("li", [m("strong", "Player management"), " — Add players in bulk, organize them into groups, and toggle participation anytime"]),
          m("li", [m("strong", "Smart scheduling"), " — Fair round scheduling based on available courts, active players and the chosen format"]),
          m("li", [m("strong", "Score tracking"), " — Quick score entry and instant update of standings"]),
          m("li", [m("strong", "Offline ready"), " — Works without internet"]),
        ),
      ),
    ];
  },
};
