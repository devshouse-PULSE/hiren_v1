import os
import argparse
from pathlib import Path
import yt_dlp
from pydub import AudioSegment

def download_and_slice(url, class_name, output_base_dir, chunk_length_sec=5):
    # 1. Setup target directory
    out_dir = Path(output_base_dir) / class_name
    out_dir.mkdir(parents=True, exist_ok=True)
    
    temp_file_base = "temp_download"
    temp_wav = f"{temp_file_base}.wav"

    # 2. Download the best audio using yt-dlp and convert to WAV
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
        }],
        'outtmpl': f'{temp_file_base}.%(ext)s',
        'quiet': False
    }

    print(f"\n[1/3] Downloading audio from {url}...")
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
    except Exception as e:
        print(f"Error downloading video: {e}")
        return

    # 3. Slice the audio using pydub
    print(f"[2/3] Slicing audio into {chunk_length_sec}-second chunks...")
    try:
        audio = AudioSegment.from_wav(temp_wav)
        
        # Force the audio to match train_acoustic.py requirements (Mono, 22050Hz)
        audio = audio.set_frame_rate(22050).set_channels(1)
        
        chunk_length_ms = chunk_length_sec * 1000
        # Create chunks
        chunks = [audio[i:i+chunk_length_ms] for i in range(0, len(audio), chunk_length_ms)]
        
        # Determine starting index to avoid overwriting existing files
        existing_files = list(out_dir.glob("*.wav"))
        start_idx = len(existing_files)
        
        count = 0
        for i, chunk in enumerate(chunks):
            # Only save if it's a full 5-second chunk (drops the short tail end of the video)
            if len(chunk) == chunk_length_ms:
                chunk_name = out_dir / f"{class_name.lower()}_{start_idx + count:03d}.wav"
                chunk.export(chunk_name, format="wav")
                count += 1
                
        print(f"[3/3] Success! Added {count} new samples to {out_dir}")
        
    finally:
        # Cleanup temporary files
        if os.path.exists(temp_wav):
            os.remove(temp_wav)

def main():
    parser = argparse.ArgumentParser(description="Download and slice YouTube audio for ML dataset")
    parser.add_argument("url", type=str, help="YouTube video URL")
    parser.add_argument("class_name", type=str, choices=["BC", "WBM", "Granular", "Concrete"], 
                        help="Surface class: BC, WBM, Granular, or Concrete")
    parser.add_argument("--out", type=str, default="dataset_audio", 
                        help="Output directory (default: dataset_audio)")
    
    args = parser.parse_args()
    download_and_slice(args.url, args.class_name, args.out)

if __name__ == "__main__":
    main()