import * as path from "path";
import * as fs from "fs";
import * as fsx from "fs-extra";
import { sha256 } from "js-sha256";
import { GameConfiguration } from "./GameConfiguration";

export const ERROR_FILENAME_CONFLICT = "ERROR_FILENAME_CONFLICT";

/**
 * 与えられたファイルパスのファイル名部分を、ファイルパスから計算したハッシュ値で置き換えたファイルパスを返す
 * @param filepath 変換するファイルパス
 * @param nameLength ファイル名の文字数の最大値
 */
export function hashFilepath(filepath: string, nameLength: number): string {
	const hashedFilename = sha256(filepath).slice(0, nameLength);
	const extname = path.extname(filepath);

	return path.posix.join("files", hashedFilename + extname);
}

/**
 * アセット・ globalScripts のファイル名をファイルパスに基づいてハッシュ化し、アセットファイル名をリネームする
 * @param content 読み込む game.json
 * @param basedir 読み込む gamejson が置かれているパス
 * @param maxHashLength ハッシュ化後のファイル名の文字数の最大値。省略された場合、20文字
 */
export function renameAssetFilenames(content: GameConfiguration, basedir: string, maxHashLength: number = 20): void {
	_renameAssets(content, basedir, maxHashLength);
	_renameGlobalScripts(content, basedir, maxHashLength);
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
			fsx.mkdirsSync(path.dirname(path.resolve(basedir, newFilePath)));
			fs.renameSync(path.resolve(basedir, filePath), path.resolve(basedir, newFilePath));
			return;
		}
		throw error;
	}
	throw new Error(ERROR_FILENAME_CONFLICT);
}

function _renameAudioFilename(basedir: string, filePath: string, newFilePath: string): void {
	const extTypes = [".ogg", ".aac", ".mp4"];
	extTypes.forEach((ext) => {
		try {
			fs.accessSync(path.resolve(basedir, filePath + ext));
			_renameFilename(basedir, filePath + ext, newFilePath + ext);
		} catch (error) {
			if (error.code === "ENOENT") return; // 全てのオーディオ拡張子が揃っているとは限らない
			throw error;
		}
	});
}

function _renameAssets(content: GameConfiguration, basedir: string, maxHashLength: number): void {
	const assetNames = Object.keys(content.assets);
	const assetDirs: string[] = [];
	assetNames.forEach((name) => {
		const filePath = content.assets[name].path;
		assetDirs.push(path.dirname(filePath));
		const hashedFilePath = hashFilepath(filePath, maxHashLength);
		content.assets[name].path = hashedFilePath;
		content.assets[name].virtualPath = filePath;
		if (content.assets[name].type !== "audio") {
			_renameFilename(basedir, filePath, hashedFilePath);
		} else {
			_renameAudioFilename(basedir, filePath, hashedFilePath);
		}
	});
	// パス文字列長でソートすることで、空ディレクトリしかないツリーでも末端から削除できるようにする
	assetDirs.sort((a, b) => {
		if (a.length < b.length) return 1;
		if (a.length > b.length) return -1;
		return 0;
	});
	console.log("assetDirs", assetDirs);
	assetDirs.forEach((dirpath) => {
		const dirFullPath = path.resolve(basedir, dirpath);
		try {
			fs.accessSync(dirFullPath);
			const files = fs.readdirSync(dirFullPath);
			console.log(dirFullPath, ":", files);
			if (files.length === 0) fs.rmdirSync(dirFullPath);
		} catch (err) {
			// do nothing
		}
	});
}

function _renameGlobalScripts(content: GameConfiguration, basedir: string, maxHashLength: number): void {
	if (content.globalScripts) {
		const assetDirs = fs.readdirSync(path.resolve(basedir, "node_modules")).map((filepath) => path.join("node_modules", filepath));
		assetDirs.push("node_modules");

		content.globalScripts.forEach((name: string, idx: number) => {
			assetDirs.push(path.dirname(name));
			const assetname = "a_e_z_" + idx;
			const hashedFilePath = hashFilepath(name, maxHashLength);
			content.assets[assetname] = {
				type: /\.json$/i.test(name) ? "text" : "script",
				virtualPath: name,
				path: hashedFilePath,
				global: true
			};
			_renameFilename(basedir, name, hashedFilePath);
		});
		// パス文字列長でソートすることで、空ディレクトリしかないツリーでも末端から削除できるようにする
		assetDirs.sort((a, b) => {
			if (a.length < b.length) return 1;
			if (a.length > b.length) return -1;
			return 0;
		});
		console.log("assetDirs", assetDirs);
		assetDirs.forEach((dirpath) => {
			const dirFullPath = path.resolve(basedir, dirpath);
			try {
				fs.accessSync(dirFullPath);
				const files = fs.readdirSync(dirFullPath);
				console.log(dirFullPath, ":", files);
				if (files.length === 0) fs.rmdirSync(dirFullPath);
			} catch (err) {
				// do nothing
				console.log("dir", dirFullPath);
				console.log("err", err);
			}
		});
	}
	content.globalScripts = [];
}
