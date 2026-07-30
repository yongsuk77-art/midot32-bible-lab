# 미도트 32 성경 연구소

사용자가 붙여넣은 성경 본문을 랍비 엘리에제르에게 전승되는 32가지 해석 규칙으로 검토하고, 복음주의적 신학 정리·설교 적용·최종 종합 해석까지 생성하는 모바일 우선 웹 앱입니다.

## 주요 기능

- 본문 문맥, 구조, 핵심 원어의 신중한 관찰
- 32개 미도트 각각의 적용 강도 `◎ / ○ / △ / —` 판정
- 본문의 1차 의미와 복음주의적 정경 해석의 구분
- 설교에서 피할 오해, 오늘의 적용 질문, 3대지 설교 개요
- 결과 전체 복사, Markdown 다운로드, 인쇄/PDF 저장
- 브라우저 로컬 연구 기록(최대 8개)
- 휴대폰·태블릿·데스크톱 반응형 UI
- 접근 키, 요청 크기 제한, 보안 헤더, 프롬프트 인젝션 방어

## 구조

```text
src/                 React 사용자 화면
worker/              Cloudflare Worker API와 AI 프롬프트
scripts/             Vite 결과물을 Worker에 묶는 빌드 스크립트
tests/               요청 검증·프롬프트·보안 헬퍼 테스트
wrangler.jsonc       Cloudflare Workers 설정
```

Cloudflare Worker 하나가 정적 앱과 `/api/research` API를 함께 제공합니다. AI 연구는 Workers AI의 다국어 장문 모델 `@cf/zai-org/glm-4.7-flash`를 사용합니다.

## 로컬 실행

Node.js 22 이상을 권장합니다.

```bash
npm install
npm run dev
```

Vite 개발 서버에서는 화면을 확인할 수 있습니다. 실제 AI API까지 로컬에서 시험하려면 `.dev.vars.example`을 `.dev.vars`로 복사하고 접근 키를 설정한 뒤, `npm run build` 후 `npx wrangler dev`를 사용하세요. Workers AI 원격 호출에는 Cloudflare 로그인이 필요할 수 있습니다.

## 품질 검사와 빌드

```bash
npm run check
```

이 명령은 TypeScript 검사, 단위 테스트, 웹 빌드와 Worker 번들을 차례로 실행합니다.

## 배포

먼저 공개 AI 사용량을 보호할 긴 임의의 키를 등록합니다.

```bash
npx wrangler secret put APP_ACCESS_KEY
npm run deploy
```

`AI` 바인딩과 관측성은 `wrangler.jsonc`에 선언되어 있습니다. 접근 키나 다른 비밀값은 저장소에 커밋하지 마세요.

## 해석상 안전장치

이 앱은 미도트를 모든 본문에 억지로 끼워 맞추지 않습니다. 각 규칙을 독립적으로 판정하고, 적용이 어려운 규칙은 `— 보류`로 표시하도록 프롬프트가 설계되어 있습니다. 또한 구약의 역사적 의미와 신약 이후의 기독교 정경적 종합을 구분하며, 확인하지 못한 원어·사본·고전 문헌·URL을 만들어내지 않도록 지시합니다.

AI 결과는 연구 초안입니다. 설교·출판 전에는 원문, 신뢰할 수 있는 주석과 고전 자료를 직접 대조해야 합니다.

## 라이선스

MIT
