# Socratic AI Tutor - Project Blueprint & Maintenance Guide

本文檔旨在為技術維護人員提供系統架構的完整概覽，並標準化日後的維護流程。本項目採用 **Chrome Extension + Web Hub (GitHub Pages) + Firebase** 的混合雲架構。

---

## 🏗️ 1. 系統架構總覽 (System Architecture)

系統由三個核心組件構成，通過 Firebase 實時同步數據：

### A. Chrome Extension (Frontend/Logic)
- **目錄**: `/src/sidepanel`, `/src/background`
- **功能**: 
  - 核心蘇格拉底教學邏輯。
  - 使用 `chrome.identity` 進行 Google 登入。
  - 透過 `Vertex AI API` 調用 Gemini 模型。
  - 實時監聽 Firestore 中的 `energyBalance`。

### B. Web Hub (Marketing/Account Management)
- **目錄**: `/src/web`
- **託管**: GitHub Pages (`socratic.geledtech.com`)
- **功能**:
  - 定價方案展示與購買引導。
  - 跨端帳戶數據同步。
  - **PayPal Live 支付對接** (詳見 [PAYPAL_INTEGRATION_GUIDE.md](file:///Users/leungkin/Desktop/Socratic AI Tutor - Guided Learning Assistant/Docs/PAYPAL_INTEGRATION_GUIDE.md))。
  - 交易與電力消耗歷史紀錄。

### C. Backend Services (Serverless)
- **服務**: Firebase Auth, Firestore & Cloud Functions (Gen 2)
- **角色**: 唯一真理來源 (Source of Truth) 與安全履約中心。
  - **Firestore**: 存儲用戶電力、交易與配置。
  - **Cloud Functions**: 處理 PayPal Webhooks 異步充值，確保「銀行級」交易可靠性。

---

## 🔄 2. 實時數據同步機制 (Real-time Sync)

為了確保 Extension 與 Web 端數據一致，我們實施了以下機制：

1.  **登入流 (Authentication Flow)**:
    - **Extension**: 使用 `signInWithCredential` 與 OAuth Token 綁定。
    - **Web Hub**: 使用 `signInWithRedirect` (預防彈出視窗攔截) 進行 Google 登入。
2.  **實時監聽 (Live Listeners)**:
    - 兩端均使用 Firebase `onSnapshot` 監聽 `/users/{uid}` 文件。
    - 任何一端發生扣費或充值，另一端會 **0 延遲** 自動更新 UI。

---

## 🚀 3. 部署與開發流程 (Deployment)

### GitHub Actions 自動部署
本項目配置了 `.github/workflows/deploy.yml`，每當 `main` 分支有代碼推送時：
1.  自動構建 Web 目錄。
2.  發布至 `gh-pages` 分支。
3.  更新 `socratic.geledtech.com` 內容。

### 更新步驟
1.  修改 `/src/web` 下的 HTML/CSS。
2.  提交並推送至 GitHub。
3.  在 GitHub Actions 標籤頁確認部署成功。

---

## 🛠️ 4. 技術維護手冊 (Maintenance FAQ)

### Q: 如何添加新的授權網域？
若更改網域，必須前往 [Firebase Console](https://console.firebase.google.com/):
- **路徑**: Authentication > Settings > Authorized domains。
- **操作**: 點擊「Add domain」並加入新域名。

### Q: 如何替換 AI 模型？
- **文件**: `/src/background/engine.js` (或相關模型管理文件)。
- **操作**: 更新 `MODEL_ID` (如 `gemini-1.5-pro` 改為 `gemini-2.0-flash`)。
- **注意**: 若模型更換，請確認 IAM 權限中是否已賦予該模型調用權。

### Q: 電力數值不更新怎麼辦？
1.  確認 Firebase Config 是否正確（與 Extension 一致）。
2.  檢查瀏覽器 Console 是否有 `auth/unauthorized-domain` 錯誤。
3.  確認 Firestore 規則（Security Rules）允許用戶讀取自己的文檔。

---
 
## 🛡️ 5. 安全合規與風險防控 (Compliance & Safety)
 
本項目曾於開發階段觸發 Google 「網路釣魚 (Phishing)」自動風控，為維護域名商譽與專案穩定，必須嚴格執行以下標準：
 
1.  **支付標誌管控**：嚴禁在 `.web.app` 或 `.github.io` 子域名上放置過多第三方支付（如 Visa, Mastercard）的彩色 Logo。
2.  **信任標記 (Trust Markers)**：所有升級頁面必須具備完整的法律腳註（隱私權政策、服務條款、聯絡電子郵件）。
3.  **域名策略**：生產環境強制使用已驗證的高權重自定義域名 (`socratic.geledtech.com`)，禁止直接對外宣傳原生 Firebase/GitHub 分配的網域。
4.  **申訴存檔**：本專案已通過 Google Trust & Safety 團隊的人工審核 (Ticket ID: BSF6ZOPLELYXZ5YZQDOWRUJRCA)。
 
---
 
## 📜 項目歷史紀錄 (Changelog Highlights)
- **2026/02/01**: 完成從 Firebase Hosting 遷移至 GitHub Pages。
- **2026/02/02**: 實現 Web 端與 Extension 的 Firebase 實時同步。
- **2026/02/02**: 將 Web 端登入機制優化為跳轉模式 (Redirect) 以解決阻擋問題。
- **2026/02/02**: 完成 PayPal Live 正式環境接入，實現商業化閉環。
- **2026/02/02**: 部署 Firebase Cloud Functions (Gen 2)，建立 PayPal Webhook 異步充值機制。
- **2026/02/02**: 完成 Google Cloud Trust & Safety 申訴流程，優化 Phishing 防控標準。
- **2026/02/02**: 建立動態電力消耗等級 (L1, L2, L3) 並在 UI 公示。

---
*本文檔遵循 Superpowers 技術文檔標準生成，最後更新於 2026/02/02。*
