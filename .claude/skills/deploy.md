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
