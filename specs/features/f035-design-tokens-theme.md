# F-035: Design Tokens & Theme

## Status: active
## Sprint: 13
## Priority: P0
## GitHub Issues: #192 (feature), #199 (PR)

## 使用者故事
As a developer, I want a consistent editorial design system with light/dark/system theme support, so that all UI components share a unified visual language.

## 設計決策
- 採用 OKLCH 色彩空間（感知均勻，dark mode 調整直覺）
- `data-theme` attribute 驅動主題切換（CSS variable 覆蓋，無 JS class toggle）
- Tailwind v4 `@theme` directive 整合 CSS variables
- editorial 紙本系統：溫暖米白底、深墨色文字、minimal 陰影

## Design Tokens 定義

### 色彩（OKLCH）
| Token | Light | Dark |
|-------|-------|------|
| `--color-bg` | oklch(97% 0.005 80) | oklch(15% 0.005 240) |
| `--color-fg` | oklch(18% 0.01 240) | oklch(92% 0.005 80) |
| `--color-muted` | oklch(55% 0.01 240) | oklch(55% 0.01 240) |
| `--color-border` | oklch(85% 0.005 80) | oklch(28% 0.005 240) |
| `--color-accent` | oklch(55% 0.18 250) | oklch(68% 0.18 250) |
| `--color-accent-fg` | oklch(99% 0 0) | oklch(99% 0 0) |
| `--color-surface` | oklch(100% 0 0) | oklch(20% 0.005 240) |
| `--color-surface-raised` | oklch(96% 0.005 80) | oklch(24% 0.005 240) |

### Typography
| Token | Value |
|-------|-------|
| `--font-sans` | "Inter Variable", system-ui, sans-serif |
| `--font-mono` | "JetBrains Mono Variable", monospace |
| `--text-xs` | 0.75rem / 1rem |
| `--text-sm` | 0.875rem / 1.25rem |
| `--text-base` | 1rem / 1.5rem |
| `--text-lg` | 1.125rem / 1.75rem |
| `--text-xl` | 1.25rem / 1.75rem |
| `--text-2xl` | 1.5rem / 2rem |

### Spacing
- 基礎單位 4px（`--space-1` = 4px ... `--space-16` = 64px）

### Shadows
| Token | Value |
|-------|-------|
| `--shadow-sm` | 0 1px 2px oklch(0% 0 0 / 6%) |
| `--shadow-md` | 0 4px 8px oklch(0% 0 0 / 8%) |
| `--shadow-lg` | 0 8px 24px oklch(0% 0 0 / 12%) |

### Z-Index
| Token | Value |
|-------|-------|
| `--z-modal` | 50 |
| `--z-sidebar` | 40 |
| `--z-tooltip` | 60 |
| `--z-cmdk` | 70 |

## 實作範圍

### 檔案
- `dev/frontend/app/globals.css`：所有 CSS variable 定義 + Tailwind `@theme`
- `dev/frontend/components/theme/ThemeProvider.tsx`：context + localStorage + system preference
- `dev/frontend/components/theme/theme-script.tsx`：inline script（防 FOUC）
- `dev/frontend/components/theme/theme-toggle.tsx`：light/dark/system 切換按鈕
- `design/tokens/colors.json`、`design/tokens/typography.json`、`design/tokens/spacing.json`、`design/tokens/shadows.json`、`design/tokens/z-index.json`

## Business Rules
1. 主題預設為 system（跟隨 OS 偏好）
2. 使用者設定儲存於 localStorage key `aibo-theme`
3. 頁面載入時 inline script 先讀取 localStorage，在 hydration 前設定 `data-theme`，消除 FOUC
4. `data-theme="light" | "dark"` 設定在 `<html>` element
5. system 模式下，`prefers-color-scheme` 媒體查詢決定實際 theme

## Scenarios

### Happy Path

#### Scenario: 頁面載入使用 system theme（OS dark）
GIVEN OS 偏好為 dark，localStorage 無 aibo-theme
WHEN 頁面載入
THEN `<html>` 的 `data-theme` 為 "dark"
AND background 顯示深色

#### Scenario: 切換至 light theme
GIVEN 目前為 dark theme
WHEN 使用者點擊 theme-toggle 選擇 light
THEN `<html>` 的 `data-theme` 改為 "light"
AND localStorage `aibo-theme` = "light"

#### Scenario: 重新整理後保持使用者設定
GIVEN localStorage `aibo-theme` = "light"
WHEN 頁面重新整理
THEN `<html>` 的 `data-theme` 為 "light"（無 FOUC）

### Error Handling

#### Scenario: localStorage 不可用時降級
GIVEN localStorage 被封鎖（隱私模式）
WHEN 頁面載入
THEN 使用 system 預設，不拋錯

### Edge Cases

#### Scenario: CSS variable 覆蓋生效
GIVEN `data-theme="dark"` 已設定
WHEN 讀取 `--color-bg` computed value
THEN 值為 dark token 對應的 OKLCH 值
