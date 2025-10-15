import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api";

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function useMediaList(params) {
  const cleaned = cleanParams(params);
  const key = [
    "media",
    cleaned.album_id ?? "all",
    cleaned.type ?? "all",
    Number(cleaned.page ?? 1),
    Number(cleaned.size ?? 12),
  ];

  const albumKey = cleaned.album_id ?? "all";
  const previousAlbumRef = useRef(albumKey);
  const isSameAlbum = previousAlbumRef.current === albumKey;

  useEffect(() => {
    previousAlbumRef.current = albumKey;
  }, [albumKey]);

  return useQuery({
    queryKey: key,
    queryFn: () => api.get("/media", { params: cleaned }),
    keepPreviousData: isSameAlbum,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
