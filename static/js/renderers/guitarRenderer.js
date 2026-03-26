/**
 * 기타 코드 다이어그램(Chord Box) 및 스케일 지판 렌더링 로직
 * 외부 라이브러리 없이 자체 구현한 순수 SVG 그래픽을 활용하여 렌더링
 */
function renderGuitar(chordDataList, chordName) {
    const container = document.getElementById("guitar-container");
    
    // 데이터 유효성 검사
    if (!chordDataList) {
        container.innerHTML = `<p style="color: #999; font-size: 14px; text-align: center; padding: 20px;">선택한 코드의 기타 운지 데이터가 없습니다.</p>`;
        return;
    }

    // 단일 객체가 들어왔을 경우 호환성을 위해 배열로 감싸기
    if (!Array.isArray(chordDataList)) {
        if (chordDataList.positions) chordDataList = [chordDataList];
        else {
            container.innerHTML = `<p style="color: #999; font-size: 14px; text-align: center; padding: 20px;">선택한 코드의 기타 운지 데이터가 유효하지 않습니다.</p>`;
            return;
        }
    }

    if (chordDataList.length === 0) {
        container.innerHTML = `<p style="color: #999; font-size: 14px; text-align: center; padding: 20px;">선택한 코드의 기타 운지 데이터가 없습니다.</p>`;
        return;
    }

    container.innerHTML = ""; // 기존 렌더링 초기화

    try {
        // Flex 레이아웃으로 변경하여 1개일 때도 가운데 정렬 유지 (3개 배치도 호환)
        container.style.display = "flex";
        container.style.flexWrap = "wrap";
        container.style.gap = "20px";
        container.style.justifyContent = "center";
        container.style.padding = "10px";

        let renderedCount = 0;

        // 전달된 모든 포지션(chordData)을 순회
        chordDataList.forEach((chordData, posIndex) => {
            if (!chordData || !chordData.positions) return;

            // 해당 포지션 내의 여러 운지법(fingering)을 순회 (없으면 기본값으로 1회 순회)
            const fingerings = chordData.fingerings && chordData.fingerings.length > 0 
                              ? chordData.fingerings 
                              : [null];

            fingerings.forEach((fingering, fingIndex) => {
                const wrapper = document.createElement("div");
                wrapper.style.display = "flex";
                wrapper.style.flexDirection = "column";
                wrapper.style.alignItems = "center";
                wrapper.style.background = "#fff";
                wrapper.style.border = "1px solid #ddd";
                wrapper.style.borderRadius = "8px";
                wrapper.style.padding = "20px";
                wrapper.style.boxShadow = "0 4px 10px rgba(0,0,0,0.1)";
                wrapper.style.width = "340px"; // 넓이를 고정하여 여러 개일 때 3열 배치를 유도
                wrapper.style.maxWidth = "100%"; // 모바일 등 좁은 화면 대응
                
                // Layout 2(손가락 번호 외곽 배치) 스타일을 유지하면서 가로형 SVG로 직접 렌더링
                const svgNS = "http://www.w3.org/2000/svg";
                const svg = document.createElementNS(svgNS, "svg");
                const width = 340;
                const height = 200; // 하단 fr 텍스트가 잘리지 않도록 높이 20px 추가
                // 화면에 꽉 차게 반응형으로 조정하기 위해 viewBox를 사용
                svg.setAttribute("width", "100%");
                svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

                const pl = 50, pr = 50, pt = 40, pb = 40; // 하단 여백 늘림
                const gridW = width - pl - pr;
                const gridH = height - pt - pb;
                const numFrets = 5;
                const fretSpc = gridW / numFrets;
                const strSpc = gridH / 5; // 6현 간격

                let frets = chordData.positions
                    .filter(p => String(p).toLowerCase() !== "x" && p !== "" && p !== "0")
                    .map(p => parseInt(p, 10));
                let minFret = frets.length > 0 ? Math.min(...frets) : 1;
                let startFret = minFret <= 2 ? 1 : minFret;

                // 코드 이름 및 변형(Variation) 표시 (상단 중앙)
                const titleTxt = document.createElementNS(svgNS, "text");
                titleTxt.setAttribute("x", width / 2);
                titleTxt.setAttribute("y", 25);
                titleTxt.setAttribute("font-size", "22");
                titleTxt.setAttribute("font-weight", "bold");
                titleTxt.setAttribute("fill", "#333");
                titleTxt.setAttribute("text-anchor", "middle");
                
                let titleStr = chordName || "";
                if (chordDataList.length > 1 || fingerings.length > 1) {
                    titleStr += ` (v${posIndex + 1}${fingerings.length > 1 ? '-' + (fingIndex + 1) : ''})`;
                }
                titleTxt.textContent = titleStr;
                svg.appendChild(titleTxt);

                // 프렛(세로선) 그리기
                for (let i = 0; i <= numFrets; i++) {
                    const line = document.createElementNS(svgNS, "line");
                    let x = pl + i * fretSpc;
                    line.setAttribute("x1", x); line.setAttribute("y1", pt);
                    line.setAttribute("x2", x); line.setAttribute("y2", pt + gridH);
                    line.setAttribute("stroke", i === 0 && startFret === 1 ? "#2c3e50" : "#95a5a6");
                    line.setAttribute("stroke-width", i === 0 && startFret === 1 ? "6" : "2");
                    svg.appendChild(line);
                }

                // 시작 프렛 라벨
                if (startFret > 1) {
                    const fretLabel = document.createElementNS(svgNS, "text");
                    fretLabel.setAttribute("x", pl + fretSpc / 2);
                    // 여백을 조금 띄우고 폰트 크기를 키움 (12 -> 16, y좌표 18 -> 24)
                    fretLabel.setAttribute("y", pt + gridH + 24);
                    fretLabel.setAttribute("font-size", "16");
                    fretLabel.setAttribute("font-weight", "bold");
                    fretLabel.setAttribute("fill", "#7f8c8d");
                    fretLabel.setAttribute("text-anchor", "middle");
                    fretLabel.textContent = startFret + "fr";
                    svg.appendChild(fretLabel);
                }

                // 기타 줄(가로선) 그리기
                for (let i = 0; i < 6; i++) {
                    const line = document.createElementNS(svgNS, "line");
                    let y = pt + i * strSpc;
                    line.setAttribute("x1", pl); line.setAttribute("y1", y);
                    line.setAttribute("x2", pl + gridW); line.setAttribute("y2", y);
                    line.setAttribute("stroke", "#34495e");
                    line.setAttribute("stroke-width", 1 + i * 0.4); // 6번줄(아래)이 두껍게
                    svg.appendChild(line);
                }

                // 마커 및 손가락 번호 표기
                for (let s = 0; s < 6; s++) {
                    let posIdx = 5 - s; // 0번줄(1번현, High E) ~ 5번줄(6번현, Low E)
                    let fretVal = chordData.positions[posIdx];
                    let fretValStr = String(fretVal).toLowerCase();
                    let y = pt + s * strSpc;

                    if (fretValStr === "x") {
                        const xMark = document.createElementNS(svgNS, "text");
                        xMark.setAttribute("x", pl - 20); xMark.setAttribute("y", y + 5);
                        xMark.setAttribute("font-size", "14"); xMark.setAttribute("font-weight", "bold");
                        xMark.setAttribute("fill", "#e74c3c"); xMark.setAttribute("text-anchor", "middle");
                        xMark.textContent = "X";
                        svg.appendChild(xMark);
                    } else if (fretValStr === "0" || fretValStr === "") {
                        const oMark = document.createElementNS(svgNS, "text");
                        oMark.setAttribute("x", pl - 20); oMark.setAttribute("y", y + 5);
                        oMark.setAttribute("font-size", "14"); oMark.setAttribute("font-weight", "bold");
                        oMark.setAttribute("fill", "#3498db"); oMark.setAttribute("text-anchor", "middle");
                        oMark.textContent = "O";
                        svg.appendChild(oMark);
                    } else {
                        let fretNum = parseInt(fretVal, 10);
                        let relFret = fretNum - startFret + 1;
                        if (relFret > 0 && relFret <= numFrets) {
                            let cx = pl + (relFret - 0.5) * fretSpc;
                            const dot = document.createElementNS(svgNS, "circle");
                            dot.setAttribute("cx", cx); dot.setAttribute("cy", y);
                            dot.setAttribute("r", "8"); dot.setAttribute("fill", "#2c3e50");
                            svg.appendChild(dot);
                        }
                    }

                    // 우측에 손가락 번호
                    if (fingering && fingering[posIdx]) {
                        let fingVal = String(fingering[posIdx]);
                        if (fingVal !== "0" && fingVal !== "" && fingVal !== "-") {
                            const fingTxt = document.createElementNS(svgNS, "text");
                            fingTxt.setAttribute("x", pl + gridW + 25); fingTxt.setAttribute("y", y + 5);
                            fingTxt.setAttribute("font-size", "14"); fingTxt.setAttribute("font-weight", "bold");
                            fingTxt.setAttribute("fill", "#0984e3"); fingTxt.setAttribute("text-anchor", "middle");
                            fingTxt.textContent = fingVal;
                            svg.appendChild(fingTxt);
                        }
                    }
                }

                wrapper.appendChild(svg);

                // 기타의 실제 음역대(E2=40) 기준으로 복구합니다.
                const stringMidis = [40, 45, 50, 55, 59, 64];
                const midisToPlay = [];
                chordData.positions.forEach((fret, index) => {
                    if (String(fret).toLowerCase() !== "x" && String(fret) !== "") {
                        midisToPlay.push(stringMidis[index] + parseInt(fret, 10));
                    }
                });

                wrapper.style.cursor = "pointer";
                wrapper.title = "클릭하여 코드 소리 듣기";
                wrapper.onclick = () => {
                    // 기타 전용 컨트롤 함수 호출 (아르페지오 모드)
                    if (window.playGuitarAction) {
                        window.playGuitarAction(midisToPlay, true, 90); 
                    }
                };

                container.appendChild(wrapper);
                renderedCount++;
            });
        });

        if (renderedCount === 0) {
            container.innerHTML = `<p style="color: #999; font-size: 14px; text-align: center; padding: 20px;">타브 악보로 변환할 수 있는 데이터가 없습니다.</p>`;
        }

    } catch (e) {
        console.error("VexFlow 타브 악보 렌더링 에러:", e);
        container.innerHTML = `<p style="color: red; font-size:12px; text-align: center;">타브 악보 렌더링 실패: ${e.message}</p>`;
    }
}

