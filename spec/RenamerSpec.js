var path = require("path");
var mockfs = require("mock-fs");
var fs = require("fs");
var Util = require("../lib/Util");
var Renamer = require("../lib/Renamer");
var ConfigurationFile = require("../lib/ConfigurationFile");
var GameConfiguration = require("../lib/GameConfiguration");

describe("Renamer", function () {
	it(".hashFilepath()", function () {
		var arr = ["script/mainScene.js", "node_modules/foo/bar/index.js", "image/hoge.png"];
		expect(arr.map((v) => Util.makeUnixPath(Renamer.hashFilepath(v)))).toEqual([
			"21a027/04ef22b752657e08b66fe185c9f9592944afe6ab0ba51380f04d33f42d6a409c.js",
			"dba27c31aad9/2c2/fcd/825a514c9ba0f7565c0bc4415451ee2350476c9c18abf970a98cdd62113617ce.js",
			"6105d/a70844aefe0a5ceb64eb6b4ed23be19ab98eed26a43059802cd6a2b51e066e21.png"
		]);
		expect(arr.map((v) => Renamer.hashFilepath(v, 5))).toEqual([
			"21a027/04ef2.js",
			"dba27c31aad9/2c2/fcd/825a5.js",
			"6105d/a7084.png"
		]);
	});

	describe(".hashFilePaths()", function () {
		beforeEach(function () {
			mockfs({
				srcDir: {
					"game.json": JSON.stringify({
						main: "./script/mainScene",
						assets: {
							mainScene: {
								type: "script",
								path: "script/mainScene.js",
								global: true
							},
							hoge: {
								type: "image",
								path: "image/hoge.png",
								global: true
							},
							foo: {
								type: "audio",
								path: "audio/foo",
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
					audio: {
						"foo.mp4": "",
						"foo.ogg": "",
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
				Renamer.renameAssetFilenames(gamejson, "./srcDir");

				expect(gamejson.main).toBe("./script/mainScene");
				expect(gamejson.assets["mainScene"]).toEqual({
					type: "script",
					path: "21a027/04ef22b752657e08b66f.js",
					virtualPath: "script/mainScene.js",
					global: true
				});
				expect(gamejson.assets["hoge"]).toEqual({
					type: "image",
					path: "6105d/a70844aefe0a5ceb64eb.png",
					virtualPath: "image/hoge.png",
					global: true
				});
				expect(gamejson.assets["foo"]).toEqual({
					type: "audio",
					path: "6ed89/47acba638f0bcfc681d7",
					virtualPath: "audio/foo",
					global: true
				});
				// globalScripts は scriptAsset に変換される
				expect(gamejson.assets["a_e_z_0"]).toEqual({
					type: "script",
					path: "dba27c31aad9/2c2/fcd/825a514c9ba0f7565c0b.js",
					virtualPath: "node_modules/foo/bar/index.js",
					global: true
				});
				// moduleMainScripts はvirtualPathで扱うのでリネームされていてはならない
				expect(gamejson.moduleMainScripts["foo"]).toBe("node_modules/foo/bar/index.js");
				expect(fs.statSync(path.join("srcDir", "6105d/a70844aefe0a5ceb64eb.png")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "21a027/04ef22b752657e08b66f.js")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "6ed89/47acba638f0bcfc681d7.mp4")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "6ed89/47acba638f0bcfc681d7.ogg")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "dba27c31aad9/2c2/fcd/825a514c9ba0f7565c0b.js")).isFile()).toBe(true);
				done();
			})
			.catch(done.fail)
		});

		// アセットの path が重複している場合、ファイル名の衝突が発生しエラーになる
		it("hash game.json - throw error", function (done) {
			Promise.resolve()
			.then(() => ConfigurationFile.ConfigurationFile.read(path.join("./srcDir", "game.json"), undefined))
			.then((gamejson) => {
				gamejson.assets = {
					hoge: {
						type: "image",
						path: "image/hoge.png",
						global: true
					},
					hoge2: {
						type: "image",
						path: "image/hoge.png",
						global: true
					}
				};
				gamejson.globalScripts = [];
				expect(() => {Renamer.renameAssetFilenames(gamejson, "./srcDir")}).toThrow(new Error(Renamer.ERROR_FILENAME_CONFLICT));
				done();
			})
			.catch(done.fail);
		});
	});
});
