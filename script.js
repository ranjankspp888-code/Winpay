// Supabase Configuration (Apna Project URL aur Anon/Publishable Key yahan dalein)
const SUPABASE_URL = 'https://nzjpeofntgmmxuwpvgrb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EMtwDM6VuGCoWElwvE2K7w_GvjIJGg-';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isRegisterMode = false;

// Auto-fill Refer Code from URL on load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        isRegisterMode = true;
        toggleMode();
        const referInput = document.getElementById('refer_code');
        if (referInput) referInput.value = ref;
    }
});

function toggleMode() {
    isRegisterMode = !isRegisterMode;
    const title = document.getElementById('form-title');
    const btn = document.getElementById('submit-btn');
    const switchText = document.getElementById('switch-mode');
    
    if (title) title.innerText = isRegisterMode ? "Register to EarnPro" : "Login to EarnPro";
    if (btn) btn.innerText = isRegisterMode ? "Register" : "Login";
    if (switchText) switchText.innerText = isRegisterMode ? "Already have an account? Login" : "Don't have an account? Register";
    
    const nameField = document.getElementById('name-field');
    const emailField = document.getElementById('email-field');
    const referField = document.getElementById('refer-field');
    
    if (nameField) nameField.classList.toggle('hidden', !isRegisterMode);
    if (emailField) emailField.classList.toggle('hidden', !isRegisterMode);
    if (referField) referField.classList.toggle('hidden', !isRegisterMode);
}

// Generate 5-digit Unique User ID
function generateUniqueId() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

async function handleAuth(event) {
    event.preventDefault();
    const mobileField = document.getElementById('mobile');
    const passwordField = document.getElementById('password');
    
    if (!mobileField || !passwordField) return;
    
    const mobile = mobileField.value;
    const password = passwordField.value;

    if (isRegisterMode) {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const referCodeInput = document.getElementById('refer_code').value;
        const userId = generateUniqueId();
        
        // Fetch Admin Settings for Welcome Bonus safely
        let welcomeBonus = 50;
        try {
            const { data: settings } = await supabase.from('settings').select('value').eq('key', 'config').single();
            if (settings && settings.value) {
                welcomeBonus = settings.value.welcome_bonus || 50;
            }
        } catch (err) {
            console.log("Using default welcome bonus");
        }

        const { error } = await supabase.from('users').insert([{
            user_id: userId,
            name: name,
            mobile: mobile,
            email: email,
            password: password,
            refer_code: userId,
            referred_by: referCodeInput || null,
            wallet: welcomeBonus
        }]);

        if (error) {
            alert('Registration Error: ' + error.message);
            return;
        }

        // Show Custom Alert Popup
        const alertContent = document.getElementById('alert-content');
        const customAlert = document.getElementById('custom-alert');
        
        if (alertContent) {
            alertContent.innerHTML = `
                <p><b>User Name:</b> ${name}</p>
                <p><b>User ID:</b> ${userId}</p>
                <p><b>Password:</b> ${password}</p>
                <p class="text-green-400 mt-2">Welcome Bonus ₹${welcomeBonus} added to wallet!</p>
            `;
        }
        if (customAlert) customAlert.classList.remove('hidden');
        localStorage.setItem('currentUser', JSON.stringify({ user_id: userId, name, mobile, email }));
    } else {
        // Login Logic
        const { data, error } = await supabase.from('users').select('*').eq('mobile', mobile).eq('password', password).single();
        if (error || !data) {
            alert('Invalid Mobile Number or Password');
            return;
        }
        localStorage.setItem('currentUser', JSON.stringify(data));
        window.location.href = 'dashboard.html';
    }
}

// Forgot Password Logic (Sends password via Email using mailto)
async function forgotPassword() {
    const mobileInput = prompt("Enter your registered Mobile Number or Email:");
    if (!mobileInput) return;

    const { data, error } = await supabase.from('users')
        .select('*')
        .or(`mobile.eq.${mobileInput},email.eq.${mobileInput}`)
        .single();

    if (error || !data) {
        alert('No account found with this Mobile Number or Email.');
        return;
    }

    if (!data.email) {
        alert('No email address registered with this account. Cannot send password.');
        return;
    }

    const subject = encodeURIComponent("Your EarnPro Password Recovery");
    const body = encodeURIComponent(`Hello ${data.name},\n\nYour Login Details:\nUser ID: ${data.user_id}\nMobile: ${data.mobile}\nPassword: ${data.password}\n\nPlease keep it secure.`);
    
    window.location.href = `mailto:${data.email}?subject=${subject}&body=${body}`;
    alert('Password recovery email client opened. Please send the email to retrieve your password.');
}

function closeAlert() {
    window.location.href = 'dashboard.html';
}

