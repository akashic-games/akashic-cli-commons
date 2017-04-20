import * as fs from "fs";
import * as path from "path";
import * as browserify from "browserify";
import * as Util from "./Util";
import { Logger } from "./Logger";
import { ConsoleLogger } from "./ConsoleLogger";
import { StringStream } from "./StringStream";

export module NodeModules {
	export function listModuleFiles(basepath: string, modules: string|string[], logger?: Logger): Promise<string[]> {
		const _logger = logger || new ConsoleLogger();
		if (modules.length === 0) return Promise.resolve([]);
		return Promise.resolve()
			.then(() => NodeModules._listScriptFiles(basepath, modules, _logger))
			.then((paths) => paths.concat(NodeModules._listPackageJsonsFromScriptsPath(basepath, paths)));
	}

	export function _listPackageJsonsFromScriptsPath(basepath: string, filepaths: string[]): string[] {
		// パッケージのルートパスを取得する。filePathsにはrequireするモジュールのファイルパスが渡されるため、必ずnode_modules以下のパスが得られる
		var packageDirPaths: string[] =	filepaths.map((path) => /(.*node_modules\/(?:@.*?\/)?(?:.*?)\/)/.exec(path)[1]);
		packageDirPaths = packageDirPaths.filter((path, i, self) => self.indexOf(path) === i);

		var packageJsonPaths: string[] = [];
		packageDirPaths.forEach((dirPath: string) => {
			var packageJsonPath = Util.makeUnixPath(path.join(basepath, dirPath, "package.json"));
			try {
				if (!fs.lstatSync(packageJsonPath).isFile()) return;
				packageJsonPaths.push(Util.makeUnixPath(path.relative(basepath, packageJsonPath)));
			} catch (e) { /* nothing */ }
		});
		return packageJsonPaths;
	}

	export function _listScriptFiles(basepath: string, modules: string|string[], logger: Logger): Promise<string[]> {
		var moduleNames = (typeof modules === "string") ? [modules] : modules;

		// moduleNamesをrequireするだけのソースコード文字列を作って依存性解析の基点にする
		// (moduleNamesを直接b.require()してもよいはずだが、
		//  そうすると名前(ディレクトリ名であることが多い)が出力されてしまうので避ける)
		var dummyRootName = path.join(basepath, "__akashic-cli_dummy_require_root.js");
		var rootRequirer = moduleNames.map((name: string) => {
			return "require(\"" + Util.makeModuleNameNoVer(name) + "\");";
		}).join("\n");

		// akashicコンテンツが Node.js のコアモジュールを参照するモジュールに依存している場合、
		// akashic-cli-commons/node_modules 以下への依存として表現される。
		// これを検知した場合、そのモジュールへの依存はgame.jsonに追記せず、akashicコマンドユーザには警告を表示する。
		const ignoreModulePaths = ["/akashic-cli-commons/node_modules/"];

		var b = browserify({
			entries: new StringStream(rootRequirer, dummyRootName),
			basedir: basepath,
			builtins: true  // builtins (コアモジュール) はサポートしていないが、b.on("dep", ...) で検出するためにtrueにする
		});
		b.external("g");

		return new Promise<string[]>((resolve, reject) => {
			var filePaths: string[] = [];
			b.on("dep", (row: any) => {
				if (row.file === dummyRootName)
					return;

				var filePath = Util.makeUnixPath(path.relative(basepath, row.file));
				if (/^\.\.\//.test(filePath)) {
					const rawFilePath = Util.makeUnixPath(row.file);
					if (ignoreModulePaths.find((modulePath) => rawFilePath.includes(modulePath))) {
						const detectedModuleName = path.basename(path.dirname(filePath));

						const msg = "Reference to '" + detectedModuleName
							+ "' is detected, and Skipped to listing."
							+ " Akashic content should not depend on core module of Node.js."
							+ " Game Developers should build your game runnable without reference to '" + detectedModuleName + "'.";
						logger.warn(msg);
						return;
					}
					var msg = "Unsupported module found in " + JSON.stringify(modules)
												+ ". Skipped to listing '" + filePath
												+ "' that cannot be dealt with. (This may be a core module of Node.js)";
					reject(new Error(msg));
					return;
				}
				filePaths.push(filePath);
			});
			b.bundle((err: any) => {
				err ? reject(err) : resolve(filePaths);
			});
		});
	}
}
