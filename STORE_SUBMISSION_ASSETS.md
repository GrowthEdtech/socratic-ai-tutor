# Socratic AI Tutor - Store Submission Assets

This document consolidates all the text, justifications, and technical notes required to submit your extension to the **Chrome Web Store Developer Dashboard**.

---

## 1. Store Listing (Main Info)

**Product Name:**
`Socratic AI Tutor - Guided Learning Assistant`

**Summary (Max 132 chars):**
`24/7 Socratic AI Tutor: Don't just get answers. Master concepts through AI-powered guided questioning and visual reasoning.`

**Description:**
```text
Unlock Your Thinking with Socratic AI Assistant

Stop copying answers and start mastering concepts. Socratic AI Assistant is your 24/7 personal tutor integrated directly into your browser, powered by Google's advanced Gemini 1.5 Pro engine.

Why Choose the Socratic Method?

1. Guided Thinking (Not Just Answers)
Unlike standard AI, Socratic AI doesn't just hand you the solution. It breaks down complex problems into manageable steps and asks provocative questions to lead you to the answer yourself—building true critical thinking skills.

2. Multimodal Visual Tutoring (Pro Feature)
Stuck on a geometry diagram, a chemical structure, or a handwritten physics problem? Use our built-in screenshot tool. Our AI "sees" the image and guides you through the logic of the visual data.

3. Deep Context Awareness
Whether you are reading a dense research paper or practicing on a coding platform, Socratic AI understands the context. It provides hints and analogies tailored to the specific text you are struggling with.

4. Long-Term Learning Memory
The more you learn, the smarter your tutor gets. It remembers your past struggles and tailors its questioning style to your unique learning pace and level.

Freemium Model:
• Free: Daily basic guided questions & text analysis.
• Pro: Unlimited deep reasoning, visual/screenshot tutoring, and advanced long-term memory powered by Gemini 1.5 Pro.

Secure & Private
Your learning journey is yours alone. We use enterprise-grade encryption via Google Cloud to ensure your data is never used to train public models. Includes Google Account Integration for a seamless experience across devices.
```

---

## 2. Privacy & Permissions (Justifications)

**Single Purpose Statement:**
`The single purpose of this extension is to provide a Socratic-style tutoring experience by allowing users to select text or capture screenshots of educational content to receive guided, pedagogical questioning and hints that facilitate independent learning.`

| Permission | Justification |
| --- | --- |
| `activeTab` & `desktopCapture` | Essential for the "Visual Tutoring" feature. They allow the user to capture a specific part of their screen (like a math formula or diagram) so the AI can analyze the visual context and provide step-by-step guidance. |
| `identity` | Required for Google OAuth login. This manages the user's subscription status (Free vs. Pro), syncs their learning history, and tracks their daily "Energy Points" for the Freemium model. |
| `storage` | Used to store local user preferences, such as "Preferred Learning Level" and temporary UI states to ensure a smooth tutoring experience. |
| `cookies` | Necessary to synchronize the user's session between the extension and our web dashboard for managing Pro subscriptions. |
| `sidePanel` | Provides a non-intrusive, persistent interface for the tutor to remain visible alongside the student's study material. |

---

## 3. Technical Notes for Reviewers

**AI Model Usage:**
"The extension calls an external API (Google Vertex AI / Gemini 1.5 Pro) to process text and images for pedagogical guidance. No remote code is executed; the extension only handles UI state and API communication."

**Safety Settings:**
"The AI model is configured with strict safety filters (`BLOCK_LOW_AND_ABOVE` for all harm categories) to ensure a safe learning environment for students of all ages."

---

## 4. Data Usage Checklist

* **Personal identification information:** Yes (User authentication and subscription management).
* **Website content:** Yes (To analyze the problem the user is facing and generate guided hints).
* **User activity:** Yes (To track learning progress and provide a personalized Socratic experience).

---

> [!TIP]
> **Privacy Policy Recommendation:** 
> When updating your policy at `geledtech.com`, ensure you include: *"We do not store or use captured screenshots for any purpose other than providing immediate AI-driven tutoring feedback. Images are processed via encrypted Google Cloud channels and are not used for model training."*
