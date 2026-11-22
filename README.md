# 사나이크럽 V6.4.6 — Plus 구독 없이 식단 기록

**최우선: 기존 기록 보존.** 기존 Android applicationId, 서명키, `ironlog.v5.nutrition` localStorage 및 운동 기록 키를 변경하지 않는다. 설치된 앱을 삭제하거나 데이터를 초기화하지 말고, 최신 APK를 기존 앱 위에 업데이트한다.

## 무료 식단 빠른 입력 (앱 자체 기능)

- 영양 보급소 → **무료 식단 빠른 입력**: 인터넷·ChatGPT Plus·MCP·별도 API 키 없이 작동. 내장 식품 DB의 음식 검색/수량 파싱/탄단지 계산으로 기존 식단 기록에 **추가**한다.
- 예시 입력: `점심 닭가슴살 200g, 모짜렐라 치즈 50g`
- ChatGPT 무료 플랜에서 영양을 계산했다면 각 음식을 한 줄씩 `점심|닭가슴살 200g|330|62|0|7.2` 형식(끼니|음식명·양|총 kcal|단백질g|탄수화물g|지방g)으로 복사해 붙여넣는다. 이 수치는 **사용자가 먹은 총량 기준**이며 앱에서 다시 곱하지 않는다.
- **미리보기 → 확인 후 한 번에 저장**: 알 수 없는 음식, 음수, 잘못된 형식, 과도한 수량은 오류로 표시하고 해당 묶음 전체 저장을 막는다. 추정치/외부 수치는 출처를 보여준다. 저장 성공 여부가 확인되기 전에는 기록 완료라고 표시하지 않는다.
- 기존 보급소 검색·즐겨찾기·직접 등록·프로틴 단축 기록, 기존 ChatGPT 암호화 수신 기능과 병행한다. 기존 기록을 마이그레이션하거나 삭제하지 않는다.
- **제약:** 자연어 입력은 완전한 생성형 AI가 아니라 내장 DB 매칭이다. 모르는 음식은 기존 검색·직접 등록을 사용한다. ChatGPT에서 앱으로 직접 쓰는 플러그인 기능이 무료 플랜에서도 작동하는지는 플랜/앱 권한에 따라 달라진다. 이 기능은 플러그인이 불가할 때의 **복사/붙여넣기 대안**이며 자동 채팅 연동이라고 주장하지 않는다.
- V6.4.6은 `versionCode 73`이므로 APK 업데이트 필요. V6.4.4(71) 기기는 서명된 OTA r5 적용 시 이 UI를 받을 수 있다. V6.4.5(72)는 이 OTA 대상이 아니므로 V6.4.6 APK로 업데이트해야 한다. OTA 적용/실기기 데이터 유지 여부는 기기에서 따로 검증해야 한다.

---

# 사나이크럽 V6.4.5 — ChatGPT 무료 식단 자동 연동

Android package `club.sanai.app`, minSdk 26, targetSdk 32, **versionCode 72 / versionName 6.4.5**. 기존 `ironlog.v5.nutrition` 및 운동 기록의 localStorage 키는 변경하지 않는다. 버전 업데이트는 동일한 기존 서명 인증서를 사용하는 APK로만 가능하다.

## ChatGPT 식단 자동 연동 (별도 API/서버 요금 없음)

- `app/src/main/java/club/sanai/app/SanaiFoodSync.java`: Android Keystore에서 RSA-3072 비밀키 생성·보관. 앱 열기/복귀, 포그라운드 30분마다 암호화된 GitHub 인박스를 확인.
- `app/src/main/assets/sanai-food-sync.js`: `영양 보급소`에 연결 상태/복사/동기화 버튼 추가. 저장 전 식단 데이터 검증, 기존 기록에 병합, 동일 이벤트 ID 중복 방지. 로컬 저장 성공 후에만 수신 확인.
- `tools/food_sync_encrypt.py`: 장치 공개키로 AES-256-GCM + RSA-OAEP(SHA-256, MGF1 SHA-1) 암호화한 식단 파일 생성. `python3 tools/food_sync_encrypt.py --self-test`로 암호화 왕복 및 위변조 검사.
- `sync/devices/<device_uuid>.pem`: 장치별 **공개키만** 등록. `sync/inbox/YYYY-MM/<event_uuid>.json`: 내용이 암호화된 식단 이벤트만 보관. **식사명·영양값·개인 기록의 평문은 GitHub에 절대 올리지 않는다.** 저장소가 공개되므로 커밋 시각/암호문 크기 등의 메타데이터는 타인에게 보일 수 있다.

최초 연결은 APK를 V6.4.5로 설치한 다음 **보급소 → ChatGPT 식단 자동 연동 → 연결키 복사**에서 JSON을 복사해 ChatGPT에 붙여넣고 `사나이크럽 연결`을 요청한다. 개인용 ChatGPT 플러그인 `사나이크럽 식단 연동`은 GitHub 연결을 이용해 해당 공개키를 저장한다. 이후 `사나이크럽 점심 제육볶음 1인분 기록해`처럼 요청하면 영양성분을 검색·계산해 암호화 이벤트 파일을 생성하며, 앱을 열면 자동 수신한다. **GitHub 업로드 성공과 실제 휴대폰 저장 성공은 다른 단계**이므로 혼동하지 말 것. 연결키 등록과 실기기 수신 테스트 전에는 자동 연동 완료로 안내하지 않는다.

