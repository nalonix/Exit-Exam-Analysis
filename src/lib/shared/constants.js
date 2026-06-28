export const TOPICS = ['Computer Science', 'Software Engineering'];

export const TOPIC_LABELS = {
	cs: 'Computer Science',
	se: 'Software Engineering',
	both: 'Both'
};

export const TOPIC_VALUES = {
	cs: ['Computer Science'],
	se: ['Software Engineering'],
	both: ['Computer Science', 'Software Engineering']
};

export const GENDER_COLORS = {
	Male: '#78d7ff',
	Female: '#ff7f8a',
	Other: '#8b7bff',
	Unknown: '#b8c1d9'
};

export const INSTITUTION_PALETTE = [
	'#78d7ff',
	'#8b7bff',
	'#36d399',
	'#ffcb6b',
	'#ff8f5b',
	'#4dd0e1',
	'#ff6fae',
	'#9ccc65',
	'#f06292',
	'#64b5f6'
];

export function hashString(value) {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 31 + value.charCodeAt(i)) | 0;
	}
	return Math.abs(hash);
}

export function pickInstitutionColor(institution) {
	return INSTITUTION_PALETTE[hashString(institution) % INSTITUTION_PALETTE.length];
}

export function getGenderColor(gender) {
	return GENDER_COLORS[gender] || GENDER_COLORS.Unknown;
}
