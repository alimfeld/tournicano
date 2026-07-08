import { Style, Avatar } from "@dicebear/core";
import type { StyleOptions } from "@dicebear/core";
import botttsDefinition from "@dicebear/styles/bottts.json";
import botttsNeutralDefinition from "@dicebear/styles/bottts-neutral.json";
import { AvatarSpec } from "../model/settings/Settings.ts";

type BotttsStyle = Style<typeof botttsDefinition>;
type BotttsNeutralStyle = Style<typeof botttsNeutralDefinition>;

type AvatarSpecEntry =
  | { style: BotttsStyle; options: StyleOptions<typeof botttsDefinition> }
  | { style: BotttsNeutralStyle; options: StyleOptions<typeof botttsNeutralDefinition> };

const botttsStyle = new Style(botttsDefinition);
const botttsNeutralStyle = new Style(botttsNeutralDefinition);

/**
 * Predefined avatar specs with their associated DiceBear style and options.
 */
const AVATAR_SPECS: Record<AvatarSpec, AvatarSpecEntry> = {
  "bottts": {
    style: botttsStyle,
    options: {},
  },
  "bottts-neutral": {
    style: botttsNeutralStyle,
    options: {
      borderRadius: 10,
    },
  },
  "bottts-clean": {
    style: botttsStyle,
    options: {
      eyesVariant: ["bulging", "dizzy", "eva", "frame1", "frame2", "happy", "robocop", "roundFrame01", "roundFrame02", "sensor", "shade01"],
      mouthVariant: ["bite", "diagram", "grill01", "grill02", "grill03", "smile01", "smile02", "square01", "square02"],
      textureProbability: 0,
      topVariant: ["antenna", "antennaCrooked", "bulb01", "lights", "pyramid", "radar"],
    },
  },
};

/**
 * Avatar cache to avoid regenerating avatars on every render.
 * Keyed by "<spec>:<playerName>" so switching specs never evicts existing
 * entries — avatars for a previously used spec are restored instantly from cache.
 * Limits memory usage to ~3MB (300 entries × ~10KB each).
 */
const avatarCache = new Map<string, string>();
const MAX_CACHE_SIZE = 300;

/**
 * Currently active avatar spec.
 */
let currentSpec: AvatarSpec = "bottts";

/**
 * Set the active avatar spec. The cache is keyed per spec so no entries are
 * evicted — switching back to a previous spec instantly restores cached avatars.
 * @param spec - The avatar spec to activate
 */
export const setAvatarSpec = (spec: AvatarSpec): void => {
  currentSpec = spec;
};

/**
 * Get an avatar for a player, using cache to avoid regeneration.
 * @param playerName - The player's name (used as seed for avatar generation)
 * @returns Data URI string for the avatar image
 */
export const getAvatar = (playerName: string): string => {
  const key = `${currentSpec}:${playerName}`;
  if (!avatarCache.has(key)) {
    // Evict oldest entry if cache is at capacity
    if (avatarCache.size >= MAX_CACHE_SIZE) {
      const firstKey = avatarCache.keys().next().value as string;
      avatarCache.delete(firstKey);
    }

    const { style, options } = AVATAR_SPECS[currentSpec];
    const avatar = new Avatar(style, { seed: playerName, ...options });
    avatarCache.set(key, avatar.toDataUri());
  }
  return avatarCache.get(key)!;
};
