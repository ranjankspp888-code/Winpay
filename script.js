// Supabase Configuration (Apna Project URL aur Anon Key yahan dalein)
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let isRegisterMode = false;

// Auto-fill Refer Code from URL on load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
        isRegisterMode = true;
        toggleMode();
        document.getElementById('refer_code').value = ref;
    }
});

function toggleMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('form-title').innerText = isRegisterMode ? "Register to EarnPro" : "Login to EarnPro";
    document.getElementById('submit-btn').innerText = isRegisterMode ? "Register" : "Login";
    document.getElementById('switch-mode').innerText = isRegisterMode ? "Already have an account? Login" : "Don't have an account? Register";
    
    document.getElementById('name-field').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('email-field').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('refer-field').classList.toggle('hidden', !isRegisterMode);
}

// Generate 5-digit Unique User ID
function generateUniqueId() {
    return Math.floor(10000 + Math.random() * 90000).toString();
}

async function handleAuth(event) {
    event.preventDefault();
    const mobile = document.getElementById('mobile').value;
    const password = document.getElementById('password').value;

    if (isRegisterMode) {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const referCodeInput = document.getElementById('refer_code').value;
        const userId = generateUniqueId();
        
        // Fetch Admin Settings for Welcome Bonus
        const { data: settings } = await supabase.from('settings').select('value').eq('key', 'config').single();
        const welcomeBonus = settings ? settings.value.welcome_bonus : 50;

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
            alert('Error: ' + error.message);
            return;
        }

        // Show Custom Alert Popup
        document.getElementById('alert-content').innerHTML = `
            <p><b>User Name:</b> ${name}</p>
            <p><b>User ID:</b> ${userId}</p>
            <p><b>Password:</b> ${password}</p>
            <p class="text-green-400 mt-2">Welcome Bonus ₹${welcomeBonus} added to wallet!</p>
        `;
        document.getElementById('custom-alert').classList.remove('hidden');
        localStorage.setItem('currentUser', JSON.stringify({ user_id: userId, name, mobile }));
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

function closeAlert() {
    window.location.href = 'dashboard.html';
}

// Dashboard Initializations
if (window.location.pathname.includes('dashboard.html')) {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) window.location.href = 'index.html';

    document.getElementById('user-dp').innerText = user.name.charAt(0).toUpperCase();
    document.getElementById('menu-name').innerText = user.name;
    document.getElementById('menu-id').innerText = `ID: ${user.user_id}`;
    document.getElementById('menu-mobile').innerText = user.mobile;
    document.getElementById('refer-link').value = `${window.location.origin}/index.html?ref=${user.user_id}`;

    // Fetch Wallet Balance
    supabase.from('users').select('wallet').eq('user_id', user.user_id).single().then(({ data }) => {
        if (data) document.getElementById('wallet-balance').innerText = data.wallet;
    });
}

function toggleProfileMenu() {
    document.getElementById('profile-menu').classList.toggle('hidden');
}

function openSupport() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const supportEmail = "support@earnpro.com"; // Admin panel email sync
    const message = encodeURIComponent(`User ID: ${user.user_id}\nName: ${user.name}\nMobile: ${user.mobile}\n\nIssue: `);
    window.location.href = `mailto:${supportEmail}?subject=Customer Support&body=${message}`;
}

async function scratchCard() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const { data: settings } = await supabase.from('settings').select('value').eq('key', 'config').single();
    
    if (!settings || !settings.value.scratch_enabled) {
        alert('Scratch card is currently disabled by admin.');
        return;
    }

    const min = settings.value.scratch_min;
    const max = settings.value.scratch_max;
    const wonAmount = Math.floor(Math.random() * (max - min + 1)) + min;

    // Update Wallet in DB
    const { data: currentUserData } = await supabase.from('users').select('wallet').eq('user_id', user.user_id).single();
    const newWallet = Number(currentUserData.wallet) + wonAmount;

    await supabase.from('users').update({ wallet: newWallet }).eq('user_id', user.user_id);
    document.getElementById('wallet-balance').innerText = newWallet;
    document.getElementById('scratch-box').innerHTML = `<span class="text-green-400">You Won ₹${wonAmount}!</span>`;
    document.getElementById('scratch-box').style.pointerEvents = 'none';
}

function copyReferLink() {
    const copyText = document.getElementById('refer-link');
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
    const user_id = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;

    const { data } = await supabase.from('users').select('*').eq('user_id', user_id).eq('password', pass).single();
    if (data) { // Direct Supabase check
        document.getElementById('admin-login-box').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        loadAdminSettings();
    } else {
        alert('Unauthorized Admin ID');
    }
}

async function loadAdminSettings() {
    const { data } = await supabase.from('settings').select('value').eq('key', 'config').single();
    if (data) {
        document.getElementById('admin-bonus').value = data.value.welcome_bonus;
        document.getElementById('admin-scratch-toggle').checked = data.value.scratch_enabled;
        document.getElementById('admin-levels').value = data.value.levels.join(',');
    }
}

async function saveAdminSettings() {
    const bonus = Number(document.getElementById('admin-bonus').value);
    const scratch = document.getElementById('admin-scratch-toggle').checked;
    const levels = document.getElementById('admin-levels').value.split(',').map(Number);

    await supabase.from('settings').update({
        value: { welcome_bonus: bonus, scratch_enabled: scratch, scratch_min: 1, scratch_max: 10, levels: levels }
    }).eq('key', 'config');

    alert('Settings updated successfully!');
}
