import m from "mithril";
import "./HomePage.css";
import { Header } from "./Header.ts";

export const HomePage: m.Component = {
  view: () => {
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
          "Organize doubles tournaments with automatic player pairing and fair rotation in minutes. Perfect for padel, pickleball, tennis, or any doubles sport. Supports Americano, Mexicano, and other formats."
        ),
        m("h2", "Quick Start"),
        m(
          "ol.quick-start",
          m("li", "⚙️ Configure courts and format"),
          m("li", "🤖 Add players"),
          m("li", "🚀 Generate rounds → play → enter scores"),
          m("li", "🏆 View live standings"),
        ),
        m("h2", "Key Features"),
        m(
          "dl.key-features",
          m("dt", "Flexible formats"),
          m("dd", "Choose from predefined formats like Americano and Mexicano, or create custom matching strategies based on variety, performance, or group constraints."),
          m("dt", "Quick player management"),
          m("dd", "Add or remove players anytime, even mid-tournament, and organize them into groups for mixed doubles, group battles, or multi-division tournaments."),
          m("dt", "Smart round scheduling"),
          m("dd", "Create rounds with players paired based on your chosen format, prioritizing variety, performance, or group constraints while ensuring fair court time for all."),
          m("dt", "Score tracking"),
          m("dd", "Enter and modify scores anytime, and the standings update instantly."),
          m("dt", "Player toggling"),
          m("dd", "Pause and resume players per round as they want to take a break or rejoin."),
          m("dt", "Live standings"),
          m("dd", "View rankings by win percentage with point differential as tiebreaker."),
          m("dt", "Offline support"),
          m("dd", "Install as a web app for offline use — no account needed, data stays on your device, and updates happen automatically when online."),
        ),
      ),
    ];
  },
};
