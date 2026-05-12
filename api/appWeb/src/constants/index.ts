import type { LangOption, DbOption } from '../types';

export const LANG_OPTS: Record<string, LangOption> = {
  python:     { icon: '🐍', label: 'Python',     color: 'text-[#3776AB]', bg: 'bg-[rgba(55,118,171,.2)]',  border: 'border-[rgba(55,118,171,.3)]'  },
  typescript: { icon: '📘', label: 'TypeScript', color: 'text-[#5ba3f5]', bg: 'bg-[rgba(49,120,198,.2)]',  border: 'border-[rgba(49,120,198,.3)]'  },
  go:         { icon: '🐹', label: 'Go',         color: 'text-[#00d4ff]', bg: 'bg-[rgba(0,173,216,.15)]',  border: 'border-[rgba(0,173,216,.25)]'  },
  rust:       { icon: '🦀', label: 'Rust',       color: 'text-[#ff7a3d]', bg: 'bg-[rgba(206,74,24,.2)]',   border: 'border-[rgba(206,74,24,.3)]'   },
  java:       { icon: '☕', label: 'Java',       color: 'text-[#ffb347]', bg: 'bg-[rgba(237,139,0,.2)]',   border: 'border-[rgba(237,139,0,.3)]'   },
  c:          { icon: '⚙️', label: 'C',          color: 'text-[#bdd0e0]', bg: 'bg-[rgba(168,185,204,.15)]', border: 'border-[rgba(168,185,204,.25)]' },
  cpp:        { icon: '🔧', label: 'C++',        color: 'text-[#5b9bd5]', bg: 'bg-[rgba(0,89,156,.2)]',    border: 'border-[rgba(0,89,156,.3)]'    },
};

export const DB_OPTS: Record<string, DbOption> = {
  postgresql: { icon: '🐘', label: 'PostgreSQL' },
  mysql:      { icon: '🐬', label: 'MySQL'      },
  mariadb:    { icon: '🦁', label: 'MariaDB'    },
  sqlite:     { icon: '📦', label: 'SQLite'     },
};

export const MTH: Record<string, string> = {
  get:    'bg-[rgba(34,197,94,.15)] text-[#4ade80]',
  post:   'bg-[rgba(59,130,246,.15)] text-[#60a5fa]',
  put:    'bg-[rgba(245,158,11,.15)] text-[#fbbf24]',
  delete: 'bg-[rgba(239,68,68,.15)] text-[#f87171]',
};
