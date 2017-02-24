var path = require("path");
var mockfs = require("mock-fs");
var Util = require("../lib/Util");

describe("Util", function () {
	it(".filterMap()", function () {
		var arr = [1, 3, 100, -5, "foo", false, "zoo", 4];
		expect(Util.filterMap(arr, (v) => (typeof v === "string" ? v.toUpperCase() : undefined))).toEqual(["FOO", "ZOO"]);
		expect(Util.filterMap(arr, (v) => (typeof v === "number" ? v * 2 : undefined))).toEqual([2, 6, 200, -10, 8]);
	});

	it(".makeModuleNameNoVer()", function () {
		expect(Util.makeModuleNameNoVer("foo")).toBe("foo");
		expect(Util.makeModuleNameNoVer("foo@0.1.0")).toBe("foo");
		expect(Util.makeModuleNameNoVer("foo@1")).toBe("foo");
		expect(Util.makeModuleNameNoVer("@scoped/foo")).toBe("@scoped/foo");
		expect(Util.makeModuleNameNoVer("@scoped/foo@0.1.0")).toBe("@scoped/foo");
	});

	it(".makeUnixPath()", function() {
		expect(Util.makeUnixPath("\\foo\\bar\\")).toBe("/foo/bar/");
		expect(Util.makeUnixPath("/foo/bar/")).toBe("/foo/bar/");
	});

	describe(".invertMap()", function () {
		it("reverses key/value pair", function () {
			var o = {
				foo: "fooValue",
				bar: 1,
				zoo: "tt",
				dee: "tt",
			};
			var reversed = Util.invertMap(o);
			expect("foo" in reversed).toBe(false);
			expect("bar" in reversed).toBe(false);
			expect("zoo" in reversed).toBe(false);
			expect("dee" in reversed).toBe(false);
			expect(reversed.fooValue).toEqual(["foo"]);
			expect(reversed[1]).toEqual(["bar"]);
			expect(reversed.tt.indexOf("zoo")).not.toBe(-1);
			expect(reversed.tt.indexOf("dee")).not.toBe(-1);
		});

		it("reverses a key and a property in the value", function () {
			var o = {
				foo: {
					id: "id1",
					value: false,
				},
				bar: {
					id: "id100",
					something: "wrong",
				},
				zoo: {
					id: "id42",
				}
			};
			var reversed = Util.invertMap(o, "id");
			expect("foo" in reversed).toBe(false);
			expect("bar" in reversed).toBe(false);
			expect("zoo" in reversed).toBe(false);
			expect(reversed.id1).toEqual(["foo"]);
			expect(reversed.id100).toEqual(["bar"]);
			expect(reversed.id42).toEqual(["zoo"]);
		});
	});

	describe(".chdir()", function () {
		afterEach(function () {
			mockfs.restore();
		});

		it("changes and restores the cwd", function (done) {
			mockfs({
				testdir1: {
					insidedir: {}
				},
				testdir2: {
				}
			});
			var resolvedOriginalPath = path.resolve(".");
			var resolvedInsideDirPath = path.resolve("./testdir1/insidedir");
			expect(path.resolve(process.cwd())).toBe(resolvedOriginalPath);
			var restoreDirectory = Util.chdir("./testdir1/insidedir");
			expect(path.resolve(process.cwd())).toBe(resolvedInsideDirPath);

			var pathlog = [];
			Promise.resolve()
				.then(() => restoreDirectory())
				.then(() => {
					pathlog.push(1);
					expect(path.resolve(process.cwd())).toBe(resolvedOriginalPath);
				})
				.then(() => restoreDirectory("error"))
				.catch((e) => {
					pathlog.push(2);
					expect(e).toBe("error");
				})
				.then(() => {
					expect(pathlog).toEqual([1, 2]);
					done();
				})
				.catch(done.fail);
		});
	});
});
