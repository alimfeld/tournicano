// Enums defining matching behavior modes
export enum TeamUpGroupMode {
  PAIRED,
  SAME,
}

export enum MatchUpGroupMode {
  SAME,  // Match teams with same group composition
  CROSS, // Match teams from different groups (cross-group)
}

export enum TeamUpPerformanceMode {
  EQUAL, // players with equal performance
  AVERAGE, // players adding app to average performance
  MEXICANO, // 1st with 3rd and 2nd with 4th
}

// Specification interfaces
interface TeamUpSpec {
  varietyFactor: number;
  performanceFactor: number;
  groupFactor: number;
  groupMode: TeamUpGroupMode;
  performanceMode: TeamUpPerformanceMode;
}

interface MatchUpSpec {
  varietyFactor: number;
  performanceFactor: number;
  groupFactor: number;
  groupMode: MatchUpGroupMode;
}

export interface MatchingSpec {
  teamUp?: TeamUpSpec; // Optional, if not provided, fixed teams will be used
  matchUp: MatchUpSpec;
  balanceGroups?: boolean;
}

// Predefined matching modes
export const Americano: MatchingSpec = {
  teamUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 0,
    groupMode: TeamUpGroupMode.PAIRED, // not relevant
  },
  matchUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    groupFactor: 0,
    groupMode: MatchUpGroupMode.SAME, // not relevant
  },
};

export const AmericanoMixed: MatchingSpec = {
  teamUp: {
    varietyFactor: 40, // PAIRED mode: must be < 50, since same-group pairs score 50/100 → 40+50=90 < 100
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 100,
    groupMode: TeamUpGroupMode.PAIRED,
  },
  matchUp: {
    varietyFactor: 40, // SAME mode: must be < 50, since mixed vs non-mixed scores 50/100 → 40+50=90 < 100
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
};

export const AmericanoMixedBalanced: MatchingSpec = {
  teamUp: {
    varietyFactor: 40, // PAIRED mode: must be < 50, since same-group pairs score 50/100 → 40+50=90 < 100
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 100,
    groupMode: TeamUpGroupMode.PAIRED,
  },
  matchUp: {
    varietyFactor: 40, // SAME mode: must be < 50, since mixed vs non-mixed scores 50/100 → 40+50=90 < 100
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
  balanceGroups: true,
};

export const TeamAmericano: MatchingSpec = {
  matchUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    groupFactor: 0,
    groupMode: MatchUpGroupMode.SAME, // not relevant
  },
};

export const Mexicano: MatchingSpec = {
  teamUp: {
    varietyFactor: 0,
    performanceFactor: 100,
    performanceMode: TeamUpPerformanceMode.MEXICANO,
    groupFactor: 0,
    groupMode: TeamUpGroupMode.PAIRED, // not relevant
  },
  matchUp: {
    varietyFactor: 0,
    performanceFactor: 100,
    groupFactor: 0,
    groupMode: MatchUpGroupMode.SAME, // not relevant
  },
};

export const TeamMexicano: MatchingSpec = {
  matchUp: {
    varietyFactor: 0,
    performanceFactor: 100,
    groupFactor: 0,
    groupMode: MatchUpGroupMode.SAME, // not relevant
  },
};

export const Tournicano: MatchingSpec = {
  teamUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 0,
    groupMode: TeamUpGroupMode.PAIRED, // not relevant
  },
  matchUp: {
    varietyFactor: 0,
    performanceFactor: 100,
    groupFactor: 0,
    groupMode: MatchUpGroupMode.SAME, // not relevant
  },
};

export const TournicanoGroups: MatchingSpec = {
  teamUp: {
    varietyFactor: 90, // 90 < 100 → groupFactor always dominates
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 100,
    groupMode: TeamUpGroupMode.SAME,
  },
  matchUp: {
    varietyFactor: 0,
    performanceFactor: 90, // 90 < 100 → groupFactor always dominates
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
  balanceGroups: true,
};

export const Swiss: MatchingSpec = {
  teamUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 0,
    groupMode: TeamUpGroupMode.PAIRED, // not relevant
  },
  matchUp: {
    varietyFactor: 100,
    performanceFactor: 90,
    groupFactor: 0,
    groupMode: MatchUpGroupMode.SAME, // not relevant
  },
};

