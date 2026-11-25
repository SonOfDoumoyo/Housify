import { useUser } from "../contexts/userContext";

export function useUserPage() {
  const { currentUser, loading } = useUser();
  return { currentUser, loading, error: "" };
}
