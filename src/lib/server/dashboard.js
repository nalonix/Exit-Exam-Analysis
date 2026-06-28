import { percentileFromSortedScores } from './percentile.js';
import { buildInstitutionMajorStats, buildInstitutionSubjectExtremes, getDataset, getPool, getStudent, normalizeTopicSelection, selectionToTopics } from './students.js';
import { formatInteger } from '../shared/format.js';

export async function getDashboardData(selection = 'both') {
	const poolKey = normalizeTopicSelection(selection);
	const pool = await getPool(poolKey);
	const dataset = await getDataset();
	const csCount = dataset.topicStudents['Computer Science'].length;
	const seCount = dataset.topicStudents['Software Engineering'].length;
	const passCount = dataset.students.filter((student) => student.passFail === 'Pass').length;
	const failCount = dataset.students.filter((student) => student.passFail === 'Fail').length;
	const disqualifiedCount = dataset.students.filter((student) => student.isDisqualified).length;

	return {
		selection: poolKey,
		topics: selectionToTopics(poolKey),
		summary: {
			total: pool.total,
			averageScore: pool.averageScore,
			passCount: pool.passCount,
			failCount: pool.failCount,
			disqualifiedCount: pool.disqualifiedCount,
			passRate: pool.passRate,
			minScore: pool.minScore,
			maxScore: pool.maxScore
		},
		scatter: pool.scatter,
		histogram: pool.histogram,
		histogramInstitutionBreakdown: pool.histogramInstitutionBreakdown,
		histogramSchoolNormalized: pool.histogramSchoolNormalized,
		institutionStats: pool.institutionStats.slice(0, 12),
		institutionMajorStats: buildInstitutionMajorStats(pool.students).slice(0, 12),
		institutionSubjectExtremes: buildInstitutionSubjectExtremes(pool.students).slice(0, 12),
		genderBreakdown: buildGenderBreakdown(pool.students),
		topPerformers: pool.scatter.slice(0, 10),
		datasetStats: {
			totalRecords: dataset.students.length,
			uniqueInstitutions: new Set(dataset.students.map((student) => student.institution)).size,
			csRecords: csCount,
			seRecords: seCount,
			passCount,
			failCount,
			disqualifiedCount
		},
		majorBreakdown: [
			{ major: 'Computer Science', count: csCount },
			{ major: 'Software Engineering', count: seCount }
		],
		meta: {
			totalStudents: dataset.students.length,
			uniqueInstitutions: new Set(dataset.students.map((student) => student.institution)).size
		}
	};
}

function buildGenderBreakdown(students) {
	const map = new Map([
		['Male', 0],
		['Female', 0],
		['Other', 0],
		['Unknown', 0]
	]);

	for (const student of students) {
		map.set(student.gender, (map.get(student.gender) || 0) + 1);
	}

	return [...map.entries()].map(([gender, count]) => ({
		gender,
		count,
		label: `${gender} (${formatInteger(count)})`
	}));
}

export async function getStudentReport(username, selection = 'both') {
	const poolKey = normalizeTopicSelection(selection);
	const pool = await getPool(poolKey);
	const student = await getStudent(username);
	if (!student) return null;

	const percentile = percentileFromSortedScores(pool.scoresSorted, student.score);

	return {
		student,
		pool: poolKey,
		statistics: {
			...percentile,
			poolAverage: pool.averageScore,
			scoreDifferenceFromAverage: student.score - pool.averageScore,
			passRate: pool.passRate
		}
	};
}

export async function getScoreReport(score, selection = 'both') {
	const poolKey = normalizeTopicSelection(selection);
	const pool = await getPool(poolKey);
	const numericScore = Number(score);
	if (!Number.isFinite(numericScore)) return null;

	const percentile = percentileFromSortedScores(pool.scoresSorted, numericScore);
	const histogram = pool.histogram;
	const bin = histogram.find((entry, index) => {
		const isLast = index === histogram.length - 1;
		return numericScore >= entry.start && (isLast ? numericScore <= entry.end : numericScore < entry.end);
	}) || histogram[histogram.length - 1];

	return {
		score: numericScore,
		pool: poolKey,
		statistics: {
			...percentile,
			poolAverage: pool.averageScore,
			histogramBin: bin,
			scoreDifferenceFromAverage: numericScore - pool.averageScore
		},
		distribution: {
			bins: histogram,
			minScore: pool.minScore,
			maxScore: pool.maxScore
		}
	};
}
