import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getWorkflowToken, removeWorkflowToken, decodeToken } from "@/lib/workflowApi";

export interface WorkflowUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: WorkflowUser | null;
  loading: boolean;
  /** Call after a successful login to refresh the context from localStorage. */
  refreshAuth: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshAuth: () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

function getUserFromToken(): WorkflowUser | null {
  const token = getWorkflowToken();
  if (!token) return null;

  const payload = decodeToken(token);
  if (!payload) return null;

  // Check expiration
  const exp = payload.exp as number | undefined;
  if (exp && exp * 1000 < Date.now()) {
    removeWorkflowToken();
    return null;
  }

  return {
    id: (payload.id as string) ?? "",
    email: (payload.email as string) ?? "",
    name: (payload.name as string) ?? "",
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<WorkflowUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = () => {
    setUser(getUserFromToken());
    setLoading(false);
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const signOut = () => {
    removeWorkflowToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