/**
 * 스케일 선택 시: 기타 지판 전체(15프렛)를 가로로 길게 렌더링하는 함수
 */
function renderGuitarScale(notesData) {
    const container = document.getElementById("guitar-container");
    if (!notesData || notesData.length === 0) return;
    
    container.innerHTML = ""; // 기존 렌더링 초기화
    container.style.display = "block"; // 스케일 뷰는 Flex 대신 Block 사용
    
    const activePitchClasses = [...new Set(notesData.map(n => n.piano_key % 12).filter(k => !isNaN(k)))];
    const rootPitchClass = notesData[0].piano_key % 12;
    
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    const width = 850;
    const height = 200; // 스케일 뷰에서도 하단 숫자가 잘리지 않게 높이 증가
    svg.setAttribute("width", "100%");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    
    const pt = 20, pb = 40, pl = 40, pr = 30; // 하단 여백 늘림
    const gridW = width - pl - pr;
    const gridH = height - pt - pb;
    const numFrets = 15;
    const fretSpc = gridW / numFrets;
    const strSpc = gridH / 5;
    
    // 1. 프렛 라인 및 번호 그리기
    for(let i = 0; i <= numFrets; i++) {
        const line = document.createElementNS(svgNS, "line");
        let x = pl + i * fretSpc;
        line.setAttribute("x1", x);
        line.setAttribute("y1", pt);
        line.setAttribute("x2", x);
        line.setAttribute("y2", pt + gridH);
        line.setAttribute("stroke", i === 0 ? "#2c3e50" : "#95a5a6");
        line.setAttribute("stroke-width", i === 0 ? "5" : "2");
        svg.appendChild(line);
        
        if (i > 0) {
            // 프렛 번호에 깔끔한 둥근 배경 박스 추가
            const bgW = 18;
            const bgH = 16;
            const bgX = x - fretSpc/2 - bgW/2;
            const bgY = pt + gridH + 18; // 지판 하단의 음표 동그라미와 겹치지 않도록 여백 증가
            
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", bgX); rect.setAttribute("y", bgY);
            rect.setAttribute("width", bgW); rect.setAttribute("height", bgH);
            rect.setAttribute("rx", "4"); rect.setAttribute("fill", "#f1f2f6");
            svg.appendChild(rect);

            const txt = document.createElementNS(svgNS, "text");
            txt.setAttribute("x", x - fretSpc/2);
            txt.setAttribute("y", bgY + 12); // 중앙 정렬
            txt.setAttribute("font-size", "11");
            txt.setAttribute("font-weight", "bold");
            txt.setAttribute("fill", "#34495e");
            txt.setAttribute("text-anchor", "middle");
            txt.textContent = i;
            svg.appendChild(txt);
        }
    }
    
    // 2. 지판 마커 (3, 5, 7, 9, 12, 15프렛 점)
    const markers = [3, 5, 7, 9, 12, 15];
    markers.forEach(fret => {
        if (fret <= numFrets) {
            let cx = pl + (fret - 0.5) * fretSpc;
            if (fret === 12) {
                [pt + strSpc * 1.5, pt + strSpc * 3.5].forEach(cy => {
                    const dot = document.createElementNS(svgNS, "circle");
                    dot.setAttribute("cx", cx); dot.setAttribute("cy", cy);
                    dot.setAttribute("r", "5"); dot.setAttribute("fill", "#ecf0f1");
                    svg.appendChild(dot);
                });
            } else {
                const dot = document.createElementNS(svgNS, "circle");
                dot.setAttribute("cx", cx); dot.setAttribute("cy", pt + gridH / 2);
                dot.setAttribute("r", "6"); dot.setAttribute("fill", "#ecf0f1");
                svg.appendChild(dot);
            }
        }
    });

    // 3. 기타 줄 (1번줄~6번줄) 그리기
    for(let i = 0; i < 6; i++) {
        const line = document.createElementNS(svgNS, "line");
        let y = pt + i * strSpc;
        line.setAttribute("x1", pl); line.setAttribute("y1", y);
        line.setAttribute("x2", pl + gridW); line.setAttribute("y2", y);
        line.setAttribute("stroke", "#34495e");
        line.setAttribute("stroke-width", 1 + (5 - i) * 0.4); // 굵은 줄 표현
        svg.appendChild(line);
    }
    
    // 4. 구성음(Note) 동그라미 표기
    // 기타의 실제 음역대로 복구
    const stringsMidi = [64, 59, 55, 50, 45, 40]; // 1번줄 ~ 6번줄 MIDI
    for(let s = 0; s < 6; s++) {
        let y = pt + s * strSpc;
        for(let f = 0; f <= numFrets; f++) {
            let midi = stringsMidi[s] + f;
            let pc = midi % 12;
            if (activePitchClasses.includes(pc)) {
                const isRoot = pc === rootPitchClass;
                let cx = f === 0 ? pl - 12 : pl + (f - 0.5) * fretSpc;
                
                const group = document.createElementNS(svgNS, "g");
                group.style.cursor = "pointer";
                
                const dot = document.createElementNS(svgNS, "circle");
                dot.setAttribute("cx", cx); dot.setAttribute("cy", y);
                dot.setAttribute("r", isRoot ? "11" : "9");
                dot.setAttribute("fill", isRoot ? "#e74c3c" : "#3498db");
                dot.setAttribute("stroke", isRoot ? "#c0392b" : "#2980b9"); // 테두리를 추가하여 입체감 부여
                dot.setAttribute("stroke-width", "2");
                
                const txt = document.createElementNS(svgNS, "text");
                txt.setAttribute("x", cx); txt.setAttribute("y", y + 3.8); // 텍스트를 정중앙으로 미세조정
                txt.setAttribute("font-size", isRoot ? "11" : "10");
                txt.setAttribute("font-weight", "bold");
                txt.setAttribute("fill", "#fff");
                txt.setAttribute("text-anchor", "middle");
                
                let noteObj = notesData.find(n => n.piano_key % 12 === pc);
                txt.textContent = noteObj ? noteObj.pitch.replace(/[0-9]/g, '').replace(/-/g, '♭') : ""; // 소문자 b 대신 실제 플랫 기호 사용
                
                group.appendChild(dot); group.appendChild(txt);
                
                // 단일음 클릭 이벤트
                group.onclick = () => {
                    // 기타 전용 컨트롤 함수 호출 (단일음 모드)
                    if (window.playGuitarAction) {
                        window.playGuitarAction([midi], false);
                    }
                };
                svg.appendChild(group);
            }
        }
    }
    container.appendChild(svg);
}