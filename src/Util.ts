import * as path from "path";
import * as fs from "fs";
import { sha256 } from "js-sha256";
import { GameConfiguration, OperationPluginDeclaration } from "./GameConfiguration";

export function invertMap(obj: {[key: string]: string}): {[key: string]: string[]};
export function invertMap(obj: {[key: string]: Object}, prop: string): {[key: string]: string[]};
export function invertMap(obj: {[key: string]: any}, prop?: string): {[key: string]: string[]} {
	var ret: {[key: string]: string[]} = {};
	Object.keys(obj).forEach((key: string) => {
		var v: string = prop ? obj[key][prop] : obj[key];
		(ret[v] || (ret[v] = [])).push(key);
	});
	return ret;
}

export function filterMap<S, D>(xs: S[], f: (v: S) => D): D[] {
	var result: D[] = [];
	xs.forEach((x) => {
		var mapped = f(x);
		if (mapped !== undefined)
			result.push(mapped);
	});
	return result;
}

export function makeModuleNameNoVer(name: string): string {
	var atPos = name.indexOf("@", 1); // 1 は scoped module の prefix 避け
	return (atPos !== -1) ? name.substr(0, atPos) : name;
}

/**
 * パス文字列の \ を全て / に変換する。
 */
// akashic-cli が扱う game.json 内ではパスはすべて / 区切りなので、
// 環境依存を暗黙に吸収して \ と / を使い分ける path.resolve() が使えない。
export function makeUnixPath(path: string): string {
	return path.replace(/\\/g, "/");
}

/**
 * カレントディレクトリを変更し、戻すための関数を返す。
 * @param dirpath 設定するカレントディレクトリ
 */
export function chdir(dirpath: string): (err?: any) => Promise<void> {
	var cwd = process.cwd();
	process.chdir(dirpath);
	return function (err?: any) {
		process.chdir(cwd);
		return err ? Promise.reject(err) : Promise.resolve();
	};
}

/**
 * 与えられたファイルパスのファイル名部分を、ファイルパスから計算したハッシュ値で置き換えたファイルパスを返す。
 * @param filepath 変換するファイルパス
 * @param nameLength ファイル名の文字数の最大値
 */
export function hashBasename(filepath: string, nameLength: number): string {
	const dirname = path.posix.dirname(filepath);
	const hashedFilename = sha256(filepath).slice(0, nameLength);
	const extname = path.extname(filepath);
	return path.posix.join(dirname, hashedFilename + extname);
}

/**
 * アセット・ globalScripts のファイル名をファイルパスに基づいてハッシュ化し、アセットファイル名をリネームする
 * @param content 読み込む game.json
 * @param basedir 読み込む gamejson が置かれているパス
 * @param maxHashLength ハッシュ化後のファイル名の文字数の最大値。省略された場合、20文字
 */
export function renameAssetFilenames(content: GameConfiguration, basedir: string, maxHashLength: number = 20): void {
	let resultAssets: boolean;
	let resultMain: boolean;
	let resultOperationPugins: boolean;
	let resultGlobalScripts: boolean;
	try {
		resultAssets = _renameAssets(content, basedir, maxHashLength);
		resultMain = _renameMain(content, basedir, maxHashLength);
		resultOperationPugins = _renameOperationPlugins(content, basedir, maxHashLength);
		resultGlobalScripts = _renameGlobalScripts(content, basedir, maxHashLength);
		_renameModuleMainScripts(content, basedir, maxHashLength);
	} catch (error) {
		throw error;
	}
	if (resultAssets && resultMain && resultOperationPugins && resultGlobalScripts) {
		// all rename succeeded
	} else {
		throw new Error("Use other hash-filename param.");
	}
}

/**
 * 指定されたファイルをリネームする。リネーム成功時に真を、ファイル名の衝突時に偽を返す
 * @param basedir リネームするファイルが置かれているパス
 * @param filePath リネームするファイルのパス
 * @param newFilePath リネームされたファイルのパス
 */
function _renameFilename(basedir: string, filePath: string, newFilePath: string): boolean {
	try {
		fs.accessSync(path.resolve(basedir, newFilePath));
	} catch (error) {
		if (error.code === "ENOENT") {
			fs.renameSync(path.resolve(basedir, filePath), path.resolve(basedir, newFilePath));
			return true;
		}
		throw error;
	}
	return false;
}

function _renameAssets(content: GameConfiguration, basedir: string, maxHashLength: number): boolean {
	var assetNames = Object.keys(content.assets);
	var result = true;
	assetNames.forEach((name) => {
		var filePath = content.assets[name].path;

		const hashedFilePath = hashBasename(filePath, maxHashLength);
		content.assets[name].path = hashedFilePath;
		content.assets[name].virtualPath = filePath;

		result = result && _renameFilename(basedir, filePath, hashedFilePath);
	});
	return result;
}

function _renameMain(content: GameConfiguration, basedir: string, maxHashLength: number): boolean {
	var result = true;
	if (content.main) {
		const mainPath = content.main;
		content.main = hashBasename(content.main, maxHashLength);
		result = result && _renameFilename(basedir, mainPath, content.main);
	}
	return result;
}

function _renameOperationPlugins(content: GameConfiguration, basedir: string, maxHashLength: number): boolean {
	var result = true;
	if (content.operationPlugins) {
		content.operationPlugins.forEach((plugin: OperationPluginDeclaration, idx: number) => {
			var filePath = plugin.script;
			const hashedFilePath = hashBasename(content.operationPlugins[idx].script, maxHashLength);
			content.operationPlugins[idx].script = hashedFilePath;

			result = result && _renameFilename(basedir, filePath, hashedFilePath);
		});
	}
	return result;
}

function _renameGlobalScripts(content: GameConfiguration, basedir: string, maxHashLength: number): boolean {
	var result = true;
	if (content.globalScripts) {
		content.globalScripts.forEach((name: string, idx: number) => {
			const assetname = "a_e_z_" + idx;
			const hashedFilePath = hashBasename(name, maxHashLength);
			// あとで衝突判定する
			content.assets[assetname] = {
				type: /\.json$/i.test(name) ? "text" : "script",
				virtualPath: name,
				path: hashedFilePath,
				global: true
			};
			result = result && _renameFilename(basedir, name, hashedFilePath);
		});
	}
	content.globalScripts = [];
	return result;
}

function _renameModuleMainScripts(content: GameConfiguration, basedir: string, maxHashLength: number) {
	if (content.moduleMainScripts) {
		Object.keys(content.moduleMainScripts).forEach((name: string) => {
			content.moduleMainScripts[name] = hashBasename(content.moduleMainScripts[name], maxHashLength);
			// moduleMainScripts は globalScripts として登録されているためファイルのリネームはしない
		});
	}
}
