# Skill: Deploy Pipeline

## Flow
```
git push main
→ GitHub Actions: npm install + webpack build → dist/
→ Thêm package.json + wrangler.toml vào dist/ bằng echo commands
→ peaceiris/actions-gh-pages push dist/ → gh-pages branch
→ Cloudflare Pages watch gh-pages → wrangler deploy
```

## URLs
- **Live**: https://survival-game-2d.loutrinh2312000.workers.dev
- **Repo**: https://github.com/Lou-trinh/Game-2D
- **Config**: `.github/workflows/deploy.yml`

## Quan trọng
- **git push**: luôn dùng **PowerShell tool** (Bash tool hang vô tận trên Windows do credential popup)
- **YAML heredoc bug**: `cat << 'EOF'` trong `run: |` bị YAML indentation thêm spaces trước EOF terminator → dùng `echo` commands thay thế
- dist/ cần có `package.json` — nếu thiếu sẽ lỗi `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`

## Lệnh push
```powershell
# Dùng PowerShell tool, không dùng Bash tool
git add -A
git commit -m "message"
git push origin main
```

## Webpack build config

**Entry point duy nhất**: `./js/survival-game.js` → `dist/js/app.js`

**6 Firebase env vars** inject qua `webpack.DefinePlugin` (từ `.env` local hoặc Cloudflare build env):
```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
```
Thiếu 1 trong 6 → Firebase init fail **silently** (không có error rõ ràng).

**Dev server COOP header** (critical cho Google login popup ở localhost):
```
Cross-Origin-Opener-Policy: same-origin-allow-popups
```
Thiếu header này → Google popup bị block trên localhost.

**CopyPlugin** (prod only): copy `assets/`, `css/`, icons vào `dist/`.
Nếu thêm asset folder mới → phải thêm pattern vào `CopyPlugin` trong `webpack.config.prod.js`.
