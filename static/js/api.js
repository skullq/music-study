/**
 * 동적 드롭다운 메뉴 데이터
 * 향후 새로운 스케일이나 코드가 추가되면 이 배열에만 추가하면 됩니다.
 */
const typeOptions = {
    scale: [
        { value: "major", text: "Major" },
        { value: "minor", text: "Minor" }
    ],
    triad: [
        { value: "major_triad", text: "Major Triad" },
        { value: "minor_triad", text: "Minor Triad" },
        { value: "augmented_triad", text: "Augmented Triad" },
        { value: "diminished_triad", text: "Diminished Triad" }
    ],
    seventh: [
        { value: "major_7", text: "Major 7th" },
        { value: "minor_7", text: "Minor 7th" },
        { value: "dominant_7", text: "Dominant 7th" },
        { value: "half_dim_7", text: "Half-Diminished 7th" },
        { value: "diminished_7", text: "Diminished 7th" }
    ]
};

/**
 * 카테고리 변경 시 세부 타입 드롭다운 업데이트
 */
function updateTypes() {
    const category = document.getElementById('category').value;
    const typeSelect = document.getElementById('type');
    const stackSelect = document.getElementById('stack-chords');
    typeSelect.innerHTML = '';
    
    typeOptions[category].forEach(item => {
        const option = document.createElement('option');
        option.value = item.value;
        option.text = item.text;
        typeSelect.appendChild(option);
    });

    // 스케일일 때만 화음 쌓기 옵션 보이기
    if (category === 'scale') {
        stackSelect.style.display = 'inline-block';
    } else {
        stackSelect.style.display = 'none';
    }
}

/**
 * FastAPI 백엔드와 통신하여 데이터를 Fetching하는 모듈
 */
async function fetchMusicData(root, type, isChord = false) {
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
    document.getElementById('guitar-title').innerText = `기타 지판 (${root} ${displayType})`;


    const isChord = (category === 'triad' || category === 'seventh');
    const data = await fetchMusicData(root, type, isChord);
    if(data && data.notes) {
        if (window.activeStaffMidis) window.activeStaffMidis = []; // 새로운 렌더링 시 기존 하이라이트 초기화
        renderStaff(data.notes, data.type, data.scale_type, stackChords); 
        renderPiano(data.notes, data.type, data.scale_type, stackChords);
        renderGuitar(data.notes);
    }
}

// 초기 화면 로드 시 세부 타입 드롭다운 세팅
window.addEventListener('DOMContentLoaded', updateTypes);