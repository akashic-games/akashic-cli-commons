var path = require("path");
var mockfs = require("mock-fs");
var fs = require("fs");
var Util = require("../lib/Util");
var Renamer = require("../lib/Renamer");
var ConfigurationFile = require("../lib/ConfigurationFile");
var GameConfiguration = require("../lib/GameConfiguration");

describe("Renamer", function () {
	it(".hashBasename()", function () {
		var arr = ["script/mainScene.js", "node_modules/foo/bar/index.js", "image/hoge.png"];
		expect(arr.map((v) => Util.makeUnixPath(Renamer.hashBasename(v)))).toEqual([
			"script/04ef22b752657e08b66fe185c9f9592944afe6ab0ba51380f04d33f42d6a409c.js",
			"node_modules/foo/bar/825a514c9ba0f7565c0bc4415451ee2350476c9c18abf970a98cdd62113617ce.js",
			"image/a70844aefe0a5ceb64eb6b4ed23be19ab98eed26a43059802cd6a2b51e066e21.png"
		]);
		expect(arr.map((v) => Renamer.hashBasename(v, 5))).toEqual([
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

				expect(gamejson.main).toBe("script/04ef22b752657e08b66f.js");
				expect(gamejson.assets["hoge"]).toEqual({
					type: "image",
					path: "image/a70844aefe0a5ceb64eb.png",
					virtualPath: "image/hoge.png",
					global: true
				});
				expect(gamejson.assets["foo"]).toEqual({
					type: "audio",
					path: "audio/47acba638f0bcfc681d7",
					virtualPath: "audio/foo",
					global: true
				});
				// globalScripts は scriptAsset に変換される
				expect(gamejson.assets["a_e_z_0"]).toEqual({
					type: "script",
					path: "node_modules/foo/bar/825a514c9ba0f7565c0b.js",
					virtualPath: "node_modules/foo/bar/index.js",
					global: true
				});
				expect(gamejson.moduleMainScripts["foo"]).toBe(Renamer.hashBasename("node_modules/foo/bar/index.js", 20));
				expect(fs.statSync(path.join("srcDir", "image/a70844aefe0a5ceb64eb.png")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "script/04ef22b752657e08b66f.js")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "audio/47acba638f0bcfc681d7.mp4")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "audio/47acba638f0bcfc681d7.ogg")).isFile()).toBe(true);
				expect(fs.statSync(path.join("srcDir", "node_modules/foo/bar/825a514c9ba0f7565c0b.js")).isFile()).toBe(true);
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
