# 发布清单（维护者用）

这份文件不会随 tarball 发布，只用于把仓库整理成可公开的状态。

## 1. 仓库信息

- GitHub 用户名 `skyrocks` 已写入 `README.md` / `README.en.md` / `package.json`。
- 包名：`@skyrocks/dsh-go-model-limits`
- 仓库名：`dsh-go-model-limits`
- 插件行 id：`go-model-limits`
- 版本：`0.1.0`

## 2. 发布前检查

```sh
node test/smoke.mjs         # 解析 / 映射 / 组件 / 自包含
node test/manifest.mjs      # 入口、files、manifest、generated 区块
node --check client.js      # 浏览器 bundle 语法
npm run check               # 线上文档额度与内嵌数据是否一致（需要网络）
grep -rn "YOUR_GITHUB_NAME\|TODO" README.md README.en.md package.json
```

最后一条应无输出。

确认图片存在：

```sh
ls -l docs/preview-menu.png docs/preview-tooltip.png
```

## 3. 上传

仓库根目录是 **本目录的内容**（`package.json` 与 `cordis.patch.yml` 在根），
不要把外层父目录一起上传，否则 `github:skyrocks/dsh-go-model-limits` 安装会找不到插件清单。

```sh
git remote add origin git@github.com:skyrocks/dsh-go-model-limits.git
git push -u origin main
git push origin v0.1.0
```

如果机器上没登录过 GitHub CLI：

```sh
gh auth login
gh repo create skyrocks/dsh-go-model-limits --public --source=. --remote=origin --push
git push origin v0.1.0
```

## 4. Release

```sh
npm pack                    # 生成 skyrocks-dsh-go-model-limits-0.1.0.tgz
gh release create v0.1.0 ./skyrocks-dsh-go-model-limits-0.1.0.tgz \
  --title "v0.1.0" --generate-notes
```

也可以在网页上创建 Release，正文直接用 `CHANGELOG.md` 的对应段落。

## 5. 发布前检查表

- [x] `node test/smoke.mjs` 通过（10 项）
- [x] `node test/manifest.mjs` 通过
- [x] `node --check client.js` 通过
- [x] `npm run check` 与线上数据一致
- [x] README 预览图已生成 PNG（`docs/preview-*.png`）
- [x] `grep -n "YOUR_GITHUB_NAME" README.md README.en.md package.json` 无输出
- [ ] CI 在 Ubuntu / macOS / Windows 上全绿（推送后自动跑）
- [ ] 安装路径实测：粘贴 `github:skyrocks/dsh-go-model-limits` 后完全退出重启
- [ ] Release 附件与 `package.json` 版本一致

## 6. 可选：发布到 npm

```sh
npm login
npm publish --access public
```

确认 `@skyrocks` scope 有发布权限，且 npm 上不存在同名包。
