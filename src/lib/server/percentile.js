export function lowerBound(values, target) {
	let left = 0;
	let right = values.length;

	while (left < right) {
		const middle = (left + right) >> 1;
		if (values[middle] < target) left = middle + 1;
		else right = middle;
	}

	return left;
}

export function upperBound(values, target) {
	let left = 0;
	let right = values.length;

	while (left < right) {
		const middle = (left + right) >> 1;
		if (values[middle] <= target) left = middle + 1;
		else right = middle;
	}

	return left;
}

export function percentileFromSortedScores(scoresSorted, score) {
	const totalStudents = scoresSorted.length;
	if (!totalStudents) {
		return {
			percentile: 0,
			rank: 0,
			totalStudents: 0,
			sameScoreCount: 0,
			belowCount: 0,
			aboveCount: 0
		};
	}

	const belowCount = lowerBound(scoresSorted, score);
	const aboveCount = totalStudents - upperBound(scoresSorted, score);
	const sameScoreCount = totalStudents - belowCount - aboveCount;
	const percentile = (belowCount / totalStudents) * 100;
	const rank = totalStudents - upperBound(scoresSorted, score) + 1;

	return {
		percentile,
		rank,
		totalStudents,
		sameScoreCount,
		belowCount,
		aboveCount
	};
}

