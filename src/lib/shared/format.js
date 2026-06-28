export function formatNumber(value, fractionDigits = 2) {
	if (Number.isNaN(value) || value === null || value === undefined) return '—';
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	}).format(value);
}

export function formatInteger(value) {
	if (Number.isNaN(value) || value === null || value === undefined) return '—';
	return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function formatPercent(value, fractionDigits = 1) {
	if (Number.isNaN(value) || value === null || value === undefined) return '—';
	return `${value.toFixed(fractionDigits)}%`;
}

export function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

