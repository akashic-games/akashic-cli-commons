var path = require("path");
var mockfs = require("mock-fs");
var fs = require("fs");
var Util = require("../lib/Util");
var ConfigurationFile = require("../lib/ConfigurationFile");
var GameConfiguration = require("../lib/GameConfiguration");

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

	it(".hashBasename()", function () {
		var arr = ["script/mainScene.js", "node_modules/foo/bar/index.js", "image/hoge.png"];
		expect(arr.map((v) => Util.makeUnixPath(Util.hashBasename(v)))).toEqual([
			"script/04ef22b752657e08b66fe185c9f9592944afe6ab0ba51380f04d33f42d6a409c.js",
			"node_modules/foo/bar/825a514c9ba0f7565c0bc4415451ee2350476c9c18abf970a98cdd62113617ce.js",
			"image/a70844aefe0a5ceb64eb6b4ed23be19ab98eed26a43059802cd6a2b51e066e21.png"
		]);
		expect(arr.map((v) => Util.hashBasename(v, 5))).toEqual([
			"script/04ef2.js",
			"node_modules/foo/bar/825a5.js",
			"image/a7084.png"
		]);
	});

	describe(".hashFilePaths()", function () {
		beforeEach(function () {
			mockfs({
				srcDir: {
					"game.json": JSON.stringify({
						main: "script/mainScene.js",					
						assets: {
							hoge: {
								type: "image",
								path: "image/hoge.png",
								global: true
							}
						},
						globalScripts: [
							"node_modules/foo/bar/index.js"
						],
						moduleMainScripts: {
							foo: "node_modules/foo/bar/index.js"
						}
					}),
					script: {
						"mainScene.js": "console.log('main');"
					},
					image: {
						"hoge.png": ""
					},
					node_modules: {
						foo: {
							bar: {
								"index.js": "console.log('foo');"
							}
						}
					}
				},
				destDir: {}
			});
		});
		afterEach(function () {
			mockfs.restore();
		});

		it("hash game.json", function (done) {
			Promise.resolve()
			.then(() => ConfigurationFile.ConfigurationFile.read(path.join("./srcDir", "game.json"), undefined))
			.then((gamejson) => {
				Util.renameAssetFilenames(gamejson, "./srcDir");

				expect(gamejson.main).toBe("script/04ef22b752657e08b66f.js");
				expect(gamejson.assets["hoge"]).toEqual({
					type: "image",
					path: "image/a70844aefe0a5ceb64eb.png",
					virtualPath: "image/hoge.png",
					global: true
				});
				// globalScripts は scriptAsset に変換される
				expect(gamejson.assets["a_e_z_0"]).toEqual({
					type: "script",
					path: "node_modules/foo/bar/825a514c9ba0f7565c0b.js",
					virtualPath: "node_modules/foo/bar/index.js",
					global: true
				});
				expect(gamejson.moduleMainScripts["foo"]).toBe(Util.hashBasename("node_modules/foo/bar/index.js", 20));
				expect(fs.statSync(path.join("srcDir", "image/a70844aefe0a5ceb64eb.png")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "script/04ef22b752657e08b66f.js")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "node_modules/foo/bar/825a514c9ba0f7565c0b.js")).isFile()).toBe(true);
				done();
			})
			.catch(done.fail)
		});
	});
});
