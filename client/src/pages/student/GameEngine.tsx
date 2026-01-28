import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { useQuestion, useSubmitAnswer } from "@/hooks/use-learning";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Check, X, Clock, Trophy, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

import JunkpileGame from "@/components/JunkpileGame";

export default function GameEngine() {
  const [, params] = useRoute("/student/play/:topicId");
  const [, setLocation] = useLocation();
  const topicId = Number(params?.topicId);

  if (!topicId) return null;

  return (
    <div className="container mx-auto py-8">
      <JunkpileGame 
        topicId={topicId} 
        onComplete={() => setLocation("/student/dashboard")} 
      />
    </div>
  );
}
