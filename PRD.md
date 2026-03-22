[PR] Feat: 통합 음악 시각화 웹 서비스 핵심 기능 및 인터랙티브 UI 구현

📌 개요 (Description)
이 PR은 사용자가 선택한 스케일 또는 코드를 오선지, 피아노 건반, 기타 타브(지판)에 한꺼번에 렌더링하여 직관적인 이해를 돕는 웹 애플리케이션의 핵심 기능을 완성합니다. 백엔드(FastAPI+music21) 데이터 연동부터 프론트엔드의 3가지 독립적인 UI 시각화, Web Audio API를 활용한 소리 재생 및 컴포넌트 간 실시간 상호작용(하이라이팅)까지 모두 포함되었습니다.

🔗 관련 이슈 (Related Issues)
- Resolves: #이슈번호_여기에_작성

🎯 개발 방향 및 주요 목표 (Development Direction & Goals)

    * 백엔드 (Data & Logic Layer): 파이썬 생태계의 장점을 살려 music21 라이브러리로 복잡한 음악 이론(음정, 스케일, 코드 구성음) 연산을 전담합니다.
        * 프론트엔드에서 쉽게 소비할 수 있도록 FastAPI를 이용해 가볍고 빠른 RESTful API를 구축하며, JSON 형태로 정규화된 음표 데이터를 반환하도록 설계합니다.
    * 프론트엔드 (Presentation Layer): 백엔드에서 전달받은 하나의 데이터 셋을 3개의 독립적인 UI 컴포넌트(오선지, 피아노, 기타)가 구독하여 동시에 렌더링하는 구조를 취합니다.
        * VexFlow를 도입하여 오선지 악보를 표준에 맞게 그리고, 건반과 지판은 CSS Grid와 DOM 조작을 통해 가볍게 구현합니다.
    * 관심사 분리 (Separation of Concerns): UI 렌더링 로직과 음악 이론 계산 로직을 완전히 분리하여 향후 유지보수 및 기능 확장(예: 새로운 악기 추가)을 용이하게 합니다.

✨ 주요 변경 사항 (Changes Introduced)

    * Backend (Python)
        * app/main.py: FastAPI 애플리케이션 초기화, CORS 미들웨어 및 정적 파일 서빙 설정.
        * app/api/music_routes.py: 스케일(Scale) 및 화음(Chord) 데이터를 반환하는 REST API 라우터 구현.
        * app/services/music_engine.py: music21 기반 12음계 연산. Major/Minor 스케일 및 4가지 Triad(Major, Minor, Aug, Dim) 코드 구성음, MIDI 번호 매핑 로직 완비. 에러 추적(Traceback) 추가.
        * requirements.txt: fastapi, uvicorn, music21 등 필수 패키지 명시.
    * Frontend (HTML/JS)
        * static/index.html: 한 화면에 꽉 차는 컴팩트한 중앙 정렬 레이아웃 구성. 피아노 건반 및 기타 지판용 CSS 스타일링 완료.
        * static/js/api.js: FastAPI 연동, URL 인코딩 처리(샵/플랫 대응), 선택된 스케일/코드에 맞춘 동적 컴포넌트 제목 업데이트 기능.
        * static/js/renderers/:
            * staffRenderer.js: VexFlow 기반 가로폭이 넓은 오선지 렌더링. 임시표 자동 계산. 스케일 렌더링 시 온음/반음 간격 시각화, 로마 숫자(I, ii, V 등) 및 실제 다이아토닉 코드 네임(Cmaj7, Dm 등) 동시 표기. 클릭 시 빨간색 하이라이팅.
            * pianoRenderer.js: 2옥타브 분량의 인터랙티브 건반 UI. 스케일 구성음 및 음표 이름 라벨링. 불필요한 텍스트 오버레이를 제거하여 순수 피아노 건반의 역할에 충실하도록 디자인. 건반 클릭 시 Web Audio API를 통한 사운드 재생.
            * guitarRenderer.js: 6번줄 15프렛 기타 지판 UI 완벽 구현. 근음(Root)과 일반 구성음 색상 구분. 지판 클릭 시 소리 재생 및 오선지 연동.

📸 스크린샷 (Screenshots)
| 전체 레이아웃 | 오선지 (VexFlow) | 피아노/기타 컴포넌트 |
|---|---|---|
| (이미지 첨부) | (이미지 첨부) | (이미지 첨부) |

🏗️ 시스템 아키텍처 요약 (Architecture Overview)
Plaintext

[ Client (Browser) ] 
   ├── 1. 사용자가 F Major Scale 선택 후 요청
   ├── 4. JSON 데이터 수신
   └── 5. 3개 컴포넌트(VexFlow, 피아노 DOM, 기타 DOM) 동시 업데이트 렌더링
         ▲
         │ (REST API - JSON)
         ▼
[ Server (FastAPI) ]
   ├── 2. 요청 수신 및 매개변수 검증
   └── 3. music21 기반 연산 로직 호출 -> 통합 데이터 구조(Notes, Keys, Frets) 생성 및 반환

🚀 실행 방법 및 테스트 가이드 (How to Run & Test)
1. 가상환경 생성 및 의존성 설치: `uv venv` 실행 후 `uv pip install -r requirements.txt`
2. 백엔드 서버 실행: `uv run uvicorn app.main:app --reload`
3. 프론트엔드 실행: `static/index.html` 파일을 브라우저에서 열거나 VSCode Live Server 등으로 실행
4. API 테스트: 브라우저 또는 포스트맨으로 `http://localhost:8000/api/scale?root=F&type=major` 등 호출하여 JSON 포맷 확인

👀 리뷰어 참고 사항 (Reviewer Notes)
- 백엔드와 프론트엔드의 관심사 분리가 의도한 대로 잘 이루어졌는지, 디렉토리 구조 위주로 살펴봐 주세요.
- 3개의 컴포넌트(오선지, 피아노, 기타)가 클릭 이벤트(`playTone`, `highlightStaffNote`)를 통해 유기적으로 연결된 부분을 중점적으로 테스트해 주세요.

✅ 체크리스트 (Checklist)

    - [x] FastAPI 서버가 로컬에서 정상적으로 구동되는가? (uv run uvicorn app.main:app --reload)
    - [x] API 엔드포인트가 예상된 JSON 스키마를 반환하는가?
    - [x] 프론트엔드 레이아웃에 3가지 뷰 영역이 정상적으로 분할되어 있는가?
    - [x] VexFlow 라이브러리가 정상적으로 로드되는가?
    - [x] 피아노/기타 클릭 시 오선지에 하이라이트가 발생하며 소리가 정상 출력되는가?

🔜 다음 작업 (Next Steps / TODO)

    * 7화음(7th Chords) 등 추가적인 코드 타입 지원.
    * 기타 지판의 다양한 튜닝(Drop D, Open G 등) 지원.
    * UI 다크 모드(Dark Theme) 토글 기능 추가.