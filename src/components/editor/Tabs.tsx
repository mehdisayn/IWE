import { Icon } from "../Icon";

interface TabsProps {
  tabs: string[];
  active: string | null;
  dirty: Set<string>;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function Tabs({ tabs, active, dirty, onSelect, onClose }: TabsProps) {
  return (
    <div className="tabs">
      {tabs.map((t) => {
        const isDash = t === "__dashboard__";
        const isSet = t === "__settings__";
        const name = isDash ? "Dashboard" : isSet ? "Settings" : t.split("/").pop()!.replace(/\.md$/, "");
        const ic = isDash ? "grid" : isSet ? "settings" : "md";
        const isDirty = dirty.has(t);
        return (
          <div key={t} className={"tab" + (t === active ? " active" : "")} onClick={() => onSelect(t)}>
            <span className="ti">
              <Icon name={ic} size={14} />
            </span>
            <span className="tab-name">{name}</span>
            {isDirty ? (
              <span className="dirty" title="Unsaved" />
            ) : (
              <button
                className="x"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t);
                }}
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
