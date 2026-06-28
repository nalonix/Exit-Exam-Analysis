import { getDashboardData } from '$lib/server/dashboard.js';

export async function load() {
	return {
		initialDashboard: await getDashboardData('both')
	};
}

