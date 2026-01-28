import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTopics } from "@/hooks/use-learning";
import { StudentLayout } from "@/components/StudentLayout";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Loader2, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { id: 1, name: "Science", icon: "🔬", color: "from-blue-500 to-indigo-600" },
  { id: 2, name: "Maths", icon: "🔢", color: "from-purple-500 to-pink-600" },
  { id: 3, name: "English", icon: "📚", color: "from-green-500 to-teal-600" },
];

const GAMES = [
  { id: "racing", name: "Number Rally", icon: "🏎️", description: "Answer a question, then dash in the mini-game." },
  { id: "rocket", name: "Rocket Boost", icon: "🚀", description: "Fuel up between answers to launch higher." },
  { id: "puzzle", name: "Puzzle Pop", icon: "🧩", description: "Unlock a new piece after every answer." },
  { id: "adventure", name: "Quest Sprint", icon: "⚔️", description: "Keep your streak alive on the quest." },
];

const topicIcons: Record<string, string> = {
  "Electricity": "⚡",
  "Plants": "🌿",
  "Space": "🚀",
  "Addition": "➕",
  "Subtraction": "➖",
  "Multiplication": "✖️",
  "Division": "➗",
  "Fractions": "🍕",
  "Grammar": "📝",
  "Spelling": "🔤",
};

const topicColors: Record<string, string> = {
  "Electricity": "from-yellow-400 to-orange-500",
  "Plants": "from-green-400 to-emerald-600",
  "Space": "from-indigo-500 to-purple-700",
  "Addition": "from-blue-400 to-blue-600",
  "Subtraction": "from-red-400 to-red-600",
  "Multiplication": "from-purple-400 to-purple-600",
  "Division": "from-teal-400 to-teal-600",
  "Fractions": "from-orange-400 to-orange-600",
  "Grammar": "from-emerald-400 to-teal-600",
  "Spelling": "from-lime-400 to-green-600",
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<number>(2);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [showGameSelect, setShowGameSelect] = useState(false);
  
  const { data: topics, isLoading } = useTopics("KS2", selectedSubject);
  const averageMastery = topics?.length
    ? Math.round(
        (topics.reduce((sum, topic) => sum + (topic.mastery || 0), 0) / topics.length) * 100
      )
    : 0;

  const handleTopicClick = (topicId: number) => {
    setSelectedTopic(topicId);
    setShowGameSelect(true);
  };

  const handleGameSelect = (gameId: string) => {
    if (selectedTopic) {
      setLocation(`/student/play/${selectedTopic}?game=${gameId}`);
    }
  };

  return (
    <StudentLayout>
      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 p-6 text-white">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-white/20" />
          <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10" />
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
              <span className="rounded-full bg-white/20 px-3 py-1">MathKid Arcade</span>
              <span className="rounded-full bg-white/20 px-3 py-1">Answer + play</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-white/90 text-base md:text-lg max-w-2xl">
              Answer questions to power the mini-game between every round. Pick a subject to start playing.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/15 p-4 flex items-center gap-3">
                <Gamepad2 className="w-6 h-6 text-white" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/80">Games ready</p>
                  <p className="text-xl font-bold">{GAMES.length}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 flex items-center gap-3">
                <Trophy className="w-6 h-6 text-white" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/80">Coins</p>
                  <p className="text-xl font-bold">{user?.coins || 0}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 flex items-center gap-3">
                <Star className="w-6 h-6 text-white" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/80">Mastery</p>
                  <p className="text-xl font-bold">{averageMastery}%</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800">Choose a subject</h2>
            <p className="text-sm text-slate-500">
              Each answer triggers a mini-game moment in your chosen game.
            </p>
          </div>
        </div>

        <div className="flex gap-4 p-2 bg-white/80 rounded-2xl w-fit shadow-sm border border-slate-200">
          {SUBJECTS.map((subject) => (
            <motion.button
              key={subject.id}
              onClick={() => setSelectedSubject(subject.id)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-lg transition-all",
                selectedSubject === subject.id
                  ? `bg-gradient-to-r ${subject.color} text-white shadow-lg`
                  : "bg-white text-slate-600 hover:bg-slate-50"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-2xl">{subject.icon}</span>
              {subject.name}
            </motion.button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-[40vh] flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-xl font-display text-indigo-400">Loading topics...</p>
          </div>
        ) : (
          <motion.div 
            key={selectedSubject}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {topics?.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => handleTopicClick(topic.id)}
                className={cn(
                  "bg-gradient-to-br rounded-3xl p-6 text-white shadow-lg cursor-pointer h-48 flex flex-col justify-between relative overflow-hidden group game-card",
                  topicColors[topic.name] || "from-slate-400 to-slate-600"
                )}
              >
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                  <span className="text-8xl">{topicIcons[topic.name] || "📚"}</span>
                </div>
                
                <div className="relative z-10 flex justify-between items-start">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
                    {Math.round((topic.mastery || 0) * 100)}% Mastery
                  </span>
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-2xl font-display font-bold">{topic.name}</h3>
                  <p className="opacity-90 text-sm">{topic.description || "Practice now!"}</p>
                  
                  <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(topic.mastery || 0) * 100}%` }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        <AnimatePresence>
          {showGameSelect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowGameSelect(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
              >
                <div className="text-center mb-8">
                  <Gamepad2 className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
                  <h2 className="text-3xl font-display font-bold text-slate-800">Choose Your MathKid Game</h2>
                  <p className="text-slate-500 mt-2">Every answer powers a mini-game moment</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {GAMES.map((game, index) => (
                    <motion.button
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleGameSelect(game.id)}
                      className="p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                    >
                      <span className="text-5xl block mb-3 group-hover:scale-110 transition-transform">{game.icon}</span>
                      <h3 className="font-bold text-lg text-slate-800">{game.name}</h3>
                      <p className="text-slate-500 text-sm">{game.description}</p>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setShowGameSelect(false)}
                  className="mt-6 w-full py-3 text-slate-500 hover:text-slate-700 font-bold"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </StudentLayout>
  );
}
