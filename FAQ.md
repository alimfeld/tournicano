# Tournicano FAQ

> **New to Tournicano?** The app's [Home screen](https://alimfeld.github.io/tournicano/) covers getting started basics, key features, and tournament formats. This FAQ focuses on data management, troubleshooting, and algorithm details.

## Table of Contents
- [Installation & Setup](#installation--setup)
- [Data Storage & Privacy](#data-storage--privacy)
- [Managing Multiple Player Sets](#managing-multiple-player-sets)
- [Backup & Handover](#backup--handover)
- [How Matching Works](#how-matching-works)
- [Understanding Tournament Modes](#understanding-tournament-modes)

---

## Installation & Setup

### How do I install Tournicano as an app?

- **iOS (Safari):** Share button → Add to Home Screen
- **Android (Chrome):** Menu (⋮) → Install app
- **Desktop:** Look for install icon in address bar or browser menu

### Can I use it without installing?

Yes! It works in any browser. Installing provides faster loading, offline
access, and a native app experience.

---

## Data Storage & Privacy

### Where is my data stored?

All data is stored locally in your browser's **localStorage** on your device.

- ✅ 100% private - no servers, no cloud, no accounts
- ✅ No tracking or analytics
- ✅ Works completely offline
- ⚠️ Device-specific - doesn't sync between devices (by design)

### Why is my data different in browser vs installed app?

**This is expected!** The browser version and installed PWA use **separate
storage contexts** - they're treated as different apps.

**Solutions:**
- **Pick one** - Use either browser OR installed app (recommended: installed)
- **Transfer** - Export from one, import to the other
- **Fresh start** - Create new tournament in your preferred version

**Tip:** The installed version is recommended for tournament day - faster and
offline-capable.

### What happens if I clear browser data?

- ❌ Browser version: Tournament data deleted
- ✅ Installed PWA: Usually safe (separate storage)

**Always export backups before clearing browser data!**

---

## Managing Multiple Player Sets

### How do I run tournaments with different sets of players?

**Option 1: Single Player List + Active/Inactive** (For overlapping players)

Best when players rotate between sessions (e.g., some attend Tuesday, some
Friday, some both).

- Keep all players in one list
- Before each session, toggle who's active
- Start new tournament (keeps players, clears rounds)

**Option 2: Export & Import Tournament Templates** (For distinct player sets)

Best when you have completely separate player sets.

- Create tournaments with different player lists and settings
- Export each as a template file (Settings → Export Tournament)
- Before each session, import the relevant template
- Start new tournament to clear old rounds (keeps players and settings)

**Tip:** Export templates after adding players but before creating rounds, or use
"Start New Tournament" after import to reset rounds while keeping player lists.

**Recommendation:**
- Overlapping players → **Option 1**
- Distinct groups → **Option 2**

---

## Backup & Handover

### How do I back up my tournament?

Settings → Export Tournament → Save JSON file

**Includes:** All players, rounds, matches, scores, and tournament settings

### How do I restore from backup?

Settings → Import Tournament → Select JSON file → Confirm

⚠️ This replaces your current tournament!

### How do I hand over to someone else?

1. Export tournament
2. Send JSON file (AirDrop, email, etc.)
3. They import on their device

⚠️ **Important:** This creates two independent copies

---

## How Matching Works

### What factors does the algorithm consider?

The algorithm uses **maximum weighted graph matching** with three factors:

1. **Variety** - Rotates partners and opponents
2. **Performance** - Pairs by skill level
3. **Groups** - Enforces team composition rules

### How are players selected for each round?

**Priority order:**
1. **Play ratio** - Players who've played less get priority
2. **Last pause time** - Tiebreaker for equal play ratios
3. **Group balancing** (if enabled) - Equal participation per group
4. **Court limit** - Max players = courts × 4

### What is "Group Balancing"?

Ensures equal participation from each group per round.

**Example (2 courts, 12 players: 6 from A, 6 from B):**
- Without balancing: Could be 7 from A, 1 from B
- With balancing: Guaranteed 4 from A, 4 from B

Active in: Americano Mixed Balanced, Group Battle modes

---

## Understanding Tournament Modes

### Which mode should I use?

- **Social/casual** → Americano
- **Mixed doubles (men/women)** → Americano Mixed (Balanced)
- **Competitive/ranked** → Mexicano
- **Fixed team pairs** → Team Americano / Team Mexicano
- **Variety + competition** → Tournicano
- **Team competition** → Group Battle (Mixed)
- **Custom needs** → Custom Mode

### How do fixed team modes (Team Americano / Team Mexicano) work?

**Team Americano** and **Team Mexicano** use **fixed team pairs** - the same partners stay together throughout the tournament.

**Team formation:**
- When you create the first round, active players are **randomly paired** into teams
- These pairings become your fixed teams for the tournament, unless adjusted
- New players added mid-tournament are automatically paired with other new players

**Adjusting team pairings:**

Use the **Switch Players** feature to modify team compositions:
1. Go to the **Round page**
2. Tap the **pencil icon (✎)** in the header
3. Select two players to swap
4. Changes persist to future rounds

**Mode differences:**
- **Team Americano:** Focuses on variety of opponents
- **Team Mexicano:** Matches teams by skill level

**Viewing team standings:**

The Standings page includes a toggle (👥) to switch between individual player standings and team standings:
- **Individual view:** Shows stats for each player separately
- **Team view:** Shows combined stats for each team pair
- Team standings display both partners' names and the team's total wins, losses, and points

### How do I run a multi-stage tournament (qualification + group play)?

**Overview:** Tournicano supports two-phase formats where you run an open qualification round, then split players into groups for a second competitive phase.

**Phase 1 — Qualification:**
Use any rotating mode (Americano, Mexicano, Tournicano) with all players in a single group. Run as many rounds as needed.

**Phase 2 — Split into groups:**
1. Go to the **Standings page**
2. Tap the **÷ icon** in the header
3. Choose 2 or 4 groups and confirm
4. Players are automatically assigned to groups by their current rank (top players → Group A, etc.)

**Phase 3 — Group play:**
Change the matching mode (Settings) to one of the **Groups** presets:
- **Americano Groups** — max rotation, within-group only
- **Mexicano Groups** — skill-based, within-group only
- **Tournicano Groups** — variety + competition, within-group only

Create new rounds — all pairings will stay within groups.

**Note:** Stats are cumulative across all phases. Players not yet in any round are ignored by the split.

### How are group constraints enforced in group-based modes?

In group-based modes, the algorithm scores every possible pairing and picks the best overall combination. Group rules are enforced by giving group-correct pairings a much higher score than group-incorrect ones — high enough that no amount of variety or performance pressure can override them.

The required margin depends on the mode:

- **Regular group modes** (Americano Groups, Mexicano Groups, Tournicano Groups, Group Battle): a wrong pairing scores 0, so variety just needs to be below 100. These modes use `variety=90` or `performance=90`.
- **Mixed group modes** (Americano Mixed, Group Battle Mixed): teams must pair across specific groups (e.g. men with women). Here, a same-group pairing scores 50 — not 0 — so variety must also stay below 50. These modes use `variety=40`.

**Examples:**
- **Americano Groups / Group Battle:** `variety=90, group=100` — group always wins
- **Mexicano Groups:** `performance=90, group=100` — group always wins
- **Tournicano Groups:** `variety=60, performance=30, group=100` — group always wins (60+30=90 < 100)
- **Americano Mixed / Group Battle Mixed:** `variety=40, group=100` — group always wins (40 < 50)

The Tournicano Groups split of 60/30 mirrors the regular Tournicano ratio of variety=100/performance=50, keeping the same balance between partner rotation and skill-based matchups.

---

**Have more questions?** For specific issues or feature requests, please [open an issue on GitHub](https://github.com/alimfeld/tournicano/issues).
