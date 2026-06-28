import { json, error } from '@sveltejs/kit';
import { getPool, normalizeTopicSelection } from '$lib/server/students.js';

export async function GET({ url }) {
	const topic = normalizeTopicSelection(url.searchParams.get('topic') || 'both');
	const pool = await getPool(topic);
	if (!pool) throw error(404, 'Topic pool not found');

	return json({
		topic,
		scatter: pool.scatter,
		total: pool.total,
		averageScore: pool.averageScore,
		minScore: pool.minScore,
		maxScore: pool.maxScore
	});
}

