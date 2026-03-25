# Watchtek Report

사내 업무 보고(일간/주간/월간)와 취합 확인을 위한 React + Vite 기반 웹앱입니다.

## 주요 기능

- 계획 업무(todo)와 결과 업무(done) 분리 관리
- 일간/주간/월간 단위 보고 입력 및 조회
- 유형/세부유형 기반 분류 체계
- 취합 확인(일간/주간/월간 + 업무별/개인별)
- 사용자 역할(팀장/팀원) 기반 데이터 범위 제어

## 기능 상세

### 1) 일간 보고

- 같은 날짜의 계획 업무를 선택해 결과 입력 폼 자동 채움
  - 복사 항목: 유형, 세부유형, 업무 일감 내용
- 업무 계획 작성 시 월간 계획을 상단 셀렉트에서 가져오기 지원
- 일간 현황에서 계획/결과를 분리하여 확인

### 2) 주간 보고

- 주간 업무 계획 추가
  - 공수 단위: MD 입력 (내부 저장은 MH)
  - 수행 요일: 월/화/수/목/금 체크
  - 월간 계획 가져오기 지원 (유형/세부유형/업무 내용)
- 입력 카드는 접기/펼치기 토글 제공 (기본 접힘)
- 현황은 입력 카드 하단에 배치

### 3) 월간 보고

- 월간 업무 계획 추가
  - 공수 단위: MD 입력 (내부 저장은 MH)
  - 수행 주차: 1~n주차 체크
  - 월간 계획 셀렉트로 기존 계획 재사용
- 입력 카드는 접기/펼치기 토글 제공 (기본 접힘)
- 현황은 입력 카드 하단에 배치

### 4) 계획 일정 표시 및 수정

- 계획 업무 표시 시 진행률 옆에 일정 정보 출력
  - 주간 계획: 수행 요일
  - 월간 계획: 수행 주차
- 계획 업무 수정 시 일정 정보도 함께 수정 가능
  - 주간: 요일 체크 수정
  - 월간: 주차 체크 수정

### 5) 취합 확인

- 조회 단위: 일간/주간/월간
- 그룹 기준: 업무별 확인 / 개인별 확인
- 주간/월간 취합에서 계획/결과 포함 규칙
  - 계획(todo): 해당 기간 타입만 포함 (주간은 weekly, 월간은 monthly)
  - 결과(done): 해당 기간 타입 + 일간 결과 포함
- 같은 업무 집계 규칙
  - 공수: 합계
  - 진행률: 최신 날짜 값
- 업무별 표시에서도 계획 일정(요일/주차) 정보 확인 가능

### 6) 사용자/권한 관리

- 사용자 정보 관리
  - 이름, 소속(팀), 파트, 직급, 직책(role)
  - 직책: 팀장(team-lead), 팀원(team-member)
- 조회 범위 정책
  - 일간/주간/월간: 팀장은 팀 전체, 팀원은 본인
  - 취합 확인: 팀장/팀원 모두 팀 전체

### 7) 공수 단위 정책

- 저장 단위: MH
- 표시/입력 단위
  - 일간: MH
  - 주간/월간: MD
- 변환 기준: 1MD = 8MH

## 기술 스택

- React 18
- TypeScript
- Vite
- Zustand
- Firebase Firestore
- date-fns

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm run preview
```

## 환경 변수

Firebase 연동을 위해 아래 VITE 환경 변수를 사용합니다.

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID

로컬에서는 `.env`에 설정하고, GitHub Actions에서는 Repository Secrets로 설정합니다.

## 배포 (GitHub Pages, GitHub Actions)

main 브랜치 푸시 시 GitHub Actions가 자동으로 빌드 후 Pages 배포를 수행합니다.

- 워크플로: `.github/workflows/deploy.yml`
- Pages 설정: Repository Settings > Pages > Source = GitHub Actions

## 프로젝트 구조

```text
src/
  components/      # 공통 UI 컴포넌트
  pages/           # 화면 단위 페이지
  store/           # Zustand 상태 관리
  lib/             # Firebase 설정
```
