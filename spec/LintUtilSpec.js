var LintUtil = require("../lib/LintUtil");

describe("LintUtil", function () {
	it("can judge that es5 code is valid", function () {
		const es5Code = `
			"use strict";
			var fn = function () {
				return 1;
			};
			var array = [1, 2];
			var a = array[0];
			var b = array[1];
		`;
		expect(LintUtil.validateEs5Code(es5Code)).toBe(true);
	});

	it("can judge that es6 code is invalid", function () {
		const es6Code = `
			"use strict";
			const fn = () => {
				return 1;
			}
			const array = [1, 3];
			const [a, b] = array;
		`;
		expect(LintUtil.validateEs5Code(es6Code)).toBe(false);
	});
});