# Design System: GK Blog

A clean, crisp, modern digital studio & personal publication space for GK.
Optimized for Chinese-first screen reading, high contrast, and zero artificial clutter.

## 1. Principles
* **Clear & Crisp (清晰明亮)**: Pure whites and subtle neutral cool grays in light mode; deep solid zinc in dark mode. Strictly NO yellowed "AI paper" tints.
* **Native Chinese Typography (中文排版优先)**:
  * Uses the high-performance system font stack (`-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"`).
  * No external font downloads.
  * No forced serif fonts for Chinese body or titles.
  * Natural line height (`1.75 ~ 1.8`) and proper word-break/text-wrap formatting.
* **Manual & Persistent Theme Switching (明暗主题切换)**:
  * Integrated Sun/Moon toggle in the navigation bar.
  * Immediate head script execution to prevent FOUC (flash of unstyled content).
  * Persisted in `localStorage` with fallback to `prefers-color-scheme`.

## 2. Color Palette

### Light Mode (Crisp White / 清晰明亮)
* **Background Primary**: `#ffffff` (Pure Crisp White)
* **Background Surface**: `#f8fafc` (Slate-50)
* **Text Primary**: `#0f172a` (Slate-900, High Legibility Deep Charcoal)
* **Text Secondary**: `#64748b` (Slate-500)
* **Border**: `#e2e8f0` (Slate-200, 1px subtle hairline)
* **Accent**: `#0284c7` (Clean Sky / Tech Slate)

### Dark Mode (Clean Zinc / 深邃暗黑)
* **Background Primary**: `#09090b` (Zinc-950)
* **Background Surface**: `#18181b` (Zinc-900)
* **Text Primary**: `#fafafa` (Zinc-50)
* **Text Secondary**: `#a1a1aa` (Zinc-400)
* **Border**: `#27272a` (Zinc-800)
* **Accent**: `#38bdf8` (Luminous Sky)
