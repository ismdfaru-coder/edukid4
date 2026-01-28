import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function JunkpileGame({ topicId, onComplete }: { topicId: number, onComplete: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [carPosition, setCarPosition] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [history, setHistory] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: question, refetch, isError, error } = useQuery({
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

  const [gameTime, setGameTime] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [accuracyHistory, setAccuracyHistory] = useState<boolean[]>([]);

  useEffect(() => {
    if (gameTime > 0 && !isPaused && currentQuestion) {
      const timer = setInterval(() => setGameTime(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (gameTime === 0) {
      onComplete();
    }
  }, [gameTime, isPaused, currentQuestion, onComplete]);

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
      setHistory(prev => [...prev, currentQuestion.id]);
      setAccuracyHistory(prev => [...prev, data.correct].slice(-5));
      
      if (data.correct) {
        setItems(prev => [...prev, { id: Date.now(), type: 'junk' }]);
        setCarPosition(prev => Math.min(prev + 10, 90));
        
        // Dynamic time scaling
        const recentCorrect = accuracyHistory.filter(x => x).length;
        if (recentCorrect >= 3) {
          setGameTime(prev => prev + 5);
        }
      }

      const nextCount = questionCount + 1;
      setQuestionCount(nextCount);
      
      if (nextCount % 3 === 0) {
        setIsPaused(true);
      }

      refetch();
    }
  });

  if (isPaused) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-900/50 rounded-3xl p-8 text-center border-2 border-yellow-500 animate-pulse">
        <h2 className="text-3xl font-display font-bold text-yellow-500 mb-4">Game Paused!</h2>
        <p className="text-white mb-6">Answer a question to resume your race!</p>
        <button 
          onClick={() => setIsPaused(false)}
          className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold py-3 px-8 rounded-full transition-all"
        >
          Resume Game
        </button>
      </div>
    );
  }

  useEffect(() => {
    if (question) setCurrentQuestion(question);
  }, [question]);

  if (isError) {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive mb-4">Error: {(error as Error).message}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
          <Button variant="ghost" className="ml-2" onClick={onComplete}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) return <div>Loading...</div>;

  const options = [currentQuestion.correctAnswer, ...currentQuestion.distractors].sort();

  return (
    <div className="flex flex-col items-center gap-8 p-4">
      {/* Visual Game Area */}
      <div className="relative w-full h-48 bg-slate-800 rounded-lg overflow-hidden border-4 border-accent/20">
        {/* Road */}
        <div className="absolute bottom-4 w-full h-8 bg-slate-700">
           <div className="w-full h-1 border-t-2 border-dashed border-white/30 mt-3" />
        </div>
        
        {/* Moving Car */}
        <motion.div
          animate={{ x: `${carPosition}%` }}
          transition={{ type: "spring", stiffness: 50 }}
          className="absolute bottom-8 text-5xl"
        >
          🏎️
        </motion.div>

        {/* Finish Line */}
        <div className="absolute right-4 bottom-4 w-2 h-16 bg-white border-2 border-slate-900 repeating-linear-gradient" />
      </div>

      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <h2 className="text-xl font-bold mb-6 text-center">{currentQuestion.content}</h2>
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
      
      <Button variant="ghost" onClick={onComplete}>End Game</Button>
    </div>
  );
}
