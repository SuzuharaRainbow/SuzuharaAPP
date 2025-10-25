import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api";
import { useRequireDeveloper } from "../hooks/useMe";
import { useHomeSections } from "../hooks/useHomeSections";
import { useAlbums } from "../hooks/useAlbums";

const cardStyle = {
  background: "var(--card-surface)",
  border: "1px solid var(--card-border)",
  borderRadius: 18,
  boxShadow: "var(--shadow-soft)",
};

const TAB_OPTIONS = [
  { id: "home", label: "主页" },
  { id: "albums", label: "相册" },
];

function TabSwitcher({ activeTab, onChange }) {
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
      {TAB_OPTIONS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={activeTab === tab.id ? "button-primary" : "button-secondary"}
          style={{ padding: "8px 18px" }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function HomeTab() {
  const queryClient = useQueryClient();
  const { data: sections, isLoading: sectionsLoading } = useHomeSections();
  const { data: albums, isLoading: albumsLoading } = useAlbums();
  const [selectedId, setSelectedId] = useState(null);
  const [feedback, setFeedback] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newRows, setNewRows] = useState(1);

  const [localSections, setLocalSections] = useState([]);
  const [draggingId, setDraggingId] = useState(null);

  const selectedSection = useMemo(
    () => localSections.find((item) => item.id === selectedId) ?? null,
    [localSections, selectedId]
  );

  const [titleDraft, setTitleDraft] = useState("");
  const [rowsDraft, setRowsDraft] = useState(1);
  const [albumSelection, setAlbumSelection] = useState([]);

  useEffect(() => {
    if (sections) {
      setLocalSections(sections.map((item) => ({ ...item })));
    }
  }, [sections]);

  useEffect(() => {
    if (!sectionsLoading) {
      if (localSections && localSections.length > 0) {
        if (!selectedId || !localSections.some((item) => item.id === selectedId)) {
          setSelectedId(localSections[0].id);
        }
      } else {
        setSelectedId(null);
      }
    }
  }, [localSections, sectionsLoading, selectedId]);

  useEffect(() => {
    if (selectedSection) {
      setTitleDraft(selectedSection.title);
      setRowsDraft(selectedSection.preview_rows || 1);
      setAlbumSelection(selectedSection.album_ids || []);
    } else {
      setTitleDraft("");
      setRowsDraft(1);
      setAlbumSelection([]);
    }
  }, [selectedSection]);

  const createSection = useMutation({
    mutationFn: (payload) => api.post("/home-sections", payload),
    onSuccess: (data) => {
      setFeedback("分类创建成功");
      setNewTitle("");
      setNewRows(1);
      queryClient.invalidateQueries(["home-sections"]);
      if (data?.id) {
        setSelectedId(data.id);
      }
    },
    onError: (err) => setFeedback(err?.message || "分类创建失败"),
  });

  const updateSection = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/home-sections/${id}`, payload),
    onSuccess: () => {
      setFeedback("分类已更新");
      queryClient.invalidateQueries(["home-sections"]);
    },
    onError: (err) => setFeedback(err?.message || "更新失败"),
  });

  const updateSectionAlbums = useMutation({
    mutationFn: ({ id, albumIds }) => api.put(`/home-sections/${id}/albums`, { album_ids: albumIds }),
    onSuccess: () => {
      setFeedback("挂载相册已保存");
      queryClient.invalidateQueries(["home-sections"]);
    },
    onError: (err) => setFeedback(err?.message || "保存失败"),
  });

  const reorderMutation = useMutation({
    mutationFn: (order) => api.put("/home-sections/reorder", { order }),
    onSuccess: () => {
      setFeedback("分类顺序已更新");
      queryClient.invalidateQueries(["home-sections"]);
    },
    onError: (err) => {
      setFeedback(err?.message || "分类排序保存失败");
      queryClient.invalidateQueries(["home-sections"]);
    },
  });

  const deleteSection = useMutation({
    mutationFn: (id) => api.delete(`/home-sections/${id}`),
    onSuccess: (_, id) => {
      setFeedback("分类已删除");
      if (selectedId === id) {
        setSelectedId(null);
        setAlbumSelection([]);
      }
      queryClient.invalidateQueries(["home-sections"]);
    },
    onError: (err) => setFeedback(err?.message || "删除失败"),
  });

  const albumOptions = useMemo(() => albums || [], [albums]);

  const onToggleAlbum = (albumId) => {
    setAlbumSelection((prev) => {
      if (prev.includes(albumId)) {
        return prev.filter((id) => id !== albumId);
      }
      return [...prev, albumId];
    });
  };

  const reorderSections = (sourceId, targetId) => {
    if (sourceId === targetId) return;
    const items = [...localSections];
    const fromIndex = items.findIndex((item) => item.id === sourceId);
    const toIndex = items.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    setLocalSections(items);
    reorderMutation.mutate(items.map((item) => item.id));
  };

  const parseRowsValue = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return 1;
    }
    return Math.min(2, Math.max(1, parsed));
  };

  const handleCreateSection = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setFeedback("请输入分类标题");
      return;
    }
    createSection.mutate({ title: trimmed, preview_rows: newRows });
  };

  const handleSaveBasics = () => {
    if (!selectedSection) {
      return;
    }
    const payload = {};
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== selectedSection.title) {
      payload.title = trimmed;
    }
    if (rowsDraft !== selectedSection.preview_rows) {
      payload.preview_rows = rowsDraft;
    }
    if (Object.keys(payload).length === 0) {
      setFeedback("没有可保存的更改");
      return;
    }
    updateSection.mutate({ id: selectedSection.id, payload });
  };

  const handleSaveAlbums = () => {
    if (!selectedSection) {
      return;
    }
    updateSectionAlbums.mutate({ id: selectedSection.id, albumIds: albumSelection });
  };

  const handleDeleteSection = (sectionId) => {
    if (window.confirm("确定删除该首页分类吗？")) {
      deleteSection.mutate(sectionId);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
      <div>
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>新增分类</h3>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="分类标题，如 照片"
            style={{ width: "100%", marginBottom: 12 }}
          />
          <label style={{ fontSize: 13, color: "rgba(50,44,84,0.7)", display: "block", marginBottom: 8 }}>
            首页预览排数
          </label>
          <select
            value={newRows}
            onChange={(e) => setNewRows(parseRowsValue(e.target.value))}
            style={{ width: "100%", marginBottom: 12 }}
          >
            <option value={1}>一排（4 个预览）</option>
            <option value={2}>两排（8 个预览）</option>
          </select>
          <button
            type="button"
            className="button-primary"
            onClick={handleCreateSection}
            disabled={createSection.isPending}
            style={{ width: "100%" }}
          >
            {createSection.isPending ? "创建中…" : "创建分类"}
          </button>
        </div>

        <div style={{ ...cardStyle, padding: 16, maxHeight: 480, overflowY: "auto" }}>
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>分类列表</h3>
          {sectionsLoading ? (
            <div>加载分类中…</div>
          ) : localSections && localSections.length > 0 ? (
            <ul style={{ display: "grid", gap: 8 }}>
              {localSections.map((section) => {
                const isSelected = selectedId === section.id;
                const isDragging = draggingId === section.id;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(section.id)}
                      className={isSelected ? "button-primary" : "button-secondary"}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(section.id));
                        setDraggingId(section.id);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const sourceId = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
                        if (Number.isFinite(sourceId)) {
                          reorderSections(sourceId, section.id);
                        }
                        setDraggingId(null);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        opacity: reorderMutation.isPending ? 0.75 : 1,
                        borderStyle: isDragging ? "dashed" : undefined,
                      }}
                    >
                      <span>{section.title}</span>
                      <span style={{ fontSize: 12, color: "rgba(50,44,84,0.65)" }}>
                        {section.album_ids?.length || 0} 个相册
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div style={{ color: "rgba(50,44,84,0.6)" }}>暂无分类，请先新增。</div>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 24 }}>
        {feedback && (
          <div style={{ marginBottom: 16, color: "var(--brand-ink)" }}>{feedback}</div>
        )}

        {selectedSection ? (
          <div>
            <header style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 22, marginBottom: 6 }}>配置「{selectedSection.title}」</h3>
              <div style={{ fontSize: 13, color: "rgba(50,44,84,0.65)" }}>唯一键：{selectedSection.key}</div>
            </header>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>显示名称</label>
                <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>首页预览排数</label>
                <select
                  value={rowsDraft}
                  onChange={(e) => setRowsDraft(parseRowsValue(e.target.value))}
                  style={{ width: 220 }}
                >
                  <option value={1}>一排（4 个预览）</option>
                  <option value={2}>两排（8 个预览）</option>
                </select>
                <div style={{ fontSize: 12, color: "rgba(50,44,84,0.6)", marginTop: 6 }}>
                  实际展示数量 = 排数 × 4，当前将展示 {rowsDraft * 4} 个预览项目。
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>挂载相册</label>
                <div style={{ fontSize: 12, color: "rgba(50,44,84,0.6)", marginBottom: 8 }}>
                  分类不会直接添加媒体，勾选后会展示所选相册中的最新内容。
                </div>
                {albumsLoading ? (
                  <div>加载相册中…</div>
                ) : albumOptions.length > 0 ? (
                  <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                    {albumOptions.map((album) => {
                      const checked = albumSelection.includes(album.id);
                      return (
                        <label key={album.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleAlbum(album.id)}
                          />
                          <span>
                            {album.title}
                            <span style={{ fontSize: 12, color: "rgba(50,44,84,0.55)", marginLeft: 6 }}>
                              {album.media_count ?? 0} 媒体
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ color: "rgba(50,44,84,0.6)" }}>
                    还没有任何相册，先在「相册」标签中新建，或通过
                    {" "}
                    <Link to="/upload" style={{ color: "var(--brand-ink)" }}>上传页</Link>
                    {" "}
                    添加媒体。
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button type="button" className="button-primary" onClick={handleSaveBasics} disabled={updateSection.isPending}>
                {updateSection.isPending ? "保存中…" : "保存基本信息"}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={handleSaveAlbums}
                disabled={updateSectionAlbums.isPending}
              >
                {updateSectionAlbums.isPending ? "保存中…" : "保存挂载相册"}
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => handleDeleteSection(selectedSection.id)}
                disabled={deleteSection.isPending}
                style={{ marginLeft: "auto", color: "#dc2626", borderColor: "rgba(220,38,38,0.4)" }}
              >
                删除分类
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color: "rgba(50,44,84,0.6)" }}>请选择左侧的分类进行配置。</div>
        )}
      </div>
    </div>
  );
}

function AlbumsTab() {
  const queryClient = useQueryClient();
  const { data: albums, isLoading: albumsLoading, isError, error } = useAlbums();
  const [selectedId, setSelectedId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newVisibility, setNewVisibility] = useState("private");

  const selectedAlbum = useMemo(() => albums?.find((item) => item.id === selectedId) ?? null, [albums, selectedId]);
  const [titleDraft, setTitleDraft] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    if (albums && albums.length > 0) {
      if (!selectedId || !albums.some((item) => item.id === selectedId)) {
        setSelectedId(albums[0].id);
      }
    } else {
      setSelectedId(null);
    }
  }, [albums, selectedId]);

  useEffect(() => {
    if (selectedAlbum) {
      setTitleDraft(selectedAlbum.title);
      setIsRenaming(false);
    }
  }, [selectedAlbum]);

  const createAlbum = useMutation({
    mutationFn: (payload) => api.post("/albums", payload),
    onSuccess: (data) => {
      setFeedback("相册创建成功");
      setNewTitle("");
      setNewVisibility("private");
      queryClient.invalidateQueries(["albums"]);
      queryClient.invalidateQueries(["home-sections"]);
      if (data?.id) {
        setSelectedId(data.id);
      }
    },
    onError: (err) => setFeedback(err?.message || "创建失败"),
  });

  const updateAlbum = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/albums/${id}`, payload),
    onSuccess: () => {
      setFeedback("相册已更新");
      queryClient.invalidateQueries(["albums"]);
      queryClient.invalidateQueries(["home-sections"]);
    },
    onError: (err) => setFeedback(err?.message || "更新失败"),
  });

  const deleteAlbum = useMutation({
    mutationFn: (id) => api.delete(`/albums/${id}`),
    onSuccess: (_, id) => {
      setFeedback("相册已删除");
      if (selectedId === id) {
        setSelectedId(null);
      }
      queryClient.invalidateQueries(["albums"]);
      queryClient.invalidateQueries(["home-sections"]);
    },
    onError: (err) => setFeedback(err?.message || "删除失败"),
  });

  const handleCreateAlbum = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setFeedback("请输入相册名称");
      return;
    }
    createAlbum.mutate({ title: trimmed, visibility: newVisibility });
  };

  const handleRename = () => {
    if (!selectedAlbum) {
      return;
    }
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === selectedAlbum.title) {
      setIsRenaming(false);
      setTitleDraft(selectedAlbum.title);
      return;
    }
    updateAlbum.mutate({ id: selectedAlbum.id, payload: { title: trimmed } });
    setIsRenaming(false);
  };

  const handleChangeVisibility = (value) => {
    if (!selectedAlbum || value === selectedAlbum.visibility) {
      return;
    }
    updateAlbum.mutate({ id: selectedAlbum.id, payload: { visibility: value } });
  };

  const handleDelete = (albumId) => {
    if (window.confirm("确定删除该相册吗？相册内的媒体会解除绑定。")) {
      deleteAlbum.mutate(albumId);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
      <div>
        <div style={{ ...cardStyle, padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>新增相册</h3>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="相册名称"
            style={{ width: "100%", marginBottom: 12 }}
          />
          <select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value)} style={{ width: "100%", marginBottom: 12 }}>
            <option value="private">private</option>
            <option value="unlisted">unlisted</option>
            <option value="public">public</option>
          </select>
          <button
            type="button"
            className="button-primary"
            onClick={handleCreateAlbum}
            disabled={createAlbum.isPending}
            style={{ width: "100%" }}
          >
            {createAlbum.isPending ? "创建中…" : "创建相册"}
          </button>
        </div>

        <div style={{ ...cardStyle, padding: 16, maxHeight: 480, overflowY: "auto" }}>
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>相册列表</h3>
          {albumsLoading ? (
            <div>加载相册中…</div>
          ) : isError ? (
            <div style={{ color: "#dc2626" }}>{error?.message || "加载失败"}</div>
          ) : albums && albums.length > 0 ? (
            <ul style={{ display: "grid", gap: 8 }}>
              {albums.map((album) => (
                <li key={album.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(album.id)}
                    className={selectedId === album.id ? "button-primary" : "button-secondary"}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{album.title}</span>
                    <span style={{ fontSize: 12, color: "rgba(50,44,84,0.65)" }}>
                      {album.media_count ?? 0} 媒体
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: "rgba(50,44,84,0.6)" }}>暂无相册，先创建一个吧。</div>
          )}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 24 }}>
        {feedback && <div style={{ marginBottom: 16, color: "var(--brand-ink)" }}>{feedback}</div>}

        {selectedAlbum ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              {isRenaming ? (
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRename();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setIsRenaming(false);
                      setTitleDraft(selectedAlbum.title);
                    }
                  }}
                  style={{ fontSize: 24, fontWeight: 700, flex: "1 1 auto" }}
                />
              ) : (
                <h3
                  style={{ fontSize: 24, fontWeight: 700, cursor: "pointer" }}
                  onDoubleClick={() => setIsRenaming(true)}
                  title="双击重命名"
                >
                  {selectedAlbum.title}
                </h3>
              )}
              <button type="button" className="button-secondary" onClick={() => handleDelete(selectedAlbum.id)}>
                删除
              </button>
            </div>

            <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: "rgba(50,44,84,0.75)" }}>
                媒体数量：<strong>{selectedAlbum.media_count ?? 0}</strong>
              </div>
              <div style={{ fontSize: 14, color: "rgba(50,44,84,0.75)" }}>
                可见性：
                <select
                  value={selectedAlbum.visibility}
                  onChange={(e) => handleChangeVisibility(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  <option value="private">private</option>
                  <option value="unlisted">unlisted</option>
                  <option value="public">public</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <Link to={`/albums/${selectedAlbum.id}`} className="button-secondary">
                  查看相册
                </Link>
                <Link to={`/upload?albumId=${selectedAlbum.id}`} className="button-secondary">
                  前往上传
                </Link>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "rgba(50,44,84,0.6)" }}>
              提示：双击标题可以进入重命名状态；删除相册不会删除媒体，只会解除关联。
            </div>
          </div>
        ) : (
          <div style={{ color: "rgba(50,44,84,0.6)" }}>请选择左侧的相册进行管理。</div>
        )}
      </div>
    </div>
  );
}

