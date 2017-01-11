import * as npm from "npm";
import { Logger } from "./Logger";
import { ConsoleLogger } from "./ConsoleLogger";

export interface PromisedNpmParameterObject {
	logger?: Logger;
	npm?: any;
}

export interface NpmLsRsultObject {
	dependencies?: {[key: string]: NpmLsRsultObject};
}

export class PromisedNpm {
	_logger: Logger;
	private _npm: NPM.Static;

	constructor(param: PromisedNpmParameterObject) {
		this._npm = param.npm || npm;
		this._logger = param.logger || new ConsoleLogger();
	}

	install(moduleNames: string[] = []): Promise<void> {
		return this._load()
			.then(() => new Promise<void>((resolve, reject) => {
				this._logger.info("Installing " + moduleNames + "...");
				this._npm.commands.install(moduleNames, (err: any) => {
					err ? reject(err) : resolve();
				});
			}));
	}

	link(moduleNames: string[] = []): Promise<void> {
		return this._load()
			.then(() => new Promise<void>((resolve, reject) => {
				this._logger.info("Linking " + moduleNames + "...");
				this._npm.commands.link(moduleNames, (err: any) => {
					err ? reject(err) : resolve();
				});
			}));
	}

	uninstall(moduleNames: string[] = []): Promise<void> {
		return this._load()
			.then(() => new Promise<void>((resolve, reject) => {
				this._logger.info("Uninstalling " + moduleNames + "...");
				this._npm.commands.uninstall(moduleNames, (err: any) => {
					err ? reject(err) : resolve();
				});
			}));
	}

	unlink(moduleNames: string[] = []): Promise<void> {
		return this._load()
			.then(() => new Promise<void>((resolve, reject) => {
				this._logger.info("Unlinking " + moduleNames + "...");
				this._npm.commands.unlink(moduleNames, (err: any) => {
					err ? reject(err) : resolve();
				});
			}));
	}

	shrinkwrap(): Promise<void> {
		return this._load()
			.then(() => new Promise<void>((resolve, reject) => {
				this._logger.info("Shrinkwrapping...");
				this._npm.commands.shrinkwrap([], (err: any) => {
					if (err) {
						reject(err);
					} else {
						this._logger.info("Added npm-shrinkwrap.json");
						resolve();
					}
				});
			}));
	}

	ls(silent: boolean = false): Promise<NpmLsRsultObject> {
		return this._load()
			.then(() => new Promise<NpmLsRsultObject>((resolve, reject) => {
				this._logger.info("Listing dependencies ...");
				this._npm.commands.ls(undefined, silent, (err: any, data: NpmLsRsultObject) => {
					err ? reject(err) : resolve(data);
				});
			}));
	}

	setConfig(name: string, value: string): Promise<void> {
		return this._load()
			.then(() => new Promise<void>((resolve, reject) => {
				this._npm.config.set(name, value);
				resolve();
			}));
	}

	_load(): Promise<void> {
		if (this._npm.config.loaded)
			return Promise.resolve();
		return new Promise<void>((resolve, reject) => {
			this._npm.load({ save: true }, (err: any) => {
				if (err)
					return void reject(err);
				resolve();
			});
		});
	}

	update(moduleNames?: string[]): Promise<void> {
		return this._load()
			.then(() => new Promise<void>((resolve, reject) => {
				this._logger.info("Update dependencies ...");
				this._npm.commands.update(moduleNames, (err: any) => {
					err ? reject(err) : resolve();
				});
			}));
	}

}
