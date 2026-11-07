import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  HeartPulse,
  PlaneTakeoff,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import logo from "@/app/assets/logo.png";

interface InitialQuestionsProps {
  onQuestionClick: (questions: string) => void;
}

const initialQuestions = [
  {
    icon: Building2,
    question: "What are the best clinics available in Lithuania?",
  },
  {
    icon: HeartPulse,
    question: "What plastic surgery procedures are available in Lithuania?",
  },
  {
    icon: PlaneTakeoff,
    question: "Tell me about medical tourism",
  },
  {
    icon: ShieldCheck,
    question: "Why should I choose Lithuania for my plastic surgery?",
  },
];

const InitialQuestions = ({ onQuestionClick }: InitialQuestionsProps) => {
  return (
    <Card className="surface-panel mx-auto flex w-full max-w-[880px] flex-col items-center justify-center overflow-hidden rounded-[32px] border border-white/70 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <CardHeader className="flex w-full items-center px-6 pb-2 pt-6 text-center sm:px-10 sm:pt-7">
        <div className="mx-auto mb-4 flex h-[86px] w-full max-w-[220px] items-center justify-center rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-[0_18px_45px_rgba(14,165,233,0.18)] sm:h-[96px] sm:max-w-[240px]">
          <Image
            src={logo}
            alt="Surgery Abroad logo"
            width={240}
            height={137}
            priority
            className="h-full w-full object-contain"
          />
        </div>

        <div className="mb-3 flex flex-wrap justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-700">
          <span className="rounded-full border border-sky-200 bg-white/80 px-3 py-1">
            Treatment planning
          </span>
          <span className="rounded-full border border-sky-200 bg-white/80 px-3 py-1">
            Clinic guidance
          </span>
          <span className="rounded-full border border-sky-200 bg-white/80 px-3 py-1">
            Travel support
          </span>
        </div>

        <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[2.15rem]">
          Ask anything about surgery abroad
        </CardTitle>

        <CardDescription className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">
          Get a fast starting point for clinics, procedures, recovery planning,
          and medical tourism decisions.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid w-full gap-3 px-6 pb-6 pt-2 sm:px-10 md:grid-cols-2">
        {initialQuestions.map(({ icon: Icon, question }, index) => (
          <button
            key={index}
            type="button"
            className="group flex min-h-[82px] items-start gap-3 rounded-[22px] border border-white/70 bg-white/78 p-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white"
            onClick={() => onQuestionClick(question)}
          >
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition duration-300 group-hover:bg-sky-600 group-hover:text-white">
              <Icon size={18} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-900 md:text-[15px]">
                {question}
              </span>
              <span className="text-xs text-slate-500">
                Start with this prompt
              </span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
};

export default InitialQuestions;
