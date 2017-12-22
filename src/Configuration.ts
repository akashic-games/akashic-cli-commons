import * as fs from "fs";
import * as path from "path";
import { Logger } from "./Logger";
import { ConsoleLogger } from "./ConsoleLogger";
import { GameConfiguration } from "./GameConfiguration";
import { Util } from "./index";

export interface ConfigurationParameterObject {
	content: GameConfiguration;
	logger?: Logger;
}

export class Configuration {
	_content: GameConfiguration;
	_logger: Logger;

	constructor(param: ConfigurationParameterObject) {
		this._content = param.content;
		this._logger = param.logger || new ConsoleLogger();
	}

	getContent(): GameConfiguration {
		return this._content;
	}

	vacuumGlobalScripts(): void {
		this._content.globalScripts = this._content.globalScripts.filter((filePath) => {
			try {
				fs.accessSync(filePath, fs.F_OK);
			} catch (err) {
				if (err.code === "ENOENT") {
					return false;
				} else {
					throw err;
				}
			}
			return true;
		});
	}

	/**
	 * アセット・globalScriptsのファイル名をファイルパスに基づいてハッシュ化し、アセットファイル名をリネームしたうえで game.json に反映する
	 * @param basedir 出力先のgamejsonが置かれているパス
	 * @param maxHashLength ハッシュ化後のファイル名の文字数の最大値。省略された場合、20文字
	 */
	hashFilePaths(basedir: string, maxHashLength: number = 20): void {
		var assetNames = Object.keys(this._content.assets);
		assetNames.forEach((name) => {
			var filePath = this._content.assets[name].path;

			const hashedFilePath = Util.hashBasename(filePath, maxHashLength);
			this._content.assets[name].path = hashedFilePath;
			this._content.assets[name].virtualPath = filePath;

			this._renameFilename(basedir, filePath, hashedFilePath);
		});
		if (this._content.main) {
			this._content.main = Util.hashBasename(this._content.main, maxHashLength);
		}
		if (this._content.operationPlugins) {
			this._content.operationPlugins.forEach((name, idx) => {
				var filePath = this._content.operationPlugins[idx].script;
				const hashedFilePath = Util.hashBasename(this._content.operationPlugins[idx].script, maxHashLength);
				this._content.operationPlugins[idx].script = hashedFilePath;

				this._renameFilename(basedir, filePath, hashedFilePath);
			});
		}
		if (this._content.globalScripts) {
			this._content.globalScripts.forEach((name, idx) => {
				console.log("name", name);
				const assetname = "a_e_z_" + idx;
				const hashedFilePath = Util.hashBasename(name, maxHashLength);
				// あとで衝突判定する
				this._content.assets[assetname] = {
					type: /\.json$/i.test(name) ? "text" : "script",
					virtualPath: name,
					path: hashedFilePath,
					global: true
				};
				this._renameFilename(basedir, name, hashedFilePath);
			});
		}
		this._content.globalScripts = [];
	}

	_renameFilename(basedir: string, filePath: string, hashedFilePath: string) {
		if (fs.accessSync(path.resolve(basedir, hashedFilePath))) throw new Error(hashedFilePath + " is already exists. Use other hash-filename param.");
		fs.renameSync(path.resolve(basedir, filePath), path.resolve(basedir, hashedFilePath));
	}
}
