const demoTracks = [
    {
        title: 'AI Music 001',
        artist: '本地音频',
        src: 'ai_music_001.wav',
        duration: '--:--'
    },
    {
        title: 'AI Music 002',
        artist: '本地音频',
        src: 'ai_music_002.wav',
        duration: '--:--'
    },
    {
        title: 'Synth Melody 3s',
        artist: 'Samplelib 免费样例',
        src: 'https://samplelib.com/lib/preview/mp3/sample-3s.mp3',
        duration: '--:--'
    },
    {
        title: 'Synth Melody 6s',
        artist: 'Samplelib 免费样例',
        src: 'https://samplelib.com/lib/preview/mp3/sample-6s.mp3',
        duration: '--:--'
    },
    {
        title: 'Drum Melody 9s',
        artist: 'Samplelib 免费样例',
        src: 'https://samplelib.com/lib/preview/mp3/sample-9s.mp3',
        duration: '--:--'
    }
];

class MusicPlayerPage {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.playButton = document.getElementById('play-btn');
        this.prevButton = document.getElementById('prev-btn');
        this.nextButton = document.getElementById('next-btn');
        this.playlistButton = document.getElementById('playlist-btn');
        this.listToggle = document.getElementById('list-toggle');
        this.progressRange = document.getElementById('progress-range');
        this.volumeRange = document.getElementById('volume-range');
        this.currentTimeEl = document.getElementById('current-time');
        this.durationTimeEl = document.getElementById('duration-time');
        this.currentTitleEl = document.getElementById('current-title');
        this.currentArtistEl = document.getElementById('current-artist');
        this.playlistList = document.getElementById('playlist-list');
        this.playlistSearch = document.getElementById('playlist-search');
        this.trackCount = document.getElementById('track-count');
        this.audioUpload = document.getElementById('audio-upload');

        this.tracks = [...demoTracks];
        this.filteredTracks = [...this.tracks];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isSeeking = false;
        this.loadToken = 0;

