/**
 * GitHub 設定頁面 testid 常數
 * 供 QA e2e 測試及頁面元件共用，避免字串重複定義
 */

export const GITHUB_TESTIDS = {
  /** 側邊欄導航連結 */
  NAV_GITHUB: "nav-github",

  /** 連接狀態 badge（已連接 / 未連接） */
  STATUS_BADGE: "github-status-badge",

  /** PAT 輸入欄位 */
  TOKEN_INPUT: "github-token-input",

  /** 「連接」按鈕 */
  CONNECT_BUTTON: "github-connect-button",

  /** 「中斷連接」按鈕 */
  DISCONNECT_BUTTON: "github-disconnect-button",

  /** AlertDialog 內的「確認中斷」按鈕 */
  DISCONNECT_CONFIRM_BUTTON: "github-disconnect-confirm-button",

  /** 已連接時顯示的 GitHub username */
  USERNAME_DISPLAY: "github-username-display",

  /** ConnectForm submit 失敗時的即時錯誤訊息 */
  ERROR_MESSAGE: "github-error-message",

  /** 已連接狀態下 status.last_error 的顯示訊息 */
  LAST_ERROR_MESSAGE: "github-last-error-message",

  /** 已連接時「更新 PAT」場景的 submit 按鈕 */
  UPDATE_PAT_BUTTON: "github-update-pat-button",
} as const;
