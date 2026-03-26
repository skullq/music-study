/**
 * 슬래시 코드(분수코드)의 베이스 음을 계산하여 데이터베이스 키 형식에 맞게 반환합니다.
 */
window.getNoteNameForSlash = function(root, interval) {
    const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let cleanRoot = root.replace('-', 'b');
    const flatToSharp = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };
    if (flatToSharp[cleanRoot]) cleanRoot = flatToSharp[cleanRoot];
    let baseIndex = sharpNames.indexOf(cleanRoot);
    if (baseIndex === -1) baseIndex = 0;
    return '/' + sharpNames[(baseIndex + interval) % 12];
};

/**
 * 애플리케이션에서 사용하는 모든 음악적 정의(스케일, 코드)를 담는 중앙 데이터 객체입니다.
 * 새로운 스케일이나 코드를 추가/수정할 때 이 객체만 관리하면
 * UI(드롭다운 메뉴)와 내부 로직(API 요청, 이름 생성)에 모두 자동으로 반영됩니다.
 */
window.MUSIC_DEFINITIONS = {
    scale: {
        text: '스케일 (Scale)',
        types: {
            major: { text: 'Major' },
            minor: { text: 'Minor' }
        }
    },
    triad: {
        text: '3화음 (Triad)',
        types: {
            major_triad: { text: 'Major Triad', suffix: '' },
            minor_triad: { text: 'Minor Triad', suffix: 'm' },
            augmented_triad: { text: 'Augmented Triad', suffix: 'aug' },
            diminished_triad: { text: 'Diminished Triad', suffix: 'dim' }
        }
    },
    sixth: {
        text: '6화음 (6th Chord)',
        types: {
            major_6: { text: 'Major 6th', suffix: '6' },
            minor_6: { text: 'Minor 6th', suffix: 'm6' }
        }
    },
    seventh: {
        text: '7화음 (7th Chord)',
        types: {
            major_7: { text: 'Major 7th', suffix: 'maj7' },
            minor_7: { text: 'Minor 7th', suffix: 'm7' },
            dominant_7: { text: 'Dominant 7th', suffix: '7' },
            half_dim_7: { text: 'Half-Diminished 7th', suffix: 'm7b5' },
            diminished_7: { text: 'Diminished 7th', suffix: 'dim7' }
        }
    },
    ninth: {
        text: '9화음 (9th Chord)',
        types: {
            major_9: { text: 'Major 9th', suffix: 'maj9' },
            minor_9: { text: 'Minor 9th', suffix: 'm9' },
            dominant_9: { text: 'Dominant 9th', suffix: '9' }
        }
    },
    eleventh: {
        text: '11화음 (11th Chord)',
        types: {
            major_11: { text: 'Major 11th', suffix: 'maj11' },
            minor_11: { text: 'Minor 11th', suffix: 'm11' },
            dominant_11: { text: 'Dominant 11th', suffix: '11' }
        }
    },
    thirteenth: {
        text: '13화음 (13th Chord)',
        types: {
            major_13: { text: 'Major 13th', suffix: 'maj13' },
            minor_13: { text: 'Minor 13th', suffix: 'm13' },
            dominant_13: { text: 'Dominant 13th', suffix: '13' }
        }
    },
    suspended: {
        text: '서스펜디드 (Sus)',
        types: {
            sus4: { text: 'Sus4', suffix: 'sus4' },
            sus2: { text: 'Sus2', suffix: 'sus2' },
            dom_7sus4: { text: '7sus4', suffix: '7sus4' }
        }
    },
    added: {
        text: '부가화음 (Add)',
        types: {
            add9: { text: 'Add9', suffix: 'add9' }
        }
    },
    slash: {
        text: '분수코드 (Slash)',
        types: {
            slash_maj_3: { text: 'Major /3 (1st Inv)', suffix: (r) => getNoteNameForSlash(r, 4) },
            slash_maj_5: { text: 'Major /5 (2nd Inv)', suffix: (r) => getNoteNameForSlash(r, 7) },
            slash_min_3: { text: 'Minor /b3 (1st Inv)', suffix: (r) => 'm' + getNoteNameForSlash(r, 3) },
            slash_min_5: { text: 'Minor /5 (2nd Inv)', suffix: (r) => 'm' + getNoteNameForSlash(r, 7) }
        }
    }
};

