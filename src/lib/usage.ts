import { UserProfile, DailyUsage } from '../types';
import { db, doc, updateDoc } from '../firebase';

export const PLAN_LIMITS = {
  free: {
    translations: 1,
    audios: 1,
    readouts: 1,
    sketching: 1,
    exports: 1,
    downloads: 1,
  },
  standard: {
    translations: 20,
    audios: 20,
    readouts: 20,
    sketching: 20,
    exports: 20,
    downloads: 20,
  },
  advanced: {
    translations: 60,
    audios: 60,
    readouts: 60,
    sketching: 60,
    exports: 60,
    downloads: 60,
  },
  corporate: {
    translations: Infinity,
    audios: Infinity,
    readouts: Infinity,
    sketching: Infinity,
    exports: Infinity,
    downloads: Infinity,
  }
};

export type UsageFeature = keyof Omit<DailyUsage, 'date'>;

export const checkUsageLimit = (userProfile: UserProfile | null, feature: UsageFeature): boolean => {
  if (!userProfile) return false;
  if (userProfile.role === 'super_admin') return true;
  if (userProfile.plan === 'corporate') return true;

  const today = new Date().toISOString().split('T')[0];
  const usage = userProfile.dailyUsage;

  if (!usage || usage.date !== today) {
    // No usage today yet, so they have full limits
    return true;
  }

  const limit = PLAN_LIMITS[userProfile.plan][feature];
  return usage[feature] < limit;
};

export const incrementUsage = async (userProfile: UserProfile | null, feature: UsageFeature) => {
  if (!userProfile) return;
  if (userProfile.role === 'super_admin' || userProfile.plan === 'corporate') return;

  const today = new Date().toISOString().split('T')[0];
  let newUsage: DailyUsage;

  if (!userProfile.dailyUsage || userProfile.dailyUsage.date !== today) {
    newUsage = {
      date: today,
      translations: 0,
      audios: 0,
      readouts: 0,
      sketching: 0,
      exports: 0,
      downloads: 0,
    };
  } else {
    newUsage = { ...userProfile.dailyUsage };
  }

  newUsage[feature] += 1;

  try {
    await updateDoc(doc(db, 'users', userProfile.uid), {
      dailyUsage: newUsage
    });
  } catch (error) {
    console.error('Failed to increment usage:', error);
  }
};
