<script>
	import { onMount } from 'svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import ScatterPlot from '$lib/components/ScatterPlot.svelte';
	import Histogram from '$lib/components/Histogram.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import { TOPIC_LABELS } from '$lib/shared/constants.js';
	import { formatInteger, formatNumber, formatPercent } from '$lib/shared/format.js';

	export let data;

	let selectedTopics = 'both';
	let colorMode = 'institution';
	let dashboard = data.initialDashboard;
	let username = '';
	let scoreValue = '';
	let studentReport = null;
	let scoreReport = null;
	let loading = false;
	let errorMessage = '';
	let requestId = 0;

	async function fetchDashboard(nextTopics) {
		const response = await fetch(`/api/dashboard?topics=${encodeURIComponent(nextTopics)}`);
		if (!response.ok) throw new Error('Failed to load dashboard data.');
		return response.json();
	}

	async function fetchStudent(usernameValue, topics = selectedTopics) {
		const response = await fetch(
			`/api/student?username=${encodeURIComponent(usernameValue)}&topics=${encodeURIComponent(topics)}`
		);
		if (response.status === 404) return null;
		if (!response.ok) throw new Error('Failed to load student record.');
		return response.json();
	}

	async function fetchScore(score, topics = selectedTopics) {
		const response = await fetch(
			`/api/score?value=${encodeURIComponent(score)}&topics=${encodeURIComponent(topics)}`
		);
		if (!response.ok) throw new Error('Failed to load score report.');
		return response.json();
	}

	async function refreshDashboard(nextTopics = selectedTopics) {
		const currentRequest = ++requestId;
		loading = true;
		errorMessage = '';

		try {
			const nextDashboard = await fetchDashboard(nextTopics);
			if (currentRequest !== requestId) return;
			dashboard = nextDashboard;

			if (username.trim()) {
				studentReport = await fetchStudent(username.trim().toLowerCase(), nextTopics);
				if (currentRequest !== requestId) return;
			}

			if (scoreValue !== '' && scoreValue !== null && scoreValue !== undefined) {
				scoreReport = await fetchScore(scoreValue, nextTopics);
				if (currentRequest !== requestId) return;
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
		} finally {
			if (currentRequest === requestId) loading = false;
		}
	}

	async function handleStudentSearch() {
		errorMessage = '';
		if (!username.trim()) {
			studentReport = null;
			return;
		}

		try {
			studentReport = await fetchStudent(username.trim().toLowerCase());
			if (!studentReport) errorMessage = 'Student not found.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
		}
	}

	async function handleScoreSearch() {
		errorMessage = '';
		if (scoreValue === '' || scoreValue === null || scoreValue === undefined) {
			scoreReport = null;
			return;
		}

		try {
			scoreReport = await fetchScore(scoreValue);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
		}
	}

	function onTopicChange(event) {
		selectedTopics = event.currentTarget.value;
		refreshDashboard(selectedTopics);
	}

	onMount(() => {
		dashboard = data.initialDashboard;
	});

	$: scatterPoints = dashboard?.scatter || [];
	$: histogramBins = dashboard?.histogram || [];
	$: institutionRows = dashboard?.institutionStats || [];
	$: schoolSubjectExtremes = dashboard?.institutionSubjectExtremes || [];
	$: institutionMajorRows = dashboard?.institutionMajorStats || [];
	$: majorBreakdown = dashboard?.majorBreakdown || [];
	$: highlightedUsername = studentReport?.student?.username || '';
	$: scoreLine = scoreReport?.score ?? null;
	$: summary = dashboard?.summary || {};
	$: datasetStats = dashboard?.datasetStats || {};
	$: topicLabel = TOPIC_LABELS[selectedTopics] || 'Both';
</script>

<svelte:head>
	<title>Exit Plot | Student Exam Analytics</title>
</svelte:head>

<main class="page">
	<section class="hero container">
		<div class="hero__copy">
			<div class="chip">Local CSV analytics</div>
			<h1>Student exam results.</h1>
			<p>Search, percentiles, and charts from one local CSV.</p>
		</div>

		<div class="hero__cards panel">
			<StatCard label="Dataset pool" value={topicLabel} hint={`Total records: ${formatInteger(summary.total)}`} tone="accent" />
			<StatCard label="Average score" value={formatNumber(summary.averageScore)} hint={`Range: ${formatNumber(summary.minScore)} - ${formatNumber(summary.maxScore)}`} tone="success" />
			<StatCard label="Pass rate" value={formatPercent(summary.passRate)} hint={`Pass: ${formatInteger(summary.passCount)} | Fail: ${formatInteger(summary.failCount)}`} tone="warning" />
		</div>
	</section>

	<section class="container controls panel">
		<div class="control">
			<label for="topic">Topic pool</label>
			<select id="topic" class="select" bind:value={selectedTopics} on:change={onTopicChange}>
				<option value="cs">Computer Science</option>
				<option value="se">Software Engineering</option>
				<option value="both">Both</option>
			</select>
		</div>

		<div class="control">
			<label for="colorMode">Color mode</label>
			<select id="colorMode" class="select" bind:value={colorMode}>
				<option value="institution">Institution</option>
				<option value="gender">Gender</option>
			</select>
		</div>

		<div class="control search">
			<label for="username">Student search</label>
			<div class="search-row">
				<input
					id="username"
					class="input"
					placeholder="username"
					bind:value={username}
					on:keydown={(event) => event.key === 'Enter' && handleStudentSearch()}
				/>
				<button class="action-button" on:click={handleStudentSearch}>Find student</button>
			</div>
		</div>

		<div class="control search">
			<label for="score">Score search</label>
			<div class="search-row">
				<input
					id="score"
					class="input"
					type="number"
					step="0.01"
					placeholder="72"
					bind:value={scoreValue}
					on:keydown={(event) => event.key === 'Enter' && handleScoreSearch()}
				/>
				<button class="action-button" on:click={handleScoreSearch}>Find score</button>
			</div>
		</div>
	</section>

	{#if errorMessage}
		<div class="container error panel">{errorMessage}</div>
	{/if}

	<section class="container stats-strip">
		<StatCard label="Total records" value={formatInteger(datasetStats.totalRecords)} hint="All cleaned rows in the CSV" />
		<StatCard label="Institutions" value={formatInteger(datasetStats.uniqueInstitutions)} hint="Unique school names" />
		<StatCard label="Computer Science" value={formatInteger(datasetStats.csRecords)} hint="Rows in CS" />
		<StatCard label="Software Engineering" value={formatInteger(datasetStats.seRecords)} hint="Rows in SE" />
		<StatCard label="Passed" value={formatInteger(datasetStats.passCount)} hint="Pass outcomes" />
		<StatCard label="Disqualified" value={formatInteger(datasetStats.disqualifiedCount)} hint="Marked disqualified" />
	</section>

	<section class="container grid dashboard-grid">
		<div class="main-chart">
			<ScatterPlot
				points={scatterPoints}
				colorMode={colorMode}
				highlightedUsername={highlightedUsername}
				scoreLine={scoreLine}
				title={`Exam scatter plot - ${topicLabel}`}
			/>
		</div>

		<div class="side-panel grid">
			<div class="panel summary-card">
				<h3>Student search result</h3>
				{#if studentReport}
					<div class="detail-list">
						<div><span>Username</span><strong>{studentReport.student.username}</strong></div>
						<div><span>Score</span><strong>{formatNumber(studentReport.student.score)}</strong></div>
						<div><span>Status</span><strong>{studentReport.student.passFail}</strong></div>
						<div><span>Topic rank</span><strong>{formatInteger(studentReport.statistics.rank)}</strong></div>
						<div><span>Institution rank</span><strong>{formatInteger(studentReport.student.rankInInstitutionByTopic)}</strong></div>
						<div><span>Dynamic percentile</span><strong>{formatPercent(studentReport.statistics.percentile)}</strong></div>
						<div><span>vs pool average</span><strong>{formatNumber(studentReport.statistics.scoreDifferenceFromAverage)}</strong></div>
					</div>
				{:else}
					<p class="muted">Search by username to see topic rank, institution rank, percentile, and comparison.</p>
				{/if}
			</div>

			<div class="panel summary-card">
				<h3>Score search result</h3>
				{#if scoreReport}
					<div class="detail-list">
						<div><span>Score</span><strong>{formatNumber(scoreReport.score)}</strong></div>
						<div><span>Percentile</span><strong>{formatPercent(scoreReport.statistics.percentile)}</strong></div>
						<div><span>Same score</span><strong>{formatInteger(scoreReport.statistics.sameScoreCount)}</strong></div>
						<div><span>Rank</span><strong>{formatInteger(scoreReport.statistics.rank)}</strong></div>
						<div><span>Pool size</span><strong>{formatInteger(scoreReport.statistics.totalStudents)}</strong></div>
						<div><span>Histogram bin</span><strong>{scoreReport.statistics.histogramBin.label}</strong></div>
					</div>
				{:else}
					<p class="muted">Enter a score to calculate its percentile and locate it in the distribution.</p>
				{/if}
			</div>
		</div>
	</section>

	<section class="container charts-grid">
		<Histogram bins={histogramBins} breakdown={dashboard?.histogramSchoolNormalized || []} title="Score distribution, normalized by school" />
		<BarChart rows={institutionRows} title="Pass rate per school" valueKey="passRate" valueFormat="percent" />
	</section>

	<section class="container charts-grid charts-grid--major">
		<BarChart rows={majorBreakdown} title="Students by major" valueKey="count" labelKey="major" valueFormat="integer" />
	</section>

	<section class="container panel school-table">
		<div class="section-head">
			<h3>Highest and lowest per school by subject</h3>
			<span class="muted">Top {schoolSubjectExtremes.length} schools in the current pool</span>
		</div>

		{#if schoolSubjectExtremes.length}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>School</th>
							<th>CS highest</th>
							<th>CS lowest</th>
							<th>SE highest</th>
							<th>SE lowest</th>
						</tr>
					</thead>
					<tbody>
						{#each schoolSubjectExtremes as row}
							<tr>
								<td title={row.institution}>{row.institution}</td>
								<td>{formatNumber(row.computerScience.highestScore)}</td>
								<td>{formatNumber(row.computerScience.lowestScore)}</td>
								<td>{formatNumber(row.softwareEngineering.highestScore)}</td>
								<td>{formatNumber(row.softwareEngineering.lowestScore)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-table muted">No school data available.</div>
		{/if}
	</section>

	<section class="container panel school-table">
		<div class="section-head">
			<h3>Students by major from each school</h3>
			<span class="muted">CS and SE counts by institution</span>
		</div>

		{#if institutionMajorRows.length}
			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>School</th>
							<th>Computer Science</th>
							<th>Software Engineering</th>
							<th>Total</th>
						</tr>
					</thead>
					<tbody>
						{#each institutionMajorRows as row}
							<tr>
								<td title={row.institution}>{row.institution}</td>
								<td>{formatInteger(row.csCount)}</td>
								<td>{formatInteger(row.seCount)}</td>
								<td>{formatInteger(row.total)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="empty-table muted">No institution breakdown available.</div>
		{/if}
	</section>
	{#if loading}
		<div class="loading">Refreshing analytics...</div>
	{/if}
</main>

<style>
	.page {
		padding: 1.25rem 0 2rem;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.95fr);
		gap: 1rem;
		align-items: stretch;
		margin-bottom: 1rem;
	}

	.hero__copy {
		padding: 1rem 0.25rem;
	}

	h1 {
		font-size: clamp(2rem, 4vw, 3.3rem);
		line-height: 1;
		margin: 0.75rem 0 0.5rem;
		max-width: 10ch;
		letter-spacing: -0.04em;
	}

	.hero p {
		max-width: 32ch;
		color: var(--muted);
		font-size: 0.98rem;
		margin: 0;
	}

	.hero__cards {
		display: grid;
		gap: 0.9rem;
		padding: 0.9rem;
	}

	.stats-strip {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.9rem;
		padding: 0.9rem;
		margin-bottom: 1rem;
	}

	.control {
		display: grid;
		gap: 0.45rem;
	}

	label {
		font-size: 0.82rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.search-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.6rem;
	}

	.action-button {
		border: 0;
		border-radius: 14px;
		padding: 0.8rem 1rem;
		background: linear-gradient(135deg, rgba(120, 215, 255, 0.95), rgba(139, 123, 255, 0.9));
		color: #05111e;
		font-weight: 700;
	}

	.error {
		padding: 0.95rem 1rem;
		margin-bottom: 1rem;
		border-color: rgba(255, 127, 138, 0.42);
		color: #ffd8dc;
	}

	.dashboard-grid {
		grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.8fr);
		gap: 1rem;
		align-items: start;
		margin-bottom: 1rem;
	}

	.main-chart {
		min-width: 0;
	}

	.side-panel {
		grid-template-columns: 1fr;
	}

	.summary-card {
		padding: 1rem;
	}

	.summary-card h3,
	.info-card h3 {
		margin: 0 0 0.75rem;
	}

	.detail-list {
		display: grid;
		gap: 0.7rem;
	}

	.detail-list div {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.detail-list span {
		color: var(--muted);
	}

	.charts-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.charts-grid--major {
		grid-template-columns: minmax(0, 1fr);
	}

	.school-table {
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.9rem;
	}

	.section-head h3 {
		margin: 0;
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.8rem 0.7rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-align: left;
		white-space: nowrap;
	}

	th {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		font-weight: 600;
	}

	td {
		color: var(--text);
	}

	td:first-child {
		max-width: 360px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.empty-table {
		padding: 1rem 0;
	}

	.loading {
		position: fixed;
		left: 50%;
		bottom: 18px;
		transform: translateX(-50%);
		padding: 0.7rem 1rem;
		border-radius: 999px;
		background: rgba(8, 15, 28, 0.88);
		border: 1px solid var(--border);
		box-shadow: var(--shadow);
	}

	@media (max-width: 1120px) {
		.hero,
		.dashboard-grid,
		.charts-grid,
		.controls {
			grid-template-columns: 1fr;
		}

		.stats-strip {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.page {
			padding-top: 0.8rem;
		}

		.search-row {
			grid-template-columns: 1fr;
		}

		h1 {
			font-size: 2.35rem;
		}

		.stats-strip {
			grid-template-columns: 1fr;
		}
	}
</style>
