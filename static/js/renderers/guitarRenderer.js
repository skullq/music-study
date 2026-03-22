/**
 * 기타 지판(Fretboard) 생성 및 마킹 로직
 */
function renderGuitar(notesData) {
    const container = document.getElementById("guitar-container");
    if (!notesData || notesData.length === 0) return;

    // 기준이 되는 근음과 스케일에 포함된 모든 Pitch Class(12음계 인덱스) 추출
    const rootMidi = notesData[0].piano_key; 
    const rootPitchClass = rootMidi % 12;
    const activePitchClasses = [...new Set(notesData.map(n => n.piano_key % 12).filter(k => !isNaN(k)))];

    // 기타 줄의 개방현 MIDI 번호 (1번줄 E4 ~ 6번줄 E2)
    const stringsMidi = [64, 59, 55, 50, 45, 40];
    const fretCount = 15; // 0프렛(개방현) ~ 15프렛
    const defaultNoteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    let html = `<div class="fretboard">`;

    // 1. 프렛(Fret) 배경 및 마커 렌더링
    html += `<div class="fret nut" style="width: 4%;"></div>`; // 0프렛(Nut)
    for (let i = 1; i <= fretCount; i++) {
        let markers = '';
        if ([3, 5, 7, 9, 15].includes(i)) {
            markers = `<div class="fret-marker" style="top: 50%;"></div>`;
        } else if (i === 12) {
            markers = `<div class="fret-marker" style="top: 30%;"></div><div class="fret-marker" style="top: 70%;"></div>`;
        }
        html += `<div class="fret" style="width: 6.4%;">${markers}</div>`;
    }

    // 2. 가로 줄(String) 렌더링
    for (let s = 0; s < 6; s++) {
        const topPos = s * 22; // 1번 줄이 맨 위(0), 6번 줄이 맨 아래(110)
        const thickness = 1 + (s * 0.5); // 두꺼운 줄(6번줄)로 갈수록 굵어지게 표현
        html += `<div class="string-line" style="top: ${topPos}px; height: ${thickness}px;"></div>`;
        html += `<div class="string-label" style="top: ${topPos}px;">${s + 1}</div>`;
    }

    // 3. 음표(Dot) 렌더링
    for (let s = 0; s < 6; s++) {
        const stringBaseMidi = stringsMidi[s];
        const topPos = s * 22;

        for (let f = 0; f <= fretCount; f++) {
            const midi = stringBaseMidi + f;
            const pitchClass = midi % 12;
            
            if (activePitchClasses.includes(pitchClass)) {
                const isRoot = (pitchClass === rootPitchClass);
                
                // 백엔드 데이터에서 정확한 플랫/샵 표기를 찾아옴 (예: D# 대신 Eb)
                let noteName = defaultNoteNames[pitchClass];
                const noteObj = notesData.find(n => n.piano_key % 12 === pitchClass);
                if (noteObj && noteObj.name) {
                    noteName = noteObj.name.replace('-', 'b'); 
                }

                // X 좌표(left %) 계산: 0프렛은 2%, 나머지는 각 프렛의 중앙
                const leftPct = (f === 0) ? 2 : 4 + (f - 1) * 6.4 + 3.2;
                const cssClass = isRoot ? 'note-dot root' : 'note-dot';
                
                html += `<div class="${cssClass}" style="left: ${leftPct}%; top: ${topPos}px;" 
                              onclick="playTone(${midi}); if(window.highlightStaffNote) window.highlightStaffNote(${midi});">
                              ${noteName}
                         </div>`;
            }
        }
    }

    html += `</div>`;
    // 범례 추가
    html += `<div style="margin-top: 15px; font-size: 13px; color: #555;">
                <span style="display:inline-block; width:12px; height:12px; background:#e74c3c; border-radius:50%; margin-right:5px; vertical-align:-1px;"></span>근음(Root)
                <span style="display:inline-block; width:12px; height:12px; background:#0984e3; border-radius:50%; margin-right:5px; margin-left:15px; vertical-align:-1px;"></span>스케일/코드 구성음
             </div>`;

    container.innerHTML = html;
}