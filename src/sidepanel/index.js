console.log('Socratic AI: index.js started execution');
import { initializeApp } from '../vendor/firebase-app.js';
import { getAuth, signInWithCredential, GoogleAuthProvider } from '../vendor/firebase-auth.js';
import { getFirestore, doc, onSnapshot, updateDoc, setDoc, getDoc, serverTimestamp } from '../vendor/firebase-firestore.js';
import { firebaseConfig } from '../auth/firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Globals
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const screenshotBtn = document.getElementById('screenshot-btn');
const energyCount = document.getElementById('energy-count');
const energyDisplay = document.getElementById('energy-display');
const authScreen = document.getElementById('auth-screen');
const appContent = document.getElementById('app-content');
const loginBtn = document.getElementById('login-btn');
const historyBtn = document.getElementById('history-btn');
const versionDisplay = document.getElementById('version-display');

// History Button Redirect
if (historyBtn) {
    historyBtn.addEventListener('click', () => {
        const url = new URL('https://socratic.geledtech.com/#billing-history');
        const profileContainer = document.getElementById('user-profile');
        const img = profileContainer?.querySelector('img');
        const initialDiv = profileContainer?.querySelector('.avatar-initial');

        if (img && img.src) url.searchParams.set('picture', img.src);
        else if (initialDiv) url.searchParams.set('initial', initialDiv.innerText);

        const energyVal = energyCount?.innerText;
        if (energyVal && energyVal !== '--') url.searchParams.set('energy', energyVal);

        chrome.tabs.create({ url: url.toString() });
    });
}

// Display version from manifest
if (versionDisplay) {
    const manifest = chrome.runtime.getManifest();
    versionDisplay.innerText = `v${manifest.version}`;
}

let currentUser = null;
let userAvatarHtml = '<div class="msg-avatar">👤</div>';

console.log('Socratic AI: Elements found', {
    loginBtn: !!loginBtn,
    authScreen: !!authScreen
});

// Auto-resize textarea
if (userInput) {
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
}

if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);

if (loginBtn) {
    console.log('Socratic AI: Attaching login listener');
    loginBtn.addEventListener('click', () => {
        console.log('Socratic AI: Login button clicked');
        handleLogin(true);
    });
}

// Open external upgrade page or Recent Activity
if (energyDisplay) {
    energyDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        const activityPanel = document.getElementById('activity-panel');
        activityPanel?.classList.toggle('active');
    });
}

// Redirect to web usage hub
const viewAllUsage = document.getElementById('view-all-usage');
if (viewAllUsage) {
    viewAllUsage.addEventListener('click', (e) => {
        e.preventDefault();
        const url = new URL('https://socratic.geledtech.com/#usage');
        const profileContainer = document.getElementById('user-profile');
        const img = profileContainer?.querySelector('img');
        const initialDiv = profileContainer?.querySelector('.avatar-initial');

        if (img && img.src) url.searchParams.set('picture', img.src);
        else if (initialDiv) url.searchParams.set('initial', initialDiv.innerText);

        const energyVal = energyCount?.innerText;
        if (energyVal && energyVal !== '--') url.searchParams.set('energy', energyVal);

        chrome.tabs.create({ url: url.toString() });
    });
}

// Close activity panel when clicking outside
document.addEventListener('click', () => {
    const activityPanel = document.getElementById('activity-panel');
    activityPanel?.classList.remove('active');
});

if (screenshotBtn) {
    screenshotBtn.addEventListener('click', async () => {
        addMessage('system', 'Capturing visual context...');
        try {
            const response = await chrome.runtime.sendMessage({ type: 'SCREENSHOT_CAPTURE' });
            if (response.success) {
                const botMsgDiv = addMessage('system', 'Analyzing the diagram/text...');
                const queryResponse = await chrome.runtime.sendMessage({
                    type: 'SOCRATIC_QUERY',
                    payload: {
                        text: "I've shared a visual of my screen. Can you help me understand what's happening here?",
                        context: 'Visual Tutoring',
                        imageData: response.dataUrl
                    }
                });
                if (queryResponse.success) {
                    botMsgDiv.innerText = queryResponse.data;
                    deductEnergy();
                } else {
                    botMsgDiv.innerText = 'Error: ' + queryResponse.error;
                }
            }
        } catch (error) {
            console.error('Capture failed:', error);
        }
    });
}

async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = '';
    userInput.style.height = 'auto';
    addMessage('user', text);
    const botMsgDiv = addMessage('system', '...');
    try {
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

// Initial Auth Check
handleLogin(false);

async function handleLogin(interactive = false) {
    console.log('Socratic AI: handleLogin started', { interactive });
    chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
            console.warn('Socratic AI: getAuthToken error:', chrome.runtime.lastError.message);
            if (interactive) {
                alert('Login failed: ' + chrome.runtime.lastError.message);
            }
            showAuth(true);
            return;
        }
        if (!token) {
            console.log('Socratic AI: No token received');
            showAuth(true);
            return;
        }
        console.log('Socratic AI: Login successful');
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
    if (!authScreen || !appContent) return;
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
            linkFirebase(token);
            if (userData.picture) {
                const imgHtml = `<img src="${userData.picture}" alt="User Avatar" style="width:100%;height:100%;object-fit:cover;">`;
                if (userProfile) userProfile.innerHTML = imgHtml;
                userAvatarHtml = `<div class="msg-avatar" style="overflow:hidden;">${imgHtml}</div>`;
            } else {
                const initial = (userData.name || userData.email || 'U').charAt(0).toUpperCase();
                const initialHtml = `<div class="avatar-initial">${initial}</div>`;
                if (userProfile) userProfile.innerHTML = initialHtml;
                userAvatarHtml = `<div class="msg-avatar">${initialHtml}</div>`;
            }
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
}
