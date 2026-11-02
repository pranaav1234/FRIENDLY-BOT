import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Search,
  Music,
  Disc,
  Radio,
  User,
  ListMusic,
} from 'lucide-react';
import { musicService, Song, MusicPlayerState } from '../services/musicService';
import { UserProfile } from '../types';
import { userDataService } from '../services/userDataService';

interface MusicPlayerViewProps {
  currentUser?: UserProfile | null;
  onExit?: () => void;
}

export const MusicPlayerView: React.FC<MusicPlayerViewProps> = ({ currentUser, onExit }) => {
  const [playerState, setPlayerState] = useState<MusicPlayerState>(musicService.getState());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>(() => {
    if (currentUser?.id) {
      const prefs = userDataService.getMusicPreferences(currentUser.id);
      if (prefs?.selectedGenre) return prefs.selectedGenre;
    }
    return 'All';
  });

  useEffect(() => {
    if (currentUser?.id) {
      const prefs = userDataService.getMusicPreferences(currentUser.id);
      if (prefs?.selectedGenre) setSelectedGenre(prefs.selectedGenre);
      if (typeof prefs?.volume === 'number') {
        musicService.setVolume(prefs.volume);
      }
    }
  }, [currentUser?.id]);

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre);
    if (currentUser?.id) {
      const prefs = userDataService.getMusicPreferences(currentUser.id) || { userId: currentUser.id };
      userDataService.saveMusicPreferences(currentUser.id, { ...prefs, selectedGenre: genre });
    }
  };

  useEffect(() => {
    const unsubscribe = musicService.subscribe((state) => {
      setPlayerState(state);
    });
    return () => unsubscribe();
  }, []);

  const songs = musicService.getSongs();

  // Filter songs based on search query and selected genre
  const filteredSongs = songs.filter((s) => {
    const matchesQuery =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.album.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre = selectedGenre === 'All' || s.genre.toLowerCase().includes(selectedGenre.toLowerCase());

    return matchesQuery && matchesGenre;
  });

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentSong = playerState.currentSong || songs[0];

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    musicService.seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    musicService.setVolume(val);
    if (currentUser?.id) {
      const prefs = userDataService.getMusicPreferences(currentUser.id) || { userId: currentUser.id };
      userDataService.saveMusicPreferences(currentUser.id, { ...prefs, volume: val });
    }
  };

  const genres = ['All', 'Pop', 'Rock', 'Classical', 'Synthwave', 'Folk'];

  return (
    <div className="w-full space-y-6 animate-fade-in pb-2 text-slate-100">
      {/* Header Card matching Productivity Dashboard header exact height & style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-600/20 border border-rose-500/30 rounded-xl text-rose-400">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Music Player</h1>
            <p className="text-xs text-slate-400">Search songs, browse artists, and listen with AI voice commands.</p>
          </div>
        </div>
      </div>

      {/* Featured / Currently Playing Main Player Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-850 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Album Cover Column */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative group w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 transition-transform duration-300 hover:scale-[1.02]">
              {currentSong ? (
                <img
                  src={currentSong.coverUrl}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                  <Disc className="w-20 h-20 animate-spin" style={{ animationDuration: '8s' }} />
                </div>
              )}

              {/* Overlay vinyl spinning indicator when playing */}
              {playerState.isPlaying && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-slate-950/80 border border-slate-600 flex items-center justify-center text-rose-400 backdrop-blur-sm shadow-xl">
                    <Disc className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Player Info & Interactive Controls Column */}
          <div className="md:col-span-7 lg:col-span-8 space-y-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-rose-400 font-semibold mb-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Now Playing</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight truncate">
                {currentSong ? currentSong.title : 'Select a Song'}
              </h2>
              <p className="text-base font-medium text-slate-300 flex items-center justify-center md:justify-start gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span>{currentSong ? currentSong.artist : 'Artist'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700/50">
                  {currentSong ? currentSong.album : 'Album'}
                </span>
              </p>
            </div>

            {/* Progress Bar & Timers */}
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={playerState.duration || 100}
                value={playerState.currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 transition-all"
              />
              <div className="flex justify-between text-xs font-mono text-slate-400 font-medium">
                <span>{formatTime(playerState.currentTime)}</span>
                <span>{formatTime(playerState.duration)}</span>
              </div>
            </div>

            {/* Control Buttons & Volume Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              {/* Playback Controls */}
              <div className="flex items-center space-x-3 mx-auto md:mx-0">
                <button
                  onClick={() => musicService.previous()}
                  className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                  title="Previous Song"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={() => musicService.togglePlay()}
                  className="p-4 rounded-full bg-gradient-to-tr from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white transition-all hover:scale-105 active:scale-95 shadow-xl shadow-rose-500/25 flex items-center justify-center cursor-pointer"
                  title={playerState.isPlaying ? 'Pause' : 'Play'}
                >
                  {playerState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                <button
                  onClick={() => musicService.stop()}
                  className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                  title="Stop"
                >
                  <Square className="w-5 h-5 text-slate-300" />
                </button>

                <button
                  onClick={() => musicService.next()}
                  className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                  title="Next Song"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Slider & Mute Control */}
              <div className="flex items-center space-x-2.5 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/70 shadow-inner mx-auto md:mx-0">
                <button
                  onClick={() => musicService.toggleMute()}
                  className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={playerState.isMuted ? 'Unmute' : 'Mute'}
                >
                  {playerState.isMuted || playerState.volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-slate-300" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={playerState.isMuted ? 0 : playerState.volume}
                  onChange={handleVolumeChange}
                  className="w-20 sm:w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <span className="text-xs font-mono text-slate-400 w-8">
                  {playerState.isMuted ? '0%' : `${Math.round(playerState.volume * 100)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Genre Filters Section */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by song name or artist..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Genre Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => handleGenreChange(g)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedGenre === g
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-md'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Song Catalog List */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-200">
            <ListMusic className="w-4 h-4 text-rose-400" />
            <span>Song Library ({filteredSongs.length})</span>
          </div>
          <span className="text-xs text-slate-400">Click any song to play immediately</span>
        </div>

        {filteredSongs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Music className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
            <p className="text-base font-semibold text-slate-300">
              Sorry, I couldn't find that song. Please try another title or artist.
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You can search for songs by Ed Sheeran, Taylor Swift, A. R. Rahman, Anirudh, Imagine Dragons, and more.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('All');
              }}
              className="mt-2 px-4 py-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold hover:bg-rose-500/30 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredSongs.map((song, idx) => {
              const isCurrent = playerState.currentSong?.id === song.id;
              const isPlaying = isCurrent && playerState.isPlaying;

              return (
                <div
                  key={song.id}
                  onClick={() => musicService.playSong(song)}
                  className={`p-3 sm:p-4 flex items-center justify-between gap-4 transition-all hover:bg-slate-800/60 cursor-pointer group ${
                    isCurrent ? 'bg-rose-500/10 border-l-4 border-l-rose-500' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-5 text-center">
                      {idx + 1}
                    </span>

                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 border border-slate-700/80">
                      <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                      <div
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3
                          className={`text-sm sm:text-base font-bold truncate ${
                            isCurrent ? 'text-rose-400' : 'text-slate-100 group-hover:text-rose-300'
                          }`}
                        >
                          {song.title}
                        </h3>
                        {isPlaying && (
                          <span className="flex items-center space-x-0.5 text-rose-400">
                            <span className="w-1 h-3 bg-rose-400 animate-pulse rounded-full" />
                            <span className="w-1 h-4 bg-rose-400 animate-pulse delay-75 rounded-full" />
                            <span className="w-1 h-2 bg-rose-400 animate-pulse delay-150 rounded-full" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-2">
                        <span>{song.artist}</span>
                        <span>•</span>
                        <span className="text-slate-500">{song.album}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 flex-shrink-0">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 hidden sm:inline-block">
                      {song.genre}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      {formatTime(song.duration)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPlaying) {
                          musicService.pause();
                        } else {
                          musicService.playSong(song);
                        }
                      }}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
