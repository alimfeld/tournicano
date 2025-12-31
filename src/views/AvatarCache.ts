import { createAvatar } from "@dicebear/core";
import { bottts } from "@dicebear/collection";

/**
 * Avatar cache to avoid regenerating avatars on every render.
 * Avatars are generated once per player name and cached as data URIs.
 */
const avatarCache = new Map<string, string>();

/**
 * Maximum number of avatars to keep in cache.
 * Limits memory usage to ~1MB (100 avatars × ~10KB each).
 */
const MAX_CACHE_SIZE = 100;

/**
 * Get an avatar for a player, using cache to avoid regeneration.
 * @param playerName - The player's name (used as seed for avatar generation)
 * @returns Data URI string for the avatar image
 */
export const getAvatar = (playerName: string): string => {
  if (!avatarCache.has(playerName)) {
    // Evict oldest entry if cache is at capacity
    if (avatarCache.size >= MAX_CACHE_SIZE) {
      const firstKey = avatarCache.keys().next().value as string;
      avatarCache.delete(firstKey);
    }
    
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
