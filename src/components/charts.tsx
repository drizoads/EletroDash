import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Charger, ConnectorStatus, DailyPoint } from "../api";
import { int, kwh, money } from "../lib/format";
import { CONNECTOR_STATUS, TONE_HEX, cx } from "./ui";

const AXIS = { fill: "var(--faint)", fontSize: 11 };
const GRID = "color-mix(in oklab, var(--line) 85%, transparent)";

export type SeriesKey = "gross" | "energy" | "sessions";

function bucketLabel(iso: string, bucket: "day" | "hour") {
  const d = new Date(iso);
  return bucket === "hour"
    ? `${String(d.getHours()).padStart(2, "0")}h`
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface TipPayload {
  payload?: DailyPoint & { label: string };
}

function ChartTip({
  active,
  payload,
  series,
}: {
  active?: boolean;
  payload?: TipPayload[];
  series: SeriesKey;
}) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  return (
    <div className="bg-surface border-line rounded-lg border px-3 py-2 text-xs shadow-lg">
      <div className="text-main mb-1 font-medium">{p.label}</div>
      {series === "gross" && (
        <div className="text-muted space-y-0.5 tabular">
          <div>
            Total: <span className="text-main font-medium">{money(p.grossCents)}</span>
          </div>
          <div>
            <span className="text-accent">■</span> Pix {money(p.pixCents)}
          </div>
          <div>
            <span className="text-info">■</span> Cartão {money(p.cardCents)}
          </div>
        </div>
      )}
      {series === "energy" && <div className="text-muted tabular">{kwh(p.energyWh)}</div>}
      {series === "sessions" && (
        <div className="text-muted tabular">{int(p.sessions)} recargas concluídas</div>
      )}
    </div>
  );
}

export function EvolutionChart({
  data,
  bucket,
  series,
}: {
  data: DailyPoint[];
  bucket: "day" | "hour";
  series: SeriesKey;
}) {
  const rows = data.map((d) => ({
    ...d,
    label: bucketLabel(d.date, bucket),
    pix: d.pixCents / 100,
    card: d.cardCents / 100,
    kwh: d.energyWh / 1000,
  }));
  const tickFmt = (v: number) =>
    series === "gross"
      ? `R$ ${v.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 })}`
      : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  // Barras finas e espaçadas, mesmo com poucos pontos.
  const barSize = bucket === "hour" ? 10 : rows.length > 20 ? 8 : 14;
  const top = [3, 3, 1, 1] as [number, number, number, number];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 12, right: 4, left: 0, bottom: 0 }} barSize={barSize}>
        <defs>
          <linearGradient id="bar-accent" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={1} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.45} />
          </linearGradient>
          <linearGradient id="bar-info" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--info)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--info)" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="2 6" />
        <XAxis
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={18}
          dy={6}
        />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={58}
          tickCount={4}
          tickFormatter={tickFmt}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)", radius: 6 } as object}
          content={(props) => (
            <ChartTip
              active={props.active}
              payload={props.payload as unknown as TipPayload[]}
              series={series}
            />
          )}
        />
        {series === "gross" && (
          <>
            <Bar dataKey="pix" stackId="a" fill="url(#bar-accent)" radius={[1, 1, 1, 1]} />
            <Bar dataKey="card" stackId="a" fill="url(#bar-info)" radius={top} />
          </>
        )}
        {series === "energy" && <Bar dataKey="kwh" fill="url(#bar-accent)" radius={top} />}
        {series === "sessions" && <Bar dataKey="sessions" fill="url(#bar-accent)" radius={top} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

const ORDER: ConnectorStatus[] = ["available", "charging", "occupied", "faulted", "offline"];

export function countConnectors(chargers: Charger[]): Record<ConnectorStatus, number> {
  const counts: Record<ConnectorStatus, number> = {
    available: 0,
    charging: 0,
    occupied: 0,
    faulted: 0,
    offline: 0,
  };
  for (const c of chargers) for (const con of c.connectors) counts[con.status]++;
  return counts;
}

export function ConnectorDonut({
  chargers,
  onSelect,
}: {
  chargers: Charger[];
  onSelect?: (s: ConnectorStatus) => void;
}) {
  const counts = countConnectors(chargers);
  const total = ORDER.reduce((a, s) => a + counts[s], 0);
  const online = total - counts.offline;
  const data = ORDER.map((s) => ({ status: s, value: counts[s] })).filter((d) => d.value > 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
      <div className="relative size-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="status"
              innerRadius={52}
              outerRadius={72}
              paddingAngle={data.length > 1 ? 3 : 0}
              stroke="none"
              onClick={(_d, index) => {
                const st = data[index]?.status;
                if (st) onSelect?.(st);
              }}
              className={cx(onSelect && "cursor-pointer")}
            >
              {data.map((d) => (
                <Cell key={d.status} fill={TONE_HEX[CONNECTOR_STATUS[d.status].tone]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-main text-2xl font-semibold tabular">
              {online}
              <span className="text-faint text-base font-normal">/{total}</span>
            </div>
            <div className="text-faint text-[11px]">conectores online</div>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {ORDER.map((s) => (
          <li key={s}>
            <button
              onClick={() => onSelect?.(s)}
              className="hover:bg-surface-2 flex w-full items-center justify-between rounded-md px-2 py-1"
            >
              <span className="text-muted flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: TONE_HEX[CONNECTOR_STATUS[s].tone] }}
                />
                {CONNECTOR_STATUS[s].label}
              </span>
              <span className="text-main font-medium tabular">{counts[s]}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
