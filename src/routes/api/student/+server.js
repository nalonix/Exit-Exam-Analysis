import { json } from '@sveltejs/kit';
import { getStudentReport } from '$lib/server/dashboard.js';

export async function GET({ url }) {
	const username = url.searchParams.get('username') || '';
	const topics = url.searchParams.get('topics') || 'both';
	const report = await getStudentReport(username, topics);

	if (!report) {
		return json({ error: 'Student not found' }, { status: 404 });
	}

	return json(report);
}

