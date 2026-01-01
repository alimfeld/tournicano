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

**Option 2: Save & Paste Player Lists** (For distinct player sets)

Best when you have completely separate sets.

- Share each player list, and save the text
- Before each session, delete all players and paste the relevant list

Player lists are comma-separated names, one group per line.

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
- **Variety + competition** → Tournicano
- **Team competition** → Group Battle (Mixed)
- **Custom needs** → Custom Mode

### Why does Americano Mixed use Variety 50 instead of 100?

**Short answer:** Group constraints compete with variety. Setting variety to 50
ensures group rules are enforced first (groupFactor: 100) while still
maximizing variety within those constraints.

**Technical explanation:**
- Regular Americano: variety=100, no group constraints
- Americano Mixed: variety=50, group=100 (paired groups)
- If both were 100, the algorithm couldn't prioritize → unpredictable results
- At 50, you still get excellent variety with guaranteed group mixing

---

**Have more questions?** For specific issues or feature requests, please [open an issue on GitHub](https://github.com/alimfeld/tournicano/issues).
