<script>
	import { onMount } from 'svelte';
	import { clamp } from '$lib/shared/format.js';
	import { getGenderColor, pickInstitutionColor } from '$lib/shared/constants.js';

	export let points = [];
	export let width = 1000;
	export let height = 560;
	export let title = 'Scatter Plot';
	export let colorMode = 'gender';
	export let highlightedUsername = '';
	export let scoreLine = null;

	let hovered = null;
	let container;
	let measuredWidth = width;

	onMount(() => {
		const resize = () => {
			measuredWidth = container?.clientWidth || width;
		};

		resize();
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	});

	$: renderWidth = Math.max(320, measuredWidth || width);
	$: renderHeight = Math.max(380, Math.round(renderWidth * 0.56));

	const padding = { top: 24, right: 22, bottom: 54, left: 56 };

	$: maxIndex = Math.max(1, points.length - 1);
	$: minScore = points.length ? Math.min(...points.map((point) => point.score)) : 0;
	$: maxScore = points.length ? Math.max(...points.map((point) => point.score)) : 100;
	$: scoreRange = Math.max(1, maxScore - minScore);

	function pointColor(point) {
		return colorMode === 'institution' ? pickInstitutionColor(point.institution) : getGenderColor(point.gender);
	}

	function xFor(point) {
		const innerWidth = renderWidth - padding.left - padding.right;
		return padding.left + ((point.index - 1) / maxIndex) * innerWidth;
	}

	function yFor(score) {
		const innerHeight = renderHeight - padding.top - padding.bottom;
		return padding.top + (1 - (score - minScore) / scoreRange) * innerHeight;
	}

	function setHovered(point, event) {
		const svg = event.currentTarget.ownerSVGElement;
		const rect = svg.getBoundingClientRect();
		hovered = {
			...point,
			x: event.clientX - rect.left + 14,
			y: event.clientY - rect.top - 12
		};
	}

	function lineY(value) {
		if (value === null || value === undefined) return null;
		return yFor(clamp(value, minScore, maxScore));
	}

	$: scoreLineY = lineY(scoreLine);
	$: highlighted = highlightedUsername ? points.find((point) => point.username === highlightedUsername) : null;
</script>

<div class="panel plot-shell" bind:this={container}>
	<div class="plot-header">
		<div>
			<h2>{title}</h2>
			<p class="muted">Each dot is one student. X-axis uses rank/index, Y-axis uses score.</p>
		</div>
		<div class="plot-legend">
			<span class="legend-item"><span class="legend-dot" style="background: var(--accent);"></span> Highlighted student</span>
			<span class="legend-item"><span class="legend-dot" style="background: var(--warn);"></span> Score line</span>
		</div>
	</div>

	{#if points.length}
		<svg class="plot" width={renderWidth} height={renderHeight} viewBox={`0 0 ${renderWidth} ${renderHeight}`} role="img" aria-label={title}>
			<defs>
				<linearGradient id="axisFade" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stop-color="rgba(255,255,255,0.12)" />
					<stop offset="100%" stop-color="rgba(255,255,255,0.02)" />
				</linearGradient>
			</defs>

			<rect x="0" y="0" width={renderWidth} height={renderHeight} fill="url(#axisFade)" rx="18" />

			{#if scoreLineY !== null}
				<line x1={padding.left} x2={renderWidth - padding.right} y1={scoreLineY} y2={scoreLineY} class="score-line" />
				<text x={renderWidth - padding.right} y={scoreLineY - 8} class="line-label">Score line</text>
			{/if}

			{#each points as point}
				{@const isHighlighted = highlightedUsername && point.username === highlightedUsername}
				<circle
					cx={xFor(point)}
					cy={yFor(point.score)}
					r={isHighlighted ? 5.8 : 2.8}
					fill={isHighlighted ? 'var(--accent)' : pointColor(point)}
					opacity={isHighlighted ? 1 : 0.7}
					stroke={isHighlighted ? 'white' : 'transparent'}
					stroke-width="1.2"
					on:mouseenter={(event) => setHovered(point, event)}
					on:mousemove={(event) => setHovered(point, event)}
					on:mouseleave={() => (hovered = null)}
				/>
			{/each}

			<line x1={padding.left} x2={renderWidth - padding.right} y1={renderHeight - padding.bottom} y2={renderHeight - padding.bottom} class="axis" />
			<line x1={padding.left} x2={padding.left} y1={padding.top} y2={renderHeight - padding.bottom} class="axis" />

			<text x={padding.left} y={renderHeight - 18} class="axis-label">Rank / Index</text>
			<text x={18} y={padding.top + 8} class="axis-label" transform={`rotate(-90 18 ${padding.top + 8})`}>Score</text>

			<text x={padding.left} y={renderHeight - padding.bottom + 18} class="tick-label">1</text>
			<text x={(padding.left + renderWidth - padding.right) / 2} y={renderHeight - padding.bottom + 18} class="tick-label">Middle</text>
			<text x={renderWidth - padding.right - 18} y={renderHeight - padding.bottom + 18} class="tick-label">Last</text>

			<text x={padding.left - 12} y={padding.top + 4} text-anchor="end" class="tick-label">{maxScore.toFixed(1)}</text>
			<text x={padding.left - 12} y={renderHeight - padding.bottom} text-anchor="end" class="tick-label">{minScore.toFixed(1)}</text>
		</svg>

		{#if hovered}
			<div class="tooltip" style={`left:${hovered.x}px; top:${hovered.y}px;`}>
				<div class="tooltip__title">{hovered.username}</div>
				<div>Score: {hovered.score.toFixed(2)}</div>
				<div>Institution: {hovered.institution}</div>
				<div>Gender: {hovered.gender}</div>
			</div>
		{/if}

		{#if highlighted}
			<div class="highlight-row">
				<span class="chip">Highlighted: {highlighted.username}</span>
				<span class="chip">Rank: {highlighted.rank}</span>
				<span class="chip">Score: {highlighted.score.toFixed(2)}</span>
			</div>
		{/if}
	{:else}
		<div class="empty-state">No points available for this selection.</div>
	{/if}
</div>

<style>
	.plot-shell {
		position: relative;
		padding: 1rem;
	}

	.plot-header {
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}

	h2 {
		margin: 0;
		font-size: 1.15rem;
	}

	p {
		margin: 0.3rem 0 0;
	}

	.plot-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.9rem;
		justify-content: flex-end;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--muted);
		font-size: 0.88rem;
	}

	.legend-dot {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 999px;
	}

	.plot {
		display: block;
		width: 100%;
		height: auto;
	}

	.axis {
		stroke: rgba(255, 255, 255, 0.18);
		stroke-width: 1.2;
	}

	.score-line {
		stroke: var(--warn);
		stroke-width: 1.5;
		stroke-dasharray: 6 5;
	}

	.line-label {
		fill: var(--warn);
		font-size: 11px;
	}

	.axis-label,
	.tick-label {
		fill: rgba(233, 240, 255, 0.7);
		font-size: 11px;
	}

	.tooltip {
		position: absolute;
		min-width: 200px;
		padding: 0.75rem 0.8rem;
		border-radius: 14px;
		border: 1px solid var(--border);
		background: rgba(8, 15, 28, 0.96);
		box-shadow: var(--shadow);
		pointer-events: none;
		font-size: 0.92rem;
	}

	.tooltip__title {
		font-weight: 700;
		margin-bottom: 0.25rem;
		color: var(--accent);
	}

	.highlight-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.85rem;
	}

	.empty-state {
		padding: 3rem 1rem;
		text-align: center;
		color: var(--muted);
	}
</style>
