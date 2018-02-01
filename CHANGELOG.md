# CHANGELOG

## 0.2.7
* `Renamer#renameAssetFilenames()` がオーディオアセットを正常に変換できない問題を解決

## 0.2.6
* `Renamer` を追加

## 0.2.5
* version 0.2.4 が正しくパブリッシュ出来ていなかったのを修正

## 0.2.4
* `NodeModules#listModuleMainScripts()` を追加

## 0.2.3
* `NodeModules#_listPackageJsonsFromScriptsPath()` を `NodeModules#listPackageJsonsFromScriptsPath()` に変更
* `NodeModules#_listScriptFiles()` を `NodeModules#listScriptFiles()` に変更
* `GameConfiguration#ModuleMainScripts` を追加

## 0.2.2

* game.json に environment メンバを追加

## 0.2.1
* `NodeModules#listModuleFiles()` がモジュール名だけでなくファイル名を受け付けられるように
* `NodeModules#listModuleFiles()` がコアモジュールを検出した時、エラーでなく警告するように

## 0.2.0
* Npmモジュールへの依存をやめ、execを利用
* Node.js 7 対応

## 0.1.3
* 初期リリース
