#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="${EDGEONE_PROJECT_NAME:-nuonuo-language-island}"
TARGET_ENV="${EDGEONE_ENV:-production}"
ACCOUNT_SITE="${EDGEONE_SITE:-china}"
ACCELERATION_AREA="${EDGEONE_AREA:-overseas}"
MODE="dry-run"

usage() {
  cat <<'HELP'
用法：bash scripts/deploy-edgeone.sh [选项]

  --project NAME       EdgeOne 项目名（默认 nuonuo-language-island）
  --env production|preview  部署环境（默认 production）
  --site china|global  腾讯云账号站点（默认 china）
  --area overseas|global 加速区域（默认overseas，不含中国大陆）
  --dry-run            本地检查，打印部署方案，不上传（默认）
  --publish            使用已登录的官方 EdgeOne CLI 实际上传
  -h, --help           显示说明

首次使用：npm ci，然后 npx --no-install edgeone login，选择 China。
控制台中选择免费版和“直接上传”项目。未备案域名请选择
“全球可用区（不含中国大陆）”，并绑定自定义域名和 HTTPS。
HELP
}
die(){ printf '%s\n' "错误：$*" >&2; exit 1; }
while (($#)); do
  case "$1" in
    --project|--env|--site|--area)
      (($#>=2))||die "$1 缺少参数"
      case "$1" in --project) PROJECT="$2";; --env) TARGET_ENV="$2";; --site) ACCOUNT_SITE="$2";; --area) ACCELERATION_AREA="$2";; esac
      shift 2;;
    --publish) MODE="publish"; shift;;
    --dry-run) MODE="dry-run"; shift;;
    -h|--help) usage; exit 0;;
    *) die "未知参数：$1。用 --help 查看用法。";;
  esac
done
[[ "$PROJECT" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]||die '项目名只允许小写字母、数字和中间的连字符'
((${#PROJECT}<=63))||die '项目名过长'
[[ "$TARGET_ENV" == production || "$TARGET_ENV" == preview ]]||die '--env 必须为 production 或 preview'
[[ "$ACCOUNT_SITE" == china || "$ACCOUNT_SITE" == global ]]||die '--site 必须为 china 或 global'
[[ "$ACCELERATION_AREA" == overseas || "$ACCELERATION_AREA" == global ]]||die '--area 必须为 overseas 或 global'
command -v node >/dev/null 2>&1||die '需要 Node.js，请先安装当前受支持的 LTS 版本'

cd "$ROOT_DIR"
node --check dist/assets/app.js
node --check dist/assets/data.js
node --check dist/assets/bank.js
node scripts/check.mjs

STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/nuonuo-edgeone.XXXXXX")"
trap 'rm -rf -- "$STAGE_DIR"' EXIT
node scripts/prepare-site.mjs "$STAGE_DIR"
printf '\n项目：%s\n环境：%s\n账号站点：%s\n' "$PROJECT" "$TARGET_ENV" "$ACCOUNT_SITE"
printf '加速区域：%s\n' "$ACCELERATION_AREA"

if [[ "$MODE" == dry-run ]]; then
  printf '\n%s\n' '本次为本地检查，没有上传。正式命令形态（Token仅从环境传入，不打印）：'
  printf 'edgeone makers deploy <已筛选的临时目录> -n %q -e %q --area %q --skip-ai-gateway-sync\n' "$PROJECT" "$TARGET_ENV" "$ACCELERATION_AREA"
  printf '%s\n' '确认项目和区域后，加 --publish 执行上传。'
  exit 0
fi

CLI="$ROOT_DIR/node_modules/.bin/edgeone"
[[ -x "$CLI" ]]||die '先执行npm ci安装锁定版本的官方EdgeOne CLI'
if [[ "${CI:-}" == true && -z "${EDGEONE_API_TOKEN:-}" ]]; then
  die 'CI部署需要GitHub Secret EDGEONE_API_TOKEN'
fi
# Prefer the Makers namespace; Pages is retained only for CLI compatibility.
CLI_NAMESPACE=""
for candidate in makers pages; do
  if CLI_HELP="$("$CLI" "$candidate" deploy --help 2>/dev/null)" && [[ "$CLI_HELP" == *'--area'* && "$CLI_HELP" == *'--skip-ai-gateway-sync'* ]]; then
    CLI_NAMESPACE="$candidate"; break
  fi
done
[[ -n "$CLI_NAMESPACE" ]]||die '已安装的CLI缺少所需部署参数，请检查锁定版本'
printf '\n%s\n' '将把训练网页上传至你已登录的腾讯云 EdgeOne 项目。'
printf '%s\n' '这不会上传本机试卷、分析报告或浏览器中的练习记录。'
DEPLOY_ARGS=("$CLI_NAMESPACE" deploy "$STAGE_DIR" -n "$PROJECT" -e "$TARGET_ENV" --area "$ACCELERATION_AREA" --skip-ai-gateway-sync)
# These environment variables are supported by the pinned official CLI. Tokens
# stay out of shell history, argv, the staged website and deployment logs.
export EDGEONE_PAGES_API_REGION="$ACCOUNT_SITE"
if [[ -n "${EDGEONE_API_TOKEN:-}" ]]; then export EDGEONE_PAGES_API_TOKEN="$EDGEONE_API_TOKEN"; fi
cd "$STAGE_DIR"
"$CLI" "${DEPLOY_ARGS[@]}"
printf '\n%s\n' '部署命令已完成。请以 CLI 返回的部署状态/控制台为准，并使用绑定的自定义域名验收。'
printf '%s\n' '若只拿到预览链接，它可能有时效或访问地区限制，不要当成长期地址。'
