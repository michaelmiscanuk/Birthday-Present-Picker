'use client';

import type { Item } from '@/types';

interface Props {
  item: Item;
  userId: string;
  onToggle: (id: string) => void;
}

export default function ChecklistItem({ item, userId, onToggle }: Props) {
  const isMine = !!userId && item.pickedBy === userId;
  const isTaken = item.pickedBy !== null && !isMine;
  const isAvailable = item.pickedBy === null;

  return (
    <button
      onClick={() => !isTaken && onToggle(item.id)}
      disabled={isTaken}
      aria-label={
        isAvailable
          ? `Rezervovat: ${item.name}`
          : isMine
          ? `Zrušit rezervaci: ${item.name}`
          : `${item.name} je již rezervováno`
      }
      className={[
        'group relative flex flex-col items-center gap-2 rounded-3xl p-5 text-center',
        'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400',
        isAvailable
          ? [
              'cursor-pointer bg-white/85 backdrop-blur-sm',
              'border-2 border-pink-100',
              'hover:-translate-y-2 hover:border-pink-300 hover:shadow-xl hover:shadow-pink-200/50',
              'active:scale-95',
            ].join(' ')
          : '',
        isMine
          ? [
              'cursor-pointer',
              'bg-gradient-to-br from-rose-100 via-pink-100 to-pink-200',
              'border-2 border-rose-300 shadow-md shadow-pink-200/50',
              'hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-200/60',
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
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-400 text-[11px] text-white shadow">
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
        <span className="text-[10px] font-medium text-pink-300 group-hover:text-pink-500">
          klikni pro rezervaci ✨
        </span>
      )}
      {isMine && (
        <span className="text-[10px] font-semibold text-rose-500">
          Ty to přineseš! 💕
          <span className="mt-0.5 block text-rose-300 group-hover:text-rose-500">
            (klikni pro zrušení)
          </span>
        </span>
      )}
      {isTaken && (
        <span className="text-[10px] text-gray-400">Zarezervováno 💕</span>
      )}
    </button>
  );
}
