/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	tabWidth: 4,
	overrides: [
		{
			files: 'README.md',
			options: {
				useTabs: false
			}
		}
	]
};

export default config;
