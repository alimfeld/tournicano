import m from "mithril";
import "./App.css";
import "./views/PlayersPage.ts";
import { SettingsPage } from "./views/SettingsPage.ts";
import { PlayersPage } from "./views/PlayersPage.ts";
import { RoundPage } from "./views/RoundPage.ts";
import { StandingsPage } from "./views/StandingsPage.ts";
import { Tournament, TournamentListener } from "./model/Tournament.ts";
import { Settings, SettingsListener, Theme } from "./model/Settings.ts";
import { tournamentFactory } from "./model/Tournament.impl.ts";
import { settingsFactory } from "./model/Settings.impl.ts";
import { HomePage } from "./views/HomePage.ts";
import { ScoreEntryPage } from "./views/ScoreEntryPage.ts";
import { Match } from "./model/Tournament.ts";
import { NavView } from "./views/NavView.ts";
import { debounce } from "./model/Util.ts";
import { registerSW } from "virtual:pwa-register";

const PAGE_KEY = "page";
const SETTINGS_KEY = "settings";
const ROUND_KEY = "round";
const GROUP_KEY = "group";
const PLAYER_FILTER_KEY = "playerFilter";
const TOURNAMENT_KEY = "tournament";

export enum Page {
  HOME,
  SETTINGS,
  PLAYERS,
  ROUNDS,
  STANDINGS,
  SCORE_ENTRY,
}

interface State {
  readonly tournament: Tournament;
  readonly settings: Settings;
  page: Page;
  roundIndex: number;
  group: number | undefined;
  playerFilter: string;
  fullscreen: boolean;
  scoreEntryMatch?: {
    roundIndex: number;
    matchIndex: number;
    match: Match;
    scrollPosition: number;
  };
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
  const storedGroup = localStorage.getItem(GROUP_KEY);
  const state = {
    tournament: tournamentFactory.create(
      localStorage.getItem(TOURNAMENT_KEY) || undefined,
    ),
    settings: settingsFactory.create(
      localStorage.getItem(SETTINGS_KEY) || undefined,
    ),
    page: parseInt(localStorage.getItem(PAGE_KEY) || `${Page.HOME}`),
    roundIndex: parseInt(localStorage.getItem(ROUND_KEY) || "-1"),
    group: storedGroup !== null ? parseInt(storedGroup) : undefined,
    playerFilter: localStorage.getItem(PLAYER_FILTER_KEY) || "all",
    fullscreen: false
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
  let wakeLock: WakeLockSentinel | null = null;

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
  };

  // Request or release wake lock based on settings and current page
  const updateWakeLock = async () => {
    if (state.settings.wakeLock && state.page === Page.ROUNDS) {
      if (wakeLock === null) {
        try {
          wakeLock = await navigator.wakeLock.request("screen");
        } catch (err) {
          console.log(err);
        }
      }
    } else {
      if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
      }
    }
    m.redraw();
  };

  // Listen to settings changes to update wake lock
  const wakeLockSettingsListener: SettingsListener = {
    onchange: async () => {
      await updateWakeLock();
    },
  };
  state.settings.addListener(wakeLockSettingsListener);

  // Request wake lock on init if settings indicate and we're on rounds page
  if (state.settings.wakeLock && state.page === Page.ROUNDS) {
    updateWakeLock();
  }

  const nav = (page: Page) => {
    state.page = page;
    localStorage.setItem(PAGE_KEY, `${page}`);
    updateWakeLock();
    window.scrollTo(0, 0);
  };
  const changeRound = (index: number) => {
    state.roundIndex = index;
    localStorage.setItem(ROUND_KEY, `${index}`);
    window.scrollTo(0, 0);
  };
  const changeGroup = (group: number | undefined) => {
    state.group = group;
    if (group === undefined) {
      localStorage.removeItem(GROUP_KEY);
    } else {
      localStorage.setItem(GROUP_KEY, `${group}`);
    }
    window.scrollTo(0, 0);
  };
  const changePlayerFilter = (playerFilter: string) => {
    state.playerFilter = playerFilter;
    localStorage.setItem(PLAYER_FILTER_KEY, playerFilter);
    window.scrollTo(0, 0);
  };
  const toggleFullscreen = () => {
    state.fullscreen = !state.fullscreen;
  }
  const openScoreEntry = (roundIndex: number, matchIndex: number, match: Match) => {
    state.scoreEntryMatch = {
      roundIndex,
      matchIndex,
      match,
      scrollPosition: window.scrollY
    };
    nav(Page.SCORE_ENTRY);
  }

  return {
    view: () => {
      const showNav = state.page !== Page.SCORE_ENTRY && !state.fullscreen;

      let pageContent;
      switch (state.page) {
        case Page.HOME: {
          pageContent = m(HomePage);
          break;
        }
        case Page.SETTINGS: {
          pageContent = m(SettingsPage, {
            settings: state.settings,
          });
          break;
        }
        case Page.PLAYERS: {
          pageContent = m(PlayersPage, {
            settings: state.settings,
            tournament: state.tournament,
            playerFilter: state.playerFilter,
            changePlayerFilter,
          });
          break;
        }
        case Page.ROUNDS: {
          pageContent = m(RoundPage, {
            settings: state.settings,
            tournament: state.tournament,
            roundIndex: state.roundIndex,
            changeRound,
            wakeLock: state.settings.wakeLock && "wakeLock" in navigator,
            fullscreen: state.fullscreen,
            toggleFullscreen,
            openScoreEntry,
          });
          break;
        }
        case Page.STANDINGS: {
          pageContent = m(StandingsPage, {
            tournament: state.tournament,
            roundIndex: state.roundIndex,
            group: state.group,
            changeRound,
            changeGroup,
          });
          break;
        }
        case Page.SCORE_ENTRY: {
          if (!state.scoreEntryMatch) {
            // Fallback if scoreEntryMatch is not set
            nav(Page.ROUNDS);
            pageContent = null;
          } else {
            pageContent = m(ScoreEntryPage, {
              matchIndex: state.scoreEntryMatch.matchIndex,
              match: state.scoreEntryMatch.match,
              onClose: () => {
                const savedScroll = state.scoreEntryMatch?.scrollPosition;
                nav(Page.ROUNDS);
                // Restore scroll position after navigation completes
                if (savedScroll !== undefined) {
                  requestAnimationFrame(() => {
                    window.scrollTo(0, savedScroll);
                  });
                }
              },
            });
          }
          break;
        }
      }

      return [
        // PWA update dialog
        needRefresh ? m("dialog[open]", [
          m("article", [
            m("h3", "🔄 Update Available"),
            m("p", [
              "A new version of Tournicano is ready. Update now to get the latest features and improvements. ",
              m("a", {
                href: "https://github.com/alimfeld/tournicano/commits/main/",
                target: "_blank",
                rel: "noopener noreferrer"
              }, "View changes")
            ]),
            m("footer", [
              m("button.secondary", {
                onclick: dismissUpdate,
                disabled: isUpdating
              }, "Later"),
              m("button", {
                onclick: applyUpdate,
                disabled: isUpdating,
                "aria-busy": isUpdating
              }, isUpdating ? "Updating..." : "Update Now")
            ])
          ])
        ]) : null,
        pageContent,
        showNav ? m(NavView, { nav, currentPage: state.page }) : null,
      ];
    },
  };
};
