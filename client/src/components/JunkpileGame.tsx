import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api, buildUrl } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GameInterstitial, { getGameTheme } from "@/components/GameInterstitial";
import { cn } from "@/lib/utils";

interface JunkpileGameProps {
  topicId: number;
  gameId?: string | null;
  onComplete: () => void;
}

export default function JunkpileGame({ topicId, gameId, onComplete }: JunkpileGameProps) {
  const [carPosition, setCarPosition] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [pendingQuestion, setPendingQuestion] = useState<any>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [gameTime, setGameTime] = useState(60);
  const [questionCount, setQuestionCount] = useState(0);
  const [accuracyHistory, setAccuracyHistory] = useState<boolean[]>([]);
  const [phase, setPhase] = useState<"question" | "intermission">("question");
  const [lastResult, setLastResult] = useState<{ correct: boolean } | null>(null);
  const [streak, setStreak] = useState(0);

  const theme = getGameTheme(gameId);

  const { data: question, refetch, isError, error, isFetching } = useQuery({
    queryKey: [api.learning.getNextQuestion.path, { topicId, history: history.join(",") }],
    queryFn: async () => {
      const url = buildUrl(api.learning.getNextQuestion.path) + `?topicId=${topicId}&history=${history.join(",")}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to fetch question");
      }
      return res.json();
    }
  });

  useEffect(() => {
    if (gameTime <= 0) {
      onComplete();
      return;
    }
    if (phase !== "question" || !currentQuestion) return;
    const timer = setInterval(() => setGameTime(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [gameTime, phase, currentQuestion, onComplete]);

  useEffect(() => {
    if (!question) return;
    if (question.id === currentQuestion?.id) return;
    if (phase === "intermission") {
      setPendingQuestion(question);
    } else {
      setCurrentQuestion(question);
    }
  }, [question, phase, currentQuestion?.id]);

  useEffect(() => {
    if (phase !== "intermission" || !pendingQuestion) return;
    const timer = setTimeout(() => {
      setCurrentQuestion(pendingQuestion);
      setPendingQuestion(null);
      setPhase("question");
    }, 1200);
    return () => clearTimeout(timer);
  }, [phase, pendingQuestion]);

  const submitAnswer = useMutation({
    mutationFn: async (answer: string) => {
      const res = await fetch(api.learning.submitAnswer.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer,
          timeTaken: 5
        })
      });
      if (!res.ok) throw new Error("Failed to submit answer");
      return res.json();
    },
    onSuccess: (data) => {
      if (!currentQuestion) return;

      setHistory(prev => [...prev, currentQuestion.id]);
      setQuestionCount(prev => prev + 1);
      setLastResult({ correct: data.correct });
      setPendingQuestion(null);
      setPhase("intermission");

      setAccuracyHistory(prev => {
        const updated = [...prev, data.correct].slice(-5);
        if (data.correct && updated.filter(Boolean).length >= 3) {
          setGameTime(prevTime => prevTime + 5);
        }
        return updated;
      });

      if (data.correct) {
        setCarPosition(prev => Math.min(prev + 10, 90));
        setStreak(prev => prev + 1);
      } else {
        setCarPosition(prev => Math.max(prev - 5, 0));
        setStreak(0);
      }
    }
  });

  if (isError) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive mb-4">Error: {(error as Error).message}</p>
          <Button onClick={() => refetch()} disabled={isFetching}>
            Try Again
          </Button>
          <Button variant="ghost" className="ml-2" onClick={onComplete}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Loading your next challenge...</p>
      </div>
    );
  }

  const options = [currentQuestion.correctAnswer, ...currentQuestion.distractors].sort();
  const accuracy = accuracyHistory.length
    ? Math.round((accuracyHistory.filter(Boolean).length / accuracyHistory.length) * 100)
    : 0;

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="w-full max-w-4xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">MathKid Arcade</p>
            <h2 className="text-3xl font-display font-bold text-slate-800">{theme.name}</h2>
            <p className="text-slate-500">{theme.tagline}</p>
          </div>
          <div className={cn("rounded-2xl px-4 py-2 text-xs font-semibold uppercase", theme.badge)}>
            {phase === "intermission" ? "Mini-game moment" : "Question time"}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">Time left</p>
            <p className="text-xl font-bold text-slate-800">{gameTime}s</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">Answered</p>
            <p className="text-xl font-bold text-slate-800">{questionCount}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">Streak</p>
            <p className="text-xl font-bold text-slate-800">{streak}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-400">Accuracy</p>
            <p className="text-xl font-bold text-slate-800">{accuracy}%</p>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-4xl h-52 rounded-3xl overflow-hidden border-2 border-slate-200 bg-white shadow-lg">
        <div className={cn("absolute inset-0 opacity-20 bg-gradient-to-br", theme.accent)} />
        <div className="absolute bottom-6 left-5 right-5 h-10 rounded-full bg-slate-900/10" />
        <div className="absolute bottom-11 left-8 right-8 h-0.5 border-t-2 border-dashed border-white/70" />
        <motion.div
          animate={{ x: `${carPosition}%` }}
          transition={{ type: "spring", stiffness: 50 }}
          className="absolute bottom-10 text-5xl"
        >
          🏎️
        </motion.div>
        <div className="absolute right-6 bottom-6 w-3 h-16 bg-white/80 border-2 border-slate-700 rounded-sm" />
      </div>

      <div className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          {phase === "intermission" ? (
            <motion.div
              key="intermission"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GameInterstitial
                gameId={gameId}
                correct={lastResult?.correct ?? true}
                streak={streak}
                questionCount={questionCount}
                isLoadingNext={isFetching}
              />
            </motion.div>
          ) : (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="w-full">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-bold mb-6 text-center text-slate-800">
                    {currentQuestion.content}
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {options.map((opt) => (
                      <Button
                        key={opt}
                        variant="outline"
                        className="h-16 text-lg hover:bg-primary hover:text-accent border-2"
                        onClick={() => submitAnswer.mutate(opt)}
                        disabled={submitAnswer.isPending}
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Button variant="ghost" onClick={onComplete}>End Session</Button>
    </div>
  );
}
