import { initializeApp } from '../vendor/firebase-app.js';
import { getAuth, signInWithCredential, GoogleAuthProvider } from '../vendor/firebase-auth.js';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from '../vendor/firebase-firestore.js';
import { firebaseConfig } from '../auth/firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const screenshotBtn = document.getElementById('screenshot-btn');
    const energyCount = document.getElementById('energy-count');
    const energyDisplay = document.getElementById('energy-display');
    const authScreen = document.getElementById('auth-screen');
    const appContent = document.getElementById('app-content');
    const loginBtn = document.getElementById('login-btn');

    let currentUser = null;
    let userAvatarHtml = '<div class="msg-avatar">👤</div>';
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Send message on Enter (without Shift)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    sendBtn.addEventListener('click', handleSendMessage);

    loginBtn.addEventListener('click', () => {
        handleLogin(true);
    });

    // Open external upgrade page when clicking energy badge
    energyDisplay.addEventListener('click', () => {
        const url = new URL(chrome.runtime.getURL('src/web/upgrade.html'));

        // Sync Avatar
        const profileContainer = document.getElementById('user-profile');
        const currentImg = profileContainer.querySelector('img');
        if (currentImg && currentImg.src) {
            url.searchParams.set('picture', currentImg.src);
        }

        // Sync Energy
        const currentEnergy = document.getElementById('energy-count').innerText;
        url.searchParams.set('energy', currentEnergy);

        chrome.tabs.create({ url: url.toString() });
    });

    screenshotBtn.addEventListener('click', async () => {
        addMessage('system', 'Capturing visual context...');
        try {
            const response = await chrome.runtime.sendMessage({ type: 'SCREENSHOT_CAPTURE' });
            if (response.success) {
                // For now, we just acknowledge the capture. 
                // in 'Pro', this would be sent to Gemini 1.5 Pro's Multimodal API.
                addMessage('system', 'Visual data received. Analyzing the diagram/text...');

                // Simulate AI reaction to visual data
                setTimeout(() => {
                    addMessage('system', "I see the problem you're looking at. Let's look at the first variable. What do you think its role is in this equation?");
                }, 1500);
            }
        } catch (error) {
            console.error('Capture failed:', error);
        }
    });

    let userAvatarHtml = '<div class="msg-avatar">👤</div>';

    async function handleSendMessage() {
        const text = userInput.value.trim();
        if (!text) return;

        // Clear input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Add user message to UI
        addMessage('user', text);

        // Show thinking state
        const botMsgDiv = addMessage('system', '...');

        try {
            // Send to background service worker
            const response = await chrome.runtime.sendMessage({
                type: 'SOCRATIC_QUERY',
                payload: { text, context: 'Active Learning' }
            });

            if (response.success) {
                botMsgDiv.innerText = response.data;
                deductEnergy();
            } else {
                botMsgDiv.innerText = 'Error: ' + response.error;
            }
        } catch (error) {
            botMsgDiv.innerText = 'Connection error. Please try again.';
            console.error(error);
        }
    }

    const owlSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width:20px;height:20px;">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="9" cy="10" r="1.5"/>
            <circle cx="15" cy="10" r="1.5"/>
            <path d="M12 13l-1 1 1 1"/>
        </svg>
    `;

    function addMessage(type, text) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'msg-avatar';
        avatar.innerHTML = type === 'system' ? owlSvg : userAvatarHtml;

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${type}`;
        msgDiv.innerText = text;

        wrapper.appendChild(avatar);
        wrapper.appendChild(msgDiv);

        chatHistory.appendChild(wrapper);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return msgDiv;
    }

    function updateEnergy() {
        chrome.storage.local.get(['dailyEnergy'], (result) => {
            const current = result.dailyEnergy || 50;
            const updated = Math.max(0, current - 1);
            chrome.storage.local.set({ dailyEnergy: updated }, () => {
                energyCount.innerText = updated;
            });
        });
    }

    // Check local storage for energy
    chrome.storage.local.get(['dailyEnergy'], (result) => {
        energyCount.innerText = result.dailyEnergy || 50;
    });

    // Initial Auth Check (Non-interactive)
    handleLogin(false);

    async function handleLogin(interactive = false) {
        // First try to clear any potentially stuck/scope-lacking token if user clicks login button
        if (interactive) {
            chrome.identity.getAuthToken({ interactive: false }, (token) => {
                if (token) chrome.identity.removeCachedAuthToken({ token }, () => { });
            });
        }

        chrome.identity.getAuthToken({ interactive }, (token) => {
            if (chrome.runtime.lastError || !token) {
                if (interactive) console.error('Login failed:', chrome.runtime.lastError);
                showAuth(true);
                return;
            }

            // Successfully logged in
            showAuth(false);
            initializeUser(token);
        });
    }

    async function linkFirebase(token) {
        const credential = GoogleAuthProvider.credential(null, token);
        try {
            const userCredential = await signInWithCredential(auth, credential);
            currentUser = userCredential.user;
            setupEnergySync(currentUser.uid);
        } catch (error) {
            console.error('Firebase Auth Error:', error);
        }
    }

    function setupEnergySync(uid) {
        const userDocRef = doc(db, 'users', uid);
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                energyCount.innerText = data.energyBalance || 0;
            } else {
                // Initialize new user in Firestore
                setDoc(userDocRef, {
                    energyBalance: 50,
                    tier: 'free',
                    lastReset: serverTimestamp()
                });
            }
        });
    }

    async function deductEnergy() {
        if (!currentUser) return;
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const currentBalance = docSnap.data().energyBalance || 0;
            if (currentBalance > 0) {
                await updateDoc(userDocRef, {
                    energyBalance: currentBalance - 1
                });
            }
        }
    }

    function showAuth(shouldShow) {
        authScreen.style.display = shouldShow ? 'flex' : 'none';
        appContent.style.display = shouldShow ? 'none' : 'flex';
        if (!shouldShow) {
            appContent.style.animation = 'slideUpFade 0.5s ease-out';
        }
    }

    async function initializeUser(token) {
        const userProfile = document.getElementById('user-profile');
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const userData = await response.json();
                linkFirebase(token); // Link with Firebase
                if (userData.picture) {
                    const imgHtml = `<img src="${userData.picture}" alt="User Avatar" style="width:100%;height:100%;object-fit:cover;">`;
                    userProfile.innerHTML = imgHtml;
                    userAvatarHtml = `<div class="msg-avatar" style="overflow:hidden;">${imgHtml}</div>`;
                } else {
                    const initial = (userData.name || userData.email || 'U').charAt(0).toUpperCase();
                    const initialHtml = `<div class="avatar-initial">${initial}</div>`;
                    userProfile.innerHTML = initialHtml;
                    userAvatarHtml = `<div class="msg-avatar">${initialHtml}</div>`;
                }
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }
});