export default function ControlCenter() {
  const navigate = useNavigate();
  const { isLoading, isDeveloper } = useRequireDeveloper();
  const [params, setParams] = useSearchParams();
  const activeTab = params.get("tab") || "home";

  useEffect(() => {
    if (!TAB_OPTIONS.some((tab) => tab.id === activeTab)) {
      const next = new URLSearchParams(params);
      next.set("tab", "home");
      setParams(next, { replace: true });
    }
  }, [activeTab, params, setParams]);

  if (isLoading) {
    return <div>加载中…</div>;
  }

  if (!isDeveloper) {
    return (
      <section>
        <header className="page-header">
          <h2 className="page-title">控制中心</h2>
          <p className="page-subtitle">仅限开发者访问。</p>
        </header>
        <div style={{ color: "#dc2626", marginBottom: 16 }}>您没有访问控制中心的权限。</div>
        <button type="button" className="button-secondary" onClick={() => navigate(-1)}>
          返回
        </button>
      </section>
    );
  }

  const handleTabChange = (nextTab) => {
    const next = new URLSearchParams(params);
    next.set("tab", nextTab);
    setParams(next, { replace: true });
  };

  return (
    <section>
      <header className="page-header">
        <h2 className="page-title">控制中心</h2>
        <p className="page-subtitle">统一管理首页分类与相册。分类变更会实时影响首页展示。</p>
      </header>

      <TabSwitcher activeTab={activeTab} onChange={handleTabChange} />

      {activeTab === "home" ? <HomeTab /> : <AlbumsTab />}
    </section>
  );
}
