import m from "mithril";
import { Layout } from "./Layout.ts";
import { HomePage } from "./views/HomePage.ts";
import { SettingsPage } from "./views/SettingsPage.ts";
import { PlayersPage } from "./views/PlayersPage.ts";
import { RoundPage } from "./views/RoundPage.ts";
import { StandingsPage } from "./views/StandingsPage.ts";

const LAST_ROUTE_KEY = "lastRoute";

// Helper to create route resolvers that save route to localStorage
const createRoute = (component: m.Component) => ({
  onmatch: (_args: unknown, requestedPath: string) => {
    if (requestedPath === "/") {
      // Clear saved route when navigating to home
      localStorage.removeItem(LAST_ROUTE_KEY);
    } else {
      // Save non-root routes for PWA restart recovery
      localStorage.setItem(LAST_ROUTE_KEY, requestedPath);
    }
    return component;
  },
  render: (vnode: m.Vnode) => m(Layout, vnode),
});

const mountNode = document.querySelector("#app");
if (mountNode) {
  // Use last saved route as default, falling back to home
  const defaultRoute = localStorage.getItem(LAST_ROUTE_KEY) || "/";
  
  m.route(mountNode, defaultRoute, {
    "/": createRoute(HomePage),
    "/settings": createRoute(SettingsPage),
    "/players": createRoute(PlayersPage),
    "/rounds": createRoute(RoundPage),
    "/standings": createRoute(StandingsPage),
  });
}

