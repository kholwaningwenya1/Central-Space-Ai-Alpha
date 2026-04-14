import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ExternalLink, Server, Shield, Zap, Globe, Plane, ShoppingCart, Store, MessageSquare, Video, Mail, DollarSign } from 'lucide-react';

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
}

const ADS: Ad[] = [
  {
    id: 'blotato-referral',
    title: 'Blotato',
    link: 'https://blotato.com/?ref=kholwani',
    icon: <Video className="w-4 h-4" />,
    color: 'from-orange-500 to-red-600',
    copies: [
      { description: 'Create viral reels & post everywhere in 1 click.', cta: 'Go Viral' },
      { description: 'One click to share reels across all platforms.', cta: 'Start Sharing' },
      { description: 'Automate your social media reels instantly.', cta: 'Try Blotato' },
      { description: 'The easiest way to create & sync social reels.', cta: 'Get Started' },
      { description: 'Blast your reels to all socials with one tap.', cta: 'Boost Reach' },
      { description: 'Professional reels made easy & shared fast.', cta: 'Create Now' },
      { description: 'Sync your video content globally in seconds.', cta: 'Sync Now' },
      { description: 'Turn one video into 10 social posts instantly.', cta: 'Multiply Content' },
      { description: 'Effortless reel creation for all platforms.', cta: 'Join Blotato' },
      { description: 'Dominate social media with 1-click reels.', cta: 'Dominate Now' }
    ]
  },
  {
    id: 'getresponse-recurring',
    title: 'GetResponse',
    link: 'https://www.getresponse.com?a=rwHyDqA3aE',
    icon: <Mail className="w-4 h-4" />,
    color: 'from-blue-500 to-indigo-600',
    copies: [
      { description: 'Powerful email marketing that grows with you.', cta: 'Start Free' },
      { description: 'Automate your emails & boost conversions.', cta: 'Boost Sales' },
      { description: 'The all-in-one platform for email success.', cta: 'Try Now' },
      { description: 'Send better emails & build lasting relations.', cta: 'Get Response' },
      { description: 'Scale your business with smart email tools.', cta: 'Scale Now' },
      { description: 'Professional email templates that convert.', cta: 'View Templates' },
      { description: 'Reach your audience\'s inbox every time.', cta: 'Improve Reach' },
      { description: 'Email marketing made simple and effective.', cta: 'Join Today' },
      { description: 'Smart automation for your email campaigns.', cta: 'Automate Now' },
      { description: 'Grow your list faster with GetResponse.', cta: 'Grow List' }
    ]
  },
  {
    id: 'getresponse-bounty',
    title: 'GR Bounty',
    link: 'https://www.getresponse.com?ab=9JwxvqAgtt',
    icon: <DollarSign className="w-4 h-4" />,
    color: 'from-emerald-500 to-teal-600',
    copies: [
      { description: 'Join the bounty program & earn big rewards.', cta: 'Join Bounty' },
      { description: 'Get paid for every referral you bring in.', cta: 'Start Earning' },
      { description: 'High-paying bounty program for marketers.', cta: 'Earn Now' },
      { description: 'Turn your traffic into cash with our bounty.', cta: 'Get Paid' },
      { description: 'The most rewarding bounty program online.', cta: 'Sign Up' },
      { description: 'Earn $100 for every sale you refer today.', cta: 'Claim Bounty' },
      { description: 'Promote GetResponse & get instant payouts.', cta: 'Promote Now' },
      { description: 'Lucrative rewards for top-tier referrers.', cta: 'Start Referring' },
      { description: 'Fast-track your earnings with our bounty.', cta: 'Join Now' },
      { description: 'Simple referrals, massive bounty rewards.', cta: 'Earn $100' }
    ]
  },
  {
    id: 'amazon-shopping',
    title: 'Amazon',
    link: 'https://go.urtrackinglink.com/aff_c?offer_id=685&aff_id=141265',
    icon: <ShoppingCart className="w-4 h-4" />,
    color: 'from-amber-500 to-yellow-600',
    copies: [
      { description: 'Buy It Smarter, Get It Quicker & Safer With Amazon!', cta: 'Shop Now' },
      { description: 'Huge deals on electronics and home essentials.', cta: 'View Deals' },
      { description: 'Fast shipping and secure payments on all orders.', cta: 'Buy Now' }
    ]
  },
  {
    id: 'whatchimp-ad',
    title: 'Whatchimp',
    link: 'https://whatchimp.com/special-offer/join/oc2uxono/',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'from-green-600 to-emerald-500',
    copies: [
      { description: "Advertise infinitely on whatsapp without getting burned.", cta: 'Buy API' },
      { description: "Scale your WhatsApp marketing with official API.", cta: 'Get Started' }
    ]
  },
  {
    id: 'nomad-esim',
    title: 'Nomad eSIM',
    link: 'https://go.urtrackinglink.com/aff_c?offer_id=1904&aff_id=141265',
    icon: <Globe className="w-4 h-4" />,
    color: 'from-indigo-500 to-purple-600',
    copies: [
      { description: 'Finding reliable travel data made easy.', cta: 'eSIM Plans' },
      { description: 'Stay connected globally with affordable eSIMs.', cta: 'View Plans' }
    ]
  },
  {
    id: 'shopify-ecommerce',
    title: 'Shopify',
    link: 'https://go.urtrackinglink.com/aff_c?offer_id=1724&aff_id=141265',
    icon: <Store className="w-4 h-4" />,
    color: 'from-green-500 to-emerald-600',
    copies: [
      { description: 'Support the next generation of entrepreneurs.', cta: 'Start Selling' },
      { description: 'Build your dream online store in minutes.', cta: 'Free Trial' }
    ]
  },
  {
    id: 'gethost-hosting',
    title: 'Gethost',
    link: 'https://gethost.co.zw/clients/aff.php?aff=101',
    icon: <Server className="w-4 h-4" />,
    color: 'from-blue-600 to-indigo-700',
    copies: [
      { description: 'Zimbabwe’s Leading Web Hosting & Domain Provider.', cta: 'Get Hosting' },
      { description: 'Reliable SSD hosting with 99.9% uptime.', cta: 'Host Now' }
    ]
  }
];

export function AdBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCopy, setCurrentCopy] = useState<AdCopy>(ADS[0].copies[0]);

  useEffect(() => {
    // Random rotation between 8 to 14 seconds
    const intervalTime = Math.floor(Math.random() * (14000 - 8000 + 1) + 8000);
    
    const timer = setInterval(() => {
      const nextIndex = (currentIndex + 1) % ADS.length;
      const nextAd = ADS[nextIndex];
      const randomCopy = nextAd.copies[Math.floor(Math.random() * nextAd.copies.length)];
      
      setCurrentIndex(nextIndex);
      setCurrentCopy(randomCopy);
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
          key={`${currentAd.id}-${currentCopy.description}`}
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
              <span className="text-[11px] text-zinc-300 font-medium truncate hidden sm:inline-block drop-shadow-sm">— {currentCopy.description}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 ml-4 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 group-hover:bg-white/20 transition-all">
            <span className={`text-[10px] font-bold text-white uppercase tracking-wider`}>
              {currentCopy.cta}
            </span>
            <ExternalLink className="w-3 h-3 text-white/70 group-hover:text-white transition-colors" />
          </div>
        </motion.a>
      </AnimatePresence>
    </div>
  );
}
