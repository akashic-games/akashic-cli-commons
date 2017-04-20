import * as fs from "fs";
import * as path from "path";
import * as browserify from "browserify";
import * as Util from "./Util";
import { StringStream } from "./StringStream";

export module NodeModules {
	export function listModuleFiles(basepath: string, modules: string|string[]): Promise<string[]> {
		if (modules.length === 0) return Promise.resolve([]);
		return Promise.resolve()
			.then(() => NodeModules._listScriptFiles(basepath, modules))
			.then((paths) => paths.concat(NodeModules._listPackageJsonsFromScriptsPath(basepath, paths)));
	}

	export function _listPackageJsonsFromScriptsPath(basepath: string, filepaths: string[]): string[] {
		var packageDirPaths: string[] =	filepaths.map((path) => {
			var m = /(.*node_modules\/(?:@.*?\/)?(?:.*?)\/)/.exec(path);
			return m && m[1];
		});

		var packageJsonPaths: string[] = [];
		var alreadyProcessed: { [path: string]: boolean } = {};
		packageDirPaths.forEach((dirPath: string) => {
			if (!dirPath || alreadyProcessed[dirPath])
				return;
			alreadyProcessed[dirPath] = true;

			var packageJsonPath = Util.makeUnixPath(path.join(basepath, dirPath, "package.json"));
			try {
				if (!fs.lstatSync(packageJsonPath).isFile()) return;
				packageJsonPaths.push(Util.makeUnixPath(path.relative(basepath, packageJsonPath)));
			} catch (e) { /* nothing */ }
		});
		return packageJsonPaths;
	}

	export function _listScriptFiles(basepath: string, modules: string|string[]): Promise<string[]> {
		var moduleNames = (typeof modules === "string") ? [modules] : modules;

		// moduleNamesをrequireするだけのソースコード文字列を作って依存性解析の基点にする
		// (moduleNamesを直接b.require()してもよいはずだが、そうするとモジュールのエントリポイントの代わりに
		// モジュールの名前(ディレクトリ名であることが多い)が出力されてしまうので避ける)
		var dummyRootName = path.join(basepath, "__akashic-cli_dummy_require_root.js");
		var rootRequirer = moduleNames.map((name: string) => {
			return "require(\"" + Util.makeModuleNameNoVer(name) + "\");";
		}).join("\n");
		var b = browserify({
			entries: new StringStream(rootRequirer, dummyRootName),
			basedir: basepath,
			builtins: true  // builtins (コアモジュール) はサポートしていないが、b.on("dep", ...) で検出するためにtrueにする
		});
		b.external("g");

		return new Promise<string[]>((resolve, reject) => {
			var filePaths: string[] = [];
			b.on("dep", (row: any) => {
				var filePath = Util.makeUnixPath(path.relative(basepath, row.file));
				if (!(/^(?:\.\/)?node_modules/.test(filePath))) {
					return;
				}
				if (/^\.\.\//.test(filePath)) {
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
