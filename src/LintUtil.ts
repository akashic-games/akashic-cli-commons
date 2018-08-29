import * as eslint from "eslint";

export function validateEs5Code(code: string): boolean {
	const errors = (new eslint.Linter()).verify(code, {
		env: {
			"browser": true
		},
		parserOptions: {
			ecmaVersion: 5
		}
	});
	return errors.length === 0;
}
