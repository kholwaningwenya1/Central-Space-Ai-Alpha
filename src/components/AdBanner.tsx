import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Server, Shield, Zap, Globe, Plane, ShoppingCart, Store, MessageSquare, Video, Mail, DollarSign, Sparkles, Cpu, Code, Rocket, TrendingUp, FileText, Users } from 'lucide-react';
import { gsap } from 'gsap';
import { cn } from '../lib/utils';
import { getTopCategory, AdCategory } from '../lib/adTracking';

interface AdCopy {
  description: string;
  cta: string;
}

interface Ad {
  id: string;
  title: string;
  copies: AdCopy[];
  link: string;
  icon: React.ReactNode;
  color: string;
  category: AdCategory;
}

const ADS: Ad[] = [
  {
    id: 'gethost-zim',
    title: 'GetHost',
    link: 'https://gethost.co.zw/clients/aff.php?aff=101',
    icon: <Server className="w-4 h-4" />,
    color: 'from-blue-600 to-indigo-700',
    category: 'coding',
    copies: [
      { description: 'Zimbabwe\'s #1 Web Hosting & Domain Provider.', cta: 'Host Now' },
      { description: 'Fast, secure & affordable hosting for your business.', cta: 'Get Started' },
      { description: 'Register .co.zw domains at the best prices today.', cta: 'Buy Domain' },
      { description: 'Reliable SSD hosting with 99.9% uptime guarantee.', cta: 'Claim Deal' },
      { description: 'Build your online presence with GetHost Zimbabwe.', cta: 'Visit Site' }
    ]
  },
  {
    id: 'aviator-join',
    title: 'Join Aviator',
    link: 'https://data527.click/81af8fd380a613288b43/61a210169e/?placementName=default',
    icon: <Plane className="w-4 h-4" />,
    color: 'from-red-600 to-orange-500',
    category: 'finance',
    copies: [
      { description: 'Fly high and win big with Aviator. Join now!', cta: 'Play Now' },
      { description: 'The #1 social multiplayer game. Cash out in time.', cta: 'Enter Game' },
      { description: 'Easy to play, hard to resist. Try your luck today.', cta: 'Start Flying' },
      { description: 'Join thousands of winners in the Aviator sky.', cta: 'Get Jackpot' },
      { description: 'New prizes and instant payouts. Claim yours now.', cta: 'Join Event' }
    ]
  },
  {
    id: 'whatchimp-join',
    title: 'Whatchimp',
    link: 'https://whatchimp.com/special-offer/join/oc2uxono/',
    icon: <Zap className="w-4 h-4" />,
    color: 'from-yellow-500 to-orange-600',
    category: 'business',
    copies: [
      { description: 'Revolutionize your workflow with Whatchimp tools.', cta: 'Join Now' },
      { description: 'Special offer: Unlock pro features for business.', cta: 'Claim Offer' },
      { description: 'Automate your marketing and save hours daily.', cta: 'Explore' },
      { description: 'The ultimate tool for growth-minded entrepreneurs.', cta: 'Get Whatchimp' },
      { description: 'Scale faster with intelligence. Try the new suite.', cta: 'Learn More' }
    ]
  },
  {
    id: 'getresponse-marketing',
    title: 'GetResponse',
    link: 'https://www.getresponse.com/?ab=9JwxvqAgtt',
    icon: <Mail className="w-4 h-4" />,
    color: 'from-blue-500 to-cyan-600',
    category: 'business',
    copies: [
      { description: 'The easiest email marketing platform on the planet.', cta: 'Start Free' },
      { description: 'Send newsletters, create pages, and automate.', cta: 'Grow List' },
      { description: 'Full marketing automation for your online store.', cta: 'Try Now' },
      { description: 'Generate more leads with GetResponse today.', cta: 'Get Started' },
      { description: 'All-in-one marketing tools you actually need.', cta: 'Free Trial' }
    ]
  },
  {
    id: 'blotato-pro',
    title: 'Blotato',
    link: 'https://blotato.com/?ref=kholwani',
    icon: <Video className="w-4 h-4" />,
    color: 'from-orange-500 to-red-600',
    category: 'tech',
    copies: [
      { description: 'Create viral reels & post everywhere in 1 click.', cta: 'Go Viral' },
      { description: 'Automate your social media reels instantly.', cta: 'Try Blotato' },
      { description: 'The smarter way to create high-impact video content.', cta: 'Check it Out' },
      { description: 'Grow your audience with AI-powered video tools.', cta: 'Start Free' },
      { description: 'Post to TikTok, Reels, & Shorts automatically.', cta: 'Get Tools' }
    ]
  }
];

// Use only user provided ads
const AD_POOL = [...ADS];

