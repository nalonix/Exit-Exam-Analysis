<script>
	import { onDestroy, onMount } from 'svelte';

	export let bins = [];
	export let breakdown = [];
	export let title = 'Histogram';
	export let height = 340;

	let canvas;
	let chart;
	let chartModule;

	const palette = {
		hilcoe: 'rgba(120, 215, 255, 0.92)',
		aau: 'rgba(139, 123, 255, 0.92)',
		grid: 'rgba(255, 255, 255, 0.08)',
		tick: 'rgba(233, 240, 255, 0.72)',
		text: 'rgba(233, 240, 255, 0.92)'
	};

	function buildConfig() {
		const labels = bins.map((bin) => bin.label);
		const hilcoe = breakdown.map((bin) => bin.hilcoePercent || 0);
		const aau = breakdown.map((bin) => bin.aauPercent || 0);
		const maxValue = Math.max(10, ...hilcoe, ...aau);

		return {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: 'Hilcoe',
						data: hilcoe,
						backgroundColor: palette.hilcoe,
						borderRadius: 8,
						borderSkipped: false,
						barPercentage: 0.82,
						categoryPercentage: 0.78
					},
					{
						label: 'Addis Ababa University',
						data: aau,
						backgroundColor: palette.aau,
						borderRadius: 8,
						borderSkipped: false,
						barPercentage: 0.82,
						categoryPercentage: 0.78
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index',
					intersect: false
				},
				layout: {
					padding: {
						top: 18,
						right: 8,
						bottom: 0,
						left: 0
					}
				},
				plugins: {
					legend: {
						position: 'top',
						labels: {
							color: palette.tick,
							usePointStyle: true,
							pointStyle: 'rectRounded'
						}
					},
					tooltip: {
						callbacks: {
							label(context) {
								const value = context.parsed.y ?? 0;
								return `${context.dataset.label}: ${value.toFixed(1)}% of that school's students`;
							}
						}
					}
				},
				scales: {
					x: {
						grid: {
							display: false
						},
						ticks: {
							color: palette.tick,
							maxRotation: 0,
							autoSkip: true
						}
					},
					y: {
						beginAtZero: true,
						suggestedMax: maxValue,
						grid: {
							color: palette.grid
						},
						ticks: {
							color: palette.tick,
							callback: (value) => `${value}%`
						}
					}
				}
			},
			plugins: [
				{
					id: 'percentLabels',
					afterDatasetsDraw(chartInstance) {
						const { ctx } = chartInstance;
						ctx.save();
						ctx.fillStyle = palette.text;
						ctx.font = '700 11px Inter, system-ui, sans-serif';
						ctx.textAlign = 'center';
						ctx.textBaseline = 'bottom';

						chartInstance.data.datasets.forEach((dataset, datasetIndex) => {
							const meta = chartInstance.getDatasetMeta(datasetIndex);
							meta.data.forEach((bar, index) => {
								const value = dataset.data[index];
								if (!value || value < 8) return;
								ctx.fillText(`${Math.round(value)}%`, bar.x, bar.y - 4);
							});
						});

						ctx.restore();
					}
				}
			]
		};
	}

	async function renderChart() {
		if (!chartModule || !canvas) return;
		if (chart) {
			chart.destroy();
			chart = null;
		}

		const Chart = chartModule.default ?? chartModule.Chart;
		chart = new Chart(canvas, buildConfig());
	}

	onMount(async () => {
		chartModule = await import('chart.js/auto');
		await renderChart();
	});

	$: if (chart) {
		chart.data.labels = bins.map((bin) => bin.label);
		chart.data.datasets[0].data = breakdown.map((bin) => bin.hilcoePercent || 0);
		chart.data.datasets[1].data = breakdown.map((bin) => bin.aauPercent || 0);
		chart.update('none');
	}

	onDestroy(() => {
		if (chart) chart.destroy();
	});
</script>

<div class="panel chart-shell">
	<div class="chart-header">
		<h3>{title}</h3>
		<span class="muted">{bins.length} bins</span>
	</div>

	{#if bins.length}
		<div class="chart-frame" style={`height:${height}px;`}>
			<canvas bind:this={canvas}></canvas>
		</div>
	{:else}
		<div class="empty">No histogram data available.</div>
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

	.chart-frame {
		position: relative;
		width: 100%;
	}

	canvas {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}

	.empty {
		padding: 2rem;
		text-align: center;
		color: var(--muted);
	}
</style>
