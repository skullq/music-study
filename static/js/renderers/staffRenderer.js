window.currentStaffNotesData = null;
window.currentDataType = 'scale';
window.currentScaleType = 'major';
window.currentStackChords = '1';
window.activeStaffMidis = [];

window.highlightStaffNote = function(midi) {
    window.highlightStaffNotes([midi]);
};

window.highlightStaffNotes = function(midisArray) {
    window.activeStaffMidis = midisArray;
    if (window.currentStaffNotesData) renderStaff(window.currentStaffNotesData, window.currentDataType, window.currentScaleType, window.currentStackChords);
};

/**
 * VexFlow 초기화 및 악보 그리기 로직
 */
function renderStaff(notesData, dataType = 'scale', scaleType = 'major', stackChords = '1') {
    window.currentStaffNotesData = notesData;
    window.currentDataType = dataType;
    window.currentScaleType = scaleType;
    window.currentStackChords = stackChords;
    const container = document.getElementById("vexflow-container");
    container.innerHTML = ""; // 기존 악보 초기화

    try {
        const VF = Vex.Flow;
        const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
        renderer.resize(600, 200); // 기호를 그릴 여백을 위해 캔버스 높이 증가
        
        const context = renderer.getContext();
        const stave = new VF.Stave(10, 40, 500); // 위쪽 기호 공간 확보를 위해 오선지를 약간 아래로 이동
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

        new VF.Formatter().joinVoices([voice]).format([voice], 450);
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
                if (window.playMultipleTones) window.playMultipleTones(midisToPlay);
                if (window.highlightPianoKeys) window.highlightPianoKeys(midisToPlay);
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
                    const gap = 4;
                    const startX = x1 + gap;
                    const endX = x2 - gap;
                    const drawMidX = (startX + endX) / 2;
                    
                    // 4번째 음(인덱스 3)과 5번째 음(인덱스 4) 사이는 위로 그리기
                    const isTop = (i === 3); 

                    context.beginPath();
                    if (isTop) {
                        const yTopStart = 45;
                        const yTopPeak = 20;
                        
                        if (diff === 2) {
                            context.moveTo(startX, yTopStart);
                            context.lineTo(startX, yTopPeak);
                            context.lineTo(endX, yTopPeak);
                            context.lineTo(endX, yTopStart);
                        } else if (diff === 1) {
                            context.moveTo(startX, yTopStart);
                            context.lineTo(drawMidX, yTopPeak - 2);
                            context.lineTo(endX, yTopStart);
                        }
                    } else {
                        const yBotStart = 135;
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
                    }
                    context.stroke();
                }
            }
            
            // 다이아토닉 코드 (장/단 화음 로마숫자) 표시
            context.setFont("Arial", 14, "bold");
            context.setFillStyle("#e74c3c");
            
            let diatonic = [];
            if (scaleType === 'minor') {
                if (stackChords === '4') diatonic = ['im7', 'iiø7', 'IIImaj7', 'ivm7', 'vm7', 'VImaj7', 'VII7', 'im7'];
                else diatonic = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII', 'i'];
            } else {
                if (stackChords === '4') diatonic = ['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7', 'Imaj7'];
                else diatonic = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'I'];
            }

            for (let i = 0; i < notes.length; i++) {
                const x = notes[i].getAbsoluteX() + 15;
                const y = 190; // 온음/반음 기호보다 살짝 아래에 배치
                context.fillText(diatonic[i] || '', x - 8, y);
            }
        } else if (dataType === 'chord') {
            context.setFont("Arial", 16, "bold");
            context.setFillStyle("#0984e3");
            
            const romanNumerals = ['Chord', 'I', 'III', 'V', 'VII'];
            
            for (let i = 0; i < notes.length; i++) {
                const x = notes[i].getAbsoluteX() + 15;
                const y = 165; // 음표와 떨어지도록 아래로 이동
                
                const text = romanNumerals[i] || '';
                const offsetX = text === 'Chord' ? 20 : 8;
                context.fillText(text, x - offsetX, y);
            }
        }
    } catch (e) {
        console.error("VexFlow 렌더링 에러 상세:", e);
        container.innerHTML = `<p style="color: red; font-weight: bold;">악보 렌더링 에러: ${e.message}</p><pre style="font-size: 11px; overflow-x: auto; color: #555;">${e.stack}</pre>`;
    }
}