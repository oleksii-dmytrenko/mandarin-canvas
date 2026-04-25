import { Copy, Eraser, FilePlus2, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCanvasStore } from "../stores/canvasStore";
import { IconButton } from "./IconButton";

export function PageList() {
  const {
    pages,
    activePageId,
    editingPageId,
    setActivePage,
    addPage,
    deletePage,
    duplicatePage,
    renamePage,
    cleanPage,
    setEditingPageId,
  } = useCanvasStore();

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!editingPageId) return;
    const input = inputRefs.current[editingPageId];
    input?.focus();
    input?.select();
  }, [editingPageId]);

  return (
    <aside className="page-list">
      <button className="primary-action" onClick={addPage}>
        <FilePlus2 size={17} />
        New page
      </button>
      <div className="page-stack">
        {pages.map((page) => {
          const isActive = page.id === activePageId;

          return (
            <div
              className={`page-card ${isActive ? "active" : ""}`}
              key={page.id}
              onClick={() => setActivePage(page.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActivePage(page.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="page-card-title-row">
                {editingPageId === page.id ? (
                  <input
                    aria-label="Page title"
                    className="page-card-title"
                    defaultValue={page.title}
                    onBlur={(event) => {
                      renamePage(page.id, event.target.value);
                      setEditingPageId(null);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onFocus={() => setActivePage(page.id)}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                      if (event.key === "Escape") {
                        event.currentTarget.value = page.title;
                        setEditingPageId(null);
                      }
                    }}
                    ref={(input) => {
                      inputRefs.current[page.id] = input;
                    }}
                  />
                ) : (
                  <>
                    <span className="page-card-title-text">{page.title}</span>
                    <button
                      aria-label={`Rename ${page.title}`}
                      className="page-title-edit-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActivePage(page.id);
                        setEditingPageId(page.id);
                      }}
                      title="Rename page"
                      type="button"
                    >
                      <Pencil size={14} />
                    </button>
                  </>
                )}
              </div>
              <div className="page-card-footer">
                <small>{new Date(page.updatedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</small>
                {isActive && (
                  <div className="page-card-actions" aria-label="Page actions">
                    <IconButton
                      label="Duplicate page"
                      onClick={(event) => {
                        event.stopPropagation();
                        duplicatePage();
                      }}
                    >
                      <Copy size={15} />
                    </IconButton>
                    <IconButton
                      label="Delete page"
                      onClick={(event) => {
                        event.stopPropagation();
                        deletePage();
                      }}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                    <IconButton
                      label="Clean page"
                      onClick={(event) => {
                        event.stopPropagation();
                        cleanPage();
                      }}
                      disabled={!page.blocks.length && !page.drawings.length && !page.images.length}
                    >
                      <Eraser size={15} />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
