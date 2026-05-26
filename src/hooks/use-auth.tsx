
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut as firebaseSignOut, 
    User,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
    sendPasswordResetEmail,
    createUserWithEmailAndPassword,
    getAuth,
    updateProfile,
} from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  reauthenticate: (password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  createUser: (email: string, password: string) => Promise<any>;
  updateUserProfile: (name: string, photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth(app);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const signIn = useCallback((email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, [auth]);

  const signOut = useCallback(() => {
    router.push('/');
    return firebaseSignOut(auth);
  }, [auth, router]);

  const reauthenticate = useCallback((password: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("User not authenticated");
    }
    const credential = EmailAuthProvider.credential(currentUser.email!, password);
    return reauthenticateWithCredential(currentUser, credential);
  },[auth]);

  const changePassword = useCallback((password: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }
      return updatePassword(currentUser, password);
  }, [auth]);

  const sendPasswordReset = useCallback((email: string) => {
      return sendPasswordResetEmail(auth, email);
  }, [auth]);
  
  const createUser = useCallback((email: string, password: string) => {
      return createUserWithEmailAndPassword(auth, email, password);
  }, [auth]);

  const updateUserProfile = useCallback(async (name: string, photoURL: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          throw new Error("User not authenticated");
      }
      await updateProfile(currentUser, { displayName: name, photoURL: photoURL });
      // Manually update the user state to reflect changes immediately
      setUser(auth.currentUser);
  }, [auth]);


  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, reauthenticate, changePassword, sendPasswordReset, createUser, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
