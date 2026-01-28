import { useLocation, useRoute, useSearch } from "wouter";
import JunkpileGame from "@/components/JunkpileGame";

export default function GameEngine() {
  const [, params] = useRoute("/student/play/:topicId");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const topicId = Number(params?.topicId);
  const gameId = new URLSearchParams(search).get("game") || "racing";

  if (!topicId) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto py-8">
        <JunkpileGame 
          topicId={topicId} 
          gameId={gameId}
          onComplete={() => setLocation("/student/dashboard")} 
        />
      </div>
    </div>
  );
}
