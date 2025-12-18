import m from "mithril";
import "./HomePage.css";

export interface HomeAttrs { }

export const HomePage: m.Component<HomeAttrs> = {
  view: () => {
    return [
      m("header.home.container-fluid", m("h1", "Tournicano")),
      m(
        "main.home.container-fluid",
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
        m("h2", "⚡ Quick Start"),
        m(
          "p",
          "Follow these steps to set up and run your first tournament:",
        ),
        m(
          "ol",
          m(
            "li",
            m("b", "Configure Settings"),
            " – Go to ⚙️ Settings and set the number of courts and choose your tournament mode (e.g., Americano).",
          ),
          m(
            "li",
            m("b", "Add Players"),
            " – Go to 🤖 Players, press the ➕ button, and add player names.",
          ),
          m(
            "li",
            m("b", "Start First Round"),
            " – Go to 🚀 Rounds and press the ➕ button to create the first round.",
          ),
          m(
            "li",
            m("b", "Submit Results"),
            " – After games are played, enter the scores for each match and press ➕ to continue to the next round.",
          ),
          m(
            "li",
            m("b", "View Standings"),
            " – At any time, check the 🏆 Standings page to see player rankings.",
          ),
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": For mixed doubles, select Americano Mixed mode in ⚙️ Settings and separate players into two groups with a newline when adding them.",
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": At any time during the tournament you can manage player participation on the 🤖 Players page. Register players who join late. Deactivate players taking a break or leaving early, and reactivate them when they return. Changes will be considered for any newly created round.",
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": If you're using a shared device (e.g., iPad) for everyone to view matches and submit results, use the ⏿ Keep Screen On feature (via the ⋮ button on the 🚀 Rounds page).",
        ),
        m("h2", "🤖 Player Management"),
        m("h3", "Adding Players"),
        m(
          "p",
          "Players are added by pressing the ➕ button, which opens a dialog. Type or paste player names, separating them with commas or periods. Each name automatically gets a unique 👤 avatar image.",
        ),
        m(
          "p",
          m("b", "📝 Note"),
          ": Player names must be unique. Any non-unique names are ignored when adding players.",
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": On many devices, double-tap the space bar to insert a period.",
        ),
        m(
          "p",
          "Players can be assigned to groups. Separate player groups with a newline when entering their names. A maximum of 4 groups is supported.",
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": To add players to a specific group (e.g., Group B), leave earlier lines empty. For example, enter a blank line first, then add names on the second line to assign them to Group B.",
        ),
        m(
          "p",
          "Players can be added at any time during the tournament.",
        ),
        m("h3", "Participation Levels"),
        m(
          "p",
          "Players have two participation levels: ",
          m("b", "registered"),
          " and ",
          m("b", "active"),
          ". Active players must be registered.",
        ),
        m(
          "p",
          m("b", "Registration"),
          " determines which players are taking part in this tournament. Register players when setting up the tournament, or when players join late during an ongoing tournament.",
        ),
        m(
          "p",
          m("b", "Activation"),
          " controls which registered players are available for newly created rounds during an ongoing tournament. Deactivate players who are taking a break or leaving early, and reactivate them when they return.",
        ),
        m(
          "p",
          "Newly added players are automatically registered and active (ready to play in newly created rounds).",
        ),
        m("h3", "Managing Participation"),
        m(
          "p",
          "Select a view at the top of the page:",
        ),
        m(
          "ul",
          m("li", "\"Registered (r/t)\" – View all players and manage registration (r registered, t total)"),
          m("li", "\"Active (a/r)\" – View registered players and manage activation (a active, r registered)"),
        ),
        m(
          "p",
          "Players who have participated in any round are marked with a 🔒 lock icon. To maintain accurate standings and round history, locked players cannot be unregistered or deleted. However, activation can still be changed for locked players.",
        ),
        m("h3", "Player Actions"),
        m(
          "p",
          "Individual player actions are available via the ☰ menu next to each player:",
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
          m("li", "⊕ Register All Players – Register all players for the tournament"),
          m("li", "⊖ Unregister All Players – Unregister all players (and delete all rounds if tournament has started)"),
          m("li", "␡ Delete All Players – Delete all players and reset the tournament"),
          m("li", "⿻ Share / Export – Export player names for later import"),
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": To manage multiple rosters (e.g., different leagues, events, or club members), export the current player list using ⿻ Share / Export (via the ⋮ button) and save it to a file. To load a roster later, first delete all players using ␡ Delete All Players (via the ⋮ button), then press the ➕ button and paste the saved file content into the dialog.",
        ),
        m("h2", "🚀 Round Management"),
        m("h3", "Creating a Round"),
        m(
          "p",
          "At any time, a new round can be created by pressing the ➕ button. The button changes color to green when all matches have scores submitted, indicating it's a good time to create the next round.",
        ),
        m(
          "p",
          "The number of matches created for the new round depends on the number of available courts (configured in ⚙️ Settings) and the number of active players at that point in time.",
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": You can adjust the number of courts in ⚙️ Settings at any time during the tournament (e.g., if courts become available or unavailable). The new court count will be used when creating the next round.",
        ),
        m(
          "p",
          "When there are more players than available courts, excess players are 💤 paused for the round. An algorithm ensures ⚖️ fair rotation by giving priority to players who have played fewer matches.",
        ),
        m("h3", "Entering & Managing Scores"),
        m(
          "p",
          "For each match, there is a button to enter the score. Enter scores with up to two digits per team, separated by a colon (e.g., 21:15). To clear a score completely, use the backspace button (⌫) to delete all digits and submit the empty score.",
        ),
        m(
          "p",
          "You can change scores of previously completed rounds by using the navigation arrows in the header or by swiping left/right on touch devices.",
        ),
        m("h3", "Round Actions"),
        m(
          "p",
          "Round management actions are available via the ⋮ button:",
        ),
        m(
          "ul",
          m("li", "－ Delete Last Round – Delete the most recent round"),
          m("li", "↺ Delete All Rounds – Delete all rounds while keeping players and registration status"),
        ),
        m("h3", "Display Options"),
        m(
          "p",
          "Display features are available via the ⋮ button:",
        ),
        m(
          "ul",
          m("li", "⛶ Enter / Exit Fullscreen – Toggle full screen mode"),
          m("li", "⏿ Keep Screen On / Allow Screen to Turn Off – Prevent screen from dimming during play"),
          m("li", "? Show / Hide Debug Info – Display debug information"),
        ),
        m("h2", "🏆 Standings"),
        m(
          "p",
          "Live standings show the players ranked by win percentage, with plus/minus (point differential) as a tiebreaker.",
        ),
        m(
          "p",
          "View standings for any round by using the navigation arrows in the header or by swiping left/right on touch devices.",
        ),
        m(
          "p",
          "When players are assigned to different Groups (e.g., for mixed doubles), select All at the top of the page to view overall standings, or select a specific Group (A, B, C, or D).",
        ),
        m(
          "p",
          "On the 🚀 Rounds page, players who are performing exceptionally well (win ratio 75% or higher) are marked with a 🔥 fire badge to highlight their hot streak.",
        ),
        m(
          "p",
          "A reliability pie chart indicator shows data quality based on player participation. The green portion represents participation (played or paused) versus total rounds. This helps identify players who joined late or missed rounds, whose statistics may be less comparable to others.",
        ),
        m(
          "p",
          "Export actions are available via the ⋮ button (exports only include players who participated in rounds):",
        ),
        m(
          "ul",
          m("li", "⿻ Share / Export – Create a text summary of players, rounds, and standings"),
          m("li", "↓ Download Tournament Data (JSON) – Save complete tournament data in JSON format"),
        ),
        m("h2", "🤝 Matching"),
        m(
          "p",
          "In each round, players form teams and teams are paired into matches using a smart algorithm that optimizes player combinations.",
        ),
        m("p", "The algorithm considers the following factors:"),
        m(
          "ul",
          m("li", m("b", "Variety"), " – Rotating partners and opponents to ensure everyone plays with and against different players"),
          m("li", m("b", "Performance"), " – Creating balanced matches based on player skill levels and standings"),
          m(
            "li",
            m("b", "Groups"),
            " – Accommodating formats like mixed doubles by considering player group assignments",
          ),
        ),
        m("h3", "Tournament Modes"),
        m(
          "p",
          "Choose from predefined modes or create your own custom matching strategy:",
        ),
        m(
          "ul",
          m("li", m("b", "Americano"), " – Focuses entirely on variety. Every round, players get new partners and face new opponents, ensuring maximum rotation and social interaction."),
          m("li", m("b", "Americano Mixed"), " – Designed for mixed doubles. Pairs players from adjacent groups (e.g., Group A + Group B) while maximizing opponent variety. Ideal when you have two distinct player pools (like men and women)."),
          m("li", m("b", "Mexicano"), " – Emphasizes competitive balance. Forms teams based on player rankings (1st with 3rd, 2nd with 4th) and creates matches between similarly skilled teams. Best for competitive tournaments where scores matter."),
          m("li", m("b", "Tournicano"), " – Combines all factors equally. Balances variety, performance, and group considerations for a well-rounded tournament experience."),
        ),
        m(
          "p",
          m("b", "💡 Tip"),
          ": You can change the tournament mode in ⚙️ Settings at any time during the tournament. The new mode will be used when creating the next round.",
        ),
        m(
          "p",
          m("b", "📝 Note"),
          ": For performance-based matching to be effective, scores must be entered. For group-based matching to be effective, multiple player groups must be created.",
        ),
        m("h3", "Customization"),
        m(
          "p",
          "Create custom matching strategies by adjusting factors in ⚙️ Settings using the Customize button:",
        ),
        m(
          "p",
          m("b", "Team Formation"),
          " controls how players are paired into teams of two:",
        ),
        m(
          "ul",
          m("li", m("b", "Rotate partners"), " – Prioritizes playing with different partners each round"),
          m("li", m("b", "Match by skill level"), " – Forms teams based on player performance with three options:"),
          m(
            "ul",
            m("li", "Balanced teams – Pairs strong with weak players to create equally skilled teams"),
            m("li", "Equal skill – Pairs players of similar skill levels together"),
            m("li", "Mexicano (1+3, 2+4) – Pairs 1st with 3rd ranked, 2nd with 4th ranked, etc."),
          ),
          m("li", m("b", "Consider player groups"), " – Uses group assignments (A, B, C, D) with two options:"),
          m(
            "ul",
            m("li", "Mix adjacent groups – Creates teams from neighboring groups (e.g., A+B or B+C)"),
            m("li", "Same group only – Only pairs players within the same group"),
          ),
        ),
        m(
          "p",
          m("b", "Match Pairing"),
          " controls how teams are matched against each other:",
        ),
        m(
          "ul",
          m("li", m("b", "Rotate opponents"), " – Ensures teams face different opponents each round"),
          m("li", m("b", "Match similar skill"), " – Pairs teams with comparable combined skill levels"),
          m("li", m("b", "Similar group mix"), " – Matches teams with similar group compositions"),
        ),
        m(
          "p",
          "Each factor can be weighted from 0% (ignored) to 100% (maximum priority). Combine factors to create your ideal tournament format.",
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
          m("b", "📝 Note"),
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
          m("b", "📝 Note"),
          ": Updates are detected automatically when you're online. You can also manually check for updates in ⚙️ Settings.",
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
