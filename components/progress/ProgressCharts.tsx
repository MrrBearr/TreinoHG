"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DaySummary } from "@/types";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatNumber } from "@/lib/utils";

interface ProgressChartsProps {
  days: DaySummary[];
  target: number;
}

export function ProgressCharts({ days, target }: ProgressChartsProps) {
  // days come ordered desc; for charts we want chronological asc
  const chrono = [...days].reverse();

  const last7 = chrono.slice(-7);
  const last30 = chrono;

  return (
    <Tabs defaultValue="7d" className="space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="7d" className="flex-1">
          7 dias
        </TabsTrigger>
        <TabsTrigger value="30d" className="flex-1">
          30 dias
        </TabsTrigger>
      </TabsList>
      <TabsContent value="7d">
        <ChartGroup data={last7} target={target} />
      </TabsContent>
      <TabsContent value="30d">
        <ChartGroup data={last30} target={target} />
      </TabsContent>
    </Tabs>
  );
}

function ChartGroup({
  data,
  target,
}: {
  data: DaySummary[];
  target: number;
}) {
  const active = data.filter(
    (d) => d.consumed_kcal > 0 || d.workout_count > 0,
  );
  const avg =
    active.length > 0
      ? Math.round(
          active.reduce((s, d) => s + d.consumed_kcal, 0) / active.length,
        )
      : 0;
  const totalBurn = data.reduce((s, d) => s + d.burned_kcal, 0);
  const totalMin = data.reduce((s, d) => s + d.workout_minutes, 0);

  const chartData = data.map((d) => ({
    label: shortLabel(d.date),
    date: d.date,
    consumed: d.consumed_kcal,
    burned: d.burned_kcal,
    net: d.net_kcal,
    protein: d.protein_g,
    carbs: d.carbs_g,
    fat: d.fat_g,
    workout_min: d.workout_minutes,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Média kcal
          </div>
          <div className="stat-number text-lg">{formatNumber(avg)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Queimadas
          </div>
          <div className="stat-number text-lg">{formatNumber(totalBurn)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Min treino
          </div>
          <div className="stat-number text-lg">{formatNumber(totalMin)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold">Calorias consumidas</h3>
          <p className="text-xs text-muted-foreground">
            Comparado com sua meta diária
          </p>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <ReferenceLine
                y={target}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: "Meta",
                  fontSize: 10,
                  fill: "hsl(var(--primary))",
                  position: "right",
                }}
              />
              <Bar dataKey="consumed" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, idx) => {
                  const tol = target * 0.05;
                  const color =
                    entry.consumed === 0
                      ? "hsl(var(--secondary))"
                      : entry.consumed > target + tol
                        ? "hsl(var(--warning))"
                        : entry.consumed >= target - tol
                          ? "hsl(var(--success))"
                          : "hsl(var(--primary))";
                  return <Cell key={idx} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold">Saldo líquido</h3>
          <p className="text-xs text-muted-foreground">
            Consumido − queimado por dia
          </p>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <ReferenceLine
                y={target}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold">Treinos (min)</h3>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                stroke="hsl(var(--border))"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="workout_min"
                fill="hsl(24 95% 53%)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function shortLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}
