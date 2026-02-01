# Vertex AI 接入本系統範本指南

本指南旨在幫助開發者快速將 Google Vertex AI (Gemini) 整合至 Socratic AI Tutor 擴充功能中。本系統採用 **Chrome Identity OAuth 2.0 + REST API** 的方式直接與 GCP 連接。

---

## 🛠️ 第一階段：Google Cloud Platform (GCP) 設定

### 1. 建立專案
*   前往 [GCP Console](https://console.cloud.google.com/)。
*   建立新專案，並記錄您的 **專案編號 (Project Number)**（例如：`551520576044`）。
    > [!TIP]
    > 使用「專案編號」在 REST API 調用中通常比「文字 ID」更穩定。

### 2. 啟用 API
*   導航至 **API 與服務 > 定位庫**。
*   搜尋並啟用 **`Vertex AI API`**。

### 3. 設定 OAuth 2.0 Consent Screen
*   前往 **API 與服務 > OAuth 同意畫面**。
*   選擇 **External**，填寫必要資訊。
*   **關鍵步奏**：將您的測試帳號（Email）加入「Test users」清單中，否則會出現 `Access Denied`。

### 4. 建立憑證 (Credentials)
*   前往 **API 與服務 > 憑證**。
*   點擊 **建立憑證 > OAuth 用戶端 ID**。
*   應用程式類型選擇 **Chrome 擴充功能**。
*   填寫擴充功能 ID（在 `chrome://extensions` 頁面開啟開發者模式可見）。
*   取得 **Client ID**，稍後需寫入 `manifest.json`。

---

## 🔐 第二階段：IAM 權限管理

為了讓擴充功能代表您調用模型，必須為您的帳號分派權限：

1.  進入 **IAM 與管理 > IAM**。
2.  點擊 **授予存取權 (GRANT ACCESS)**。
3.  **成員**：填寫您在擴充功能中登入的 Google Email。
4.  **角色**：選擇 **`Vertex AI User`** (Vertex AI 使用者)。
    > [!IMPORTANT]
    > 權限應賦予「Email 帳號」，而非「Client ID」。

---

## 💻 第三階段：代碼配置實踐

### 1. manifest.json 配置
確保 `manifest.json` 包含身份識別段落：

```json
"oauth2": {
  "client_id": "您的_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/cloud-platform"
  ]
}
```

### 2. API 端點結構 (REST)
針對 Vertex AI，標準的 REST 請求路徑如下：
`https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:generateContent`

### 3. 模型選擇參考 (截至 2026/02)
| 模型代號 | 狀態 | 特性 |
| :--- | :--- | :--- |
| `gemini-2.0-flash` | **穩定的首選** | 速度快、多模態支援、最易接入。 |
| `gemini-2.5-pro` | **高性能推薦** | 強大推理能力，目前連線最穩定。 |
| `gemini-3-pro-preview` | **尖端預覽** | 支援 `thinkingConfig`，需要特定白名單權限。 |

---

## 🔍 第四階段：常見錯誤與排除

*   **404 (Model Not Found)**：通常是因為模型版本號不正確（如需帶 `-001`）或專案未獲得預覽權限。
*   **403 (Permission Denied)**：請檢查 IAM 中的「Vertex AI User」角色是否已賦予您的 Email。
*   **Thinking Level Error**：僅 Gemini 3.0+ 支援 `thinkingConfig`。若使用 2.x 模型請務必將該欄位從 Payload 中移除。

---

## 📜 蘇格拉底提示詞範本 (System Prompt)
在請求中加入 `systemInstruction` 以強制 AI 執行導師角色：
> 「你是一位蘇格拉底導師。嚴禁直接給出答案。你的任務是將複雜問題分解為微小步驟，通過引導式提問讓學生自己發現真理。」

---
*本指南由 Socratic AI 隨附開發日誌自動生成。*