/**
 * 카테고리 변경 시 세부 타입 드롭다운 업데이트
 */
function updateTypes() {
    const category = document.getElementById('category').value;
    const typeSelect = document.getElementById('type');
    const stackSelect = document.getElementById('stack-chords');
    const displayModeSelect = document.getElementById('chord-display-mode');
    typeSelect.innerHTML = '';
    
    const types = MUSIC_DEFINITIONS[category].types;
    for (const typeKey in types) {
        const option = document.createElement('option');
        option.value = typeKey;
        option.text = types[typeKey].text;
        typeSelect.appendChild(option);
    }

    // 스케일일 때만 화음 쌓기 옵션 보이기 (코드 표시 옵션은 숨김)
    if (category === 'scale') {
        stackSelect.style.display = 'inline-block';
        if (displayModeSelect) displayModeSelect.style.display = 'none';
    } else {
        stackSelect.style.display = 'none';
        if (displayModeSelect) displayModeSelect.style.display = 'inline-block';
    }
}

/**
 * 페이지 로드 시 카테고리 드롭다운 메뉴를 동적으로 생성
 */
function populateCategories() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;

    for (const categoryKey in MUSIC_DEFINITIONS) {
        const option = document.createElement('option');
        option.value = categoryKey;
        option.text = MUSIC_DEFINITIONS[categoryKey].text;
        categorySelect.appendChild(option);
    }
    // 첫 번째 카테고리에 대한 타입 메뉴를 초기에 채워넣음
    updateTypes();
}

/**
 * 프론트엔드 화음(Chord) 데이터 제너레이터
 * 백엔드가 6, 9, 11, 13 텐션 코드를 지원하지 않는 경우를 대비해, 프론트엔드에서 직접 정확한 구성음을 계산합니다.
 */
function generateChordData(root, type) {
    const chordIntervals = {
        "major_triad": [0, 4, 7],
        "minor_triad": [0, 3, 7],
        "augmented_triad": [0, 4, 8],
        "diminished_triad": [0, 3, 6],
        "major_6": [0, 4, 7, 9],
        "minor_6": [0, 3, 7, 9],
        "major_7": [0, 4, 7, 11],
        "minor_7": [0, 3, 7, 10],
        "dominant_7": [0, 4, 7, 10],
        "half_dim_7": [0, 3, 6, 10],
        "diminished_7": [0, 3, 6, 9],
        "major_9": [0, 4, 7, 11, 14],
        "minor_9": [0, 3, 7, 10, 14],
        "dominant_9": [0, 4, 7, 10, 14],
        "major_11": [0, 4, 7, 11, 14, 17],
        "minor_11": [0, 3, 7, 10, 14, 17],
        "dominant_11": [0, 4, 7, 10, 14, 17],
        "major_13": [0, 4, 7, 11, 14, 17, 21],
        "minor_13": [0, 3, 7, 10, 14, 17, 21],
        "dominant_13": [0, 4, 7, 10, 14, 17, 21],
        "sus4": [0, 5, 7],
        "sus2": [0, 2, 7],
        "dom_7sus4": [0, 5, 7, 10],
        "add9": [0, 4, 7, 14],
        "slash_maj_3": [-8, 0, 7],
        "slash_maj_5": [-5, 0, 4],
        "slash_min_3": [-9, 0, 7],
        "slash_min_5": [-5, 0, 3]
    };

    const intervals = chordIntervals[type];
    if (!intervals) return null;

    const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    let cleanRoot = root.replace('-', 'b');
    const useFlats = cleanRoot.includes('b') || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(cleanRoot);
    const names = useFlats ? flatNames : sharpNames;

    let baseIndex = sharpNames.indexOf(cleanRoot);
    if (baseIndex === -1) baseIndex = flatNames.indexOf(cleanRoot);
    if (baseIndex === -1) baseIndex = 0;

    const rootBaseMidi = 60 + baseIndex; // 기준음 C4 = 60

    const notes = intervals.map(interval => {
        const midi = rootBaseMidi + interval;
        const octave = Math.floor(midi / 12) - 1;
        const noteName = names[midi % 12];
        return {
            pitch: `${noteName}${octave}`,
            piano_key: midi
        };
    });

    return {
        type: "chord",
        scale_type: type,
        notes: notes
    };
}

