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
    const type = document.getElementById('scale-type').value;
    
    // 선택된 값에 따라 오선지 제목 변경
    let displayType = "";
    if (type === "major" || type === "major_triad") displayType = "Major";
    else if (type === "minor" || type === "minor_triad") displayType = "Minor";
    else if (type === "augmented_triad") displayType = "aug";
    else if (type === "diminished_triad") displayType = "dim";
    
    document.getElementById('staff-title').innerText = `오선지 (${root} ${displayType})`;
    document.getElementById('piano-title').innerText = `피아노 건반 (${root} ${displayType})`;
    document.getElementById('guitar-title').innerText = `기타 지판 (${root} ${displayType})`;

    // 선택한 타입이 triad(코드)인지 판별하여 isChord 플래그를 전달
    const isChord = type.includes('triad');
    const data = await fetchMusicData(root, type, isChord);
    if(data && data.notes) {
        renderStaff(data.notes, data.type); // 데이터 타입(scale/chord)을 렌더러로 전달
        renderPiano(data.notes, data.type); // 피아노에도 데이터 타입 전달
        renderGuitar(data.notes);
    }
}