// Dashboard Initializations
if (window.location.pathname.includes('dashboard.html')) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) window.location.href = 'index.html';

    const userDp = document.getElementById('user-dp');
    const menuName = document.getElementById('menu-name');
    const menuId = document.getElementById('menu-id');
    const menuMobile = document.getElementById('menu-mobile');
    const referLink = document.getElementById('refer-link');

    if (userDp && user.name) userDp.innerText = user.name.charAt(0).toUpperCase();
    if (menuName) menuName.innerText = user.name;
    if (menuId) menuId.innerText = `ID: ${user.user_id}`;
    if (menuMobile) menuMobile.innerText = user.mobile;
    if (referLink) referLink.value = `${window.location.origin}${window.location.pathname.replace('dashboard.html', 'index.html')}?ref=${user.user_id}`;

    // Fetch Wallet Balance
    supabase.from('users').select('wallet').eq('user_id', user.user_id).single().then(({ data }) => {
        const walletBalance = document.getElementById('wallet-balance');
        if (data && walletBalance) walletBalance.innerText = data.wallet;
    });
}

function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (menu) menu.classList.toggle('hidden');
}

function openSupport() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    const supportEmail = "support@earnpro.com"; 
    const message = encodeURIComponent(`User ID: ${user.user_id}\nName: ${user.name}\nMobile: ${user.mobile}\n\nIssue: `);
    window.location.href = `mailto:${supportEmail}?subject=Customer Support&body=${message}`;
}

async function scratchCard() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) return;
    
    let min = 1, max = 10;
    try {
        const { data: settings } = await supabase.from('settings').select('value').eq('key', 'config').single();
        if (settings && settings.value) {
            if (!settings.value.scratch_enabled) {
                alert('Scratch card is currently disabled by admin.');
                return;
            }
            min = settings.value.scratch_min || 1;
            max = settings.value.scratch_max || 10;
        }
    } catch (e) {}

    const wonAmount = Math.floor(Math.random() * (max - min + 1)) + min;

    const { data: currentUserData } = await supabase.from('users').select('wallet').eq('user_id', user.user_id).single();
    if (!currentUserData) return;
    
    const newWallet = Number(currentUserData.wallet) + wonAmount;

    await supabase.from('users').update({ wallet: newWallet }).eq('user_id', user.user_id);
    
    const walletBalance = document.getElementById('wallet-balance');
    const scratchBox = document.getElementById('scratch-box');
    
    if (walletBalance) walletBalance.innerText = newWallet;
    if (scratchBox) {
        scratchBox.innerHTML = `<span class="text-green-400">You Won ₹${wonAmount}!</span>`;
        scratchBox.style.pointerEvents = 'none';
    }
}

function copyReferLink() {
    const copyText = document.getElementById('refer-link');
    if (!copyText) return;
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert('Referral link copied!');
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Admin Panel Logic
async function adminLogin() {
    const user_idElem = document.getElementById('admin-user');
    const passElem = document.getElementById('admin-pass');
    if (!user_idElem || !passElem) return;

    const user_id = user_idElem.value;
    const pass = passElem.value;

    const { data } = await supabase.from('users').select('*').eq('user_id', user_id).eq('password', pass).single();
    if (data) { 
        const loginBox = document.getElementById('admin-login-box');
        const adminDashboard = document.getElementById('admin-dashboard');
        if (loginBox) loginBox.classList.add('hidden');
        if (adminDashboard) adminDashboard.classList.remove('hidden');
        loadAdminSettings();
    } else {
        alert('Unauthorized Admin ID or Password');
    }
}

async function loadAdminSettings() {
    const { data } = await supabase.from('settings').select('value').eq('key', 'config').single();
    if (data && data.value) {
        const bonusElem = document.getElementById('admin-bonus');
        const scratchElem = document.getElementById('admin-scratch-toggle');
        const levelsElem = document.getElementById('admin-levels');
        
        if (bonusElem) bonusElem.value = data.value.welcome_bonus;
        if (scratchElem) scratchElem.checked = data.value.scratch_enabled;
        if (levelsElem && data.value.levels) levelsElem.value = data.value.levels.join(',');
    }
}

async function saveAdminSettings() {
    const bonus = Number(document.getElementById('admin-bonus').value);
    const scratch = document.getElementById('admin-scratch-toggle').checked;
    const levelsStr = document.getElementById('admin-levels').value;
    const levels = levelsStr ? levelsStr.split(',').map(Number) : [10, 5, 3, 2, 1, 0.5, 0.25];

    const { error } = await supabase.from('settings').update({
        value: { welcome_bonus: bonus, scratch_enabled: scratch, scratch_min: 1, scratch_max: 10, levels: levels }
    }).eq('key', 'config');

    if (error) {
        alert('Error saving settings: ' + error.message);
    } else {
        alert('Settings updated successfully!');
    }
}
