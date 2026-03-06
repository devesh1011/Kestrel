"use client";

export function TrafficByWebsiteChart() {
  const sites = [
    { name: "Google", value: 72, color: "#7dbbff" },
    { name: "YouTube", value: 55, color: "#b899eb" },
    { name: "Instagram", value: 48, color: "#6be6d3" },
    { name: "Pinterest", value: 32, color: "#71dd8c" },
    { name: "Facebook", value: 28, color: "#a0bce8" },
    { name: "Twitter", value: 20, color: "#7dbbff" },
  ];

  return (
    <div className="space-y-3">
      {sites.map((site) => (
        <div key={site.name} className="flex items-center gap-3">
          <span className="w-20 text-[12px] text-zinc-400">{site.name}</span>
          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              style={{ width: `${site.value}%`, background: site.color }}
              className="h-full rounded-full"
            />
          </div>
          <span className="w-7 text-right text-[12px] text-zinc-400">
            {site.value}%
          </span>
        </div>
      ))}
    </div>
  );
}
