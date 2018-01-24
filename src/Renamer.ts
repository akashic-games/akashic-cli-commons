import * as path from "path";
import * as fs from "fs";
import { sha256 } from "js-sha256";
import { GameConfiguration } from "./GameConfiguration";

export const ERROR_FILENAME_CONFLICT = "ERROR_FILENAME_CONFLICT";

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
	_renameAssets(content, basedir, maxHashLength);
	_renameMain(content, basedir, maxHashLength);
	// _renameOperationPlugins(content, basedir, maxHashLength);
	_renameGlobalScripts(content, basedir, maxHashLength);
	_renameModuleMainScripts(content, basedir, maxHashLength);
}

/**
 * 指定されたファイルをリネームする
 * @param basedir リネームするファイルが置かれているパス
 * @param filePath リネームするファイルのパス
 * @param newFilePath リネームされたファイルのパス
 */
function _renameFilename(basedir: string, filePath: string, newFilePath: string): void {
	try {
		fs.accessSync(path.resolve(basedir, newFilePath));
	} catch (error) {
		if (error.code === "ENOENT") {
			fs.renameSync(path.resolve(basedir, filePath), path.resolve(basedir, newFilePath));
			return;
		}
		throw error;
	}
	throw new Error(ERROR_FILENAME_CONFLICT);
}

function _renameAssets(content: GameConfiguration, basedir: string, maxHashLength: number): void {
	const assetNames = Object.keys(content.assets);
	assetNames.forEach((name) => {
		const filePath = content.assets[name].path;
		const hashedFilePath = hashBasename(filePath, maxHashLength);
		content.assets[name].path = hashedFilePath;
		content.assets[name].virtualPath = filePath;
		_renameFilename(basedir, filePath, hashedFilePath);
	});
}

function _renameMain(content: GameConfiguration, basedir: string, maxHashLength: number): void {
	if (content.main) {
		const mainPath = content.main;
		content.main = hashBasename(content.main, maxHashLength);
		_renameFilename(basedir, mainPath, content.main);
	}
}

function _renameGlobalScripts(content: GameConfiguration, basedir: string, maxHashLength: number): void {
	if (content.globalScripts) {
		content.globalScripts.forEach((name: string, idx: number) => {
			const assetname = "a_e_z_" + idx;
			const hashedFilePath = hashBasename(name, maxHashLength);
			content.assets[assetname] = {
				type: /\.json$/i.test(name) ? "text" : "script",
				virtualPath: name,
				path: hashedFilePath,
				global: true
			};
			_renameFilename(basedir, name, hashedFilePath);
		});
	}
	content.globalScripts = [];
}

function _renameModuleMainScripts(content: GameConfiguration, basedir: string, maxHashLength: number) {
	if (content.moduleMainScripts) {
		Object.keys(content.moduleMainScripts).forEach((name: string) => {
			content.moduleMainScripts[name] = hashBasename(content.moduleMainScripts[name], maxHashLength);
			// moduleMainScripts は globalScripts として登録されているためファイルのリネームはしない
		});
	}
}
