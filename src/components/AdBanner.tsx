import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Server, Shield, Zap, Globe, Plane, ShoppingCart, Store, MessageSquare } from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  description: string;
  cta: string;
  link: string;
  icon: React.ReactNode;
  color: string;
}

const ADS: Ad[] = [
  {
    id: 'amazon-shopping',
    title: 'Amazon',
    description: 'Buy It Smarter, Get It Quicker & Safer With Amazon!',
    cta: 'Shop Now',
    link: 'https://go.urtrackinglink.com/aff_c?offer_id=685&aff_id=141265',
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'from-amber-500 to-yellow-600',
  },
  {
    id: 'whatchimp-ad',
    title: 'Whatchimp',
    description: "Advertise infinitely on whatsapp with out getting burned ' buy WhatsApp APl",
    cta: 'Buy WhatsApp API',
    link: 'https://whatchimp.com/special-offer/join/oc2uxono/',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'from-green-600 to-emerald-500',
  },
  {
    id: 'nomad-esim',
    title: 'Nomad eSIM',
    description: 'Finding reliable travel data',
    cta: 'Trending eSIM Plans',
    link: 'https://go.urtrackinglink.com/aff_c?offer_id=1904&aff_id=141265',
    icon: <Globe className="w-4 h-4" />,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'shopify-ecommerce',
    title: 'Shopify',
    description: 'Shopify is supporting the next generation of entrepreneurs, the world’s biggest brands, and everyone in between',
    cta: 'Start Selling',
    link: 'https://go.urtrackinglink.com/aff_c?offer_id=1724&aff_id=141265',
    icon: <Store className="w-4 h-4" />,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'air-india',
    title: 'Air India',
    description: 'Book Air India Online Booking — Start creating Book Air India booking online easily',
    cta: 'Book Now',
    link: 'https://go.urtrackinglink.com/aff_c?offer_id=1777&aff_id=141265',
    icon: <Plane className="w-4 h-4" />,
    color: 'from-red-500 to-orange-600',
  },
  {
    id: 'aviator-betting',
    title: 'Aviator',
    description: 'Signup & Play | Spin & Win | Learn how to win big.',
    cta: 'Play Now',
    link: 'https://data527.click/c26f429e554649afce43/e0009e4b1c/?placementName=default',
    icon: <Plane className="w-4 h-4" />,
    color: 'from-red-600 to-orange-500',
  },
  {
    id: 'hostry-main',
    title: 'Hostry',
    description: 'Reliable & well-established hosting service provider.',
    cta: 'Visit Page',
    link: 'https://hostry.com/?ref=V3F2V7E5',
    icon: <Server className="w-4 h-4" />,
    color: 'from-rose-500 to-orange-500',
  },
  {
    id: 'hostry-cdn',
    title: 'Hostry CDN',
    description: 'Lightning fast global content delivery network.',
    cta: 'Get Started',
    link: 'https://hostry.com/?ref=V3F2V7E5',
    icon: <Globe className="w-4 h-4" />,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'hostry-ssl',
    title: 'Hostry SSL',
    description: 'Secure your website with top-tier SSL certificates.',
    cta: 'Secure Now',
    link: 'https://hostry.com/?ref=V3F2V7E5',
    icon: <Shield className="w-4 h-4" />,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'hostry-vps',
    title: 'Hostry VPS',
    description: 'High-performance virtual private servers for your apps.',
    cta: 'Deploy',
    link: 'https://hostry.com/?ref=V3F2V7E5',
    icon: <Zap className="w-4 h-4" />,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'gethost-hosting',
    title: 'Gethost',
    description: 'Empower Your Online Presence with Zimbabwe’s Leading Web Hosting & Domain Provider.',
    cta: 'Get Hosting',
    link: 'https://gethost.co.zw/clients/aff.php?aff=101',
    icon: <Server className="w-4 h-4" />,
    color: 'from-blue-600 to-indigo-700',
  }
];

export function AdBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Random rotation between 8 to 14 seconds
    const intervalTime = Math.floor(Math.random() * (14000 - 8000 + 1) + 8000);
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ADS.length);
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const currentAd = ADS[currentIndex];

  return (
    <div className="relative w-full h-10 overflow-hidden bg-zinc-950 rounded-2xl mt-2 border border-zinc-800/50 shadow-inner flex items-center justify-center">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4px_4px]" />
      
      <AnimatePresence mode="popLayout">
        <motion.a
          key={currentAd.id}
          href={currentAd.link}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-between px-5 w-full h-full group hover:bg-zinc-900/50 transition-colors z-10"
        >
          <div className="flex items-center gap-4 overflow-hidden">
            <div className={`flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br ${currentAd.color} text-white shadow-lg shadow-black/50`}>
              {currentAd.icon}
            </div>
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-xs font-black text-white tracking-widest uppercase drop-shadow-md">{currentAd.title}</span>
              <span className="text-[11px] text-zinc-300 font-medium truncate hidden sm:inline-block drop-shadow-sm">— {currentAd.description}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 ml-4 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all">
            <span className={`text-[10px] font-bold text-white uppercase tracking-wider`}>
              {currentAd.cta}
            </span>
            <ExternalLink className="w-3 h-3 text-white/70 group-hover:text-white transition-colors" />
          </div>
        </motion.a>
      </AnimatePresence>
    </div>
  );
}
