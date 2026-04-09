import { createAvatar, Style } from "@dicebear/core";
import { bottts, botttsNeutral } from "@dicebear/collection";
import type { Options as BotttsOptions } from "@dicebear/bottts";
import type { Options as BotttsNeutralOptions } from "@dicebear/bottts-neutral";
import { AvatarSpec } from "../model/settings/Settings.ts";

type CoreOptions = { radius?: number };

type AvatarSpecEntry =
  | { style: Style<BotttsOptions>; options: BotttsOptions & CoreOptions }
  | { style: Style<BotttsNeutralOptions>; options: BotttsNeutralOptions & CoreOptions };

/**
 * Predefined avatar specs with their associated DiceBear style and options.
 */
const AVATAR_SPECS: Record<AvatarSpec, AvatarSpecEntry> = {
  "bottts": {
    style: bottts,
    options: {},
  },
  "bottts-neutral": {
    style: botttsNeutral,
    options: {
      radius: 10,
    },
  },
  "bottts-clean": {
    style: bottts,
    options: {
      eyes: ["bulging", "dizzy", "eva", "frame1", "frame2", "happy", "robocop", "roundFrame01", "roundFrame02", "sensor", "shade01"],
      mouth: ["bite", "diagram", "grill01", "grill02", "grill03", "smile01", "smile02", "square01", "square02"],
      textureProbability: 0,
      top: ["antenna", "antennaCrooked", "bulb01", "lights", "pyramid", "radar"],
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const avatar = createAvatar(style as Style<any>, { seed: playerName, ...options });
    avatarCache.set(key, avatar.toDataUri());
  }
  return avatarCache.get(key)!;
};
