import { json } from '@sveltejs/kit';
import { getScoreReport } from '$lib/server/dashboard.js';

export async function GET({ url }) {
	const value = url.searchParams.get('value');
	const topics = url.searchParams.get('topics') || 'both';
	const report = await getScoreReport(value, topics);

	if (!report) {
		return json({ error: 'Invalid score value' }, { status: 400 });
	}

	return json(report);
}

