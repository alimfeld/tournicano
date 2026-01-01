import m from "mithril";
import "./App.css";
import "./views/PlayersPage.ts";
import { SettingsPage } from "./views/SettingsPage.ts";
import { PlayersPage } from "./views/PlayersPage.ts";
import { RoundPage } from "./views/RoundPage.ts";
import { StandingsPage } from "./views/StandingsPage.ts";
import { Tournament, TournamentListener, PlayerFilter } from "./model/tournament/Tournament.ts";
import { Settings, SettingsListener, Theme } from "./model/settings/Settings.ts";
import { tournamentFactory } from "./model/tournament/Tournament.impl.ts";
import { settingsFactory } from "./model/settings/Settings.impl.ts";
import { HomePage } from "./views/HomePage.ts";
import { ToastCard } from "./views/ToastCard.ts";
import { debounce } from "./model/core/Util.ts";
import { registerSW } from "virtual:pwa-register";

const PAGE_KEY = "page";
const SETTINGS_KEY = "settings";
const ROUND_KEY = "round";
const TOURNAMENT_KEY = "tournament";

export enum Page {
  HOME,
  SETTINGS,
  PLAYERS,
  ROUNDS,
  STANDINGS,
}

export interface StandingsFilters {
  groups: number[]; // empty array means all groups
}

interface ToastState {
  message: string | null;
  type: "success" | "error" | "info";
  timeout: number | null;
}

interface PWAState {
  checkingForUpdates: boolean;
  serviceWorkerRegistered: boolean;
}

interface State {
  // === Core State (persisted to localStorage) ===
  readonly tournament: Tournament;
  readonly settings: Settings;
  page: Page;
  roundIndex: number;

  // === Session Filters (in-memory, resets on app restart) ===
  filters: {
    standings: StandingsFilters;
    players: PlayerFilter;
  };

  // === UI State (ephemeral) ===
  toast: ToastState;

  // === PWA State (runtime flags) ===
  pwa: PWAState;
}

