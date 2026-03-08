import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
	...nextCoreWebVitals,
	{
		rules: {
			'react/no-unescaped-entities': 'off',
			'react-hooks/immutability': 'off',
			'react-hooks/purity': 'off',
			'react-hooks/error-boundaries': 'off',
			'react-hooks/set-state-in-effect': 'off',
			'import/no-anonymous-default-export': 'off'
		}
	}
];
