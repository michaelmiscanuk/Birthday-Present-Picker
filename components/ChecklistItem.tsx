'use client';

import type { Item } from '@/types';

const RAINBOW_PALETTE = [
  { border: 'border-red-200',    hoverBorder: 'hover:border-red-300',    shadow: 'hover:shadow-red-200/50',    text: 'text-red-300',    textHover: 'group-hover:text-red-500',    ring: 'focus-visible:ring-red-400'    },
  { border: 'border-orange-200', hoverBorder: 'hover:border-orange-300', shadow: 'hover:shadow-orange-200/50', text: 'text-orange-300', textHover: 'group-hover:text-orange-500', ring: 'focus-visible:ring-orange-400' },
  { border: 'border-amber-200',  hoverBorder: 'hover:border-amber-300',  shadow: 'hover:shadow-amber-200/50',  text: 'text-amber-400',  textHover: 'group-hover:text-amber-500',  ring: 'focus-visible:ring-amber-400'  },
  { border: 'border-green-200',  hoverBorder: 'hover:border-green-300',  shadow: 'hover:shadow-green-200/50',  text: 'text-green-400',  textHover: 'group-hover:text-green-500',  ring: 'focus-visible:ring-green-400'  },
  { border: 'border-teal-200',   hoverBorder: 'hover:border-teal-300',   shadow: 'hover:shadow-teal-200/50',   text: 'text-teal-400',   textHover: 'group-hover:text-teal-500',   ring: 'focus-visible:ring-teal-400'   },
  { border: 'border-blue-200',   hoverBorder: 'hover:border-blue-300',   shadow: 'hover:shadow-blue-200/50',   text: 'text-blue-300',   textHover: 'group-hover:text-blue-500',   ring: 'focus-visible:ring-blue-400'   },
  { border: 'border-indigo-200', hoverBorder: 'hover:border-indigo-300', shadow: 'hover:shadow-indigo-200/50', text: 'text-indigo-300', textHover: 'group-hover:text-indigo-500', ring: 'focus-visible:ring-indigo-400' },
  { border: 'border-purple-200', hoverBorder: 'hover:border-purple-300', shadow: 'hover:shadow-purple-200/50', text: 'text-purple-300', textHover: 'group-hover:text-purple-500', ring: 'focus-visible:ring-purple-400' },
  { border: 'border-pink-200',   hoverBorder: 'hover:border-pink-300',   shadow: 'hover:shadow-pink-200/50',   text: 'text-pink-300',   textHover: 'group-hover:text-pink-500',   ring: 'focus-visible:ring-pink-400'   },
] as const;

interface Props {
  item: Item;
  index: number;
  userId: string;
  onToggle: (id: string) => void;
}

export default function ChecklistItem({ item, index, userId, onToggle }: Props) {
  const isMine = !!userId && item.pickedBy === userId;
  const isTaken = item.pickedBy !== null && !isMine;
  const isAvailable = item.pickedBy === null;
  const color = RAINBOW_PALETTE[index % RAINBOW_PALETTE.length];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isTaken) {
      e.preventDefault();
      onToggle(item.id);
    }
  };

  return (
    <div
      onClick={() => !isTaken && onToggle(item.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isTaken ? -1 : 0}
      aria-disabled={isTaken}
      aria-label={
        isAvailable
          ? `Rezervovat: ${item.name}`
          : isMine
          ? `Zrušit rezervaci: ${item.name}`
          : `${item.name} je již rezervováno`
      }
      className={[
        'group relative flex flex-col items-center gap-2 rounded-3xl p-5 text-center',
        `transition-all duration-200 focus:outline-none focus-visible:ring-2 ${color.ring}`,
        isAvailable
          ? [
              'cursor-pointer bg-white/85 backdrop-blur-sm',
              `border-2 ${color.border}`,
              `hover:-translate-y-2 ${color.hoverBorder} hover:shadow-xl ${color.shadow}`,
              'active:scale-95',
            ].join(' ')
          : '',
        isMine
          ? [
              'cursor-pointer',
              'bg-gradient-to-br from-emerald-100 via-teal-50 to-green-100',
              'border-2 border-emerald-300 shadow-md shadow-emerald-200/50',
              'hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-200/60',
              'active:scale-95',
            ].join(' ')
          : '',
        isTaken
          ? 'cursor-not-allowed bg-gray-50/70 border-2 border-gray-100 opacity-60 grayscale-[25%]'
          : '',
      ].join(' ')}
    >
      {/* Top-right badge */}
      {isMine && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[11px] text-white shadow">
          ✓
        </span>
      )}
      {isTaken && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-[11px] shadow">
          🔒
        </span>
      )}

      {/* Emoji */}
      <span
        className={[
          'text-4xl leading-none transition-transform duration-200',
          isAvailable ? 'group-hover:scale-110' : '',
        ].join(' ')}
        role="img"
        aria-hidden="true"
      >
        {item.emoji}
      </span>

      {/* Name */}
      <span
        className={[
          'text-sm font-semibold leading-snug',
          isTaken ? 'text-gray-400' : 'text-gray-700',
        ].join(' ')}
      >
        {item.name}
      </span>

      {/* Status line */}
      {isAvailable && (
        <span className={`text-[10px] font-medium ${color.text} ${color.textHover}`}>
          Udělat radost tímto dárkem ✨
        </span>
      )}
      {isMine && (
        <span className="text-[10px] font-semibold text-emerald-600">
          Děkuji 💕
          <span className="mt-0.5 block text-emerald-400 group-hover:text-emerald-600">
            (klikni pro zrušení)
          </span>
        </span>
      )}
      {isTaken && (
        <span className="text-[10px] text-gray-400">Už je slíbený dárek! 💕</span>
      )}

      {/* Shop link */}
      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={[
            'mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1',
            'text-[10px] font-semibold transition-all duration-150',
            'ring-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
            isTaken
              ? 'pointer-events-none text-gray-400 ring-gray-200'
              : 'bg-blue-50 text-blue-500 ring-blue-200 hover:bg-blue-100 hover:text-blue-600 hover:ring-blue-300',
          ].join(' ')}
          tabIndex={isTaken ? -1 : 0}
          aria-label={`Prohlédnout ${item.name} v obchodě`}
        >
          🛍️ Odkaz
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-2.5 w-2.5"
            aria-hidden="true"
          >
            <path d="M2 10 10 2M5 2h5v5" />
          </svg>
        </a>
      )}
    </div>
  );
}

