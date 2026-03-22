let audioCtx;

// Web Audio API를 이용한 간단한 신디사이저 함수
window.playTone = function(midi) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // MIDI 번호를 주파수(Hz)로 변환
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle'; // 부드러운 피아노 느낌의 파형
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // 건반을 누를 때 자연스럽게 소리가 줄어들도록 설정 (Envelope 적용)
    gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);

    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
};

window.playMultipleTones = function(midisArray) {
    midisArray.forEach(midi => playTone(midi)); // 배열의 모든 음을 동시에 재생
    if (window.highlightStaffNotes) {
        window.highlightStaffNotes(midisArray); // 오선지에 모든 음을 동시에 하이라이트
    }
};

window.highlightPianoKeys = function(midisArray) {
    const keys = document.querySelectorAll('#piano-container .key');
    keys.forEach(k => k.classList.remove('active')); // 기존 활성화 초기화
    midisArray.forEach(midi => {
        const el = document.querySelector(`#piano-container .key[data-midi="${midi}"]`);
        if (el) el.classList.add('active');
    });
    // 이전에 남아있던 1.5초 뒤 복구되는 setTimeout 코드가 있다면 이곳에서 완전히 제거되어야 합니다.
};

/**
 * 피아노 건반 하이라이팅 로직
 */
