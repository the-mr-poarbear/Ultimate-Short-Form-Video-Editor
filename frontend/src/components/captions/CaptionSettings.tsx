import React from "react";
import { useEditorStore } from "../../stores/editorStore";
import { Slider } from "../ui/Slider";
import { Type, Palette, AlignVerticalJustifyCenter, Sparkles } from "lucide-react";

const FONT_OPTIONS = [
  { label: "Inter (Modern Clean)", value: "Inter" },
  { label: "Montserrat (Punchy Bold)", value: "Montserrat" },
  { label: "Bebas Neue (Tall Bold)", value: "Bebas Neue" },
  { label: "Poppins (Rounded Heavy)", value: "Poppins" },
  { label: "Impact (Classic Meme/Shorts)", value: "Impact" },
  { label: "Arial Black (Universal Bold)", value: "Arial Black" },
];

const NORMAL_COLOR_PRESETS = [
  "#FFFFFF",
  "#E2E8F0",
  "#FEF08A",
  "#BAE6FD",
  "#A7F3D0",
];

const HIGHLIGHT_COLOR_PRESETS = [
  "#FFE600", // Classic Viral Yellow
  "#00F0FF", // Cyber Cyan
  "#22C55E", // Vivid Neon Green
  "#FF007F", // Hot Pink
  "#FF6B00", // Vibrant Orange
];

export const CaptionSettings: React.FC = () => {
  const project = useEditorStore((s) => s.project);
  const updateProjectSettings = useEditorStore((s) => s.updateProjectSettings);

  if (!project) return null;
  const style = project.settings.captionStyle;

  const updateCaption = (key: string, value: any) => {
    updateProjectSettings({
      captionStyle: {
        ...style,
        [key]: value,
      },
    });
  };

  const fontSize = style.fontSize ?? 48;
  const lineHeight = style.lineHeight ?? 1.25;
  const letterSpacing = style.letterSpacing ?? 0;
  const positionY = style.positionY ?? 80;
  const maxWords = style.maxWordsPerLine ?? 4;
  const textColor = style.textColor ?? "#FFFFFF";
  const highlightColor = style.highlightColor ?? "#FFE600";
  const strokeWidth = style.strokeWidth ?? 3;
  const strokeColor = style.strokeColor ?? "#000000";
  const fontFamily = style.fontFamily ?? "Inter";

  return (
    <div className="flex flex-col gap-4 text-xs select-none">
      {/* Header */}
      <div className="flex items-center gap-1.5 font-bold text-foreground uppercase tracking-wider text-[11px] pb-2 border-b border-border/60">
        <Type className="w-3.5 h-3.5 text-primary" />
        <span>Typography Studio</span>
      </div>

      {/* Font Family */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-foreground/80 flex items-center justify-between">
          <span>Font Family</span>
          <span className="text-[10px] font-mono text-muted-foreground">{fontFamily}</span>
        </label>
        <select
          value={fontFamily}
          onChange={(e) => updateCaption("fontFamily", e.target.value)}
          className="w-full h-8 px-2 bg-surface border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Size & Spacing */}
      <div className="flex flex-col gap-3 p-2.5 rounded-md bg-surface-elevated/40 border border-border/40">
        <Slider
          label="Font Size"
          value={fontSize}
          min={20}
          max={130}
          step={2}
          unit="px"
          onChange={(val) => updateCaption("fontSize", val)}
        />

        <Slider
          label="Line Height"
          value={lineHeight}
          min={0.9}
          max={2.2}
          step={0.05}
          unit="x"
          onChange={(val) => updateCaption("lineHeight", Math.round(val * 100) / 100)}
        />

        <Slider
          label="Letter Spacing"
          value={letterSpacing}
          min={-2}
          max={12}
          step={0.5}
          unit="px"
          onChange={(val) => updateCaption("letterSpacing", val)}
        />
      </div>

      {/* Colors & Highlight */}
      <div className="flex flex-col gap-3 p-2.5 rounded-md bg-surface-elevated/40 border border-border/40">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground/90">
          <Palette className="w-3 h-3 text-primary" />
          <span>Colors & Highlight</span>
        </div>

        {/* Normal Text Color */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Normal Text Color</span>
            <span className="font-mono text-[10px] text-foreground font-medium uppercase">{textColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => updateCaption("textColor", e.target.value)}
              className="w-8 h-8 rounded border border-border bg-surface cursor-pointer p-0.5"
            />
            <div className="flex items-center gap-1.5 flex-1">
              {NORMAL_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateCaption("textColor", preset)}
                  style={{ backgroundColor: preset }}
                  className={`w-5 h-5 rounded-full border border-black/40 transition-transform ${
                    textColor.toLowerCase() === preset.toLowerCase() ? "scale-125 ring-2 ring-primary" : "hover:scale-110"
                  }`}
                  title={preset}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Highlight Word Color */}
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border/40">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-primary font-medium flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Active Highlight Color
            </span>
            <span className="font-mono text-[10px] text-primary font-bold uppercase">{highlightColor}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={highlightColor}
              onChange={(e) => updateCaption("highlightColor", e.target.value)}
              className="w-8 h-8 rounded border border-border bg-surface cursor-pointer p-0.5"
            />
            <div className="flex items-center gap-1.5 flex-1">
              {HIGHLIGHT_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateCaption("highlightColor", preset)}
                  style={{ backgroundColor: preset }}
                  className={`w-5 h-5 rounded-full border border-black/40 transition-transform ${
                    highlightColor.toLowerCase() === preset.toLowerCase() ? "scale-125 ring-2 ring-primary" : "hover:scale-110"
                  }`}
                  title={preset}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layout & Stroke */}
      <div className="flex flex-col gap-3 p-2.5 rounded-md bg-surface-elevated/40 border border-border/40">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground/90">
          <AlignVerticalJustifyCenter className="w-3 h-3 text-primary" />
          <span>Layout & Outline</span>
        </div>

        <Slider
          label="Vertical Position (Y)"
          value={positionY}
          min={25}
          max={90}
          step={1}
          unit="%"
          onChange={(val) => updateCaption("positionY", val)}
        />

        <Slider
          label="Words Per Line"
          value={maxWords}
          min={2}
          max={8}
          step={1}
          unit=" words"
          onChange={(val) => updateCaption("maxWordsPerLine", val)}
        />

        <Slider
          label="Stroke Width"
          value={strokeWidth}
          min={0}
          max={8}
          step={1}
          unit="px"
          onChange={(val) => updateCaption("strokeWidth", val)}
        />

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Outline Color</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-foreground font-medium uppercase">{strokeColor}</span>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => updateCaption("strokeColor", e.target.value)}
              className="w-6 h-6 rounded border border-border bg-surface cursor-pointer p-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
