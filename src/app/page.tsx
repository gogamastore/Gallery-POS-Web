
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import LoginForm from "@/components/login-form";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      const checkRoleAndRedirect = async () => {
        try {
          const userDocRef = doc(db, "user", user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role === 'reseller') {
              router.replace('/reseller');
            } else { // 'admin' or any other role
              router.replace('/dashboard');
            }
          } else {
            // If for some reason the user exists in Auth but not in Firestore,
            // default them to dashboard. This might happen for the initial admin.
            router.replace('/dashboard');
          }
        } catch (error) {
          console.error("Error checking user role, defaulting to dashboard:", error);
          // Fallback to dashboard in case of a Firestore error
          router.replace('/dashboard');
        }
      };
      
      checkRoleAndRedirect();

    } 
    
  }, [user, loading, router]);


  if (loading || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <LoginForm />;
}
