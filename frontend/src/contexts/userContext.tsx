import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { User } from "../schemas/usertype";
import { useLocation } from "react-router-dom";
import { api } from "../interceptors/api";

type UserContextType = {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  fetchUser: () => Promise<void>;
  loading: boolean;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const publicRoutes = ["/create-account", "/sign-in", "/verify-email", "/", "/browse", "/complete-profile", "/choose-role"];
  const isPublicRoute =
    publicRoutes.includes(location.pathname) || location.pathname.startsWith("/listing-details");

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/user/current_user", { withCredentials: true });
      setCurrentUser(response.data);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // The session must survive public pages: browsing homes must never log
  // the user out. So the current user is fetched on EVERY route (public
  // pages render while it loads; only private pages wait on it).
  useEffect(() => {
    if (!currentUser) void fetchUser();
  }, [location.pathname, currentUser, fetchUser]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, fetchUser, loading }}>
      {loading && !isPublicRoute ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-400 text-2xl font-bold text-white">Loading Housify...</div>
      ) : children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used inside UserProvider");
  return context;
}
