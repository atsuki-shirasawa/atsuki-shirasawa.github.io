import fs from 'node:fs/promises'

export const log = (...m) => console.log('[decks]', ...m)
export const warn = (...m) => console.warn('[decks]', ...m)

export async function exists(target) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}
