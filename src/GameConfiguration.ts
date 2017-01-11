/**
 * 各アセット定義。
 * game.json の "assets" の各要素の型。
 */
export interface AssetConfiguration {
	type: string;
	path: string;
	width?: number;
	height?: number;
	systemId?: string;
	global?: boolean;
	duration?: number;
}

/**
 * AudioSystem 定義。
 * game.json の "audio" の各要素の型。
 */
export interface AudioSystemConfiguration {
	music?: boolean;
}

/**
 * アセット定義。
 * game.json の "assets" の値の型。
 */
export interface Assets {
	[key: string]: AssetConfiguration;
	mainScene?: AssetConfiguration;
}

/**
 * 操作プラグイン定義。
 */
export interface OperationPluginDeclaration {
	code: number;
	script: string;
	option?: any;
}

/**
 * game.json の型。
 */
export interface GameConfiguration {
	width: number;
	height: number;
	fps?: number;
	audio?: {[key: string]: AudioSystemConfiguration};
	assets?: Assets;
	globalScripts?: string[];
	operationPlugins?: OperationPluginDeclaration[];
}
