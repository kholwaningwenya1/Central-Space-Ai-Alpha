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
    features: ['Basic chat', '1 Workspace', 'Limited bots', 'Standard AI models']
  },
  {
    id: 'standard' as SubscriptionPlan,
    name: 'Standard',
    price: 9.99,
    description: 'For power users',
    features: ['Unlimited chat', '5 Workspaces', 'Custom bots', 'Document editor', 'Advanced AI models']
  },
  {
    id: 'advanced' as SubscriptionPlan,
    name: 'Advanced',
    price: 19.99,
    description: 'The complete experience',
    features: ['Unlimited workspaces', 'Visual canvas', 'Media hub', 'Priority AI access', 'Custom tools']
  },
  {
    id: 'corporate' as SubscriptionPlan,
    name: 'Corporate',
    price: 49.99,
    description: 'For teams and organizations',
    features: ['Everything in Advanced', 'Priority support', 'Whitelisting', 'Custom domain', 'Dedicated resources']
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
              <h3 className="text-xl font-black text-zinc-950 uppercase tracking-tight mb-1">{plan.name}</h3>
              <p className="text-xs text-zinc-500 font-medium">{plan.description}</p>
            </div>

            <div className="mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-950">${plan.price}</span>
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">/mo</span>
              </div>
              {plan.price > 0 && (
                <p className="text-[10px] text-zinc-400 font-bold mt-1">+ 0.5% system fee</p>
              )}
            </div>

            <div className="flex-1 space-y-4 mb-10">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-zinc-950" />
                  </div>
                  <span className="text-xs text-zinc-600 font-medium leading-tight">{feature}</span>
                </div>
              ))}
            </div>

            {userProfile.plan === plan.id ? (
              <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest text-center border border-emerald-100">
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
                <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test" }}>
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
          <div className="max-w-xl space-y-4">
            <h2 className="text-3xl font-black tracking-tighter uppercase italic">Need a custom solution?</h2>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              For large organizations requiring custom integrations, dedicated support, and advanced security features, our Enterprise team is ready to help.
            </p>
            <button 
              onClick={() => window.location.href = 'mailto:sales@example.com'}
              className="px-8 py-4 bg-white text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
            >
              Contact Sales
            </button>
          </div>
          <div className="w-48 h-48 bg-white/5 rounded-[3rem] flex items-center justify-center rotate-12 border border-white/10">
            <Shield className="w-24 h-24 text-white/20" />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48" />
      </div>
    </div>
  );
}
