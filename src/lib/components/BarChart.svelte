<script>
	export let rows = [];
	export let title = 'Bar Chart';
	export let valueKey = 'passRate';
	export let labelKey = 'institution';
	export let valueFormat = 'percent';

	$: maxValue = Math.max(1, ...rows.map((row) => row[valueKey] || 0));

	function formatValue(value) {
		if (valueFormat === 'integer') return Math.round(value).toString();
		return `${value.toFixed(1)}%`;
	}
</script>

<div class="panel chart-shell">
	<div class="chart-header">
		<h3>{title}</h3>
		<span class="muted">Top {rows.length}</span>
	</div>

	{#if rows.length}
		<div class="rows">
			{#each rows as row}
				<div class="row">
					<div class="label" title={row[labelKey]}>{row[labelKey]}</div>
					<div class="track">
						<div class="fill" style={`width:${(row[valueKey] / maxValue) * 100}%;`} />
					</div>
					<div class="value">{formatValue(row[valueKey])}</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="empty">No bar chart data available.</div>
	{/if}
</div>

<style>
	.chart-shell {
		padding: 1rem;
	}

	.chart-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	h3 {
		margin: 0;
		font-size: 1.05rem;
	}

	.rows {
		display: grid;
		gap: 0.7rem;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(0, 1.8fr) minmax(0, 3fr) auto;
		gap: 0.75rem;
		align-items: center;
	}

	.label,
	.value {
		font-size: 0.85rem;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.track {
		height: 12px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, rgba(54, 211, 153, 0.88), rgba(120, 215, 255, 0.92));
	}

	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--muted);
	}
</style>
