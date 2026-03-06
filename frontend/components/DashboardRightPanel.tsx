"use client";

import { Bug, UserPlus, Bell, MessageCircle } from "lucide-react";

export function DashboardRightPanel() {
  const notifications = [
    {
      id: 1,
      text: "You fixed a bug.",
      time: "Just now",
      variant: "purple",
      Icon: Bug,
    },
    {
      id: 2,
      text: "New user registered.",
      time: "59 min ago",
      variant: "blue",
      Icon: UserPlus,
    },
    {
      id: 3,
      text: "Andi Lane subscribed.",
      time: "Today",
      variant: "purple",
      Icon: Bell,
    },
    {
      id: 4,
      text: "New message received.",
      time: "5 hrs ago",
      variant: "blue",
      Icon: MessageCircle,
    },
  ];

  const activities = [
    {
      id: 1,
      name: "Brooklyn Simmons",
      avatar: "/avatars/1.jpg",
      action: "Changed the style.",
      time: "Just now",
    },
    {
      id: 2,
      name: "Esther Howard",
      avatar: "/avatars/2.jpg",
      action: "Released a new version.",
      time: "59 min ago",
    },
    {
      id: 3,
      name: "Cameron Williamson",
      avatar: "/avatars/3.jpg",
      action: "Submitted a bug.",
      time: "12 hrs ago",
    },
    {
      id: 4,
      name: "Kristin Watson",
      avatar: "/avatars/4.jpg",
      action: "Modified A to Z data.",
      time: "Today",
    },
    {
      id: 5,
      name: "Ronald Richards",
      avatar: "/avatars/5.jpg",
      action: "Deleted a page.",
      time: "Feb 2025",
    },
  ];

  const contacts = [
    { name: "Natali Craig", avatar: "/avatars/contact1.jpg" },
    { name: "Drew Cano", avatar: "/avatars/contact2.jpg" },
    { name: "Andi Lane", avatar: "/avatars/contact3.jpg" },
    { name: "Koray Okumus", avatar: "/avatars/contact4.jpg" },
    { name: "Kate Morrison", avatar: "/avatars/contact5.jpg" },
    { name: "Melody Macy", avatar: "/avatars/contact6.jpg" },
  ];

  return (
    <aside className="hidden xl:flex h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-l border-white/[0.06] bg-[#111318]">
      {/* Notifications */}
      <div className="p-5 border-b border-white/[0.06]">
        <h3 className="mb-3 text-[14px] font-semibold text-white">
          Notifications
        </h3>
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  n.variant === "purple" ? "bg-indigo-500/20" : "bg-sky-500/20"
                }`}
              >
                <n.Icon className="h-4 w-4 text-zinc-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-zinc-200 leading-5">{n.text}</p>
                <p className="text-[11px] text-zinc-500">{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activities */}
      <div className="p-5 border-b border-white/[0.06]">
        <h3 className="mb-3 text-[14px] font-semibold text-white">
          Activities
        </h3>
        <div className="relative space-y-4">
          {/* Vertical dashed line */}
          <div className="absolute left-3 top-0 bottom-0 w-px border-l border-dashed border-white/10" />
          {activities.map((a) => (
            <div key={a.id} className="relative flex items-start gap-3 pl-8">
              <div className="absolute left-0 h-6 w-6 overflow-hidden rounded-full bg-white/10 shrink-0">
                <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-300">
                  {a.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
              </div>
              <div>
                <p className="text-[13px] text-zinc-200 leading-5">
                  {a.action}
                </p>
                <p className="text-[11px] text-zinc-500">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div className="p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-white">Contacts</h3>
        <div className="space-y-3">
          {contacts.map((c) => (
            <div key={c.name} className="flex items-center gap-3">
              <div className="h-7 w-7 overflow-hidden rounded-full bg-white/10 shrink-0">
                <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-300">
                  {c.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
              </div>
              <span className="text-[13px] text-zinc-200">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
