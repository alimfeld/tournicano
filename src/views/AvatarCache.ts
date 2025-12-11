import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

/**
 * Avatar cache to avoid regenerating avatars on every render.
 * Avatars are generated once per player name and cached as data URIs.
 */
const avatarCache = new Map<string, string>();

/**
 * Get an avatar for a player, using cache to avoid regeneration.
 * @param playerName - The player's name (used as seed for avatar generation)
 * @returns Data URI string for the avatar image
 */
export const getAvatar = (playerName: string): string => {
  if (!avatarCache.has(playerName)) {
    const avatar = createAvatar(bottts, { seed: playerName });
    avatarCache.set(playerName, avatar.toDataUri());
  }
  return avatarCache.get(playerName)!;
};

/**
 * Clear the avatar cache. Useful for testing or memory management.
 */
export const clearAvatarCache = (): void => {
  avatarCache.clear();
};