        this.init();
    }

    init() {
        this.audio.volume = Number(this.volumeRange.value);
        this.bindEvents();
        this.renderPlaylist();
        void this.loadTrack(this.currentIndex);
    }

    bindEvents() {
        this.playButton.addEventListener('click', () => this.togglePlayback());
        this.prevButton.addEventListener('click', () => this.changeTrack(-1));
        this.nextButton.addEventListener('click', () => this.changeTrack(1));
        this.playlistButton.addEventListener('click', () => this.togglePlaylist());
        this.listToggle.addEventListener('click', () => this.togglePlaylist());

        this.progressRange.addEventListener('pointerdown', () => {
            this.isSeeking = true;
        });

        this.progressRange.addEventListener('input', () => {
            if (!Number.isFinite(this.audio.duration)) return;
            const progress = Number(this.progressRange.value) / 100;
            this.audio.currentTime = progress * this.audio.duration;
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        });

        this.progressRange.addEventListener('change', () => {
            this.isSeeking = false;
        });

        this.progressRange.addEventListener('click', (event) => {
            if (!Number.isFinite(this.audio.duration)) return;
            const rect = this.progressRange.getBoundingClientRect();
            if (!rect.width) return;
            const ratio = (event.clientX - rect.left) / rect.width;
            const clampedRatio = Math.min(1, Math.max(0, ratio));
            this.progressRange.value = String(clampedRatio * 100);
            this.audio.currentTime = clampedRatio * this.audio.duration;
            this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
            this.isSeeking = false;
        });

        this.volumeRange.addEventListener('input', () => {
            this.audio.volume = Number(this.volumeRange.value);
        });

        this.playlistSearch.addEventListener('input', () => {
            this.applyFilter(this.playlistSearch.value);
        });

        this.audioUpload.addEventListener('change', (event) => {
            const files = Array.from(event.target.files || []);
            if (!files.length) return;

            const uploads = files.map((file) => ({
                title: file.name.replace(/\.[^.]+$/, ''),
                artist: '本地导入',
                src: URL.createObjectURL(file),
                duration: '--:--'
            }));

            this.tracks = [...uploads, ...this.tracks];
            this.applyFilter(this.playlistSearch.value);
            this.currentIndex = 0;
            void this.loadTrack(0);
        });

        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.changeTrack(1));
    }

    applyFilter(keyword) {
        const value = keyword.trim().toLowerCase();

        if (!value) {
            this.filteredTracks = [...this.tracks];
        } else {
            this.filteredTracks = this.tracks.filter((track) => {
                return `${track.title} ${track.artist}`.toLowerCase().includes(value);
            });
        }

        this.renderPlaylist();
    }

    renderPlaylist() {
        this.trackCount.textContent = `${this.filteredTracks.length} 首歌曲`;

        if (!this.filteredTracks.length) {
            this.playlistList.innerHTML = '<div class="empty-state">没有匹配结果，换个关键词试试，或者导入自己的音乐。</div>';
            return;
        }

        this.playlistList.innerHTML = this.filteredTracks.map((track) => {
            const realIndex = this.tracks.indexOf(track);
            const isActive = realIndex === this.currentIndex;

            return `
                <button class="track-item ${isActive ? 'active' : ''}" type="button" data-index="${realIndex}">
                    <span class="track-index">${String(realIndex + 1).padStart(2, '0')}</span>
                    <span>
                        <span class="track-name">${track.title}</span>
                        <span class="track-artist">${track.artist}</span>
                    </span>
                    <span class="track-duration">${track.duration}</span>
                </button>
            `;
        }).join('');

        this.playlistList.querySelectorAll('.track-item').forEach((button) => {
            button.addEventListener('click', async () => {
                const index = Number(button.dataset.index);
                await this.loadTrack(index);
                await this.play();
            });
        });
    }

    async loadTrack(index) {
        if (!this.tracks.length) return;

        this.audio.pause();

        this.currentIndex = (index + this.tracks.length) % this.tracks.length;
        const track = this.tracks[this.currentIndex];
        const loadToken = ++this.loadToken;

        this.currentTitleEl.textContent = track.title;
        this.currentArtistEl.textContent = track.artist;
        this.currentTimeEl.textContent = '00:00';
        this.durationTimeEl.textContent = track.duration;
        this.progressRange.value = '0';
        this.isPlaying = false;
        this.playButton.textContent = '播放';
        this.renderPlaylist();

        try {
            const src = track.blobUrl || track.src;
            if (!track.blobUrl && !/^https?:\/\//.test(track.src)) {
                const response = await fetch(track.src);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const raw = await response.blob();
                const fixedType = raw.type && raw.type !== 'application/octet-stream' ? raw : new Blob([raw], { type: 'audio/wav' });
                track.blobUrl = URL.createObjectURL(fixedType);
            }

            if (loadToken !== this.loadToken) return;

            this.audio.src = track.blobUrl || track.src;
            this.audio.load();
        } catch (error) {
            console.warn('音频资源加载失败:', error);
        }
    }

    async togglePlayback() {
        if (!this.audio.src) {
            await this.loadTrack(this.currentIndex);
        }

        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }

    async play() {
        try {
            await this.audio.play();
            this.isPlaying = true;
            this.playButton.textContent = '暂停';
        } catch (error) {
            console.warn('音频播放失败:', error);
        }
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playButton.textContent = '播放';
    }

    async changeTrack(step) {
        const wasPlaying = this.isPlaying;
        await this.loadTrack(this.currentIndex + step);
        if (wasPlaying) {
            await this.play();
        }
    }

    updateProgress() {
        if (this.isSeeking || !Number.isFinite(this.audio.duration)) return;

        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressRange.value = String(progress);
        this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }

    updateDuration() {
        if (!Number.isFinite(this.audio.duration)) return;

        const currentTrack = this.tracks[this.currentIndex];
        currentTrack.duration = this.formatTime(this.audio.duration);
        this.durationTimeEl.textContent = currentTrack.duration;
        this.renderPlaylist();
    }

    togglePlaylist() {
        this.playlistList.classList.toggle('compact');
    }

    formatTime(time) {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayerPage();
});
