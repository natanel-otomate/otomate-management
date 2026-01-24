import React from 'react';

export type TabOption<T extends string> = {
  id: T;
  label: string;
};

export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2 border-b border-zinc-800">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={[
              'px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'text-zinc-50 border-b-2 border-zinc-50 -mb-px'
                : 'text-zinc-400 hover:text-zinc-200',
            ].join(' ')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
