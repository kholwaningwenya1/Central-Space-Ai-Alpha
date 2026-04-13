import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { CreditCard, Zap, Shield, Globe, Check, Loader2 } from 'lucide-react';
import { db, doc, setDoc, updateDoc } from '../firebase';
import { UserProfile, SubscriptionPlan, Transaction } from '../types';
import { cn } from '../lib/utils';

interface BillingProps {
  userProfile: UserProfile;
  onPlanUpdate: (plan: SubscriptionPlan) => void;
}

const PLANS = [
  {
    id: 'free' as SubscriptionPlan,
    name: 'Free',
    price: 0,
    description: 'Perfect for getting started',
    features: ['Basic chat & Unlimited Reactions', '1 Workspace', '1 Translation/day', '1 Audio Generation/day', '1 Sketch/day', '1 Export & Download/day']
  },
  {
    id: 'standard' as SubscriptionPlan,
    name: 'Standard',
    price: 9.99,
    description: 'For power users',
    features: ['Unlimited chat', '5 Workspaces', '20 Translations/day', '20 Audios & Sketches/day', '20 Exports & Downloads/day', 'Document editor & Custom bots']
  },
  {
    id: 'advanced' as SubscriptionPlan,
    name: 'Advanced',
    price: 19.99,
    description: 'The complete experience',
    features: ['Unlimited workspaces', '60 Translations/day', '60 Audios & Sketches/day', '60 Exports & Downloads/day', 'Visual canvas & Media hub', 'Custom tools']
  },
  {
    id: 'corporate' as SubscriptionPlan,
    name: 'Corporate',
    price: 49.99,
    description: 'Comprehensive solution for teams and organizations',
    features: [
      'Unlimited everything',
      'Priority 24/7 support',
      'SSO & SAML Integration (Manual Setup)',
      'Advanced Team Management (Manual Setup)',
      'Audit Logs & Analytics (On Request)',
      'Custom Domain & Whitelisting (Manual Setup)',
      'Dedicated Account Manager'
    ]
  }
];

export function Billing({ userProfile, onPlanUpdate }: BillingProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const calculateTotal = (price: number) => {
    const fee = price * 0.005; // 0.5% system charge
    return (price + fee).toFixed(2);
  };

  const handlePaymentSuccess = async (details: any, plan: SubscriptionPlan, amount: number) => {
    setIsProcessing(true);
    try {
      const transactionId = `tx_${Date.now()}`;
      const transaction: Transaction = {
        id: transactionId,
        userId: userProfile.uid,
        amount: amount,
        currency: 'USD',
        status: 'completed',
        plan: plan,
        paypalOrderId: details.id,
        systemFee: amount * 0.005,
        timestamp: Date.now()
      };

      await setDoc(doc(db, 'transactions', transactionId), transaction);
      await updateDoc(doc(db, 'users', userProfile.uid), {
        plan: plan,
        updatedAt: Date.now()
      });

      onPlanUpdate(plan);
    } catch (error) {
      console.error("Payment processing failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div 
            key={plan.id}
            className={cn(
              "bg-white border rounded-[2rem] p-8 flex flex-col transition-all duration-500",
              userProfile.plan === plan.id ? "border-zinc-950 ring-4 ring-zinc-950/5 scale-105 z-10 shadow-2xl" : "border-zinc-200 hover:border-zinc-400 shadow-sm"
            )}
          >
            <div className="mb-6">
              <h3 className="text-xl font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-tight mb-1">{plan.name}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-950 dark:text-zinc-50">${plan.price}</span>
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">/mo</span>
              </div>
              {plan.price > 0 && (
                <p className="text-[10px] text-zinc-400 font-bold mt-1">+ 0.5% system fee</p>
              )}
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-zinc-950 dark:text-zinc-50" />
                  </div>
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium leading-tight">{feature}</span>
                </div>
              ))}
            </div>

            {userProfile.plan === plan.id ? (
              <div className="w-full py-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl text-xs font-black uppercase tracking-widest text-center border border-emerald-100 dark:border-emerald-900/50">
                Current Plan
              </div>
            ) : plan.price === 0 ? (
              <button 
                onClick={() => onPlanUpdate('free')}
                className="w-full py-4 bg-zinc-100 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
              >
                Downgrade
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 mb-4">
                  <h4 className="text-[10px] font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <CreditCard className="w-3 h-3" /> Payment Options
                  </h4>
                  <div className="space-y-2">
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase">Debit or Credit Card:</span> Pay securely using your Visa, Mastercard, or Amex via our encrypted gateway.
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      <span className="font-bold text-zinc-900 dark:text-zinc-200 uppercase">Pay Later:</span> Split your payment into interest-free installments (Available via PayPal in select regions).
                    </div>
                  </div>
                </div>
                <PayPalScriptProvider options={{ clientId: process.env.VITE_PAYPAL_CLIENT_ID || "test" }}>
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "pill", label: "subscribe" }}
                    createOrder={(data, actions) => {
                      return actions.order.create({
                        intent: "CAPTURE",
                        purchase_units: [
                          {
                            amount: {
                              value: calculateTotal(plan.price),
                              currency_code: 'USD'
                            },
                            description: `${plan.name} Subscription`,
                          },
                        ],
                      });
                    }}
                    onApprove={async (data, actions) => {
                      if (actions.order) {
                        const details = await actions.order.capture();
                        handlePaymentSuccess(details, plan.id, plan.price);
                      }
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-zinc-950 rounded-[2.5rem] p-12 text-white overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl space-y-6">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Need a custom solution?</h2>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              For large organizations requiring custom integrations, dedicated support, and advanced security features, our Enterprise team is ready to help.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Support</span>
                <div className="flex flex-col gap-1">
                  <a href="mailto:centralspace00@gmail.com" className="text-xs font-medium text-white hover:text-emerald-400 transition-colors">centralspace00@gmail.com</a>
                  <a href="mailto:kholwani141@gmail.com" className="text-xs font-medium text-white hover:text-emerald-400 transition-colors">kholwani141@gmail.com</a>
                  <a href="mailto:central46labs@gmail.com" className="text-xs font-medium text-white hover:text-emerald-400 transition-colors">central46labs@gmail.com</a>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Direct Contact</span>
                <div className="flex flex-col gap-1">
                  <a href="tel:+263782524097" className="text-xs font-medium text-white hover:text-emerald-400 transition-colors">Call: +263 782 524 097</a>
                  <a href="https://wa.me/+263777315944" target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                    WhatsApp: +263 777 315 944
                  </a>
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.location.href = 'mailto:centralspace00@gmail.com'}
              className="px-8 py-4 bg-white text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
            >
              Contact Sales
            </button>
          </div>
          <div className="w-48 h-48 bg-white/5 rounded-[3rem] flex items-center justify-center rotate-12 border border-white/10 shrink-0">
            <Shield className="w-24 h-24 text-white/20" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48" />
      </div>
    </div>
  );
}
