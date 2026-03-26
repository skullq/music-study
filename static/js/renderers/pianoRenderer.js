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

    // 렌더링할 건반 범위: C2(36) ~ C5(72) - 3옥타브 분량 (기타 저음역대인 E2=40 포함)
    const START_MIDI = 36;
    const END_MIDI = 72;
    
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

    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
        const isBlack = isBlackKey(midi);
        const isActive = activeMidiNumbers.includes(midi);
        const activeClass = isActive ? 'active' : '';
        let label = noteNames[midi % 12];

        // C(도) 건반에 옥타브 번호를 표기하여 현재 위치를 정확히 알 수 있게 합니다. (예: C2, C3, C4)
        if (midi % 12 === 0) {
            const octave = Math.floor(midi / 12) - 1;
            label = `<strong style="color:#d35400; font-size:14px;">C${octave}</strong>`;
        }

        if (isBlack) {
            // 흑건은 이전 백건과 현재 백건의 경계선에 걸치도록 위치 조정
            const leftPos = currentLeft - (blackKeyWidth / 2);
            keysHtml += `<div class="key black ${activeClass}" data-midi="${midi}" style="left: ${leftPos}px; width: ${blackKeyWidth}px; height: ${heightBlack}px;" onclick="playTone(${midi}); if(window.highlightStaffNote) window.highlightStaffNote(${midi});"><span>${label}</span></div>`;
        } else {
            // 백건은 순차적으로 배치 후 너비만큼 x축 이동
            keysHtml += `<div class="key white ${activeClass}" data-midi="${midi}" style="left: ${currentLeft}px; width: ${whiteKeyWidth}px; height: ${heightWhite}px;" onclick="playTone(${midi}); if(window.highlightStaffNote) window.highlightStaffNote(${midi});"><span>${label}</span></div>`;
            currentLeft += whiteKeyWidth;
        }
    }

    // 생성된 건반들을 감싸는 피아노 몸체(board) 렌더링
    container.innerHTML = `
        <div style="width: 100%; overflow-x: auto; padding-bottom: 15px;">
            <div style="background: #333; padding: 25px 15px 15px 15px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(0,0,0,0.3); margin-top: 10px; min-width: ${currentLeft + 30}px;">
                <div style="position: relative; width: ${currentLeft}px; height: ${heightWhite}px; margin: 0 auto;">
                    ${keysHtml}
                </div>
            </div>
        </div>
    `;
}