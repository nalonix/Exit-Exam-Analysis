import { json } from '@sveltejs/kit';
import { getDashboardData } from '$lib/server/dashboard.js';
import { normalizeTopicSelection } from '$lib/server/students.js';

export async function GET({ url }) {
	const topics = normalizeTopicSelection(url.searchParams.get('topics') || 'both');
	const data = await getDashboardData(topics);
	return json(data);
}

