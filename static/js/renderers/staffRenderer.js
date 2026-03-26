window.currentStaffNotesData = null;
window.currentDataType = 'scale';
window.currentScaleType = 'major';
window.currentStackChords = '1';
window.currentSuffix = '';
window.activeStaffMidis = [];

window.highlightStaffNote = function(midi) {
    window.highlightStaffNotes([midi]);
};

window.highlightStaffNotes = function(midisArray) {
    window.activeStaffMidis = midisArray;
    if (window.currentStaffNotesData) {
        renderStaff(window.currentStaffNotesData, window.currentDataType, window.currentScaleType, window.currentStackChords, window.currentSuffix);
    }
};

/**
 * VexFlow 초기화 및 악보 그리기 로직
 */
function renderStaff(notesData, dataType = 'scale', scaleType = 'major', stackChords = '1', suffix = '') {
    window.currentStaffNotesData = notesData;
    window.currentDataType = dataType;
    window.currentScaleType = scaleType;
    window.currentStackChords = stackChords;
    window.currentSuffix = suffix;
    const container = document.getElementById("vexflow-container");
    container.innerHTML = ""; // 기존 악보 초기화

    try {
        const VF = Vex.Flow;
        const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
        renderer.resize(850, 230); // 한 줄로 합쳤으므로 캔버스 높이를 원래대로 복구
        
        const context = renderer.getContext();
        
        // 1. 조표를 그릴 짧은 앞쪽 오선지 (조표 + 높은음자리표)
        const rootNote = document.getElementById('root-note') ? document.getElementById('root-note').value : 'C';
        let keySigStr = rootNote.replace(/-/g, 'b');
        if (scaleType && scaleType.includes('minor')) {
            keySigStr += 'm';
        }
        
        const keySigStave = new VF.Stave(10, 40, 90); // Y좌표를 40으로 맞추고 넓이를 90으로 약간 줄임
        keySigStave.addClef("treble");
        
        try {
            keySigStave.addKeySignature(keySigStr);
        } catch (e) {
            // VexFlow에서 처리할 수 없는 이명동음의 경우 변환해서 렌더링 (예: D# -> Eb)
            const enharmonicMap = { 'A#': 'Bb', 'D#': 'Eb', 'G#': 'Ab', 'A#m': 'Bbm', 'D#m': 'Ebm', 'G#m': 'Abm' };
            if (enharmonicMap[keySigStr]) {
                try { keySigStave.addKeySignature(enharmonicMap[keySigStr]); } catch (e2) {}
            }
        }
        keySigStave.setContext(context).draw();

        // 2. 음표를 그릴 메인 오선지 (앞쪽 조표 오선지와 분리된 상태로 같은 줄에 렌더링)
        const stave = new VF.Stave(120, 40, 710); // X좌표를 120으로 주어 여백 확보, Y좌표는 조표와 같게 통일
        stave.addClef("treble").setContext(context).draw();

        // 백엔드에서 전달된 pitch(예: C4, B-4)를 VexFlow 포맷(c/4, bb/4)으로 변환
        const notes = notesData.map(n => {
            let pitchesToUse = [n.pitch];
            if (dataType === 'scale') {
                if (stackChords === '3') pitchesToUse = n.triad_pitches;
                else if (stackChords === '4') pitchesToUse = n.seventh_pitches;
            }

            const keys = pitchesToUse.map(p => {
                let pitchName = p.toLowerCase().replace(/-/g, 'b');
                return pitchName.replace(/([0-9])/, '/$1'); 
            });
            
            const note = new VF.StaveNote({ keys: keys, duration: "q" });
            
            pitchesToUse.forEach((p, idx) => {
                if (p.includes("-")) note.addModifier(new VF.Accidental("b"), idx);
                if (p.includes("#")) note.addModifier(new VF.Accidental("#"), idx);
            });
            
            let midisToUse = [n.piano_key];
            if (dataType === 'scale') {
                if (stackChords === '3') midisToUse = n.triad_midis;
                else if (stackChords === '4') midisToUse = n.seventh_midis;
            }

            let isHighlighted = false;
            if (window.activeStaffMidis.length > 0) {
                // 배열이 완벽하게 일치할 때만 하이라이트 (교집합으로 인해 다른 화음이 켜지는 현상 원천 차단)
                isHighlighted = JSON.stringify(midisToUse) === JSON.stringify(window.activeStaffMidis);
            }

            if (isHighlighted) {
                note.setStyle({fillStyle: "#e74c3c", strokeStyle: "#e74c3c"});
            }

            return note;
        });

        // 화음(Chord)일 경우, 앞쪽에 3화음이 합쳐진 블록 코드를 추가
        if (dataType === 'chord' && notesData.length > 0) {
            const chordKeys = notesData.map(n => {
                let pitchName = n.pitch.toLowerCase().replace(/-/g, 'b');
                return pitchName.replace(/([0-9])/, '/$1');
            });
            
            const blockChord = new VF.StaveNote({ keys: chordKeys, duration: "q" });
            
            // 블록 코드의 각 음표에 임시표를 개별적으로 적용 (인덱스 지정)
            notesData.forEach((n, idx) => {
                if (n.pitch.includes("-")) blockChord.addModifier(new VF.Accidental("b"), idx);
                if (n.pitch.includes("#")) blockChord.addModifier(new VF.Accidental("#"), idx);
            });
            
            // 블록 코드(Chord 덩어리) 자체가 클릭되었을 때 빨간색으로 빛나도록 하이라이트 로직 추가
            const blockChordMidis = notesData.map(n => n.piano_key);
            if (window.activeStaffMidis.length > 0 && JSON.stringify(blockChordMidis) === JSON.stringify(window.activeStaffMidis)) {
                blockChord.setStyle({fillStyle: "#e74c3c", strokeStyle: "#e74c3c"});
            }

            notes.unshift(blockChord);
        }

        // 박자 계산 (현재는 데이터 길이에 맞춰 유동적으로 렌더링)
        const voice = new VF.Voice({ num_beats: notes.length, beat_value: 4 });
        voice.addTickables(notes);

        new VF.Formatter().joinVoices([voice]).format([voice], 550); // 음표 간격 약간 줄임
        voice.draw(context, stave);
        
        // 오선지에 그려진 각 음표(Note)에 클릭 이벤트 추가 (마우스로 직접 연주)
        const noteGroups = container.querySelectorAll('.vf-stavenote');
        noteGroups.forEach((el, i) => {
            el.style.cursor = 'pointer';
            
            // 마우스 오버 시 클릭 가능하다는 시각적 피드백 제공
            el.addEventListener('mouseover', () => el.style.opacity = '0.6');
            el.addEventListener('mouseout', () => el.style.opacity = '1');

            el.addEventListener('click', () => {
                let midisToPlay = [];
                if (dataType === 'scale') {
                    midisToPlay = [notesData[i].piano_key];
                    if (stackChords === '3') midisToPlay = notesData[i].triad_midis;
                    else if (stackChords === '4') midisToPlay = notesData[i].seventh_midis;
                } else if (dataType === 'chord') {
                    if (i === 0) {
                        // 맨 앞의 블록 코드(Chord 덩어리)를 클릭했을 때
                        midisToPlay = notesData.map(n => n.piano_key);
                    } else {
                        // 뒤쪽에 전개된 개별 구성음을 클릭했을 때
                        midisToPlay = [notesData[i - 1].piano_key];
                    }
                }
                
                // [요청사항] 음이 여러 개(코드)일 경우 동시 재생, 하나일 경우 단일음(아르페지오) 재생
                if (midisToPlay.length > 1) {
                    // 동시 재생: 모든 음을 한 번에 연주하고, 피아노와 오선지를 동시에 하이라이트
                    if (window.playMultipleTones) window.playMultipleTones(midisToPlay);
                    if (window.highlightPianoKeys) window.highlightPianoKeys(midisToPlay);
                    
                    // 일정 시간 후 하이라이트 해제
                    setTimeout(() => {
                        if (window.highlightPianoKeys) window.highlightPianoKeys([]);
                        if (window.highlightStaffNotes) window.highlightStaffNotes([]);
                    }, 400);
                } else {
                    // 단일음 재생: 기존 아르페지오 함수를 사용 (단일음도 처리 가능)
                    if (window.playArpeggio) {
                        window.playArpeggio(midisToPlay, 90);
                    }
                }
            });
        });

        if (dataType === 'scale') {
            if (stackChords === '1') {
                // 오선지 아래에 온음(Whole step) / 반음(Half step) 간격 기호 그리기 (단일음일 때만)
                context.setStrokeStyle('#0984e3');
                context.setLineWidth(2);

                for (let i = 0; i < notes.length - 1; i++) {
                    const midi1 = notesData[i].piano_key;
                    const midi2 = notesData[i + 1].piano_key;
                    if (midi1 == null || midi2 == null) continue;

                    const diff = Math.abs(midi2 - midi1);

                    // 음표의 대략적인 중앙 X 좌표 계산
                    const x1 = notes[i].getAbsoluteX() + 15;
                    const x2 = notes[i + 1].getAbsoluteX() + 15;
                    
                    // 각 표시가 서로 떨어져 보이도록 좌우 여백(gap) 추가
                    const gap = 12; // 여백을 더 늘려서 온/반음 표시 폭을 좁힘
                    const startX = x1 + gap;
                    const endX = x2 - gap;
                    const drawMidX = (startX + endX) / 2;
                    
                    context.beginPath();

                    const yBotStart = 150; // 낮은 음표와 겹치지 않도록 아래로 더 내림
                    const yBotPeak = 170;  
                    
                    if (diff === 2) {
                        context.moveTo(startX, yBotStart);
                        context.lineTo(startX, yBotPeak);
                        context.lineTo(endX, yBotPeak);
                        context.lineTo(endX, yBotStart);
                    } else if (diff === 1) {
                        context.moveTo(startX, yBotStart);
                        context.lineTo(drawMidX, yBotPeak + 2);
                        context.lineTo(endX, yBotStart);
                    }
                    context.stroke();
                }
            }
            
            // 다이아토닉 코드 (장/단 화음 로마숫자) 표시
            context.setFont("Arial", 14, "bold");
            context.setFillStyle("#e74c3c");
            
            const diatonic = scaleType === 'minor'
                ? (stackChords === '4' ? ['im7', 'iiø7', 'IIImaj7', 'ivm7', 'vm7', 'VImaj7', 'VII7', 'im7'] : ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII', 'i'])
                : (stackChords === '4' ? ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7', 'Imaj7'] : ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I']);

            for (let i = 0; i < notes.length; i++) {
                const x = notes[i].getAbsoluteX() + 15;
                const y = 18; // 분수코드 베이스음 중첩 방지를 위해 텍스트를 오선지 상단 여백으로 이동
                
                context.setFont("Arial", 14, "bold");
                context.setFillStyle("#e74c3c");
                context.fillText(diatonic[i] || '', x - 8, y);

                // 단일음(스케일), 3화음, 4화음 모드 상관없이 로마숫자 밑에 실제 코드 이름 표시
                let cleanNote = notesData[i].pitch.replace(/[0-9]/g, '').replace(/-/g, 'b');
                let chordName = cleanNote;
                let roman = diatonic[i] || '';
                
                if (roman.includes('maj7')) chordName += 'maj7';
                else if (roman.includes('ø7')) chordName += 'm7b5';
                else if (roman.includes('7')) {
                    let baseRoman = roman.replace(/[^a-zA-Z]/g, '');
                    // 소문자 로마숫자(예: ii, iii, vi, im)인 경우 m7
                    if (baseRoman === baseRoman.toLowerCase()) {
                        chordName += 'm7';
                    } else {
                        chordName += '7';
                    }
                }
                else if (roman.includes('°')) chordName += 'dim';
                else {
                    let baseRoman = roman.replace(/[^a-zA-Z]/g, '');
                    if (baseRoman && baseRoman === baseRoman.toLowerCase()) {
                        chordName += 'm';
                    }
                }
                
                context.save();
                context.setFont("Arial", 13, "bold");
                context.setFillStyle("#0984e3"); // 파란색 텍스트로 구분
                
                // 코드 이름 길이에 따라 x 좌표 살짝 보정 (가운데 정렬 느낌)
                let offsetX = 4 + (chordName.length * 3);
                context.fillText(chordName, x - offsetX, y + 22); // 글자 겹침 방지를 위해 간격을 더 띄움
                context.restore();
            }
        } else if (dataType === 'chord') {
            context.setFont("Arial", 16, "bold");
            context.setFillStyle("#0984e3");
            
            const romanNumerals = ['Chord', 'I', 'III', 'V', 'VII']; // This seems to be for scales, but let's keep it for now.
            
            for (let i = 0; i < notes.length; i++) {
                const x = notes[i].getAbsoluteX() + 15;
                const y = 18; // 분수코드 중첩 방지를 위해 오선지 위쪽으로 텍스트 이동
                
                const text = romanNumerals[i] || '';
                const offsetX = text === 'Chord' ? 20 : 8;
                context.fillText(text, x - offsetX, y);

                // 단일 화음(Chord) 렌더링 모드일 때 맨 앞 블록 코드 밑에 실제 코드 네임 표시
                if (i === 0 && notesData.length > 0) {
                    // [수정] 분수코드의 경우 notesData[0]가 베이스음이 되므로, 
                    // 구성음이 아닌 사용자가 선택한 실제 근음(rootNote)을 바탕으로 코드 네임 생성
                    let cleanRoot = rootNote.replace(/-/g, 'b');
                    cleanRoot = cleanRoot.charAt(0).toUpperCase() + cleanRoot.slice(1);
                    
                    let chordName = cleanRoot + suffix;

                    context.save();
                    context.setFont("Arial", 15, "bold");
                    context.setFillStyle("#e74c3c"); 
                    context.fillText(chordName, x - 12, y + 22); // 글자 겹침 방지를 위해 간격을 더 띄움
                    context.restore();
                }
            }
        }
    } catch (e) {
        console.error("VexFlow 렌더링 에러 상세:", e);
        container.innerHTML = `<p style="color: red; font-weight: bold;">악보 렌더링 에러: ${e.message}</p><pre style="font-size: 11px; overflow-x: auto; color: #555;">${e.stack}</pre>`;
    }
}