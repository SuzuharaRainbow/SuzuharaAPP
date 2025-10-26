import React, { useEffect, useMemo } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import MediaCard from "../components/MediaCard";
import { useCategoryMedia } from "../hooks/useCategoryMedia";
import { useHomeSections } from "../hooks/useHomeSections";

const PAGE_SIZE = 12;

export default function CategoryCollection() {
  const { key } = useParams();
  const [params, setParams] = useSearchParams();
  const type = params.get("type") || "all";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10));

  const { data: sections, isLoading: sectionsLoading } = useHomeSections();
  const section = sections?.find((item) => item.key === key);

  const albumIds = useMemo(() => {
    if (!section) {
      return [];
    }
    return section.album_ids || [];
  }, [section]);

  const { data, isLoading, isError, error, isFetching } = useCategoryMedia({
    albumIds,
    page,
    size: PAGE_SIZE,
    type,
  });

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showInitialLoading = isLoading && items.length === 0;
  const showEmptyState = !showInitialLoading && items.length === 0;

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
    if (nextPage === page || nextPage < 1 || nextPage > totalPages) {
      return;
    }
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next, { replace: true });
  };

  if (sectionsLoading) {
    return (
      <section>
        <header className="page-header">
          <h2 className="page-title">加载分类中…</h2>
        </header>
      </section>
    );
  }

  if (!section) {
    return (
      <section>
        <header className="page-header">
          <h2 className="page-title">分类未找到</h2>
          <p className="page-subtitle">请返回首页重新选择分类。</p>
        </header>
        <Link to="/" className="button-secondary" style={{ padding: "8px 16px" }}>
          返回首页
        </Link>
      </section>
    );
  }

  return (
    <section>
      <header className="page-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="page-title">{section.title}</h2>
          <Link to="/" className="button-secondary" style={{ padding: "6px 14px" }}>
            返回首页
          </Link>
        </div>
      </header>

      {albumIds.length === 0 && (
        <div style={{ color: "rgba(50,44,84,0.6)", marginBottom: 24 }}>
          未找到与「{section.title}」匹配的相册，请前往控制中心的「主页」设置中挂载或创建相册后再试。
        </div>
      )}

      {albumIds.length > 0 && (
        <>
          {showInitialLoading && <div>加载 {section.title} 内容中…</div>}
          {isError && <div style={{ color: "#dc2626" }}>{error?.message || "加载失败"}</div>}

          {!showInitialLoading && !isError && (
            <>
              {showEmptyState ? (
                <div style={{ color: "rgba(50,44,84,0.6)" }}>暂时没有内容，稍后再来看看吧。</div>
              ) : (
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
                  {isFetching && !showInitialLoading && (
                    <div style={{ marginTop: 12, textAlign: "center", fontSize: 13, color: "rgba(50,44,84,0.6)" }}>
                      正在加载更多内容…
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
