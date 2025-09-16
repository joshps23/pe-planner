// Authentication module using Supabase and Google OAuth
console.log('Auth.js file is loading...');

// Supabase configuration - use the constants already declared in api.js
// SUPABASE_URL and SUPABASE_ANON_KEY are declared in api.js which loads before this file

// Initialize Supabase client
let supabase = null;

// Delay Supabase initialization to ensure the library is loaded
function initializeSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully');
            return true;
        } else {
            console.warn('Supabase library not yet loaded.');
            return false;
        }
    } catch (error) {
        console.error('Error initializing Supabase client:', error);
        return false;
    }
}

// Try to initialize on load
initializeSupabase();

// Auth state
let currentUser = null;

// Initialize auth on page load
async function initAuth() {
    try {
        console.log('Initializing authentication...');

        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
            updateAuthUI(false);
            return;
        }

        if (session) {
            currentUser = session.user;
            updateAuthUI(true);
            console.log('User is signed in:', currentUser.email);

            // Check if this is first login and migrate local plans
            await checkAndMigrateLocalPlans();
        } else {
            console.log('No active session, showing sign-in button');
            updateAuthUI(false);
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'SIGNED_IN' && session) {
                currentUser = session.user;
                updateAuthUI(true);
                await checkAndMigrateLocalPlans();
            } else if (event === 'SIGNED_OUT') {
                currentUser = null;
                updateAuthUI(false);
            }
        });
    } catch (error) {
        console.error('Error initializing auth:', error);
        updateAuthUI(false);
    }
}

// Sign in with Google
async function signInWithGoogle() {
    try {
        console.log('SignInWithGoogle function called');
        console.log('Current supabase status:', supabase ? 'initialized' : 'not initialized');

        // Try to initialize Supabase if not ready
        if (!supabase) {
            console.log('Attempting to initialize Supabase...');
            if (!initializeSupabase()) {
                console.error('Failed to initialize Supabase');
                alert('Authentication system not ready. Please refresh the page and try again.');
                return;
            }
        }

        console.log('Calling Supabase OAuth...');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + window.location.pathname
            }
        });

        if (error) {
            throw error;
        }
        console.log('Redirecting to Google OAuth...');
    } catch (error) {
        console.error('Error signing in with Google:', error);
        alert('Failed to sign in with Google: ' + error.message);
    }
}

// Sign out
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        currentUser = null;
        updateAuthUI(false);

        // Clear cached plans
        if (window.updatePlanSelect) {
            window.updatePlanSelect();
        }

        alert('Signed out successfully');
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Failed to sign out. Please try again.');
    }
}

// Update UI based on auth state
function updateAuthUI(isSignedIn) {
    console.log('Updating auth UI. Signed in:', isSignedIn);

    const authButton = document.getElementById('authButton');
    const userInfo = document.getElementById('userInfo');
    const signInPrompt = document.getElementById('signInPrompt');

    console.log('Auth button element:', authButton);
    console.log('User info element:', userInfo);

    if (isSignedIn && currentUser) {
        console.log('User is signed in, hiding auth button');
        // Show user info
        if (authButton) {
            authButton.style.display = 'none';
        }

        if (userInfo) {
            userInfo.style.display = 'block';
            const userEmail = userInfo.querySelector('.user-email');
            const userName = userInfo.querySelector('.user-name');

            if (userEmail) {
                userEmail.textContent = currentUser.email || 'User';
            }

            if (userName) {
                const name = currentUser.user_metadata?.full_name ||
                             currentUser.user_metadata?.name ||
                             currentUser.email?.split('@')[0] ||
                             'User';
                userName.textContent = name;
            }
        }

        // Hide sign-in prompts
        if (signInPrompt) {
            signInPrompt.style.display = 'none';
        }

        // Update save button text
        const saveButton = document.querySelector('button[onclick="savePlan()"]');
        if (saveButton && !saveButton.innerHTML.includes('☁️')) {
            saveButton.innerHTML = '<span>☁️</span> Save to Cloud';
        }
    } else {
        console.log('User is not signed in, showing auth button');
        // Show sign-in button
        if (authButton) {
            authButton.style.display = 'block';
            console.log('Auth button display set to block');
        } else {
            console.warn('Auth button element not found!');
        }

        if (userInfo) {
            userInfo.style.display = 'none';
        }

        // Show sign-in prompt if user has local plans
        if (signInPrompt && localStorage.getItem('lessonPlans')) {
            const plans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
            if (Object.keys(plans).length > 0) {
                signInPrompt.style.display = 'block';
            }
        }

        // Update save button text
        const saveButton = document.querySelector('button[onclick="savePlan()"]');
        if (saveButton && saveButton.innerHTML.includes('☁️')) {
            saveButton.innerHTML = '<span>💾</span> Save Plan';
        }
    }
}

// Check and migrate local plans to cloud
async function checkAndMigrateLocalPlans() {
    if (!currentUser) return;

    const localPlans = localStorage.getItem('lessonPlans');
    if (!localPlans) return;

    const plans = JSON.parse(localPlans);
    const planCount = Object.keys(plans).length;

    if (planCount === 0) return;

    // Check if user has already migrated (stored in user metadata or local flag)
    const migrationKey = `migrated_${currentUser.id}`;
    if (localStorage.getItem(migrationKey)) return;

    // Ask user if they want to migrate
    const shouldMigrate = confirm(
        `You have ${planCount} lesson plan(s) saved locally. ` +
        `Would you like to sync them to your cloud account?`
    );

    if (shouldMigrate) {
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const [planName, planData] of Object.entries(plans)) {
                try {
                    await window.saveToCloud(planName, planData);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to migrate plan "${planName}":`, error);
                    errorCount++;
                }
            }

            // Mark as migrated
            localStorage.setItem(migrationKey, 'true');

            // Show result
            if (errorCount === 0) {
                alert(`Successfully synced ${successCount} plan(s) to cloud!`);

                // Optionally clear local storage
                const shouldClear = confirm(
                    'Plans are now in the cloud. Would you like to remove local copies?'
                );
                if (shouldClear) {
                    localStorage.removeItem('lessonPlans');
                }
            } else {
                alert(
                    `Synced ${successCount} plan(s) successfully. ` +
                    `${errorCount} plan(s) failed to sync. Please try saving them again.`
                );
            }

            // Refresh plan list
            if (window.loadPlansFromCloud) {
                await window.loadPlansFromCloud();
            }
        } catch (error) {
            console.error('Migration error:', error);
            alert('Failed to migrate plans. They remain saved locally.');
        }
    }
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is signed in
function isSignedIn() {
    return currentUser !== null;
}

// Export functions to window
window.initAuth = initAuth;
window.signInWithGoogle = signInWithGoogle;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.isSignedIn = isSignedIn;
window.supabaseClient = supabase;

// Log that auth module is loaded
console.log('Auth module loaded.');
console.log('Functions exposed to window:', {
    initAuth: typeof window.initAuth,
    signInWithGoogle: typeof window.signInWithGoogle,
    signOut: typeof window.signOut,
    getCurrentUser: typeof window.getCurrentUser,
    isSignedIn: typeof window.isSignedIn,
    supabaseClient: typeof window.supabaseClient
});