export const AmericanoGroups: MatchingSpec = {
  teamUp: {
    varietyFactor: 90, // 90 < 100 → groupFactor always dominates
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 100,
    groupMode: TeamUpGroupMode.SAME,
  },
  matchUp: {
    varietyFactor: 90, // 90 < 100 → groupFactor always dominates
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
  balanceGroups: true,
};

export const MexicanoGroups: MatchingSpec = {
  teamUp: {
    varietyFactor: 0,
    performanceFactor: 90, // 90 < 100 → groupFactor always dominates
    performanceMode: TeamUpPerformanceMode.MEXICANO,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.SAME,
  },
  matchUp: {
    varietyFactor: 0,
    performanceFactor: 90, // 90 < 100 → groupFactor always dominates
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
  balanceGroups: true,
};

export const GroupBattle: MatchingSpec = {
  teamUp: {
    varietyFactor: 90, // 90 < 100 → groupFactor always dominates
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.SAME,
  },
  matchUp: {
    varietyFactor: 90, // 90 < 100 → groupFactor always dominates
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.CROSS,
  },
  balanceGroups: true,
};

export const GroupBattleMixed: MatchingSpec = {
  teamUp: {
    varietyFactor: 40, // PAIRED mode: must be < 50, since same-group pairs score 50/100 → 40+50=90 < 100
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.PAIRED,
  },
  matchUp: {
    varietyFactor: 90, // 90 < 100 → groupFactor always dominates
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.CROSS,
  },
  balanceGroups: true,
};

// Registry of predefined modes with their names
export const PREDEFINED_MODES = [
  { name: "Americano", spec: Americano, description: "Maximum partner variety." },
  { name: "Americano Mixed", spec: AmericanoMixed, description: "Mixed doubles with partner variety." },
  { name: "Americano Mixed Balanced", spec: AmericanoMixedBalanced, description: "Balanced mixed doubles." },
  { name: "Americano Groups", spec: AmericanoGroups, description: "Americano within groups." },
  { name: "Team Americano", spec: TeamAmericano, description: "Fixed teams, maximum variety." },
  { name: "Mexicano", spec: Mexicano, description: "Skill-based competitive matchups." },
  { name: "Mexicano Groups", spec: MexicanoGroups, description: "Mexicano within groups." },
  { name: "Team Mexicano", spec: TeamMexicano, description: "Fixed teams, skill-based." },
  { name: "Tournicano", spec: Tournicano, description: "Maximum partner variety with competitive matchups." },
  { name: "Tournicano Groups", spec: TournicanoGroups, description: "Tournicano within groups. Works with 2 or 4 groups." },
  { name: "Swiss", spec: Swiss, description: "Maximum variety with competitive matchups." },
  { name: "Group Battle", spec: GroupBattle, description: "Designed for 2 groups. Competition between two sides." },
  { name: "Group Battle Mixed", spec: GroupBattleMixed, description: "Designed for 4 groups. Mixed doubles team battle." },
] as const;

// Utility functions

// Deep equality check for MatchingSpec
export function matchingSpecEquals(a: MatchingSpec, b: MatchingSpec): boolean {
  const teamUpEquals = (a.teamUp === undefined && b.teamUp === undefined) ||
    (a.teamUp !== undefined && b.teamUp !== undefined &&
      a.teamUp.varietyFactor === b.teamUp.varietyFactor &&
      a.teamUp.performanceFactor === b.teamUp.performanceFactor &&
      a.teamUp.performanceMode === b.teamUp.performanceMode &&
      a.teamUp.groupFactor === b.teamUp.groupFactor &&
      a.teamUp.groupMode === b.teamUp.groupMode);
  return teamUpEquals &&
    a.matchUp.varietyFactor === b.matchUp.varietyFactor &&
    a.matchUp.performanceFactor === b.matchUp.performanceFactor &&
    a.matchUp.groupFactor === b.matchUp.groupFactor &&
    a.matchUp.groupMode === b.matchUp.groupMode &&
    (a.balanceGroups ?? false) === (b.balanceGroups ?? false);
}

// Get mode name from spec configuration
export function getMatchingSpecName(spec: MatchingSpec): string {
  for (const mode of PREDEFINED_MODES) {
    if (matchingSpecEquals(spec, mode.spec)) {
      return mode.name;
    }
  }
  return "Custom";
}
