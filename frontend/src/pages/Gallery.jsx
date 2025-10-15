import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MediaCard from "../components/MediaCard";
import { useMediaList } from "../hooks/useMediaList";

export default function Gallery() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") || "all";
  const page = Number.parseInt(params.get("page") || "1", 10);
  const size = 12;

  const { data, isLoading, isError, error, isFetching } = useMediaList({
    type: type === "all" ? undefined : type,
    page,
    size,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / size));

  const showInitialLoading = isLoading && items.length === 0;
  const isEmpty = !showInitialLoading && items.length === 0;

  useEffect(() => {
    if (!showInitialLoading && page > totalPages) {
      const safePage = Math.max(1, totalPages);
      if (safePage !== page) {
        const next = new URLSearchParams(params);
        next.set("page", String(safePage));
        setParams(next, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInitialLoading, page, totalPages]);

  const goToPage = (nextPage) => {
    if (nextPage === page || nextPage < 1 || nextPage > totalPages) return;
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next, { replace: true });
  };

  return (
    <section>
      <header className="page-header">
        <h2 className="page-title">媒体库</h2>
        <p className="page-subtitle">支持按类型筛选，可随时进入详情页查看大图或视频。</p>
      </header>
      {showInitialLoading && <div>加载媒体中…</div>}
      {isError && <div style={{ color: "#dc2626" }}>{error?.message || "加载失败"}</div>}
      {!isEmpty ? (
        <>
          <div className="card-grid">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isFetching}
              className="button-secondary"
              >
              上一页
            </button>
            <span style={{ alignSelf: "center", fontSize: 14 }}>
              第 {page} 页 / 共 {totalPages} 页
            </span>
            <button
              type="button"
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || isFetching}
              className="button-secondary"
            >
              下一页
            </button>
          </div>
          {isFetching && !showInitialLoading && <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: "rgba(50,44,84,0.6)" }}>正在加载更多媒体…</div>}
        </>
      ) : (
        !showInitialLoading && <div>暂无媒体内容</div>
      )}
    </section>
  );
}
