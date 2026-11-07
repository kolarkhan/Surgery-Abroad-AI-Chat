import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { generatePossibleQuestions } from "../utils/actions";

interface PossibleQuestionsProps {
  messageText: string;
  onQuestionClick: (question: string) => void;
}

const PossibleQuestions: React.FC<PossibleQuestionsProps> = ({
  messageText,
  onQuestionClick,
}) => {
  const [questions, setQuestions] = useState<string[] | undefined>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQuestions = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!messageText) {
          throw new Error("Message text is empty");
        }

        const possibleQuestions = await generatePossibleQuestions(messageText);

        if (!Array.isArray(possibleQuestions)) {
          throw new Error("Generated questions is not an array");
        }

        setQuestions(possibleQuestions);
      } catch (err) {
        console.error("Error generating questions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate questions"
        );
      } finally {
        setLoading(false);
      }
    };

    generateQuestions();
  }, [messageText]);

  if (error) return null;
  if (loading) return null;
  if (!questions?.length) return null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">
        <span className="h-2 w-2 rounded-full bg-sky-500" />
        Suggested follow ups
      </div>
      <div className="flex gap-2 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {questions.map((question, index) => (
          <Button
            key={index}
            size="sm"
            variant="outline"
            className="whitespace-nowrap rounded-full border-white/70 bg-white/80 px-4 text-xs font-medium text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:text-sky-700"
            type="submit"
            onClick={() => onQuestionClick(question)}
          >
            {question}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PossibleQuestions;