export function AdBanner() {
  const [currentAd, setCurrentAd] = useState<Ad>(AD_POOL[0]);
  const [currentCopy, setCurrentCopy] = useState<AdCopy>(AD_POOL[0].copies[0]);
  const [effectType, setEffectType] = useState<'liquid' | 'steam' | 'plasma' | 'holo' | 'portal' | 'glitch' | 'vortex' | 'slideLeft' | 'none'>('none');
  const [isAdfree, setIsAdfree] = useState(false);
  const adRef = useRef<HTMLAnchorElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectNextAd = useCallback(() => {
    const topCat = getTopCategory();
    let pool = AD_POOL;
    
    if (topCat) {
      const relevant = AD_POOL.filter(a => a.category === topCat);
      const random = AD_POOL.filter(a => a.category !== topCat);
      
      // 80% relevant skew for V3
      if (Math.random() < 0.8 && relevant.length > 0) {
        pool = relevant;
      } else {
        pool = random;
      }
    }

    const nextAd = pool[Math.floor(Math.random() * pool.length)];
    const nextCopy = nextAd.copies[Math.floor(Math.random() * nextAd.copies.length)];
    
    return { nextAd, nextCopy };
  }, []);

  const triggerEffect = useCallback(async () => {
    const effects: ('liquid' | 'steam' | 'plasma' | 'holo' | 'portal' | 'glitch' | 'vortex' | 'slideLeft')[] = 
      ['liquid', 'steam', 'plasma', 'holo', 'portal', 'glitch', 'vortex', 'slideLeft'];
    const selectedEffect = effects[Math.floor(Math.random() * effects.length)];
    
    setEffectType(selectedEffect);

    // GSAP V3 Orchestration
    if (adRef.current && containerRef.current) {
      const tl = gsap.timeline({
        onComplete: () => {
          setIsAdfree(true);
          
          // Brief "adfree" pause
          setTimeout(() => {
            const { nextAd, nextCopy } = selectNextAd();
            setCurrentAd(nextAd);
            setCurrentCopy(nextCopy);
            setIsAdfree(false);
            setEffectType('none');
            
            // Entry Animation - Randomized for dynamic feel
            requestAnimationFrame(() => {
              if (adRef.current) {
                const entryStyles = [
                  { from: { x: '100%', opacity: 0, scale: 1, rotate: 0, y: 0 }, to: { x: 0, opacity: 1, scale: 1, rotate: 0, y: 0, duration: 0.8, ease: 'power2.out' } },
                  { from: { x: '-100%', opacity: 0, scale: 1, rotate: 0, y: 0 }, to: { x: 0, opacity: 1, scale: 1, rotate: 0, y: 0, duration: 0.8, ease: 'power2.out' } },
                  { from: { y: '100%', opacity: 0, scale: 1, rotate: 0, x: 0 }, to: { y: 0, opacity: 1, scale: 1, rotate: 0, x: 0, duration: 0.8, ease: 'back.out(1.7)' } },
                  { from: { y: '-100%', opacity: 0, scale: 1, rotate: 0, x: 0 }, to: { y: 0, opacity: 1, scale: 1, rotate: 0, x: 0, duration: 0.8, ease: 'back.out(1.7)' } },
                  { from: { scale: 0, opacity: 0, rotate: -15, x: 0, y: 0 }, to: { scale: 1, opacity: 1, rotate: 0, x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.75)' } },
                  { from: { scale: 1.5, opacity: 0, rotate: 15, x: 0, y: 0 }, to: { scale: 1, opacity: 1, rotate: 0, x: 0, y: 0, duration: 0.8, ease: 'power3.out' } },
                  { from: { rotateX: 90, opacity: 0, x: 0, y: 0, scale: 1 }, to: { rotateX: 0, opacity: 1, x: 0, y: 0, scale: 1, duration: 1, ease: 'expo.out' } },
                  { from: { rotateY: 90, opacity: 0, x: 0, y: 0, scale: 0.5 }, to: { rotateY: 0, opacity: 1, x: 0, y: 0, scale: 1, duration: 0.8, ease: 'power4.out' } },
                  { from: { skewX: 30, opacity: 0, x: 50 }, to: { skewX: 0, opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' } }
                ];
                const selectedEntry = entryStyles[Math.floor(Math.random() * entryStyles.length)];
                gsap.fromTo(adRef.current, selectedEntry.from, selectedEntry.to);
              }
            });

            // Schedule next ad with dynamic interval (8-16s)
            const nextInterval = Math.floor(Math.random() * (16000 - 8000 + 1) + 8000);
            timeoutRef.current = setTimeout(triggerEffect, nextInterval);
          }, 1000); // 1s adfree gap
        }
      });

      // Exit Animations (V3 Physics)
      if (selectedEffect === 'liquid') {
        tl.to(adRef.current, { 
          skewX: 40, 
          y: 100, 
          opacity: 0, 
          filter: 'blur(15px)', 
          duration: 1.2, 
          ease: 'power2.in' 
        });
      } else if (selectedEffect === 'steam') {
        tl.to(adRef.current, { 
          y: -100, 
          opacity: 0, 
          scale: 1.5, 
          filter: 'blur(20px)',
          duration: 1, 
          ease: 'power1.in' 
        });
      } else if (selectedEffect === 'plasma') {
        tl.to(adRef.current, { 
          scale: 0, 
          opacity: 0, 
          filter: 'hue-rotate(180deg) brightness(2)',
          duration: 0.6, 
          ease: 'back.in(2)' 
        });
      } else if (selectedEffect === 'holo') {
        tl.to(adRef.current, { 
          rotateY: 360, 
          rotateX: 45,
          scale: 0, 
          opacity: 0, 
          duration: 1,
          ease: 'power3.inOut'
        });
      } else if (selectedEffect === 'glitch') {
        tl.to(adRef.current, { 
          x: () => (Math.random() - 0.5) * 50,
          y: () => (Math.random() - 0.5) * 20,
          skewX: () => (Math.random() - 0.5) * 30,
          opacity: 0,
          duration: 0.4,
          repeat: 3,
          yoyo: true,
          ease: 'none'
        }).to(adRef.current, { opacity: 0, duration: 0.1 });
      } else if (selectedEffect === 'vortex') {
        tl.to(adRef.current, { 
          rotate: 720,
          scale: 0,
          opacity: 0,
          duration: 1.2,
          ease: 'circ.in'
        });
        tl.to(containerRef.current, {
          scale: 0.9,
          duration: 0.6,
          yoyo: true,
          repeat: 1
        }, 0);
      } else if (selectedEffect === 'slideLeft') {
        tl.to(adRef.current, { 
          x: '-100%', 
          opacity: 0, 
          duration: 0.8, 
          ease: 'power2.in' 
        });
      } else if (selectedEffect === 'portal') {
        tl.to(adRef.current, {
          scale: 0,
          opacity: 0,
          filter: 'brightness(5)',
          duration: 0.6,
          ease: 'power2.in'
        });
      } else {
        tl.to(adRef.current, { 
          scale: 0, 
          rotate: -360, 
          opacity: 0, 
          duration: 0.8,
          ease: 'power4.in'
        });
      }
    }
  }, [selectNextAd]);

  useEffect(() => {
    // Initial start
    const initialInterval = Math.floor(Math.random() * (16000 - 8000 + 1) + 8000);
    timeoutRef.current = setTimeout(triggerEffect, initialInterval);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [triggerEffect]);

  // Steam Particle Effect
  useEffect(() => {
    if (effectType === 'steam' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      const particles: any[] = [];
      for (let i = 0; i < 50; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: -Math.random() * 3 - 1,
          size: Math.random() * 5 + 2,
          alpha: 1
        });
      }

      let animationFrame: number;
      const render = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.01;
          ctx.fillStyle = `rgba(200, 200, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        animationFrame = requestAnimationFrame(render);
      };
      render();
      return () => {
        cancelAnimationFrame(animationFrame);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      };
    }
  }, [effectType]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-12 overflow-hidden bg-zinc-950 rounded-2xl mt-2 border border-zinc-800/50 shadow-inner flex items-center justify-center perspective-1000"
    >
      {/* Canvas for effects */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none z-20"
      />

      {/* SVG Filters for Plasma/Liquid */}
      <svg className="hidden">
        <defs>
          <filter id="liquid-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="liquid" />
          </filter>
          <filter id="plasma-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="5" seed="2">
              <animate attributeName="baseFrequency" from="0.01" to="0.02" dur="5s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="20" />
          </filter>
        </defs>
      </svg>

      <AnimatePresence mode="wait">
        {!isAdfree && (
          <motion.a
            key={currentAd.id}
            ref={adRef}
            href={currentAd.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "absolute inset-0 flex items-center justify-between px-6 w-full h-full group transition-all z-10",
              effectType === 'liquid' && "filter-liquid",
              effectType === 'plasma' && "filter-plasma"
            )}
            whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(99, 102, 241, 0.4)" }}
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br text-white shadow-lg",
                currentAd.color
              )}>
                {currentAd.icon}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase opacity-50">Sponsored</span>
                  <span className="text-xs font-black text-white tracking-widest uppercase">{currentAd.title}</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[200px] sm:max-w-md">
                  {currentCopy.description}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 ml-4 bg-indigo-600/20 px-4 py-1.5 rounded-full backdrop-blur-md border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <span className="text-[10px] font-black text-indigo-400 group-hover:text-white uppercase tracking-widest">
                {currentCopy.cta}
              </span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </motion.a>
        )}
      </AnimatePresence>

      {isAdfree && effectType !== 'none' && (
        <div className="absolute inset-0 flex items-center justify-center z-30">
          {/* Transition text removed to avoid distracting viewers */}
        </div>
      )}

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .filter-liquid { filter: url(#liquid-filter); }
        .filter-plasma { filter: url(#plasma-filter); }
        
        @keyframes portal-ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }
        
        .portal-effect::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%);
          animation: portal-ripple 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function BookOpen(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
}
