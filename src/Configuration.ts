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
	 * アセットのファイル名をファイルパスに基づいてハッシュ化し、アセットファイル名をリネームしたうえで game.json に反映する
	 * @param hashLength ハッシュ化後のファイル名の文字数の最大値。省略された場合、20文字
	 * @param dest 出力先のgamejsonが置かれているパス
	 */
	hashingAssetNames(hashLength: number = 20, dest: string): void {
		var assetNames = Object.keys(this._content.assets);
		assetNames.forEach((name) => {
			var filePath = this._content.assets[name].path;

			const hashedFilePath = Util.hashingBasenameInPath(filePath, hashLength);
			this._content.assets[name].path = hashedFilePath;
			this._content.assets[name].virtualPath = filePath;
			fs.renameSync(path.resolve(dest, filePath), path.resolve(dest, hashedFilePath));
		});
		if (this._content.main) {
			this._content.main = Util.hashingBasenameInPath(this._content.main, hashLength);
		}
	}
}