const syncTheme = (theme: Theme) => {
  let themeToApply = theme;
  if (theme === "auto") {
    themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  document.documentElement.setAttribute("data-theme", themeToApply);
  const rootStyles = getComputedStyle(document.documentElement);
  const primaryBgColor = rootStyles.getPropertyValue('--pico-background-color').trim();
  let metaThemeColor: HTMLMetaElement | null = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.name = "theme-color";
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', primaryBgColor);
};

const createState: () => State = () => {
  const state = {
    tournament: tournamentFactory.create(
      localStorage.getItem(TOURNAMENT_KEY) || undefined,
    ),
    settings: settingsFactory.create(
      localStorage.getItem(SETTINGS_KEY) || undefined,
    ),
    page: parseInt(localStorage.getItem(PAGE_KEY) || `${Page.HOME}`),
    roundIndex: parseInt(localStorage.getItem(ROUND_KEY) || "-1"),
    filters: {
      standings: { groups: [] },
      players: {}
    },
    toast: {
      message: null,
      type: "info" as "success" | "error" | "info",
      timeout: null
    },
    pwa: {
      checkingForUpdates: false,
      serviceWorkerRegistered: false
    }
  };
  // theme state is synced to DOM
  syncTheme(state.settings.theme);
  return state;
};

const debouncedSettingsSave = debounce((settings: Settings) => {
  localStorage.setItem(SETTINGS_KEY, settings.serialize());
  syncTheme(settings.theme);
}, 500);

const settingsListener: SettingsListener = {
  onchange: debouncedSettingsSave,
};

const debouncedTournamentSave = debounce((tournament: Tournament) => {
  localStorage.setItem(TOURNAMENT_KEY, tournament.serialize());
}, 500);

const tournamentListener: TournamentListener = {
  onchange: debouncedTournamentSave,
};

export const App = () => {
  const state = createState();
  state.settings.addListener(settingsListener);
  state.tournament.addListener(tournamentListener);

  // Toast management
  const showToast = (message: string, type: "success" | "error" | "info" = "info", duration: number = 3000) => {
    // Clear any existing timeout
    if (state.toast.timeout !== null) {
      clearTimeout(state.toast.timeout);
    }

    state.toast.message = message;
    state.toast.type = type;

    // Auto-hide after duration
    state.toast.timeout = window.setTimeout(() => {
      state.toast.message = null;
      state.toast.timeout = null;
      m.redraw();
    }, duration);

    m.redraw();
  };

  const dismissToast = () => {
    if (state.toast.timeout !== null) {
      clearTimeout(state.toast.timeout);
      state.toast.timeout = null;
    }
    state.toast.message = null;
    m.redraw();
  };

  // PWA update handling
  let needRefresh = false;
  let isUpdating = false;

  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      m.redraw();
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
    onRegistered(registration) {
      console.log('SW Registered:', registration);
      state.pwa.serviceWorkerRegistered = true;
      m.redraw();
    },
    onRegisterError(error) {
      console.log('SW registration error:', error);
    },
  });

  const dismissUpdate = () => {
    needRefresh = false;
    m.redraw();
  };

  const applyUpdate = async () => {
    isUpdating = true;
    m.redraw();
    await updateServiceWorker();
    // The updateServiceWorker will trigger a page reload after the new SW is activated
  };

  const checkForUpdates = async () => {
    if (state.pwa.checkingForUpdates) return;

    state.pwa.checkingForUpdates = true;
    m.redraw();

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        // Should never happen since button only shows when registered
        state.pwa.checkingForUpdates = false;
        m.redraw();
        return;
      }

      // Check if there's already a waiting service worker
      if (registration.waiting) {
        needRefresh = true;
        state.pwa.checkingForUpdates = false;
        m.redraw();
        return;
      }

      await registration.update();

      // Wait a bit to see if an update was found
      setTimeout(() => {
        state.pwa.checkingForUpdates = false;
        if (!needRefresh) {
          showToast("You're already running the latest version", "success");
        }
        m.redraw();
      }, 1000);
    } catch (error) {
      console.error("Error checking for updates:", error);
      state.pwa.checkingForUpdates = false;
      showToast("Error checking for updates", "error");
      m.redraw();
    }
  };

  const nav = (page: Page) => {
    state.page = page;
    localStorage.setItem(PAGE_KEY, `${page}`);
    window.scrollTo(0, 0);
  };
  const changeRound = (index: number) => {
    state.roundIndex = index;
    localStorage.setItem(ROUND_KEY, `${index}`);
    window.scrollTo(0, 0);
  };
  const changeStandingsFilters = (filters: StandingsFilters) => {
    state.filters.standings = filters;
  };
  const changePlayerFilters = (filters: PlayerFilter) => {
    state.filters.players = filters;
  };

  return {
    view: () => {
      let pageContent;
      switch (state.page) {
        case Page.HOME: {
          pageContent = m(HomePage, {
            nav,
            currentPage: state.page,
          });
          break;
        }
        case Page.SETTINGS: {
          pageContent = m(SettingsPage, {
            settings: state.settings,
            tournament: state.tournament,
            showToast,
            checkForUpdates: state.pwa.serviceWorkerRegistered ? checkForUpdates : undefined,
            checkingForUpdates: state.pwa.checkingForUpdates,
            nav,
            currentPage: state.page,
            changeRound,
          });
          break;
        }
        case Page.PLAYERS: {
          pageContent = m(PlayersPage, {
            tournament: state.tournament,
            showToast,
            playerFilters: state.filters.players,
            changePlayerFilters,
            nav,
            currentPage: state.page,
          });
          break;
        }
        case Page.ROUNDS: {
          pageContent = m(RoundPage, {
            settings: state.settings,
            tournament: state.tournament,
            roundIndex: state.roundIndex,
            changeRound,
            showToast,
            nav,
            currentPage: state.page,
          });
          break;
        }
        case Page.STANDINGS: {
          pageContent = m(StandingsPage, {
            tournament: state.tournament,
            roundIndex: state.roundIndex,
            standingsFilters: state.filters.standings,
            changeRound,
            changeStandingsFilters,
            showToast,
            nav,
            currentPage: state.page,
          });
          break;
        }
      }

      return [
        // PWA update dialog
        needRefresh ? m("dialog[open]", [
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
                disabled: isUpdating
              }, "Later"),
              m("button", {
                onclick: applyUpdate,
                disabled: isUpdating,
                "aria-busy": isUpdating ? "true" : "false",
              }, isUpdating ? "Updating..." : "Update Now")
            ])
          ])
        ]) : null,
        pageContent,
        m(ToastCard, { message: state.toast.message, type: state.toast.type, onDismiss: dismissToast }),
      ];
    },
  };
};
