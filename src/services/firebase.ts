import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass databaseId from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User tokens data interface
export interface UserTokenState {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  tokensRemaining: number;
  totalTokensUsed: number;
}

export interface TokenTransactionRecord {
  id?: string;
  userId: string;
  taskType: string;
  tokensDeducted: number;
  remainingBalance: number;
  description: string;
  createdAt: string;
}

const DEFAULT_INITIAL_TOKENS = 50;
const GUEST_STORAGE_KEY = 'octoview_guest_tokens_v1';

// Get guest tokens from localStorage if not signed in
export function getGuestTokens(): number {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(GUEST_STORAGE_KEY, '15');
      return 15;
    }
    return parseInt(raw, 10) || 0;
  } catch {
    return 15;
  }
}

export function setGuestTokens(amount: number): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, Math.max(0, amount).toString());
  } catch {}
}

// Initialize or fetch user document upon sign-in
export async function syncUserProfile(user: FirebaseUser): Promise<UserTokenState> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialData: UserTokenState = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        tokensRemaining: DEFAULT_INITIAL_TOKENS,
        totalTokensUsed: 0,
      };
      await setDoc(userRef, {
        ...initialData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return initialData;
    } else {
      const data = snap.data() as UserTokenState;
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    throw err;
  }
}

// Deduct tokens when a task is executed
export async function deductUserTokens(
  user: FirebaseUser | null,
  cost: number,
  taskType: string,
  taskDescription: string,
  currentRemaining: number
): Promise<number> {
  const newBalance = Math.max(0, currentRemaining - cost);

  if (!user) {
    // Guest mode
    setGuestTokens(newBalance);
    return newBalance;
  }

  // Authenticated user: persist to Firestore
  const userRef = doc(db, 'users', user.uid);
  const txCollection = collection(db, 'users', user.uid, 'transactions');

  try {
    await updateDoc(userRef, {
      tokensRemaining: newBalance,
      updatedAt: new Date().toISOString(),
    });

    await addDoc(txCollection, {
      userId: user.uid,
      taskType,
      tokensDeducted: cost,
      remainingBalance: newBalance,
      description: taskDescription,
      createdAt: new Date().toISOString(),
    });

    return newBalance;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    return newBalance;
  }
}

// Refill user tokens
export async function refillUserTokens(user: FirebaseUser | null): Promise<number> {
  if (!user) {
    setGuestTokens(DEFAULT_INITIAL_TOKENS);
    return DEFAULT_INITIAL_TOKENS;
  }

  const userRef = doc(db, 'users', user.uid);
  const txCollection = collection(db, 'users', user.uid, 'transactions');
  try {
    await updateDoc(userRef, {
      tokensRemaining: DEFAULT_INITIAL_TOKENS,
      updatedAt: new Date().toISOString(),
    });

    await addDoc(txCollection, {
      userId: user.uid,
      taskType: 'refill',
      tokensDeducted: -DEFAULT_INITIAL_TOKENS,
      remainingBalance: DEFAULT_INITIAL_TOKENS,
      description: 'Daily Task Token Refill (+50)',
      createdAt: new Date().toISOString(),
    });

    return DEFAULT_INITIAL_TOKENS;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    return DEFAULT_INITIAL_TOKENS;
  }
}

// Sign-in with Google
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserProfile(result.user);
  return result.user;
}

// Sign out
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

// ----------------- Starred Repositories Persistence -----------------

export interface StarredRepoItem {
  id: string;
  userId: string;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  starredAt: string;
}

const GUEST_STARRED_STORAGE_KEY = 'octoview_guest_starred_repos_v1';

export function getGuestStarredRepos(): StarredRepoItem[] {
  try {
    const raw = localStorage.getItem(GUEST_STARRED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGuestStarredRepos(repos: StarredRepoItem[]): void {
  try {
    localStorage.setItem(GUEST_STARRED_STORAGE_KEY, JSON.stringify(repos));
  } catch {}
}

export function sanitizeRepoId(fullName: string): string {
  return fullName.replace(/[^a-zA-Z0-9_\-]/g, '_');
}

export async function toggleStarredRepo(
  user: FirebaseUser | null,
  repo: {
    full_name: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
  },
  isCurrentlyStarred: boolean
): Promise<boolean> {
  const repoId = sanitizeRepoId(repo.full_name);

  if (!user) {
    // Guest mode
    const existing = getGuestStarredRepos();
    if (isCurrentlyStarred) {
      saveGuestStarredRepos(existing.filter((r) => r.fullName !== repo.full_name));
      return false;
    } else {
      const newItem: StarredRepoItem = {
        id: repoId,
        userId: 'guest',
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        starredAt: new Date().toISOString(),
      };
      saveGuestStarredRepos([newItem, ...existing]);
      return true;
    }
  }

  // Firebase Firestore mode
  const docRef = doc(db, 'users', user.uid, 'starredRepos', repoId);

  try {
    if (isCurrentlyStarred) {
      await deleteDoc(docRef);
      return false;
    } else {
      await setDoc(docRef, {
        id: repoId,
        userId: user.uid,
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        starredAt: new Date().toISOString(),
      });
      return true;
    }
  } catch (err) {
    handleFirestoreError(
      err,
      isCurrentlyStarred ? OperationType.DELETE : OperationType.WRITE,
      `users/${user.uid}/starredRepos/${repoId}`
    );
    throw err;
  }
}




