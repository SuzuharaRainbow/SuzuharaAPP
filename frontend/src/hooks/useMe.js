import { useQuery } from "@tanstack/react-query";
import api, { ApiError } from "../api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const data = await api.get("/auth/me");
        return data?.user ?? null;
      } catch (err) {
        if (err instanceof ApiError && err.code === 40100) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useRequireDeveloper() {
  const query = useMe();
  const user = query.data ?? null;
  const isDeveloper = !!user && user.role === "developer";
  return { ...query, user, isDeveloper };
}
