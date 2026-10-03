import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function CampaignMixChart({ mixData, segmented, displayTotal }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={mixData}
          dataKey="value"
          nameKey="label"
          innerRadius={48}
          outerRadius={70}
          paddingAngle={segmented ? 3 : 0}
          stroke="none"
        >
          {mixData.map((entry) => (
            <Cell key={entry.key || entry.label} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const pct = displayTotal > 0 ? Math.round((Number(value) * 100) / displayTotal) : 0;
            return [`${value} (${pct}%)`, name];
          }}
          contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgb(15 23 42 / 0.08)" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
