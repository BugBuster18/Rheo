/**
 * RHEO — Animal Avatar Engine
 * Cute animal face stickers as user identity tokens.
 */
import { useMemo } from 'react';

export const AVATAR_PRESETS = [
  { id: 'fox',     emoji: '🦊', name: 'Fox',     bg: 'from-orange-400 to-amber-500' },
  { id: 'panda',   emoji: '🐼', name: 'Panda',   bg: 'from-slate-700 to-slate-900' },
  { id: 'cat',     emoji: '🐱', name: 'Cat',     bg: 'from-amber-300 to-yellow-400' },
  { id: 'dog',     emoji: '🐶', name: 'Dog',     bg: 'from-amber-600 to-orange-700' },
  { id: 'rabbit',  emoji: '🐰', name: 'Rabbit',  bg: 'from-pink-300 to-rose-400' },
  { id: 'bear',    emoji: '🐻', name: 'Bear',    bg: 'from-amber-700 to-stone-700' },
  { id: 'koala',   emoji: '🐨', name: 'Koala',   bg: 'from-slate-400 to-stone-500' },
  { id: 'penguin', emoji: '🐧', name: 'Penguin', bg: 'from-slate-800 to-teal-900' },
  { id: 'frog',    emoji: '🐸', name: 'Frog',    bg: 'from-green-400 to-emerald-600' },
  { id: 'hamster', emoji: '🐹', name: 'Hamster', bg: 'from-pink-400 to-amber-400' },
  { id: 'wolf',    emoji: '🐺', name: 'Wolf',    bg: 'from-slate-500 to-indigo-700' },
  { id: 'duck',    emoji: '🦆', name: 'Duck',    bg: 'from-yellow-400 to-amber-500' },
  { id: 'owl',     emoji: '🦉', name: 'Owl',     bg: 'from-amber-800 to-stone-900' },
  { id: 'tiger',   emoji: '🐯', name: 'Tiger',   bg: 'from-orange-500 to-amber-700' },
  { id: 'lion',    emoji: '🦁', name: 'Lion',    bg: 'from-yellow-500 to-orange-600' },
  { id: 'monkey',  emoji: '🐵', name: 'Monkey',  bg: 'from-amber-500 to-orange-800' },
];

const SIZES = {
  xs:  { box: 'w-6 h-6',   emoji: 'text-base' },
  sm:  { box: 'w-8 h-8',   emoji: 'text-xl' },
  md:  { box: 'w-10 h-10', emoji: 'text-2xl' },
  lg:  { box: 'w-12 h-12', emoji: 'text-3xl' },
  xl:  { box: 'w-16 h-16', emoji: 'text-4xl' },
  '2xl': { box: 'w-20 h-20', emoji: 'text-5xl' },
};

/**
 * Get a deterministic avatar for a user who hasn't picked one.
 * Uses the user's name string hash to assign a stable preset.
 */
export function getDefaultAvatar(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PRESETS[hash % AVATAR_PRESETS.length].id;
}

export default function Avatar({
  avatarId,
  name = 'User',
  size = 'md',
  showRing = false,
  className = '',
}) {
  const preset = useMemo(() => {
    const id = avatarId || getDefaultAvatar(name);
    return AVATAR_PRESETS.find(p => p.id === id) || AVATAR_PRESETS[0];
  }, [avatarId, name]);

  const { box, emoji } = SIZES[size] || SIZES.md;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${preset.bg} shadow-sm select-none flex-shrink-0 ${box} ${
        showRing ? 'ring-2 ring-teal-500/50 ring-offset-2 ring-offset-white' : ''
      } ${className}`}
      title={preset.name}
    >
      <span className={`leading-none ${emoji}`} role="img" aria-label={preset.name}>
        {preset.emoji}
      </span>
    </div>
  );
}
