// Database operations for lesson plans using Supabase

// Save plan to cloud
async function saveToCloud(planName, planData) {
    if (!window.isSignedIn()) {
        throw new Error('User not signed in');
    }

    const user = window.getCurrentUser();
    const supabase = window.supabaseClient;

    try {
        // Check if plan already exists
        const { data: existingPlan, error: fetchError } = await supabase
            .from('lesson_plans')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', planName)
            .single();

        let result;

        if (existingPlan && !fetchError) {
            // Update existing plan
            result = await supabase
                .from('lesson_plans')
                .update({
                    items: planData.items || [],
                    annotations: planData.annotations || [],
                    activity_details: planData.activityDetails || {},
                    court_dimensions: planData.courtDimensions || {},
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingPlan.id);
        } else {
            // Create new plan
            result = await supabase
                .from('lesson_plans')
                .insert({
                    user_id: user.id,
                    name: planName,
                    items: planData.items || [],
                    annotations: planData.annotations || [],
                    activity_details: planData.activityDetails || {},
                    court_dimensions: planData.courtDimensions || {}
                });
        }

        if (result.error) {
            throw result.error;
        }

        // Also save to local storage as cache
        const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
        localPlans[planName] = planData;
        localStorage.setItem('lessonPlans', JSON.stringify(localPlans));

        return result.data;
    } catch (error) {
        console.error('Error saving to cloud:', error);
        throw error;
    }
}

// Load all plans from cloud
async function loadPlansFromCloud() {
    if (!window.isSignedIn()) {
        return {};
    }

    const user = window.getCurrentUser();
    const supabase = window.supabaseClient;

    try {
        const { data: plans, error } = await supabase
            .from('lesson_plans')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Convert to the format expected by the app
        const plansObject = {};
        plans.forEach(plan => {
            plansObject[plan.name] = {
                items: plan.items || [],
                annotations: plan.annotations || [],
                activityDetails: plan.activity_details || {},
                courtDimensions: plan.court_dimensions || {},
                cloudId: plan.id,
                updatedAt: plan.updated_at
            };
        });

        // Cache in local storage
        localStorage.setItem('lessonPlans', JSON.stringify(plansObject));

        return plansObject;
    } catch (error) {
        console.error('Error loading from cloud:', error);

        // Fall back to local storage
        const localPlans = localStorage.getItem('lessonPlans');
        return localPlans ? JSON.parse(localPlans) : {};
    }
}

// Load a specific plan from cloud
async function loadPlanFromCloud(planName) {
    if (!window.isSignedIn()) {
        // Fall back to local storage
        const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
        return localPlans[planName] || null;
    }

    const user = window.getCurrentUser();
    const supabase = window.supabaseClient;

    try {
        const { data: plan, error } = await supabase
            .from('lesson_plans')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', planName)
            .single();

        if (error) {
            throw error;
        }

        return {
            items: plan.items || [],
            annotations: plan.annotations || [],
            activityDetails: plan.activity_details || {},
            courtDimensions: plan.court_dimensions || {},
            cloudId: plan.id,
            updatedAt: plan.updated_at
        };
    } catch (error) {
        console.error('Error loading plan from cloud:', error);

        // Fall back to local storage
        const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
        return localPlans[planName] || null;
    }
}

// Delete plan from cloud
async function deletePlanFromCloud(planName) {
    if (!window.isSignedIn()) {
        // Just delete from local storage
        const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
        delete localPlans[planName];
        localStorage.setItem('lessonPlans', JSON.stringify(localPlans));
        return true;
    }

    const user = window.getCurrentUser();
    const supabase = window.supabaseClient;

    try {
        const { error } = await supabase
            .from('lesson_plans')
            .delete()
            .eq('user_id', user.id)
            .eq('name', planName);

        if (error) {
            throw error;
        }

        // Also remove from local cache
        const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
        delete localPlans[planName];
        localStorage.setItem('lessonPlans', JSON.stringify(localPlans));

        return true;
    } catch (error) {
        console.error('Error deleting from cloud:', error);
        throw error;
    }
}

// Sync local changes to cloud (for offline support)
async function syncToCloud() {
    if (!window.isSignedIn()) {
        return { synced: 0, failed: 0 };
    }

    const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
    const cloudPlans = await loadPlansFromCloud();

    let synced = 0;
    let failed = 0;

    for (const [planName, localPlan] of Object.entries(localPlans)) {
        const cloudPlan = cloudPlans[planName];

        // Compare timestamps or use a simple strategy
        // For now, local always wins (can be improved with conflict resolution)
        if (!cloudPlan || !cloudPlan.updatedAt ||
            new Date(localPlan.updatedAt || 0) > new Date(cloudPlan.updatedAt)) {
            try {
                await saveToCloud(planName, localPlan);
                synced++;
            } catch (error) {
                console.error(`Failed to sync plan "${planName}":`, error);
                failed++;
            }
        }
    }

    return { synced, failed };
}

// Get plan statistics
async function getPlanStats() {
    if (!window.isSignedIn()) {
        const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
        return {
            totalPlans: Object.keys(localPlans).length,
            location: 'local'
        };
    }

    const user = window.getCurrentUser();
    const supabase = window.supabaseClient;

    try {
        const { count, error } = await supabase
            .from('lesson_plans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }

        return {
            totalPlans: count || 0,
            location: 'cloud'
        };
    } catch (error) {
        console.error('Error getting plan stats:', error);
        const localPlans = JSON.parse(localStorage.getItem('lessonPlans') || '{}');
        return {
            totalPlans: Object.keys(localPlans).length,
            location: 'local'
        };
    }
}

// Export functions to window
window.saveToCloud = saveToCloud;
window.loadPlansFromCloud = loadPlansFromCloud;
window.loadPlanFromCloud = loadPlanFromCloud;
window.deletePlanFromCloud = deletePlanFromCloud;
window.syncToCloud = syncToCloud;
window.getPlanStats = getPlanStats;