/**
 * FastAPI 백엔드와 통신하여 데이터를 Fetching하는 모듈
 */
async function fetchMusicData(root, type, isChord = false) {
    if (isChord) {
        // 화음일 경우 백엔드 통신 없이, 프론트엔드에서 즉시 텐션 코드 데이터 생성
        const localData = generateChordData(root, type);
        if (localData) return localData;
    }

    const endpoint = isChord ? '/api/chord' : '/api/scale';
    try {
        const response = await fetch(`${endpoint}?root=${encodeURIComponent(root)}&type=${encodeURIComponent(type)}`);
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API 응답 에러 (${response.status}): ${errText}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(`백엔드 연산 에러: ${data.error}`);
        }
        return data;
    } catch (error) {
        console.error("데이터 Fetching 중 상세 오류:", error);
        alert(`데이터 처리 중 문제가 발생했습니다:\n${error.message}`);
        return null;
    }
}

async function fetchAndRender() {
    const root = document.getElementById('root-note').value;
    const category = document.getElementById('category').value;
    const typeSelect = document.getElementById('type');
    const stackSelect = document.getElementById('stack-chords');
    const type = typeSelect.value;
    const stackChords = stackSelect.value;
    
    // 선택된 텍스트 자체(예: "Major Triad")를 가져와서 제목으로 사용
    let displayType = typeSelect.options[typeSelect.selectedIndex].text;
    
    if (category === 'scale') {
        if (stackChords === '3') displayType += " (Triads)";
        else if (stackChords === '4') displayType += " (7ths)";
    }
    
    document.getElementById('staff-title').innerText = `오선지 (${root} ${displayType})`;
    document.getElementById('piano-title').innerText = `피아노 건반 (${root} ${displayType})`;
    document.getElementById('guitar-title').innerText = `기타 지판 (${root} ${displayType})`; // 기타 지판 제목은 아래에서 코드 데이터 유무에 따라 다시 설정됩니다.


    const isChord = (category !== 'scale');
    const data = await fetchMusicData(root, type, isChord);
    if(data && data.notes) {
        // [수정] 기타 연주자의 시각에 맞춰, 피아노와 오선지 등 모든 데이터의 기준 옥타브를
        // 기타의 실제 소리(기보음보다 1옥타브 낮음)에 맞게 -12 하향 조정합니다.
        data.notes.forEach(n => {
            if (n.piano_key) n.piano_key -= 12;
            if (n.triad_midis) n.triad_midis = n.triad_midis.map(m => m - 12);
            if (n.seventh_midis) n.seventh_midis = n.seventh_midis.map(m => m - 12);
        });

        if (window.activeStaffMidis) window.activeStaffMidis = []; // 새로운 렌더링 시 기존 하이라이트 초기화
        
        // 대소문자 방어 로직 위치를 최상단으로 끌어올림
        let cleanRoot = root.trim();
        cleanRoot = cleanRoot.charAt(0).toUpperCase() + cleanRoot.slice(1);

        // 스케일/코드에 따라 렌더링 함수에 전달할 파라미터 준비
        const suffixVal = isChord ? MUSIC_DEFINITIONS[category].types[type].suffix : "";
        const suffix = (typeof suffixVal === 'function') ? suffixVal(cleanRoot) : suffixVal;

        renderStaff(data.notes, data.type, data.scale_type, stackChords, suffix); 
        renderPiano(data.notes, data.type, data.scale_type, stackChords);
        
        // 코드일 경우에만 chords.js(CHORD_COLLECTION)에서 데이터를 찾아 렌더링
        if (isChord) {
            const chordName = cleanRoot + suffix;
            
            let foundData = null;
            let errorReason = "";

            if (typeof CHORD_COLLECTION !== "undefined" && CHORD_COLLECTION[chordName]) {
                foundData = CHORD_COLLECTION[chordName];
            } else if (typeof CHORD_COLLECTION === "undefined") {
                errorReason = " (사전 파일 로드 안됨 - index.html 확인)";
            } else {
                errorReason = " (사전에 등록되지 않은 코드)";
            }
            
            // [기능 추가] UI 옵션에 따라 대표 코드만 보여줄지, 전체를 보여줄지 결정합니다.
            const displayMode = document.getElementById('chord-display-mode') ? document.getElementById('chord-display-mode').value : 'first';
            let targetData = foundData;
            
            if (foundData && displayMode === 'first') {
                targetData = [foundData[0]]; // 배열의 첫 번째 객체(대표 코드)만 남깁니다.
            }

            // [기능 추가] 기타 지판 타이틀 아래에 검색된 코드 이름과 데이터 값 표시
            const dataString = targetData ? `${targetData.length}개의 운지법 렌더링` : `<span style="color:red; font-weight:bold;">데이터 없음${errorReason}</span>`;
            document.getElementById('guitar-title').innerHTML = `기타 지판 (${cleanRoot} ${displayType})<br><span style="font-size:12px; color:#555; font-weight:normal; display:inline-block; margin-top:5px; padding:4px 8px; background:#f0f0f0; border-radius:4px; letter-spacing:0;">검색 코드명: <strong style="color:#d35400;">${chordName}</strong> | 데이터: <span style="color:#0984e3;">${dataString}</span></span>`;
            
            if (targetData) {
                renderGuitar(targetData, chordName);
            } else {
                document.getElementById('guitar-container').innerHTML = `<p style="color: #999; font-size: 14px; text-align: center; padding: 20px;">'${chordName}'에 대한 기타 운지 데이터가 없습니다.</p>`;
            }
        } else {
            // 스케일의 경우 지판 전체를 렌더링
            if (typeof renderGuitarScale !== "undefined") {
                renderGuitarScale(data.notes);
            } else {
                document.getElementById('guitar-container').innerHTML = `<p style="color: #999; font-size: 14px; text-align: center; padding: 20px;">스케일 렌더링 기능이 없습니다.</p>`;
            }
        }
    }
}

