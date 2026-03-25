import React, { useState, useEffect } from 'react';
import { Search, User, MessageSquare, Shield, Check, Loader2 } from 'lucide-react';
import { db, collection, onSnapshot, query, where } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DirectoryProps {
  onStartChat: (userId: string, userName: string, userPhoto?: string) => void;
  currentUserId: string;
}

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
}

export function Directory({ onStartChat, currentUserId }: DirectoryProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userList = snapshot.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== currentUserId);
      setUsers(userList);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [currentUserId]);

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-white h-full overflow-hidden font-sans">
      <div className="p-8 border-b border-zinc-100 bg-zinc-50/30">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-zinc-950 mb-2 tracking-tight">Business Directory</h1>
          <p className="text-zinc-500 text-sm font-medium mb-8">Connect with your team members across the organization.</p>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-zinc-300 animate-spin mb-4" />
              <p className="text-zinc-400 text-sm font-medium">Loading organization directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-zinc-200" />
              </div>
              <p className="text-zinc-500 font-medium">No team members found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user.uid}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group p-6 bg-white border border-zinc-100 rounded-3xl hover:border-zinc-950 hover:shadow-xl hover:shadow-zinc-950/5 transition-all duration-300 flex items-center gap-5 relative overflow-hidden"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center shrink-0 overflow-hidden border border-zinc-100 group-hover:scale-105 transition-transform duration-500">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-8 h-8 text-zinc-300" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-zinc-950 truncate">{user.displayName || 'Anonymous'}</h3>
                        {user.role === 'admin' && (
                          <Shield className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate mb-4 font-medium">{user.email}</p>
                      
                      <button
                        onClick={() => onStartChat(user.uid, user.displayName || 'Anonymous', user.photoURL)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Send Message
                      </button>
                    </div>

                    <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
