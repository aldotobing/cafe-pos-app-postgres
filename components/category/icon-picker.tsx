"use client";

import { Ban } from "lucide-react";

const defaultIcons = [
  // --- F&B ---
  "☕",
  "🥤",
  "🧋",
  "🫖",
  "🍹",
  "🥛",
  "🍶",
  "🧊",
  "🍽️",
  "🥣",
  "🍱",
  "🍛",
  "🍝",
  "🍜",
  "🍕",
  "🍔",
  "🥐",
  "🍞",
  "🥯",
  "🥨",
  "🍰",
  "🧁",
  "🍩",
  "🍪",
  "🍟",
  "🍿",
  "🥪",
  "🌮",
  "🥗",
  "🍦",
  "🍫",
  "🍬",

  // --- KITCHEN WARE & COOKING ---
  "🍳",
  "🥘",
  "🍲",
  "🥄",
  "🍴",
  "🔪",
  "🥢",
  "🫗",
  "🧂",
  "🥡",
  "🥠",
  "🍵",
  "🫙",
  "🏺",
  "🍺",
  "🍷",

  // --- HARDWARE & TOOLS ---
  "🔧",
  "🔨",
  "🪛",
  "🔩",
  "🪚",
  "🪜",
  "🧰",
  "⚡",
  "🔌",
  "🔋",
  "🔦",
  "⛏️",
  "⛓️",
  "🧱",
  "🪵",

  // --- ELECTRONICS & GADGETS ---
  "📱",
  "💻",
  "🖱️",
  "⌨️",
  "🎧",
  "📷",
  "📺",
  "🎮",
  "⌚",
  "🖨️",
  "📡",
  "🎙️",
  "💿",
  "🎸",
  "🎹",
  "🎻",

  // --- TRANSPORT & VEHICLES ---
  "🚗",
  "🛵",
  "🚲",
  "🚚",
  "🚜",
  "⛽",
  "🛞",
  "🛴",

  // --- AVIATION & TRAVEL ---
  "✈️",
  "🛫",
  "🛬",
  "🛩️",
  "🚁",
  "🧳",
  "🌍",
  "🗺️",
  "🛂",

  // --- PROPERTY & REAL ESTATE ---
  "🏠",
  "🏢",
  "🏬",
  "🏨",
  "🏗️",
  "🏘️",
  "🏙️",
  "🕌",
  "🏛️",
  "⛪",

  // --- HOME & APPAREL ---
  "🛋️",
  "🛏️",
  "🪴",
  "🧹",
  "🧺",
  "👕",
  "👗",
  "👟",
  "🎒",
  "👓",
  "🌂",
  "🕯️",
  "💄",
  "💍",

  // --- CLEANING & HOUSEHOLD ---
  "🧼",
  "🧽",
  "🪣",
  "🧴",
  "🧻",
  "🚿",
  "🛁",
  "🚽",
  "🪥",
  "🪒",

  // --- OFFICE & STATIONERY ---
  "📚",
  "📝",
  "📋",
  "📏",
  "📎",
  "✂️",
  "🖋️",
  "🎨",

  // --- MEDICAL & HEALTH ---
  "💊",
  "🩹",
  "🩺",
  "🧪",

  // --- GENERAL GOODS & SUPPLIES ---
  "📌",
  "📍",
  "🧷",
  "🧵",
  "🧶",
  "🪡",
  "🧯",
  "🛡️",
  "⚙️",
  "🔗",
  "📿",
  "🧮",
  "🎀",
  "🎗️",
  "📮",
  "✉️",
  "📬",

  // --- GENERAL & SERVICES ---
  "⭐",
  "🔥",
  "🏷️",
  "📦",
  "🎁",
  "✨",
  "🛍️",
  "💰",
  "🛒",
  "🔑",
  "🔓",
  "🎯",
  "",
  "🔔",
  "❤️",
];

interface IconPickerProps {
  selectedIcon: string;
  onSelect: (icon: string) => void;
}

export function IconPicker({ selectedIcon, onSelect }: IconPickerProps) {
  return (
    <div className="border rounded-lg p-3 bg-background/50">
      <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 sm:max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-muted">
        {/* None option */}
        <button
          onClick={() => onSelect("")}
          className={`w-full aspect-square rounded-lg flex items-center justify-center transition border-2 flex-shrink-0 ${
            selectedIcon === ""
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent hover:bg-muted text-muted-foreground"
          }`}
          title="Tanpa Ikon"
        >
          <Ban className="h-5 w-5 opacity-40" />
        </button>
        {/* Icons */}
        {defaultIcons.map((icon) => (
          <button
            key={icon}
            onClick={() => onSelect(icon)}
            className={`w-full aspect-square rounded-lg text-xl flex items-center justify-center transition border-2 flex-shrink-0 ${
              selectedIcon === icon
                ? "border-primary bg-primary/10"
                : "border-transparent hover:bg-muted"
            }`}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
