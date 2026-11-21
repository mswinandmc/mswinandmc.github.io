# 部署到 GitHub Pages

本目录是纯静态站点，没有构建步骤；所有资源都用相对路径，放在 `/<仓库名>/` 子路径下也能正常工作。

## 1. 创建仓库

打开 https://github.com/new?name=arcaea-ptt&visibility=public ，不要勾选 README / .gitignore / license，点 Create repository。

## 2. 推送

本目录已经初始化好 git 并提交过一次，只需添加远端并推送：

    cd D:\hyw\arcaea-ptt
    git remote add origin https://github.com/mswinandmc/arcaea-ptt.git
    git push -u origin main

以后改完页面：

    git add -A
    git commit -m "update"
    git push

## 3. 打开 Pages

仓库页 → Settings → Pages → Build and deployment：

- Source: **Deploy from a branch**
- Branch: **main**，Folder: **/ (root)**
- Save

等 1–2 分钟，访问：

    https://mswinandmc.github.io/arcaea-ptt/

## 说明

- `tests/`、`README.md`、`preview.png` 也会被公开；如果不想公开，可以改成只发布站点文件的 GitHub Actions workflow，或把它们移出发布目录。
- `.nojekyll` 已创建，跳过 Jekyll 处理，避免下划线开头的文件被忽略。
- 分享参数 `?score=9950000&diff=10.5&clear=1` 在 Pages 上同样有效。
- 若推送时提示输入密码，请用 GitHub Personal Access Token 代替密码（或先配置 Git Credential Manager）。
