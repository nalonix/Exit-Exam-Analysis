<script>
	export let label = '';
	export let value = '';
	export let hint = '';
	export let tone = 'neutral';
</script>

<article class="panel stat-card stat-card--{tone}">
	<div class="stat-card__label">{label}</div>
	<div class="stat-card__value">{value}</div>
	{#if hint}
		<div class="stat-card__hint">{hint}</div>
	{/if}
</article>

<style>
	.stat-card {
		padding: 1rem 1.05rem;
	}

	.stat-card__label {
		font-size: 0.82rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.stat-card__value {
		font-size: 1.5rem;
		font-weight: 700;
		margin-top: 0.35rem;
	}

	.stat-card__hint {
		margin-top: 0.35rem;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.stat-card--accent .stat-card__value {
		color: var(--accent);
	}

	.stat-card--success .stat-card__value {
		color: var(--good);
	}

	.stat-card--warning .stat-card__value {
		color: var(--warn);
	}
</style>

