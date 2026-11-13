# 사나이크럽 V5.5 — CHAD WIDGETS + UPDATE CENTER

V5.4 위젯 소스 기반. 기존 package `club.sanai.app`, minSdk 26, targetSdk 32, versionCode 55, WebView `file:///android_asset/index.html` 및 기존 localStorage 키 보존. 원본 V5.3 네이티브 소스는 없어 기존 APK에 맞춰 재구현한 래퍼를 사용한다. 데이터 보존 및 실제 설치는 반드시 검증한다.

## 최초 1회 설정 (GitHub Actions, PC Android Studio 불필요)
1. GitHub 계정과 전용 저장소를 준비한다. 릴리스 다운로드를 무인증으로 하려면 공개 저장소가 필요하다. 이 ZIP에는 실제 개인 운동 기록이나 서명키가 포함되지 않는다. 공개 범위는 사용자 선택이다. 비공개 저장소를 원하면 인증된 별도 다운로드 서버가 필요하며 현재 구현은 지원하지 않는다.
2. ZIP의 내용(숨김 `.github` 포함)을 저장소 루트에 넣고 기본 브랜치를 `main`으로 사용한다. 자동 빌드 결과물은 7일 뒤 삭제되며 정식 APK는 Releases에 유지된다. `.p12`, 비밀번호, 실제 백업은 절대 커밋하지 않는다.
3. 저장소 Settings → Secrets and variables → Actions → New repository secret에서 아래 값 설정. 키 백업을 로컬에서 해제하고 본인이 직접 입력한다. 비밀번호를 대화에 붙여넣지 않는다. GitHub Actions 실행 환경에서는 키가 일시적으로 복호화되므로 저장소 쓰기 권한과 워크플로 변경 권한을 신뢰하는 사람만 갖도록 한다.
   - `SANAI_KEYSTORE_B64`: 기존 `sanai-signing-key.p12`의 Base64 문자열. Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path 'sanai-signing-key.p12').Path))`
   - `SANAI_STORE_PASSWORD`: 기존 PKCS12 암호
   - `SANAI_KEY_ALIAS`: `keytool -list -storetype PKCS12 -keystore sanai-signing-key.p12`에서 표시되는 별칭. 암호는 프롬프트에 입력.
   - `SANAI_KEY_PASSWORD`: 별도 암호가 있는 경우만(기본은 store password).
4. Actions → SANAI APK release → Run workflow. GitHub 러너에서 Gradle로 빌드, 서명, V5.3 인증서 SHA-256 검사, 테스트 후 Release에 `SANAI.apk`, `update.json`, `update.sig` 게시. 무료 한도 및 사용 정책은 계정에 따라 다름.
5. 기존 앱 내 JSON 백업 후 GitHub Release에서 V5.5 APK를 받아 설치 승인. 기존 앱을 삭제하지 않는다. 패키지 및 서명이 일치해야 덮어쓰기 가능. 갤럭시 홈 화면 → 위젯 → 사나이크럽에서 4종 확인.
6. 앱 헤더의 업데이트 센터 → 업데이트 채널 설정 → `owner/repo` 입력. 이후에는 앱 시작 시 하루 1회 최신 버전 자동 확인(채널이 설정된 경우), 또는 직접 확인. 다운로드 후 Android 설치 확인은 필수. 최초 1회 출처 허용 권한이 필요할 수 있다.

## 이후 APK 변경
`app/build.gradle`의 versionCode 및 versionName을 올리고 코드 변경 후 `v5.6` 같은 main 브랜치 푸시 또는 Actions 실행. 기존 키 유지. main에 버전이 변경된 app/build.gradle이 반영되면 자동 실행하며, 이미 출시된 버전은 건너뛴다. 서명 Secrets가 미설정된 경우 빌드하지 않는다. 최초 Secrets 등록 후에는 Actions에서 직접 한 번 실행한다. 위젯, 네이티브 알림, 권한 변경은 APK 빌드 필요. 설치 파일은 현재 앱 인증서로 서명한 메타데이터, SHA-256, package ID, versionCode, APK 인증서 검증 통과 후에만 Android 설치 화면을 연다.

## OTA 웹 패치 (제한된 기능)
기존 데이터 저장 출처를 그대로 유지하도록 전체 HTML 번들 교체 대신 서명된 JavaScript/CSS 패치만 앱 페이지가 로드된 뒤 실행한다. 화면 스타일/함수/일부 기능을 변경할 수 있으나 초기화 구조 변경, 새 네이티브 기능 등은 APK로 배포해야 한다. `ota/patch.js`의 예제는 아무 동작도 하지 않는 기본 예제다. 실제 수정 시 누적형, 재실행 안전한 패치를 작성하고 로컬 저장 키를 변경하지 말 것. 외부 스크립트 로드 금지. Actions → SANAI web patch (OTA) → target native versionCode, 증가하는 revision, 설명 입력 → Run workflow. 기존 APK와 동일한 서명키로 metadata 서명 후 `ota-channel` prerelease에 배포. APK 최신 릴리스와 별개. 앱에서 웹 패치 확인 → 적용 승인. 자동 확인도 가능하지만 자동 실행 전 사용자 승인을 받는다. 복구: 업데이트 센터에서 웹 패치 제거, 또는 홈 화면 앱 아이콘 길게 누르기 → 업데이트 복구 (지원 런처). 패치 제거는 기록을 지우지 않는다. 같은 APK 버전의 이전 revision은 재적용 불가; 새 패치는 더 큰 revision 필요. 새 APK 버전은 맞지 않는 이전 패치 제거.

## 검증 및 제한
- 기존 4종 위젯 및 차드 배경 소스 보존, JS 위젯 스냅샷 테스트 통과.
- 메타데이터 서명/검증 테스트, XML/YAML/JS 구문 확인.
- Android SDK/Gradle/네트워크가 없는 현재 환경에서는 Java 컴파일, APK 제작·실기기 설치, GitHub Actions 실제 실행, OTA 실제 WebView 검증 미완료. 저장소 연결 및 최초 서명 설정 필요. 이 프로젝트는 실제 서명된 APK가 아니다.
- 공개 저장소는 코드와 릴리스가 공개되므로 원치 않으면 설정하지 말 것. 개인 기록이나 키를 공개하지 않는다. 유료 API 없음.


공식 업데이트 채널 기본값: 2645chounggs-dot/SANAI-CLUB. 최초 실행 시 별도 입력 불필요.