현재는 백그라운드 푸시 서비스가 없으며 앱을 닫아 둔 동안 실시간 갱신되지는 않는다. 이전 달까지는 매번, 더 오래된 월은 처음 한 번만 검사하는 구조(최대 12개월 전). APK 제거 시 Android Keystore 키가 소실될 수 있으니 기록을 백업하고 앱을 삭제하지 않는다. 별도 유료 API는 없지만 GitHub 무료 정책·API 요청 제한이 적용된다.

**릴리스 주의:** V6.4.4(`versionCode 71`)의 OTA r4는 기존 기기용으로 유지한다. 새 암호화 수신부는 네이티브 기능이므로 OTA만으로 설치되지 않으며 V6.4.5 APK가 필요하다. PR 검사에는 서명 없이 디버그 APK 컴파일을 수행한다. 실제 릴리스는 기존 `native-release.yml` 및 동일 인증서 서명이 필요하며, 최종 설치와 데이터 보존은 실기기에서 검증해야 한다.

---

## 기존 배포/업데이트 문서 (구 버전 절차 포함)


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

## 현재 업데이트 정책 (V6.4.3 / OTA 우선)

- 웹 화면, 운동 분석, 식품 DB 등 기존 네이티브 기능으로 처리 가능한 변경은 `ota/patch.js`에 누적 패치로 구현한다. `ota/release.json`의 nativeVersion·revision·notes를 마지막에 갱신하면 main push에서 서명·테스트·배포가 실행된다.
- 첫 패치는 V6.4.2 (versionCode 69) 전용 r1 워밍업 추천이다. V6.4.3 (70)은 해당 기능이 APK에 기본 포함되어 있으므로 r1을 적용하지 않는다. 실제 OTA 게시 및 기기 적용 여부는 Actions와 업데이트 센터에서 확인한다.
- 설치된 APK의 versionCode와 OTA 대상이 정확히 일치해야 한다. 현재 고정 ota-channel은 한 nativeVersion만 배포하므로 다른 설치 버전을 동시에 지원하지 않는다.
- 앱 내 업데이트 센터 → 웹 패치 확인 (OTA) → 적용 승인. APK 설치 권한이나 삼성 보안 자동 차단을 변경하지 않는다. 복구는 업데이트 센터의 웹 패치 제거를 사용한다.
- 네이티브 코드·권한·위젯 변경은 기존 서명 APK 릴리스로만 배포한다. 기존 APK의 자동 확인 순서는 APK 우선이며, 이 순서를 바꾸는 것도 네이티브 업데이트가 필요하다.
- 개인 운동/식단 데이터 및 서명 비밀은 저장소나 패치에 포함하지 않는다.

## OTA 웹 패치 (제한된 기능)
기존 데이터 저장 출처를 그대로 유지하도록 전체 HTML 번들 교체 대신 서명된 JavaScript/CSS 패치만 앱 페이지가 로드된 뒤 실행한다. 화면 스타일/함수/일부 기능을 변경할 수 있으나 초기화 구조 변경, 새 네이티브 기능 등은 APK로 배포해야 한다. `ota/patch.js`는 V6.4.2 전용 누적형 r1 워밍업 패치다. 실제 수정 시 누적형, 재실행 안전한 패치를 작성하고 로컬 저장 키를 변경하지 말 것. 외부 스크립트 로드 금지. Actions → SANAI web patch (OTA) → target native versionCode, 증가하는 revision, 설명 입력 → Run workflow. 기존 APK와 동일한 서명키로 metadata 서명 후 `ota-channel` prerelease에 배포. APK 최신 릴리스와 별개. 앱에서 웹 패치 확인 → 적용 승인. 자동 확인도 가능하지만 자동 실행 전 사용자 승인을 받는다. 복구: 업데이트 센터에서 웹 패치 제거, 또는 홈 화면 앱 아이콘 길게 누르기 → 업데이트 복구 (지원 런처). 패치 제거는 기록을 지우지 않는다. 같은 APK 버전의 이전 revision은 재적용 불가; 새 패치는 더 큰 revision 필요. 새 APK 버전은 맞지 않는 이전 패치 제거.

## 검증 및 제한
- 기존 4종 위젯 및 차드 배경 소스 보존, JS 위젯 스냅샷 테스트 통과.
- 메타데이터 서명/검증 테스트, XML/YAML/JS 구문 확인.
- Android SDK/Gradle/네트워크가 없는 현재 환경에서는 Java 컴파일, APK 제작·실기기 설치, GitHub Actions 실제 실행, OTA 실제 WebView 검증 미완료. 저장소 연결 및 최초 서명 설정 필요. 이 프로젝트는 실제 서명된 APK가 아니다.
- 공개 저장소는 코드와 릴리스가 공개되므로 원치 않으면 설정하지 말 것. 개인 기록이나 키를 공개하지 않는다. 유료 API 없음.


공식 업데이트 채널 기본값: 2645chounggs-dot/SANAI-CLUB. 최초 실행 시 별도 입력 불필요.
