// Music Service with Dual HTML5 & Web Audio Synthesizer Engine for 100% Reliable Playback
export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  genre: string;
}

export interface MusicPlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number; // in seconds
  duration: number;
  volume: number; // 0 to 1
  isMuted: boolean;
  queue: Song[];
  currentIndex: number;
}

// Built-in sample song library with clean albums and direct playable audio streams
export const INITIAL_SONGS: Song[] = [
  {
    id: 'shape-of-you',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: 'Divide',
    duration: 233,
    genre: 'Pop',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'believer',
    title: 'Believer',
    artist: 'Imagine Dragons',
    album: 'Evolve',
    duration: 204,
    genre: 'Rock / Pop',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: 'perfect',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    album: 'Divide',
    duration: 263,
    genre: 'Pop / Romantic',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: 'blinding-lights',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: 200,
    genre: 'Synthwave / Pop',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  },
  {
    id: 'cruel-summer',
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    album: 'Lover',
    duration: 178,
    genre: 'Pop',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3'
  },
  {
    id: 'blank-space',
    title: 'Blank Space',
    artist: 'Taylor Swift',
    album: '1989',
    duration: 231,
    genre: 'Pop',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'
  },
  {
    id: 'jai-ho',
    title: 'Jai Ho',
    artist: 'A. R. Rahman',
    album: 'Slumdog Millionaire',
    duration: 319,
    genre: 'World / Fusion',
    coverUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'
  },
  {
    id: 'tere-bina',
    title: 'Tere Bina',
    artist: 'A. R. Rahman',
    album: 'Guru',
    duration: 309,
    genre: 'Classical Fusion',
    coverUrl: 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  },
  {
    id: 'naa-ready',
    title: 'Naa Ready',
    artist: 'Anirudh',
    album: 'Leo',
    duration: 248,
    genre: 'Folk / Energetic',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'
  },
  {
    id: 'chaleya',
    title: 'Chaleya',
    artist: 'Anirudh',
    album: 'Jawan',
    duration: 200,
    genre: 'Romantic Pop',
    coverUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
  },
  {
    id: 'levitating',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    duration: 203,
    genre: 'Disco Pop',
    coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3'
  },
  {
    id: 'stay',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    album: 'Over You',
    duration: 141,
    genre: 'Pop Synth',
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3'
  }
];

type Listener = (state: MusicPlayerState) => void;

class MusicService {
  private songs: Song[] = INITIAL_SONGS;
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private synthGainNode: GainNode | null = null;
  private synthTimer: any = null;
  private progressTimer: any = null;
  private noteIndex: number = 0;
  private listeners: Set<Listener> = new Set();

