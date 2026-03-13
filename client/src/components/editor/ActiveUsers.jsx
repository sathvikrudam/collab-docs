import { useState } from 'react';

export default function ActiveUsers({ users = [] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!users.length) return null;

  const MAX = 4;
  const visible = users.slice(0, MAX);
  const extra = users.length - MAX;

  return (
    <div className="relative flex items-center">
      <div
        className="flex -space-x-2 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {visible.map((u) => (
          <div
            key={u.socketId}
            className="w-7 h-7 rounded-full border-2 border-ink-900 flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: u.color }}
            title={u.name}
          >
            {u.name?.[0]?.toUpperCase() || '?'}
          </div>
        ))}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full border-2 border-ink-900 bg-ink-700 flex items-center justify-center text-ink-300 text-xs font-semibold">
            +{extra}
          </div>
        )}
      </div>

      {showTooltip && users.length > 0 && (
        <div className="absolute top-full right-0 mt-2 card p-2 min-w-[140px] z-50 shadow-xl animate-fade-in">
          <p className="text-ink-500 text-xs px-2 pb-1.5 border-b border-ink-700 mb-1">
            {users.length} active
          </p>
          {users.map((u) => (
            <div key={u.socketId} className="flex items-center gap-2 px-2 py-1">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: u.color }}
              >
                {u.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-ink-200 text-xs truncate">{u.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
