window.currentStaffNotesData = null;
window.currentDataType = 'scale';
window.activeStaffMidi = null;

window.highlightStaffNote = function(midi) {
    window.activeStaffMidi = midi;
    if (window.currentStaffNotesData) renderStaff(window.currentStaffNotesData, window.currentDataType);
    
    // 소리가 끝나는 시간(1.5초) 후 하이라이트 원상복구
    setTimeout(() => {
        if (window.activeStaffMidi === midi) {
            window.activeStaffMidi = null;
            if (window.currentStaffNotesData) renderStaff(window.currentStaffNotesData, window.currentDataType);
        }
    }, 1500);
};

/**
 * VexFlow 초기화 및 악보 그리기 로직
 */
function renderStaff(notesData, dataType = 'scale') {
    window.currentStaffNotesData = notesData;
    window.currentDataType = dataType;
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
            // 1. music21의 플랫('-') 기호를 VexFlow 플랫('b') 기호로 변환
            let pitchName = n.pitch.toLowerCase().replace(/-/g, 'b');
            const key = pitchName.replace(/([0-9])/, '/$1'); 
            
            const note = new VF.StaveNote({ keys: [key], duration: "q" });
            
            // 2. 임시표(샵, 플랫)가 있는 경우 원본 데이터(n.pitch)를 기준으로 추가
            // key.includes("b")를 사용하면 'B(시)' 음표('b/4')까지 플랫으로 인식되는 버그 방지
            if (n.pitch.includes("-")) note.addModifier(new VF.Accidental("b"));
            if (n.pitch.includes("#")) note.addModifier(new VF.Accidental("#"));
            
            // 피아노 건반 클릭 시 해당 음표 하이라이팅 (빨간색)
            if (n.piano_key === window.activeStaffMidi) {
                note.setStyle({fillStyle: "#e74c3c", strokeStyle: "#e74c3c"});
            }

            return note;
        });

        // 화음(Chord)일 경우, 마지막에 3화음이 합쳐진 블록 코드를 추가
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
            
            notes.push(blockChord);
        }

        // 박자 계산 (현재는 데이터 길이에 맞춰 유동적으로 렌더링)
        const voice = new VF.Voice({ num_beats: notes.length, beat_value: 4 });
        voice.addTickables(notes);

        new VF.Formatter().joinVoices([voice]).format([voice], 450);
        voice.draw(context, stave);
        
        if (dataType === 'scale') {
            // 오선지 아래에 온음(Whole step) / 반음(Half step) 간격 기호 그리기
            context.setStrokeStyle('#0984e3'); // 강조된 건반과 어울리는 파란색 계열
            context.setLineWidth(2);

            for (let i = 0; i < notes.length - 1; i++) {
                const midi1 = notesData[i].piano_key;
                const midi2 = notesData[i + 1].piano_key;
                if (midi1 == null || midi2 == null) continue;

                const diff = Math.abs(midi2 - midi1);

                // 음표의 대략적인 중앙 X 좌표 계산 (getAbsoluteX()는 음표 왼쪽 끝 좌표이므로 +15 보정)
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
        } else if (dataType === 'chord') {
            // 화음(Triad)인 경우 온음/반음 기호 대신 로마 숫자(I, III, V)를 표시
            context.setFont("Arial", 16, "bold");
            context.setFillStyle("#0984e3");
            
            const romanNumerals = ['I', 'III', 'V', 'Chord'];
            
            for (let i = 0; i < notes.length; i++) {
                const x = notes[i].getAbsoluteX() + 15;
                const y = 165; // 음표와 떨어지도록 아래로 이동
                
                const text = romanNumerals[i] || '';
                const offsetX = text === 'Chord' ? 20 : 8; // 'Chord' 텍스트는 길이가 길어 중앙 정렬을 위해 오프셋 조정
                context.fillText(text, x - offsetX, y);
            }
        }
    } catch (e) {
        console.error("VexFlow 렌더링 에러 상세:", e);
        container.innerHTML = `<p style="color: red; font-weight: bold;">악보 렌더링 에러: ${e.message}</p><pre style="font-size: 11px; overflow-x: auto; color: #555;">${e.stack}</pre>`;
    }
}