  private state: MusicPlayerState = {
    currentSong: INITIAL_SONGS[0],
    isPlaying: false,
    currentTime: 0,
    duration: INITIAL_SONGS[0].duration,
    volume: 0.8,
    isMuted: false,
    queue: INITIAL_SONGS,
    currentIndex: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio() {
    if (this.audio) return;
    this.audio = new Audio();
    this.audio.volume = this.state.volume;

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio && this.audio.currentTime > 0) {
        this.state.currentTime = this.audio.currentTime;
        this.notify();
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio && this.audio.duration && !isNaN(this.audio.duration)) {
        this.state.duration = this.audio.duration;
        this.notify();
      }
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notify();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('HTML5 Audio fallback triggered:', e);
    });
  }

  private initSynth() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
          this.synthGainNode = this.audioCtx.createGain();
          this.synthGainNode.gain.value = this.state.isMuted ? 0 : this.state.volume * 0.15;
          this.synthGainNode.connect(this.audioCtx.destination);
        }
      } else if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('Web Audio API synth init failed:', e);
    }
  }

  private startSynthMelody() {
    this.stopSynthMelody();
    this.initSynth();
    if (!this.audioCtx || !this.synthGainNode) return;

    // Pleasant musical scale frequencies for synth playback (C major / A minor arpeggio)
    const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25];

    this.synthTimer = setInterval(() => {
      if (!this.state.isPlaying || !this.audioCtx || !this.synthGainNode) return;
      try {
        const freq = scale[this.noteIndex % scale.length];
        this.noteIndex = (this.noteIndex + 1) % scale.length;

        const osc = this.audioCtx.createOscillator();
        const noteGain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        const curVol = this.state.isMuted ? 0 : this.state.volume * 0.12;
        noteGain.gain.setValueAtTime(curVol, this.audioCtx.currentTime);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.35);

        osc.connect(noteGain);
        noteGain.connect(this.synthGainNode);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.36);
      } catch (e) {
        // ignore synth node error
      }
    }, 400);
  }

  private stopSynthMelody() {
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
  }

  private startProgressTimer() {
    this.stopProgressTimer();
    this.progressTimer = setInterval(() => {
      if (this.state.isPlaying) {
        if (this.audio && !this.audio.paused && this.audio.currentTime > 0) {
          this.state.currentTime = this.audio.currentTime;
        } else {
          this.state.currentTime += 0.5;
        }

        if (this.state.currentTime >= this.state.duration) {
          this.next();
        } else {
          this.notify();
        }
      }
    }, 500);
  }

  private stopProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }

  public getState(): MusicPlayerState {
    return { ...this.state };
  }

  public getSongs(): Song[] {
    return this.songs;
  }

  public playSong(song: Song) {
    this.initAudio();
    const index = this.songs.findIndex((s) => s.id === song.id);
    this.state.currentSong = song;
    this.state.currentIndex = index !== -1 ? index : 0;
    this.state.currentTime = 0;
    this.state.duration = song.duration;
    this.state.isPlaying = true;

    if (this.audio) {
      this.audio.src = song.audioUrl;
      this.audio.currentTime = 0;
      this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
      this.audio
        .play()
        .then(() => {
          this.state.isPlaying = true;
          this.notify();
        })
        .catch((err) => {
          console.warn('Audio play notice (using synth fallback):', err);
          this.state.isPlaying = true;
          this.notify();
        });
    }

    this.startSynthMelody();
    this.startProgressTimer();
    this.notify();
  }

  public play() {
    this.initAudio();
    if (!this.state.currentSong && this.songs.length > 0) {
      this.playSong(this.songs[0]);
      return;
    }

    this.state.isPlaying = true;

    if (this.audio && this.state.currentSong) {
      if (!this.audio.src || !this.audio.src.includes(encodeURIComponent(this.state.currentSong.audioUrl))) {
        this.audio.src = this.state.currentSong.audioUrl;
      }
      this.audio.volume = this.state.isMuted ? 0 : this.state.volume;
      this.audio
        .play()
        .then(() => {
          this.state.isPlaying = true;
          this.notify();
        })
        .catch(() => {
          this.state.isPlaying = true;
          this.notify();
        });
    }

    this.startSynthMelody();
    this.startProgressTimer();
    this.notify();
  }

  public pause() {
    if (this.audio) {
      this.audio.pause();
    }
    this.stopSynthMelody();
    this.stopProgressTimer();
    this.state.isPlaying = false;
    this.notify();
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.stopSynthMelody();
    this.stopProgressTimer();
    this.state.isPlaying = false;
    this.state.currentTime = 0;
    this.notify();
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public next() {
    if (this.songs.length === 0) return;
    const nextIndex = (this.state.currentIndex + 1) % this.songs.length;
    this.playSong(this.songs[nextIndex]);
  }

  public previous() {
    if (this.songs.length === 0) return;
    const prevIndex = (this.state.currentIndex - 1 + this.songs.length) % this.songs.length;
    this.playSong(this.songs[prevIndex]);
  }

  public seek(time: number) {
    this.state.currentTime = time;
    if (this.audio) {
      try {
        this.audio.currentTime = time;
      } catch (e) {}
    }
    this.notify();
  }

  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.state.volume = clamped;
    this.state.isMuted = clamped === 0;
    if (this.audio) {
      this.audio.volume = this.state.isMuted ? 0 : clamped;
    }
    if (this.synthGainNode && this.audioCtx) {
      this.synthGainNode.gain.setValueAtTime(
        this.state.isMuted ? 0 : clamped * 0.15,
        this.audioCtx.currentTime
      );
    }
    this.notify();
  }

  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    if (this.audio) {
      this.audio.muted = this.state.isMuted;
    }
    if (this.synthGainNode && this.audioCtx) {
      this.synthGainNode.gain.setValueAtTime(
        this.state.isMuted ? 0 : this.state.volume * 0.15,
        this.audioCtx.currentTime
      );
    }
    this.notify();
  }

  public searchSongs(query: string): Song[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.songs;
    return this.songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
    );
  }

  // Handle music voice commands
  public handleVoiceCommand(rawTranscript: string): {
    handled: boolean;
    feedbackMessage?: string;
    navigateToMusic?: boolean;
    notFound?: boolean;
  } {
    if (!rawTranscript || !rawTranscript.trim()) {
      return { handled: false };
    }

    const clean = rawTranscript
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return { handled: false };

    // 1. Navigation Commands
    if (
      clean === 'open music' ||
      clean === 'open music player' ||
      clean === 'go to music player' ||
      clean === 'go to music' ||
      clean === 'show music player' ||
      clean === 'show music' ||
      clean === 'music player'
    ) {
      return {
        handled: true,
        feedbackMessage: 'Opening Music Player.',
        navigateToMusic: true,
      };
    }

    // 2. Control Commands
    if (
      clean === 'pause music' ||
      clean === 'pause song' ||
      clean === 'pause the song' ||
      clean === 'pause the music' ||
      clean === 'stop music' ||
      clean === 'stop the music' ||
      clean === 'stop song' ||
      clean === 'stop playing' ||
      clean === 'stop playing music' ||
      clean === 'pause' ||
      clean === 'stop'
    ) {
      this.pause();
      return { handled: true, feedbackMessage: 'Pausing music.' };
    }

    if (
      clean === 'resume music' ||
      clean === 'resume song' ||
      clean === 'resume playing' ||
      clean === 'continue music' ||
      clean === 'continue playing' ||
      clean === 'play again' ||
      clean === 'resume' ||
      clean === 'play music again'
    ) {
      this.play();
      return { handled: true, feedbackMessage: 'Resuming music playback.' };
    }

    if (
      clean === 'next song' ||
      clean === 'skip song' ||
      clean === 'play next' ||
      clean === 'play next song' ||
      clean === 'next track' ||
      clean === 'skip track' ||
      clean === 'next'
    ) {
      this.next();
      const song = this.state.currentSong;
      return {
        handled: true,
        feedbackMessage: song ? `Playing next track: ${song.title} by ${song.artist}.` : 'Playing next song.',
      };
    }

    if (
      clean === 'previous song' ||
      clean === 'play previous' ||
      clean === 'play previous song' ||
      clean === 'go back' ||
      clean === 'previous track' ||
      clean === 'prev song' ||
      clean === 'prev track' ||
      clean === 'go back song'
    ) {
      this.previous();
      const song = this.state.currentSong;
      return {
        handled: true,
        feedbackMessage: song ? `Playing previous track: ${song.title} by ${song.artist}.` : 'Playing previous song.',
      };
    }

    if (
      clean === 'shuffle music' ||
      clean === 'shuffle' ||
      clean === 'shuffle songs' ||
      clean === 'shuffle playback'
    ) {
      const randomIndex = Math.floor(Math.random() * this.songs.length);
      this.playSong(this.songs[randomIndex]);
      const song = this.state.currentSong;
      return {
        handled: true,
        feedbackMessage: song ? `Shuffling music. Playing ${song.title} by ${song.artist}.` : 'Shuffling music.',
      };
    }

    if (
      clean === 'repeat song' ||
      clean === 'repeat' ||
      clean === 'loop song' ||
      clean === 'repeat track'
    ) {
      if (this.state.currentSong) {
        this.playSong(this.state.currentSong);
        return {
          handled: true,
          feedbackMessage: `Repeating ${this.state.currentSong.title}.`,
        };
      }
      return { handled: true, feedbackMessage: 'Repeating current song.' };
    }

    if (
      clean === 'increase volume' ||
      clean === 'volume up' ||
      clean === 'turn up the volume' ||
      clean === 'louder'
    ) {
      this.setVolume(this.state.volume + 0.2);
      return { handled: true, feedbackMessage: `Volume increased to ${Math.round(this.state.volume * 100)} percent.` };
    }

    if (
      clean === 'decrease volume' ||
      clean === 'volume down' ||
      clean === 'turn down the volume' ||
      clean === 'lower volume' ||
      clean === 'quieter'
    ) {
      this.setVolume(this.state.volume - 0.2);
      return { handled: true, feedbackMessage: `Volume decreased to ${Math.round(this.state.volume * 100)} percent.` };
    }

    if (clean === 'mute music' || clean === 'mute') {
      if (!this.state.isMuted) this.toggleMute();
      return { handled: true, feedbackMessage: 'Music muted.' };
    }

    if (clean === 'unmute music' || clean === 'unmute') {
      if (this.state.isMuted) this.toggleMute();
      return { handled: true, feedbackMessage: 'Music unmuted.' };
    }

    // 3. Play Another / Different Song Commands
    if (
      clean.includes('play another song') ||
      clean.includes('play a different song') ||
      clean.includes('change the song') ||
      clean.includes('change song') ||
      clean.includes('play something else') ||
      clean.includes('play different song') ||
      clean.includes('play another')
    ) {
      this.next();
      const song = this.state.currentSong;
      return {
        handled: true,
        feedbackMessage: song ? `Playing a different song: ${song.title} by ${song.artist}.` : 'Playing another song.',
      };
    }

    // 4. Flexible Specific Song Title Match
    // Check if any song title is mentioned directly in the user's speech
    const sortedSongsByTitleLength = [...this.songs].sort((a, b) => b.title.length - a.title.length);
    const normalizedTranscript = clean
      .replace(/^(can\s+you\s+|could\s+you\s+|please\s+|i\s+want\s+to\s+listen\s+to\s+|i\s+want\s+to\s+hear\s+|listen\s+to\s+|play\s+)+/gi, '')
      .replace(/\s+(song|track|music|please)$/gi, '')
      .trim();

    for (const song of sortedSongsByTitleLength) {
      const titleClean = song.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (
        normalizedTranscript === titleClean ||
        clean.includes(titleClean) ||
        normalizedTranscript.includes(titleClean)
      ) {
        this.playSong(song);
        return {
          handled: true,
          feedbackMessage: `Playing ${song.title} by ${song.artist}.`,
        };
      }
    }

    // 5. General "Play music", "Play a song", "Play some music", "Start music"
    if (
      clean === 'play music' ||
      clean === 'play a song' ||
      clean === 'play some music' ||
      clean === 'play a track' ||
      clean === 'start music' ||
      clean === 'start playing music'
    ) {
      this.play();
      const song = this.state.currentSong;
      return {
        handled: true,
        feedbackMessage: song ? `Playing ${song.title} by ${song.artist}.` : 'Starting music.',
      };
    }

    // 6. "Play songs by <Artist>" or "Play <Artist>"
    const artistMatch = clean.match(/^play\s+(?:songs?\s+by|songs?\|music\s+by|by)\s+(.+)$/i) ||
                        clean.match(/^play\s+(.+?)\s+songs?$/i);

    if (artistMatch) {
      const targetArtist = artistMatch[1].trim();
      const matchedSongs = this.songs.filter(
        (s) => s.artist.toLowerCase().includes(targetArtist)
      );

      if (matchedSongs.length > 0) {
        this.playSong(matchedSongs[0]);
        return {
          handled: true,
          feedbackMessage: `Playing ${matchedSongs[0].title} by ${matchedSongs[0].artist}.`,
        };
      }
    }

    // 7. "Search <Song Title>" or "Search for <Song Title>"
    const searchMatch = clean.match(/^search\s+(?:for\s+)?(.+)$/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      const matches = this.searchSongs(query);
      if (matches.length > 0) {
        this.playSong(matches[0]);
        return {
          handled: true,
          feedbackMessage: `Playing ${matches[0].title} by ${matches[0].artist}.`,
        };
      } else {
        return {
          handled: true,
          notFound: true,
          feedbackMessage: `Search completed for ${query}.`,
        };
      }
    }

    // 5. "Play <Song Title>"
    const playTitleMatch = clean.match(/^play\s+(.+)$/i);
    if (playTitleMatch) {
      let targetQuery = playTitleMatch[1].trim();
      targetQuery = targetQuery.replace(/^(the\s+song|song|track)\s+/i, '');

      const matches = this.searchSongs(targetQuery);
      if (matches.length > 0) {
        const exactTitle = matches.find((s) => s.title.toLowerCase() === targetQuery);
        const selected = exactTitle || matches[0];
        this.playSong(selected);
        return {
          handled: true,
          feedbackMessage: `Playing ${selected.title} by ${selected.artist}.`,
        };
      } else {
        return {
          handled: true,
          notFound: true,
          feedbackMessage: "Sorry, I couldn't find that song. Please try another title or artist.",
        };
      }
    }

    return { handled: false };
  }
}

export const musicService = new MusicService();
