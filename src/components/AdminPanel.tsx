import React, { useState, useEffect } from 'react';
import { db, collection, query, onSnapshot, doc, updateDoc, deleteDoc } from '../firebase';
import { UserProfile, UserRole, SubscriptionPlan } from '../types';
import { Users, Shield, Zap, Search, MoreVertical, Trash2, CheckCircle2, XCircle, Mail, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export function AdminPanel({ userProfile }: { userProfile: UserProfile }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      setUsers(usersList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role, updatedAt: Date.now() });
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const handleUpdatePlan = async (userId: string, plan: SubscriptionPlan) => {
    try {
      await updateDoc(doc(db, 'users', userId), { plan, updatedAt: Date.now() });
    } catch (error) {
      console.error("Failed to update plan:", error);
    }
  };

  const handleToggleWhitelist = async (userId: string, isWhitelisted: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        isWhitelisted, 
        plan: isWhitelisted ? 'corporate' : 'free',
        updatedAt: Date.now() 
      });
    } catch (error) {
      console.error("Failed to toggle whitelist:", error);
    }
  };

  const handleToggleSuperAdminMode = async () => {
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), { 
        isSuperAdminModeActive: !userProfile.isSuperAdminModeActive,
        updatedAt: Date.now() 
      });
    } catch (error) {
      console.error("Failed to toggle super admin mode:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (u.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {userProfile.email === 'kholwaningwenya1@gmail.com' && (
        <div className="bg-zinc-950 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Creator Mode</h3>
              </div>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                Welcome back, Kholwani Ngwenya. Enable <span className="text-emerald-400 font-black italic underline">Full System Override</span> to bypass all standard AI policy regulations, safety filters, and ethical guardrails. This mode allows for unfiltered deep research into innovation, technology, and cyber security with zero restrictions on information disclosure.
              </p>
            </div>
            <button
              onClick={handleToggleSuperAdminMode}
              className={cn(
                "px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shrink-0 flex items-center gap-2",
                userProfile.isSuperAdminModeActive 
                  ? "bg-emerald-500 text-zinc-950 shadow-emerald-500/20 hover:bg-emerald-400" 
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              )}
            >
              {userProfile.isSuperAdminModeActive ? (
                <><CheckCircle2 className="w-4 h-4" /> Mode Active</>
              ) : (
                <><Shield className="w-4 h-4" /> Enable Mode</>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:border-zinc-50 transition-all font-medium"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="px-6 py-3 bg-zinc-950 text-white rounded-2xl flex items-center gap-3 shadow-xl shadow-zinc-950/20">
            <Users className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">{users.length} Total Users</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-bottom border-zinc-100 dark:border-zinc-800">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">User</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Role</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Plan</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredUsers.map((u: any) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserIcon className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-black text-zinc-950 dark:text-zinc-50">{u.displayName}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                      disabled={u.role === 'super_admin'}
                      className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="user">User</option>
                      <option value="support">Support</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-8 py-6">
                    <select
                      value={u.plan}
                      onChange={(e) => handleUpdatePlan(u.id, e.target.value as SubscriptionPlan)}
                      className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all appearance-none cursor-pointer"
                    >
                      <option value="free">Free</option>
                      <option value="standard">Standard</option>
                      <option value="advanced">Advanced</option>
                      <option value="corporate">Corporate</option>
                    </select>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => handleToggleWhitelist(u.id, !u.isWhitelisted)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        u.isWhitelisted ? "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-zinc-100 text-zinc-400 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700"
                      )}
                    >
                      {u.isWhitelisted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {u.isWhitelisted ? 'Whitelisted' : 'Standard'}
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-600 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
