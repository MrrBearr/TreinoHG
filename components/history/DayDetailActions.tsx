"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  copyDayMeals,
  deleteFoodEntry,
  deleteMeal,
  deleteWorkout,
} from "@/lib/actions";
import { toDateKey } from "@/lib/utils";

export function CopyDayButton({ date }: { date: string }) {
  const router = useRouter();
  const [target, setTarget] = React.useState(toDateKey());
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function copy() {
    setLoading(true);
    try {
      const res = await copyDayMeals(date, target);
      toast.success(`${res.copied} refeição(ões) copiada(s)`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error("Erro ao copiar", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Copy /> Copiar dia
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copiar refeições para outro dia</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="target">Data destino</Label>
            <Input
              id="target"
              type="date"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="ghost" className="flex-1">
                Cancelar
              </Button>
            </DialogClose>
            <Button onClick={copy} loading={loading} className="flex-1">
              Copiar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteMealButton({
  meal_id,
  date,
}: {
  meal_id: string;
  date: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label="Remover refeição"
      onClick={async () => {
        if (!confirm("Excluir essa refeição?")) return;
        setLoading(true);
        try {
          await deleteMeal(meal_id, date);
          toast.success("Refeição removida");
          router.refresh();
        } catch (e) {
          toast.error("Erro ao remover", { description: (e as Error).message });
        } finally {
          setLoading(false);
        }
      }}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

export function DeleteWorkoutButton({
  workout_id,
  date,
}: {
  workout_id: string;
  date: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label="Remover treino"
      onClick={async () => {
        if (!confirm("Excluir esse treino?")) return;
        setLoading(true);
        try {
          await deleteWorkout(workout_id, date);
          toast.success("Treino removido");
          router.refresh();
        } catch (e) {
          toast.error("Erro ao remover", { description: (e as Error).message });
        } finally {
          setLoading(false);
        }
      }}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}

export function DeleteEntryButton({
  entry_id,
  date,
}: {
  entry_id: string;
  date: string;
}) {
  const router = useRouter();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label="Remover item"
      onClick={async () => {
        await deleteFoodEntry(entry_id, date);
        router.refresh();
      }}
    >
      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}
