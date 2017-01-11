var mockfs = new require("mock-fs");
var NodeModules = require("../lib/NodeModules").NodeModules;

describe("NodeModules", function () {

	var mockFsContent = {
		"node_modules": {
			"dummy": {
				"package.json": JSON.stringify({
					name: "dummy",
					version: "0.0.0",
					main: "main.js",
					dependencies: { "dummyChild": "*" }
				}),
				"main.js": [
					"require('./foo');",
					"require('dummyChild');",
				].join("\n"),
				"foo.js": "module.exports = 1;",
				"node_modules": {
					"dummyChild": {
						"main.js": "module.exports = 'dummyChild';",
						"package.json": JSON.stringify({
							name: "dummyChild",
							version: "0.0.0",
							main: "main.js"
						})
					}
				}
			},
			"dummy2": {
				"index.js": "require('./sub')",
				"sub.js": "",
			}
		}
	};

	beforeEach(function () {
	});
	afterEach(function () {
		mockfs.restore();
	});

	describe(".listModulesFiles()", function () {
		it("list the script files and all package.json", function (done) {
			mockfs(mockFsContent);
			Promise.resolve()
				.then(() => NodeModules.listModuleFiles(".", ["dummy@1", "dummy2"]))
				.then((pkgjsonPaths) => {
					expect(pkgjsonPaths.sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0))).toEqual([
						"node_modules/dummy/foo.js",
						"node_modules/dummy/main.js",
						"node_modules/dummy/node_modules/dummyChild/main.js",
						"node_modules/dummy/node_modules/dummyChild/package.json",
						"node_modules/dummy/package.json",
						"node_modules/dummy2/index.js",
						"node_modules/dummy2/sub.js"
					].sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0)));
				})
				.then(() => NodeModules.listModuleFiles(".", "dummy2"))
				.then((pkgjsonPaths) => {
					expect(pkgjsonPaths.sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0))).toEqual([
						"node_modules/dummy2/index.js",
						"node_modules/dummy2/sub.js"
					]);
				})
				.then(done)
				.catch(() => done.fail());
		});
	});

	describe("._listPackageJsonsFromScriptsPath()", function () {
		it("list the files named package.json", function (done) {
			mockfs(mockFsContent);
			Promise.resolve()
				.then(() => NodeModules._listScriptFiles(".", ["dummy", "dummy2"]))
				.then((filePaths) => NodeModules._listPackageJsonsFromScriptsPath(".", filePaths))
				.then((pkgJsonPaths) => {
					expect(pkgJsonPaths.sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0))).toEqual([
						"node_modules/dummy/package.json",
						"node_modules/dummy/node_modules/dummyChild/package.json"
					].sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0)))
				})
				.then(() => NodeModules._listScriptFiles(".", "dummy2"))
				.then((filePaths) => NodeModules._listPackageJsonsFromScriptsPath(".", filePaths))
				.then((pkgJsonPaths) => {
					expect(pkgJsonPaths).toEqual([]);
				})
				.then(done)
				.catch(() => done.fail());
		});
	});

	describe("._listScriptFiles()", function () {
		it("list the scripts in node_modules/ up", function (done) {
			mockfs(mockFsContent);
			Promise.resolve()
				.then(() => NodeModules._listScriptFiles(".", ["dummy", "dummy2"]))
				.then((filePaths) => {
					expect(filePaths.sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0))).toEqual([
						"node_modules/dummy/foo.js",
						"node_modules/dummy/main.js",
						"node_modules/dummy/node_modules/dummyChild/main.js",
						"node_modules/dummy2/index.js",
						"node_modules/dummy2/sub.js"
					]);
				})
				.then(() => NodeModules._listScriptFiles(".", "dummy"))
				.then((filePaths) => {
					expect(filePaths.sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0))).toEqual([
						"node_modules/dummy/foo.js",
						"node_modules/dummy/main.js",
						"node_modules/dummy/node_modules/dummyChild/main.js"
					]);
				})
				.then(done)
				.catch(() => done.fail());
		});
	});

	// モジュール名に node_modules を含むモジュールに依存しているケース
	describe("._listPackageJsonsFromScriptsPath() with failure-prone module name", function () {
		it("list the files named package.json", function (done) {
			mockFsContent = {
				"node_modules": {
					"@dummy": {
						"dummy_node_modules": {
							"package.json": JSON.stringify({
								name: "dummy_node_modules",
								version: "0.0.0",
								main: "main.js",
								dependencies: { "dummyChild": "*" }
							}),
							"main.js": [
								"require('./foo');",
								"require('dummyChild');",
							].join("\n"),
							"foo.js": "module.exports = 1;",
							"node_modules": {
								"dummyChild": {
									"main.js": "module.exports = 'dummyChild';",
									"package.json": JSON.stringify({
										name: "dummyChild",
										version: "0.0.0",
										main: "main.js"
									})
								}
							}
						}
					},
					"dummy_node_modules": {
						"package.json": JSON.stringify({
							name: "dummy_node_modules",
							version: "0.0.0",
							main: "main.js",
							dependencies: { "dummyChild": "*" }
						}),
						"main.js": [
							"require('./foo');",
							"require('dummyChild');",
						].join("\n"),
						"foo.js": "module.exports = 1;",
						"node_modules": {
							"dummyChild": {
								"main.js": "module.exports = 'dummyChild';",
								"package.json": JSON.stringify({
									name: "dummyChild",
									version: "0.0.0",
									main: "main.js"
								})
							}
						}
					}
				}
			};
			mockfs(mockFsContent);
			Promise.resolve()
				.then(() => NodeModules._listScriptFiles(".", ["@dummy/dummy_node_modules", "dummy_node_modules"]))
				.then((filePaths) => NodeModules._listPackageJsonsFromScriptsPath(".", filePaths))
				.then((pkgJsonPaths) => {
					expect(pkgJsonPaths.sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0))).toEqual([
						"node_modules/@dummy/dummy_node_modules/package.json",
						"node_modules/@dummy/dummy_node_modules/node_modules/dummyChild/package.json",
						"node_modules/dummy_node_modules/package.json",
						"node_modules/dummy_node_modules/node_modules/dummyChild/package.json"
					].sort((a, b) => ((a > b) ? 1 : (a < b) ? -1 : 0)))
				})
				.then(done)
				.catch(() => done.fail());
		});
	});

});