function renderPiano(notesData, dataType = 'scale', scaleType = 'major', stackChords = '1') {
    const container = document.getElementById("piano-container");
    
    // 백엔드에서 전달된 MIDI 번호 배열 추출 (스케일 화음 쌓기 모드면 초기 건반 표시 없음)
    let activeMidiNumbers = [];
    if (!(dataType === 'scale' && stackChords !== '1')) {
        activeMidiNumbers = notesData.map(n => n.piano_key).filter(k => k != null);
    }

    // 렌더링할 건반 범위: C4(60) ~ C6(84) - 2옥타브 분량
    const START_MIDI = 60;
    const END_MIDI = 84;
    
    const whiteKeyWidth = 40;
    const blackKeyWidth = 24;
    const heightWhite = 140;
    const heightBlack = 85;

    // MIDI 번호가 흑건인지 판별하는 함수 (C기준으로 1,3,6,8,10번째 음이 흑건)
    const isBlackKey = (midi) => [1, 3, 6, 8, 10].includes(midi % 12);

    // 건반 라벨 (음표 이름 배열, 12음계 매핑)
    const noteNames = ['C', 'C#<br>Db', 'D', 'D#<br>Eb', 'E', 'F', 'F#<br>Gb', 'G', 'G#<br>Ab', 'A', 'A#<br>Bb', 'B'];

    let keysHtml = '';
    let currentLeft = 0; // 백건의 x축 위치(left) 추적
    let midiToCenterX = {}; // 건반 중심 X좌표 저장용

    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
        const isBlack = isBlackKey(midi);
        const isActive = activeMidiNumbers.includes(midi);
        const activeClass = isActive ? 'active' : '';
        const label = noteNames[midi % 12];

        if (isBlack) {
            // 흑건은 이전 백건과 현재 백건의 경계선에 걸치도록 위치 조정
            const leftPos = currentLeft - (blackKeyWidth / 2);
            midiToCenterX[midi] = leftPos + (blackKeyWidth / 2); // 흑건의 정중앙 X좌표
            keysHtml += `<div class="key black ${activeClass}" data-midi="${midi}" style="left: ${leftPos}px; width: ${blackKeyWidth}px; height: ${heightBlack}px;" onclick="playTone(${midi}); if(window.highlightStaffNote) window.highlightStaffNote(${midi});"><span>${label}</span></div>`;
        } else {
            // 백건은 순차적으로 배치 후 너비만큼 x축 이동
            midiToCenterX[midi] = currentLeft + (whiteKeyWidth / 2); // 백건의 정중앙 X좌표
            keysHtml += `<div class="key white ${activeClass}" data-midi="${midi}" style="left: ${currentLeft}px; width: ${whiteKeyWidth}px; height: ${heightWhite}px;" onclick="playTone(${midi}); if(window.highlightStaffNote) window.highlightStaffNote(${midi});"><span>${label}</span></div>`;
            currentLeft += whiteKeyWidth;
        }
    }

    // 스케일일 경우 SVG를 이용해 온음/반음 기호 그리기 (건반 위 오버레이)
    let svgHtml = '';
    if (dataType === 'scale') {
        let diatonic = [];
        if (scaleType === 'minor') {
            if (stackChords === '4') diatonic = ['im7', 'iiø7', 'IIImaj7', 'ivm7', 'vm7', 'VImaj7', 'VII7', 'im7'];
            else diatonic = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII', 'i'];
        } else {
            if (stackChords === '4') diatonic = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7', 'Imaj7'];
            else diatonic = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I'];
        }

        svgHtml += `<svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; overflow: visible;">`;
        for (let i = 0; i < notesData.length - 1; i++) {
            const midi1 = notesData[i].piano_key;
            const midi2 = notesData[i + 1].piano_key;
            if (midi1 == null || midi2 == null) continue;

            const diff = Math.abs(midi2 - midi1);
            const x1 = midiToCenterX[midi1];
            const x2 = midiToCenterX[midi2];
            if (x1 === undefined || x2 === undefined) continue;

            const midX = (x1 + x2) / 2;
            const yStart = -5; // 건반 상단 바로 위 시작점
            const yPeak = -30; // 더 위로 꺾이는 최고점

            if (stackChords === '1') {
                if (diff === 2) { // 온음 (역 ㄷ자 모양)
                    svgHtml += `<path d="M ${x1} ${yStart} L ${x1} ${yPeak} L ${x2} ${yPeak} L ${x2} ${yStart}" stroke="#e74c3c" stroke-width="2" fill="none" stroke-linejoin="round" />`;
                } else if (diff === 1) { // 반음 (∧ 모양)
                    svgHtml += `<path d="M ${x1} ${yStart} L ${midX} ${yPeak} L ${x2} ${yStart}" stroke="#e74c3c" stroke-width="2" fill="none" stroke-linejoin="round" />`;
                }
            }
            
            let midis = [notesData[i].piano_key];
            if (stackChords === '3') midis = notesData[i].triad_midis;
            if (stackChords === '4') midis = notesData[i].seventh_midis;

            // 건반 위에 다이아토닉 코드(장/단 로마숫자) 표시 (클릭 가능)
            svgHtml += `<text x="${x1}" y="${yPeak - 5}" fill="#e74c3c" font-size="14" text-anchor="middle" font-weight="bold" style="pointer-events: auto; cursor: pointer;" onclick='playMultipleTones(${JSON.stringify(midis)})'>${diatonic[i]}</text>`;
        }
        
        // 마지막 옥타브 음에 대한 다이아토닉 기호 표시
        const lastIdx = notesData.length - 1;
        const lastX = midiToCenterX[notesData[lastIdx].piano_key];
        if (lastX !== undefined) {
            let lastMidis = [notesData[lastIdx].piano_key];
            if (stackChords === '3') lastMidis = notesData[lastIdx].triad_midis;
            if (stackChords === '4') lastMidis = notesData[lastIdx].seventh_midis;
            svgHtml += `<text x="${lastX}" y="-35" fill="#e74c3c" font-size="14" text-anchor="middle" font-weight="bold" style="pointer-events: auto; cursor: pointer;" onclick='playMultipleTones(${JSON.stringify(lastMidis)})'>${diatonic[lastIdx]}</text>`;
        }
        svgHtml += `</svg>`;
    }

    // 생성된 건반들을 감싸는 피아노 몸체(board) 렌더링
    container.innerHTML = `
        <div style="background: #333; padding: 55px 15px 15px 15px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin-top: 10px;">
            <div style="position: relative; width: ${currentLeft}px; height: ${heightWhite}px; margin: 0 auto;">
                ${keysHtml}
                    ${svgHtml}
            </div>
        </div>
    `;
}