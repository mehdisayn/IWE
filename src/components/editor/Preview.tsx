import { useMemo } from "react";
import { render } from "../../lib/markdown";

interface PreviewProps {
  value: string;
  onWikilink: (target: string) => void;
  single: boolean;
}

export function Preview({ value, onWikilink, single }: PreviewProps) {
  const html = useMemo(() => render(value), [value]);
  return (
    <div className="pane">
      {!single && <div className="pane-label">Preview</div>}
      <div
        className="preview"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          const a = target.closest("a.md-wikilink");
          if (a) {
            e.preventDefault();
            onWikilink(a.getAttribute("data-wikilink") || "");
          }
        }}
      >
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
