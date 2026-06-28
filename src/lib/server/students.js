import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TOPICS, TOPIC_VALUES, GENDER_COLORS, INSTITUTION_PALETTE, hashString } from '../shared/constants.js';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'students_enriched.csv');

function parseCsv(text) {
	const rows = [];
	let field = '';
	let row = [];
	let inQuotes = false;

	for (let i = 0; i < text.length; i += 1) {
		const char = text[i];
		const next = text[i + 1];

		if (char === '"') {
			if (inQuotes && next === '"') {
				field += '"';
				i += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (char === ',' && !inQuotes) {
			row.push(field);
			field = '';
			continue;
		}

		if ((char === '\n' || char === '\r') && !inQuotes) {
			if (char === '\r' && next === '\n') i += 1;
			row.push(field);
			if (row.some((value) => value.trim() !== '')) rows.push(row);
			row = [];
			field = '';
			continue;
		}

		field += char;
	}

	if (field.length || row.length) {
		row.push(field);
		if (row.some((value) => value.trim() !== '')) rows.push(row);
	}

	return rows;
}

function normalizeTopic(topic) {
	return TOPICS.includes(topic) ? topic : 'Unknown';
}

function parseNumber(value, fallback = 0) {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function parseInteger(value, fallback = 0) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function genderKey(value) {
	const normalized = String(value || '').trim();
	if (!normalized) return 'Unknown';
	if (/^male$/i.test(normalized)) return 'Male';
	if (/^female$/i.test(normalized)) return 'Female';
	return 'Other';
}

function binLabel(start, end, isLast) {
	const left = `${start.toFixed(0)}`;
	const right = isLast ? `${end.toFixed(0)}` : `${end.toFixed(0)}`;
	return `${left} - ${right}`;
}

function buildHistogram(scoresSorted, binSize = 5) {
	const bins = [];
	const maxScore = scoresSorted.length ? Math.max(100, scoresSorted[scoresSorted.length - 1]) : 100;
	const steps = Math.ceil(maxScore / binSize);

	for (let i = 0; i < steps; i += 1) {
		const start = i * binSize;
		const end = i === steps - 1 ? maxScore : start + binSize;
		bins.push({
			label: binLabel(start, end, i === steps - 1),
			start,
			end,
			count: 0
		});
	}

	for (const score of scoresSorted) {
		const normalized = Math.max(0, Math.min(maxScore - 0.001, score));
		const index = Math.min(bins.length - 1, Math.floor(normalized / binSize));
		bins[index].count += 1;
	}

	return bins;
}

function buildHistogramInstitutionBreakdown(students, binSize = 5) {
	const maxScore = students.length ? Math.max(100, ...students.map((student) => student.score)) : 100;
	const steps = Math.ceil(maxScore / binSize);
	const bins = Array.from({ length: steps }, (_, index) => {
		const start = index * binSize;
		const end = index === steps - 1 ? maxScore : start + binSize;
		return {
			label: binLabel(start, end, index === steps - 1),
			start,
			end,
			total: 0,
			hilcoe: 0,
			aau: 0,
			other: 0
		};
	});

	for (const student of students) {
		const normalized = Math.max(0, Math.min(maxScore - 0.001, student.score));
		const index = Math.min(bins.length - 1, Math.floor(normalized / binSize));
		const bin = bins[index];
		bin.total += 1;

		const institution = student.institution.toUpperCase();
		if (institution === 'HILCOE SCHOOL OF COMPUTER SCIENCE & TECHNOLOGY') bin.hilcoe += 1;
		else if (institution === 'ADDIS ABABA UNIVERSITY') bin.aau += 1;
		else bin.other += 1;
	}

	return bins.map((bin) => ({
		...bin,
		hilcoePercent: bin.total ? (bin.hilcoe / bin.total) * 100 : 0,
		aauPercent: bin.total ? (bin.aau / bin.total) * 100 : 0,
		otherPercent: bin.total ? (bin.other / bin.total) * 100 : 0
	}));
}

function buildHistogramSchoolNormalized(students, binSize = 5) {
	const maxScore = students.length ? Math.max(100, ...students.map((student) => student.score)) : 100;
	const steps = Math.ceil(maxScore / binSize);
	const hilcoeName = 'HILCOE SCHOOL OF COMPUTER SCIENCE & TECHNOLOGY';
	const aauName = 'ADDIS ABABA UNIVERSITY';
	const hilcoeTotal = students.filter((student) => student.institution.toUpperCase() === hilcoeName).length;
	const aauTotal = students.filter((student) => student.institution.toUpperCase() === aauName).length;

	const bins = Array.from({ length: steps }, (_, index) => {
		const start = index * binSize;
		const end = index === steps - 1 ? maxScore : start + binSize;
		return {
			label: binLabel(start, end, index === steps - 1),
			start,
			end,
			hilcoeCount: 0,
			aauCount: 0,
			hilcoePercent: 0,
			aauPercent: 0
		};
	});

	for (const student of students) {
		const normalized = Math.max(0, Math.min(maxScore - 0.001, student.score));
		const index = Math.min(bins.length - 1, Math.floor(normalized / binSize));
		const bin = bins[index];
		const institution = student.institution.toUpperCase();
		if (institution === hilcoeName) bin.hilcoeCount += 1;
		else if (institution === aauName) bin.aauCount += 1;
	}

	return bins.map((bin) => ({
		...bin,
		hilcoePercent: hilcoeTotal ? (bin.hilcoeCount / hilcoeTotal) * 100 : 0,
		aauPercent: aauTotal ? (bin.aauCount / aauTotal) * 100 : 0
	}));
}

function buildInstitutionStats(students) {
	const map = new Map();

	for (const student of students) {
		const key = student.institution;
		if (!map.has(key)) {
			map.set(key, {
				institution: key,
				total: 0,
				passCount: 0,
				failCount: 0,
				disqualifiedCount: 0,
				totalScore: 0,
				highestScore: -Infinity,
				lowestScore: Infinity,
				highestUsername: '',
				lowestUsername: ''
			});
		}

		const entry = map.get(key);
		entry.total += 1;
		entry.totalScore += student.score;
		if (student.score > entry.highestScore) {
			entry.highestScore = student.score;
			entry.highestUsername = student.username;
		}
		if (student.score < entry.lowestScore) {
			entry.lowestScore = student.score;
			entry.lowestUsername = student.username;
		}
		if (student.passFail === 'Pass') entry.passCount += 1;
		else entry.failCount += 1;
		if (student.isDisqualified) entry.disqualifiedCount += 1;
	}

	return [...map.values()]
		.map((entry) => ({
			...entry,
			averageScore: entry.total ? entry.totalScore / entry.total : 0,
			highestScore: Number.isFinite(entry.highestScore) ? entry.highestScore : 0,
			lowestScore: Number.isFinite(entry.lowestScore) ? entry.lowestScore : 0,
			passRate: entry.total ? (entry.passCount / entry.total) * 100 : 0
		}))
		.sort((a, b) => b.total - a.total || b.passRate - a.passRate || a.institution.localeCompare(b.institution));
}

export function buildInstitutionMajorStats(students) {
	const map = new Map();

	for (const student of students) {
		const key = student.institution;
		if (!map.has(key)) {
			map.set(key, {
				institution: key,
				csCount: 0,
				seCount: 0
			});
		}

		const entry = map.get(key);
		if (student.topic === 'Computer Science') entry.csCount += 1;
		if (student.topic === 'Software Engineering') entry.seCount += 1;
	}

	return [...map.values()]
		.map((entry) => ({
			...entry,
			total: entry.csCount + entry.seCount
		}))
		.sort((a, b) => b.total - a.total || a.institution.localeCompare(b.institution));
}

export function buildInstitutionSubjectExtremes(students) {
	const map = new Map();

	for (const student of students) {
		const key = student.institution;
		if (!map.has(key)) {
			map.set(key, {
				institution: key,
				computerScience: {
					highestScore: -Infinity,
					lowestScore: Infinity,
					highestUsername: '',
					lowestUsername: '',
					total: 0
				},
				softwareEngineering: {
					highestScore: -Infinity,
					lowestScore: Infinity,
					highestUsername: '',
					lowestUsername: '',
					total: 0
				}
			});
		}

		const entry = map.get(key);
		const bucket = student.topic === 'Computer Science' ? entry.computerScience : entry.softwareEngineering;
		bucket.total += 1;

		if (student.score > bucket.highestScore) {
			bucket.highestScore = student.score;
			bucket.highestUsername = student.username;
		}
		if (student.score < bucket.lowestScore) {
			bucket.lowestScore = student.score;
			bucket.lowestUsername = student.username;
		}
	}

	return [...map.values()]
		.map((entry) => ({
			institution: entry.institution,
			computerScience: {
				...entry.computerScience,
				highestScore: Number.isFinite(entry.computerScience.highestScore) ? entry.computerScience.highestScore : 0,
				lowestScore: Number.isFinite(entry.computerScience.lowestScore) ? entry.computerScience.lowestScore : 0
			},
			softwareEngineering: {
				...entry.softwareEngineering,
				highestScore: Number.isFinite(entry.softwareEngineering.highestScore) ? entry.softwareEngineering.highestScore : 0,
				lowestScore: Number.isFinite(entry.softwareEngineering.lowestScore) ? entry.softwareEngineering.lowestScore : 0
			}
		}))
		.sort((a, b) => a.institution.localeCompare(b.institution));
}

function buildScatterEntries(students, poolScoresSorted) {
	const descending = [...students].sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
	const scoreCounts = new Map();
	for (const score of poolScoresSorted) {
		scoreCounts.set(score, (scoreCounts.get(score) || 0) + 1);
	}

	const cumulative = new Map();
	return descending.map((student, index) => {
		const sameScoreBefore = cumulative.get(student.score) || 0;
		const sameScoreTotal = scoreCounts.get(student.score) || 1;
		cumulative.set(student.score, sameScoreBefore + 1);
		return {
			username: student.username,
			score: student.score,
			institution: student.institution,
			gender: student.gender,
			topic: student.topic,
			index: index + 1,
			rank: index + 1,
			scoreBand: sameScoreTotal,
			rankInTopic: student.rankInTopic,
			rankInInstitutionByTopic: student.rankInInstitutionByTopic
		};
	});
}

function buildTopicPool(students, label) {
	const scoresSorted = [...students].map((student) => student.score).sort((a, b) => a - b);
	const scatter = buildScatterEntries(students, scoresSorted);
	const histogram = buildHistogram(scoresSorted);
	const histogramInstitutionBreakdown = buildHistogramInstitutionBreakdown(students);
	const histogramSchoolNormalized = buildHistogramSchoolNormalized(students);
	const institutionStats = buildInstitutionStats(students);
	const totalScore = students.reduce((sum, student) => sum + student.score, 0);
	const passCount = students.filter((student) => student.passFail === 'Pass').length;
	const failCount = students.filter((student) => student.passFail === 'Fail').length;
	const disqualifiedCount = students.filter((student) => student.isDisqualified).length;

	return {
		key: label,
		students,
		scoresSorted,
		scatter,
		histogram,
		histogramInstitutionBreakdown,
		histogramSchoolNormalized,
		institutionStats,
		total: students.length,
		averageScore: students.length ? totalScore / students.length : 0,
		passCount,
		failCount,
		disqualifiedCount,
		passRate: students.length ? (passCount / students.length) * 100 : 0,
		minScore: students.length ? scoresSorted[0] : 0,
		maxScore: students.length ? scoresSorted[scoresSorted.length - 1] : 0
	};
}

function buildDataset(rawRows) {
	const headers = rawRows[0];
	const dataRows = rawRows.slice(1);

	const students = dataRows.map((row) => {
		const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
		return {
			username: String(record.username || '').trim().toLowerCase(),
			gender: genderKey(record.gender),
			institution: String(record.institution_name || '').trim(),
			topic: normalizeTopic(String(record.exam_topic_name || '').trim()),
			score: parseNumber(record.total_score, 0),
			isDisqualified: parseInteger(record.is_disqualified, 0) === 1,
			passFail: String(record.pass_fail || '').trim() || 'Fail',
			scoreVsPassMark: parseNumber(record.score_vs_pass_mark, 0),
			percentileByTopic: parseNumber(record.percentile_by_topic, 0),
			rankInTopic: parseInteger(record.rank_in_topic, 0),
			rankInInstitutionByTopic: parseInteger(record.rank_in_institution_by_topic, 0),
			year: String(record.year || '').trim(),
			status: String(record.status || '').trim()
		};
	});

	const byUsername = new Map(students.map((student) => [student.username, student]));
	const topicStudents = Object.fromEntries(TOPICS.map((topic) => [topic, students.filter((student) => student.topic === topic)]));
	const topicPools = Object.fromEntries(TOPICS.map((topic) => [topic, buildTopicPool(topicStudents[topic], topic)]));
	const combinedPool = buildTopicPool(students, 'both');
	const institutionMajorStats = buildInstitutionMajorStats(students);
	const institutionSubjectExtremes = buildInstitutionSubjectExtremes(students);
	const pools = {
		cs: topicPools['Computer Science'],
		se: topicPools['Software Engineering'],
		both: combinedPool
	};

	return {
		students,
		byUsername,
		topicStudents,
		topicPools,
		institutionMajorStats,
		institutionSubjectExtremes,
		pools,
		genderColors: GENDER_COLORS,
		institutionPalette: INSTITUTION_PALETTE
	};
}

async function loadDataset() {
	const csv = await readFile(DATA_PATH, 'utf8');
	const rawRows = parseCsv(csv);
	if (!rawRows.length) {
		throw new Error(`No rows found in ${DATA_PATH}`);
	}

	return buildDataset(rawRows);
}

const datasetPromise = loadDataset();

export async function getDataset() {
	return datasetPromise;
}

export async function getPool(selection = 'both') {
	const dataset = await getDataset();
	return dataset.pools[selection] || dataset.pools.both;
}

export async function getStudent(username) {
	const dataset = await getDataset();
	return dataset.byUsername.get(String(username || '').trim().toLowerCase()) || null;
}

export function pickInstitutionColor(institution) {
	return INSTITUTION_PALETTE[hashString(institution) % INSTITUTION_PALETTE.length];
}

export function normalizeTopicSelection(value) {
	const normalized = String(value || 'both').toLowerCase();
	if (normalized === 'cs' || normalized === 'computer science') return 'cs';
	if (normalized === 'se' || normalized === 'software engineering') return 'se';
	return 'both';
}

export function selectionToTopics(selection) {
	return TOPIC_VALUES[normalizeTopicSelection(selection)];
}