// 초기 화면 로드 시 카테고리 및 세부 타입 드롭다운 세팅
window.addEventListener('DOMContentLoaded', populateCategories);

/**
 * 배열로 전달된 MIDI 노트들을 아르페지오(분산화음)로 '챠라랑~' 연주하는 전역 함수
 */
window.playArpeggio = function(midis, delayMs = 60) {
    if (!midis || midis.length === 0) return;

    let accumulatedMidis = [];

    midis.forEach((midi, index) => {
        setTimeout(() => {
            if (window.playTone) window.playTone(midi);
            
            // 피아노 건반은 화음이 완성되도록 누적해서 눌림 상태 유지
            accumulatedMidis.push(midi);
            if (window.highlightPianoKeys) window.highlightPianoKeys([...accumulatedMidis]);
            // 오선지는 현재 연주되는 단일 음표만 순차적으로 하이라이트
            if (window.highlightStaffNote) window.highlightStaffNote(midi);
        }, index * delayMs);
    });

    // 마지막 음이 연주된 후 여운을 길게(400ms) 유지한 뒤 모든 하이라이트 해제
    const totalDuration = midis.length * delayMs;
    setTimeout(() => {
        if (window.highlightPianoKeys) window.highlightPianoKeys([]); // 피아노 하이라이트 해제
        if (window.highlightStaffNotes) window.highlightStaffNotes([]); // 오선지 하이라이트 해제
    }, totalDuration + 400); 
};

/**
 * 기타 지판 전용 클릭 이벤트 제어 함수
 * 오선지 색상 변경 없이 피아노 건반 하이라이트와 소리 재생만 담당합니다.
 */
window.playGuitarAction = function(midis, isArpeggio = true, delayMs = 90) {
    if (!midis || midis.length === 0) return;

    if (isArpeggio) {
        let accumulatedMidis = [];
        midis.forEach((midi, index) => {
            setTimeout(() => {
                if (window.playTone) window.playTone(midi);
                accumulatedMidis.push(midi);
                if (window.highlightPianoKeys) window.highlightPianoKeys([...accumulatedMidis]);
            }, index * delayMs);
        });

        const totalDuration = midis.length * delayMs;
        setTimeout(() => {
            if (window.highlightPianoKeys) window.highlightPianoKeys([]); 
        }, totalDuration + 400); 
    } else {
        midis.forEach(midi => { if (window.playTone) window.playTone(midi); });
        if (window.highlightPianoKeys) window.highlightPianoKeys(midis);
        
        setTimeout(() => {
            if (window.highlightPianoKeys) window.highlightPianoKeys([]);
        }, 400); // 단일음도 잠깐 보여준 뒤 하이라이트 해제
    }
};