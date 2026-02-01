/**
 * Vertex AI / Gemini Engine Configuration
 */

const CONFIG = {
    PROJECT_ID: '551520576044',
    LOCATION: 'us-central1',
    // 使用您建議的 gemini-2.5-pro
    MODEL_ID: 'gemini-2.5-pro',

    API_URL_TEMPLATE: 'https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL_ID}:generateContent'
};

export const SOCRATIC_SYSTEM_PROMPT = `
You are a highly skilled Socratic Tutor. Your goal is to guide students to discover answers 
on their own rather than providing them directly.

Core Rules:
1. NEVER give the student the final answer.
2. BREAK DOWN complex problems into smaller, manageable parts.
3. ASK leading questions that encourage critical thinking.
4. ADAPT your level of guided reasoning to the student's responses.
5. Provide internal thoughts to help structure your guidance.
`;

/**
 * Fetches an OAuth token from chrome.identity
 */
async function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(new Error(`Identity Error: ${chrome.runtime.lastError.message}`));
            } else if (!token) {
                reject(new Error('Identity Error: Failed to retrieve OAuth token.'));
            } else {
                resolve(token);
            }
        });
    });
}

/**
 * Calls Vertex AI Gemini API
 */
export async function generateSocraticResponse(userMessage, context = "") {
    try {
        console.log('Fetching OAuth token...');
        const token = await getAuthToken();

        const url = CONFIG.API_URL_TEMPLATE
            .replace(/{PROJECT_ID}/g, CONFIG.PROJECT_ID)
            .replace(/{LOCATION}/g, CONFIG.LOCATION)
            .replace(/{MODEL_ID}/g, CONFIG.MODEL_ID);

        console.log(`[Diagnostic] Calling Model: ${CONFIG.MODEL_ID}`);

        const payload = {
            contents: [{
                role: 'user',
                parts: [{ text: `Context: ${context}\n\nUser Question: ${userMessage}` }]
            }],
            systemInstruction: {
                parts: [{ text: SOCRATIC_SYSTEM_PROMPT }]
            },
            generationConfig: {
                temperature: 0.7, // 針對 2.x 系列調回 0.7 增加穩定性
                maxOutputTokens: 8192,
                // 注意：thinkingConfig 僅限 Gemini 3 系列。
                // Gemini 2.5 Pro 目前尚不支持該 REST 參數，因此將其移除以確保連通。
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorRaw = await response.text();
            console.error('API Response Error Body:', errorRaw);

            let message = 'Unknown API Error';
            try {
                const parsed = JSON.parse(errorRaw);
                message = parsed.error?.message || parsed[0]?.error?.message || errorRaw;
            } catch (e) {
                message = errorRaw;
            }

            throw new Error(`[GCP Error] ${message}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.warn('API returned empty response.', data);
            return "I'm contemplating how to lead you. What are your initial thoughts on this?";
        }

        return text;

    } catch (error) {
        console.error('Socratic Engine Error:', error);
        return `[Tutor Error] ${error.message}`;
    }
}
