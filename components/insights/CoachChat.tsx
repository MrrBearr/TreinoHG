"use client";

import * as React from "react";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "coach";
  content: string;
}

const SUGGESTED = [
  "Como ajustar minhas refeições para hoje?",
  "Estou treinando o suficiente?",
  "Sugira um pré-treino simples.",
  "Como bater minha meta de proteína?",
];

export function CoachChat() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim() || pending) return;
    const userMsg: Message = {
      id: rid(),
      role: "user",
      content: question.trim(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: userMsg.content }),
      });
      if (!res.ok) throw new Error("err");
      const json = await res.json();
      setMessages((m) => [
        ...m,
        { id: rid(), role: "coach", content: json.answer ?? "" },
      ]);
    } catch {
      toast.error("Não consegui responder agora.");
      setMessages((m) => [
        ...m,
        {
          id: rid(),
          role: "coach",
          content:
            "Tive um problema para responder. Tenta de novo em instantes.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="max-h-[480px] min-h-[240px] flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Pergunte qualquer coisa sobre nutrição, treino, macros ou ajustes
              do seu plano.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-secondary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        {pending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
            Coach pensando...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border bg-background/50 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte algo..."
          className="h-11 flex-1 rounded-full border border-input bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          disabled={pending}
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Enviar"
          disabled={pending || !input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground text-background">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary text-foreground rounded-bl-sm",
        )}
      >
        {message.content}
      </div>
    </div>
  );
}

function rid() {
  return Math.random().toString(36).slice(2);
}
