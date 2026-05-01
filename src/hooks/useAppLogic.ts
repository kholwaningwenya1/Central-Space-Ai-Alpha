import { useState, useCallback, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChanged, auth, db, collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc, addDoc, deleteDoc } from '../firebase';
import { UserProfile, WorkspaceSession, UserSettings, AppNotification } from '../types';
import { subscribeToNotifications } from '../services/notificationService';
import { toast } from 'sonner';

export const useAppLogic = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessions, setSessions] = useState<WorkspaceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('userSettings');
    const defaultSettings: UserSettings = {
      tone: 'Professional',
      voice: 'Second person',
      sidebarCollapsed: false,
      omniBotEnabled: true,
      autoReadOutLoud: false,
      autoGenerateAudio: false,
      darkMode: false
    };
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        // Fetch or create profile
        const profileRef = doc(db, 'users', authUser.uid);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data() as UserProfile);
        } else {
          const newProfile: UserProfile = {
            uid: authUser.uid,
            email: authUser.email || '',
            displayName: authUser.displayName || 'Anonymous',
            photoURL: authUser.photoURL,
            role: authUser.email === 'kholwaningwenya1@gmail.com' ? 'super_admin' : 'user',
            plan: 'free',
            isWhitelisted: true,
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          await setDoc(profileRef, newProfile);
          setUserProfile(newProfile);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Notifications Subscription
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
    });
    return () => unsubscribe();
  }, [user]);

  // sessions subscription
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'sessions'),
      where('members', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkspaceSession));
      setSessions(s);
      if (s.length > 0 && !currentSessionId) {
        // Find last active session or default to first
        setCurrentSessionId(s[0].id);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const updateSession = useCallback(async (id: string, updates: Partial<WorkspaceSession>) => {
    try {
      await updateDoc(doc(db, 'sessions', id), {
        ...updates,
        id, // Ensure id is always present in case older documents lack it
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Failed to update session:', error);
      toast.error('Failed to update workspace');
    }
  }, []);

  const createSession = useCallback(async (type: 'workspace' | 'direct' | 'group' | 'channel', members: string[], title?: string) => {
    if (!user) return null;
    const sessionRef = doc(collection(db, 'sessions'));
    const newSession: WorkspaceSession = {
      id: sessionRef.id,
      title: title || 'New Workspace',
      type,
      members: members.includes(user.uid) ? members : [...members, user.uid],
      messages: [],
      tone: userSettings.tone,
      voice: userSettings.voice,
      modelId: 'gpt-4o',
      mode: 'chat',
      files: [],
      updatedAt: Date.now(),
      uid: user.uid
    };
    try {
      await setDoc(sessionRef, newSession);
      setCurrentSessionId(sessionRef.id);
      return sessionRef.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create workspace');
      return null;
    }
  }, [user, userSettings]);

  return {
    user,
    userProfile,
    isAuthReady,
    sessions,
    currentSessionId,
    setCurrentSessionId,
    notifications,
    userSettings,
    setUserSettings,
    updateSession,
    createSession
  };
};
