import { TokenProfile } from '../types';

const STORAGE_PROFILES_KEY = 'octoview_profiles_v1';
const STORAGE_ACTIVE_PROFILE_KEY = 'octoview_active_profile_id';
const STORAGE_RECENT_REPOS_KEY = 'octoview_recent_repos';

export function getStoredProfiles(): TokenProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse profiles from localStorage', e);
    return [];
  }
}

export function saveProfiles(profiles: TokenProfile[]): void {
  try {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save profiles to localStorage', e);
  }
}

export function getActiveProfileId(): string | null {
  try {
    return localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY);
  } catch {
    return null;
  }
}

export function setActiveProfileId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_PROFILE_KEY);
    }
  } catch (e) {
    console.error('Failed to set active profile id', e);
  }
}

export function getActiveProfile(): TokenProfile | null {
  const profiles = getStoredProfiles();
  const activeId = getActiveProfileId();
  if (!activeId) return null;
  return profiles.find((p) => p.id === activeId) || null;
}

export function getRecentRepos(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT_REPOS_KEY);
    if (!raw) return ['expressjs/express', 'tailwindlabs/tailwindcss', 'shadcn/ui'];
    return JSON.parse(raw);
  } catch {
    return ['expressjs/express', 'tailwindlabs/tailwindcss', 'shadcn/ui'];
  }
}

export function addRecentRepo(repoFullName: string): void {
  try {
    const existing = getRecentRepos();
    const updated = [repoFullName, ...existing.filter((r) => r.toLowerCase() !== repoFullName.toLowerCase())].slice(0, 10);
    localStorage.setItem(STORAGE_RECENT_REPOS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save recent repos', e);
  }
}

export function removeRecentRepo(repoFullName: string): string[] {
  try {
    const existing = getRecentRepos();
    const updated = existing.filter((r) => r.toLowerCase() !== repoFullName.toLowerCase());
    localStorage.setItem(STORAGE_RECENT_REPOS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove recent repo', e);
    return [];
  }
}

export function clearRecentRepos(): void {
  try {
    localStorage.removeItem(STORAGE_RECENT_REPOS_KEY);
  } catch (e) {
    console.error('Failed to clear recent repos', e);
  }
}

