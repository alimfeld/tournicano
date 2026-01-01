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
  teamUp: TeamUpSpec;
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
    varietyFactor: 50,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 100,
    groupMode: TeamUpGroupMode.PAIRED,
  },
  matchUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
};

export const AmericanoMixedBalanced: MatchingSpec = {
  teamUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.PAIRED,
  },
  matchUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
  balanceGroups: true,
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

export const Tournicano: MatchingSpec = {
  teamUp: {
    varietyFactor: 100,
    performanceFactor: 100,
    performanceMode: TeamUpPerformanceMode.MEXICANO,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.PAIRED,
  },
  matchUp: {
    varietyFactor: 100,
    performanceFactor: 100,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.SAME,
  },
};

export const GroupBattle: MatchingSpec = {
  teamUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.SAME,
  },
  matchUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.CROSS,
  },
  balanceGroups: true,
};

export const GroupBattleMixed: MatchingSpec = {
  teamUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.PAIRED,
  },
  matchUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    groupFactor: 100,
    groupMode: MatchUpGroupMode.CROSS,
  },
  balanceGroups: true,
};

// Registry of predefined modes with their names
const PREDEFINED_MODES = [
  { name: "Americano", spec: Americano },
  { name: "Americano Mixed", spec: AmericanoMixed },
  { name: "Americano Mixed Balanced", spec: AmericanoMixedBalanced },
  { name: "Mexicano", spec: Mexicano },
  { name: "Tournicano", spec: Tournicano },
  { name: "Group Battle", spec: GroupBattle },
  { name: "Group Battle Mixed", spec: GroupBattleMixed },
] as const;

// Utility functions

// Deep equality check for MatchingSpec
export function matchingSpecEquals(a: MatchingSpec, b: MatchingSpec): boolean {
  return (
    a.teamUp.varietyFactor === b.teamUp.varietyFactor &&
    a.teamUp.performanceFactor === b.teamUp.performanceFactor &&
    a.teamUp.performanceMode === b.teamUp.performanceMode &&
    a.teamUp.groupFactor === b.teamUp.groupFactor &&
    a.teamUp.groupMode === b.teamUp.groupMode &&
    a.matchUp.varietyFactor === b.matchUp.varietyFactor &&
    a.matchUp.performanceFactor === b.matchUp.performanceFactor &&
    a.matchUp.groupFactor === b.matchUp.groupFactor &&
    a.matchUp.groupMode === b.matchUp.groupMode &&
    (a.balanceGroups ?? false) === (b.balanceGroups ?? false)
  );
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

// Check if spec matches a specific predefined mode
export function isMatchingSpecMode(spec: MatchingSpec, mode: MatchingSpec): boolean {
  return matchingSpecEquals(spec, mode);
}
