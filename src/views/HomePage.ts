import m from "mithril";
import "./HomePage.css";
import { BUILD_VERSION } from "../version.ts";

export interface HomeAttrs {}

export const HomePage: m.Component<HomeAttrs> = {
  view: () => {
    return [
      m("header.home.container-fluid", m("h1", "Tournicano")),
      m(
        "main.home.container-fluid",
        m("div.version", m("span", `v${BUILD_VERSION}`)),
        m("h2", "👉 What is it?"),
        m(
          "p",
          m("a", { href: "https://github.com/alimfeld/tournicano" }, "Tournicano"),
          " is a (web) app for running ad-hoc ",
          m("i", "-icano"),
          " (e.g., Americano, Mexicano, or similar) doubles tournaments.",
        ),
        m("h2", "✨ Features"),
        m(
          "ul",
          m("li", "🤖 Simple player management"),
          m("li", "🚀 Easy round management"),
          m("li", "🏆 Live standings"),
          m("li", "🤝 Smart player matching"),
          m("li", "⚖️ Fair distribution of court time"),
          m("li", "👤 Player avatar display"),
          m("li", "📲 Installable (add to home screen)"),
          m("li", "🔄 Automatic updates"),
        ),
        m("h2", "🤖 Player Management"),
        m(
          "p",
          "Players are added by typing or pasting their names into a text field. Separate player names with commas or periods. Each name automatically gets a unique 👤 avatar image.",
        ),
        m(
          "p",
          m("b", "Tip"),
          ": On many devices, double-tap the space bar to insert a period.",
        ),
        m(
          "p",
          m("b", "Tip"),
          ": To manage multiple rosters of players (e.g., different leagues, events, or club members), export the current player list using ⿻ Share/export (via the ⋮ button) and save it to a file. To load a roster later, first delete all currently registered players, then copy the saved file content and paste it into the registration text field.",
        ),
        m(
          "p",
          "Players can be assigned to groups. Separate groups of players with a newline when entering their names. A maximum of 4 groups is supported.",
        ),
        m(
          "p",
          "Players can be added at any time during the tournament. As soon as they are added, they become available for any newly created round.",
        ),
        m(
          "p",
          "Players can be activated or deactivated using a switch. While deactivated, a player will not be considered for participation in any newly created round.",
        ),
        m(
          "p",
          "A filter allows displaying all, only active, or only inactive players. The filter is only shown when at least one player is registered.",
        ),
        m(
          "p",
          "Individual player actions are available via the ☰ menu next to each player (visible when registration is open):",
        ),
        m(
          "ul",
          m("li", "Delete players who haven't yet participated"),
          m("li", "Reassign players to adjacent groups using ↑ and ↓"),
        ),
        m(
          "p",
          "Global player actions are available via the ⋮ button:",
        ),
        m(
          "ul",
          m("li", "Open/close registration to reduce UI clutter"),
          m("li", "Activate/deactivate all players"),
          m("li", "Delete all players (resets the tournament)"),
          m("li", "⿻ Share/export player names for later import"),
        ),
        m(
          "p",
          m("b", "Note"),
          ": Player names must be unique. Any non-unique names are ignored when adding players.",
        ),
        m("h2", "🚀 Round Management"),
        m(
          "p",
          "At any time, a new round can be created by pressing the respective button. The button changes color to green when all matches have scores submitted, indicating it's a good time to create the next round.",
        ),
        m(
          "p",
          "The number of matches created for the new round depends on the number of available courts (configured in ⚙️ Settings) and the number of active players at that point in time.",
        ),
        m(
          "p",
          "When there are more players than available courts, excess players are 💤 paused for the round. An algorithm ensures ⚖️ fair rotation by giving priority to players who have played fewer matches.",
        ),
        m(
          "p",
          "For each match, there is a button to enter the score. Enter scores with up to two digits per team, separated by a colon (e.g., 21:15). Scores can also be cleared.",
        ),
        m(
          "p",
          "Players who are performing exceptionally well (win ratio above 75%) are marked with a 🔥 fire badge to highlight their hot streak.",
        ),
        m(
          "p",
          "You can change scores of previously completed rounds by using the navigation arrows in the header or by swiping left/right on touch devices.",
        ),
        m(
          "p",
          "Quick actions are available via the ⋮ button:",
        ),
        m(
          "ul",
          m("li", "Delete the most recent round"),
          m("li", "Restart the tournament (deletes all rounds)"),
          m("li", "Toggle full screen mode"),
          m("li", "Display debug information"),
          m("li", "⏿ Prevent screen from turning off"),
        ),
        m("h2", "🏆 Standings"),
        m(
          "p",
          "Live standings show the players ranked by win percentage, with plus/minus as a tiebreaker.",
        ),
        m(
          "p",
          "A reliability pie chart indicator shows data quality based on player participation. The green portion of the pie represents the ratio of rounds played or paused versus total rounds.",
        ),
        m(
          "p",
          "View standings for any round by using the navigation arrows in the header or by swiping left/right on touch devices.",
        ),
        m(
          "p",
          "When players are assigned to different groups, you can show standings overall and per group.",
        ),
        m("h2", "🤝 Matching"),
        m(
          "p",
          "In each round, players form teams and teams are paired into matches using a smart algorithm that optimizes player combinations.",
        ),
        m("p", "The algorithm considers the following factors:"),
        m(
          "ul",
          m("li", m("b", "Variety"), " – rotating partners and opponents"),
          m("li", m("b", "Performance"), " – creating balanced matches"),
          m(
            "li",
            m("b", "Groups"),
            " – accommodating formats like mixed doubles",
          ),
        ),
        m(
          "p",
          "Use a predefined matching (such as Americano or Mexicano) or customize it under ⚙️ Settings.",
        ),
        m(
          "p",
          m("b", "Note"),
          ": For performance-based matching to be effective, scores must be entered. For group-based matching to be effective, multiple player groups must be created.",
        ),
        m("h2", "📲 Installation"),
        m(
          "p",
          "Tournicano can be installed on your device to work like a native app. Once installed, it will be available from your home screen and can work offline.",
        ),
        m(
          "p",
          m("b", "iOS (iPhone/iPad)"),
          ": Open Tournicano in Safari, tap the Share button, then select 'Add to Home Screen'.",
        ),
        m(
          "p",
          m("b", "Android"),
          ": Open Tournicano in Chrome, tap the menu (⋮), then select 'Add to Home screen' or 'Install app'.",
        ),
        m(
          "p",
          m("b", "Desktop (Chrome/Edge)"),
          ": Look for an install icon in the address bar, or open the browser menu and select 'Install Tournicano'.",
        ),
        m(
          "p",
          m("b", "Note"),
          ": Installation is optional. Tournicano works perfectly fine in your browser without installation.",
        ),
        m("h2", "🔄 Updates"),
        m(
          "p",
          "When a new version of Tournicano is available, a pop-up will appear giving you the option to update now or later.",
        ),
        m(
          "p",
          "The update pop-up includes a link to see what's new in the latest version. When you choose to update, the app will reload with the improvements.",
        ),
        m(
          "p",
          m("b", "Note"),
          ": Updates are detected automatically when you're online. You don't need to check for updates manually.",
        ),
        m("h2", "🚫 Out of scope"),
        m(
          "ul",
          m("li", "Player/tournament database"),
          m("li", "Integration with third-party services (e.g., for player ratings)"),
          m(
            "li",
            "Data import/export (beyond clipboard and the system's ⿻ sharing capabilities)",
          ),
          m("li", "Features likely covered by your existing system"),
        ),
        m(
          "p",
          "To time rounds, use any timer, or end a round once the first match finishes.",
        ),
      ),
    ];
  },
};
