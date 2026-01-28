import { motion } from "framer-motion";
import { Rocket, Star, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export const GAME_THEMES = {
  racing: {
    id: "racing",
    name: "Number Rally",
    tagline: "Speed through questions to keep the wheels spinning.",
    accent: "from-amber-400 via-orange-500 to-rose-500",
    badge: "bg-amber-100 text-amber-700",
    icon: Trophy,
  },
  rocket: {
    id: "rocket",
    name: "Rocket Boost",
    tagline: "Charge the launch between each answer.",
    accent: "from-sky-400 via-indigo-500 to-purple-500",
    badge: "bg-sky-100 text-sky-700",
    icon: Rocket,
  },
  puzzle: {
    id: "puzzle",
    name: "Puzzle Pop",
    tagline: "Unlock the next piece with each answer.",
    accent: "from-emerald-400 via-teal-500 to-cyan-500",
    badge: "bg-emerald-100 text-emerald-700",
    icon: Star,
  },
  adventure: {
    id: "adventure",
    name: "Quest Sprint",
    tagline: "Keep your streak alive as you explore.",
    accent: "from-violet-400 via-fuchsia-500 to-pink-500",
    badge: "bg-violet-100 text-violet-700",
    icon: Zap,
  },
} as const;

export type GameId = keyof typeof GAME_THEMES;

export function getGameTheme(gameId?: string | null) {
  if (gameId && gameId in GAME_THEMES) {
    return GAME_THEMES[gameId as GameId];
  }
  return GAME_THEMES.racing;
}

interface GameInterstitialProps {
  gameId?: string | null;
  correct: boolean;
  streak: number;
  questionCount: number;
  isLoadingNext?: boolean;
}

export default function GameInterstitial({
  gameId,
  correct,
  streak,
  questionCount,
  isLoadingNext,
}: GameInterstitialProps) {
  const theme = getGameTheme(gameId);
  const Icon = theme.icon;
  const statusLabel = correct ? "Correct!" : "Keep trying!";
  const statusCopy = correct
    ? "Your mini-game powers up for the next round."
    : "Stay focused. The next question is ready soon.";

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-white/70 bg-white/80 shadow-xl">
      <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", theme.accent)} />

      <div className="relative z-10 p-6 flex flex-col md:flex-row gap-6 items-center md:items-start justify-between">
        <div className="space-y-3 text-center md:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            MathKid Mini-Game
          </p>
          <div className="space-y-1">
            <h3 className="text-2xl font-display font-bold text-slate-800">{theme.name}</h3>
            <p className="text-slate-600">{theme.tagline}</p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-slate-900/5">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                correct ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
            <span className="text-sm font-semibold text-slate-700">{statusLabel}</span>
          </div>
          <p className="text-sm text-slate-500">{statusCopy}</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className={cn("rounded-2xl px-4 py-2 text-xs font-semibold uppercase", theme.badge)}>
            Question {questionCount}
          </div>
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, -4, 4, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-20 w-20 rounded-3xl bg-white shadow-lg border border-white/60 flex items-center justify-center"
          >
            <Icon className="h-10 w-10 text-slate-700" />
          </motion.div>
        </div>
      </div>

      <div className="relative z-10 px-6 pb-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span>Streak {streak}</span>
          <span>{isLoadingNext ? "Loading next question" : "Next question ready"}</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <motion.div
            key={`progress-${questionCount}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full bg-gradient-to-r", theme.accent)}
          />
        </div>
      </div>
    </div>
  );
}
