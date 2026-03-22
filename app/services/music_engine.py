import music21
import traceback

def get_scale_data(root: str, scale_type: str):
    try:
        if scale_type.lower() == 'minor':
            sc = music21.scale.MinorScale(root)
        else:
            sc = music21.scale.MajorScale(root)
        
        pitches = sc.getPitches(f"{root}4", f"{root}5")
        
        notes_data = []
        for p in pitches:
            notes_data.append({
                "pitch": p.nameWithOctave,
                "name": p.name,
                "piano_key": p.midi,
                "guitar_fret": {"string": 0, "fret": 0}
            })
            
        return {"type": "scale", "root": root, "scale_type": scale_type, "notes": notes_data}
    except Exception as e:
        traceback.print_exc()  # 서버 터미널에 상세 에러 로그 출력
        return {"error": str(e), "traceback": traceback.format_exc()}

def get_chord_data(root: str, chord_type: str):
    try:
        root_pitch = music21.pitch.Pitch(f"{root}4")
        
        if chord_type == 'major_triad':
            intervals = ['P1', 'M3', 'P5']
        elif chord_type == 'minor_triad':
            intervals = ['P1', 'm3', 'P5']
        elif chord_type == 'augmented_triad':
            intervals = ['P1', 'M3', 'A5']
        elif chord_type == 'diminished_triad':
            intervals = ['P1', 'm3', 'd5']
        else:
            intervals = ['P1', 'M3', 'P5']

        pitches = [music21.interval.Interval(i).transposePitch(root_pitch) for i in intervals]
        
        notes_data = []
        for p in pitches:
            notes_data.append({
                "pitch": p.nameWithOctave,
                "name": p.name,
                "piano_key": p.midi,
                "guitar_fret": {"string": 0, "fret": 0}
            })
            
        return {"type": "chord", "root": root, "chord_type": chord_type, "notes": notes_data}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e), "traceback": traceback.format_exc()}