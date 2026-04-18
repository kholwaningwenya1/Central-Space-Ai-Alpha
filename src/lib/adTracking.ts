
export type AdCategory = 'finance' | 'coding' | 'business' | 'tech' | 'general';

export interface QueryLog {
  text: string;
  cat: AdCategory;
  timestamp: number;
}

const CATEGORY_KEYWORDS: Record<AdCategory, string[]> = {
  finance: ['trade', 'forex', 'crypto', 'stock', 'invest', 'money', 'bank', 'profit', 'revenue', 'billing', 'payment', 'price', 'aviator', 'win', 'jackpot'],
  coding: ['code', 'dev', 'web', 'hosting', 'vercel', 'react', 'typescript', 'api', 'server', 'database', 'git', 'deploy', 'app', 'software', 'programming', 'gethost', 'domain'],
  business: ['shopify', 'ecommerce', 'marketing', 'sales', 'customer', 'enterprise', 'brand', 'startup', 'strategy', 'growth', 'product', 'management', 'getresponse', 'whatchimp'],
  tech: ['ai', 'gemini', 'gpt', 'robot', 'gadget', 'hardware', 'processor', 'cloud', 'quantum', 'future', 'innovation', 'blotato', 'video', 'reels', 'social'],
  general: []
};

export function analyzeQuery(text: string): AdCategory {
  const lowerText = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'general') continue;
    if (keywords.some(kw => lowerText.includes(kw))) {
      return cat as AdCategory;
    }
  }
  return 'general';
}

export function trackQuery(text: string) {
  try {
    const cat = analyzeQuery(text);
    const historyRaw = localStorage.getItem('ad_query_history');
    const history: QueryLog[] = historyRaw ? JSON.parse(historyRaw) : [];
    
    history.push({
      text,
      cat,
      timestamp: Date.now()
    });

    // Keep only last 50 queries
    const trimmedHistory = history.slice(-50);
    localStorage.setItem('ad_query_history', JSON.stringify(trimmedHistory));
    
    // Dispatch custom event to notify AdBanner
    window.dispatchEvent(new CustomEvent('ad_history_updated'));
  } catch (e) {
    console.error('Failed to track query for ads', e);
  }
}

export function getTopCategory(): AdCategory | null {
  try {
    const historyRaw = localStorage.getItem('ad_query_history');
    if (!historyRaw) return null;
    
    const history: QueryLog[] = JSON.parse(historyRaw);
    if (history.length === 0) return null;

    const counts: Record<AdCategory, number> = {
      finance: 0,
      coding: 0,
      business: 0,
      tech: 0,
      general: 0
    };

    history.forEach(q => {
      counts[q.cat]++;
    });

    let topCat: AdCategory = 'general';
    let maxCount = 0;

    for (const [cat, count] of Object.entries(counts)) {
      if (count > maxCount && cat !== 'general') {
        maxCount = count;
        topCat = cat as AdCategory;
      }
    }

    return maxCount > 0 ? topCat : null;
  } catch (e) {
    return null;
  }
}
