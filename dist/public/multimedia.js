'use strict';

function stopAllOtherMedia(activeType) {
    //Pause Mini Audio Player if its playing and wasn't the trigger
    if (activeType !== 'mini' && typeof HFS_MiniPlayer !== 'undefined' && HFS_MiniPlayer.playing) {
        HFS_MiniPlayer.pause();
    }

    //Pause ArtPlayer if active and wasn't the trigger
    if (activeType !== 'art' && typeof HFS_ArtPlayer !== 'undefined' && HFS_ArtPlayer.artInstance) {
        if (typeof HFS_ArtPlayer.artInstance.pause === 'function') {
            HFS_ArtPlayer.artInstance.pause();
        } else if (HFS_ArtPlayer.artInstance.video) {
            HFS_ArtPlayer.artInstance.video.pause();
        }
    }
}

/* ====================================
   Generic Live File View Window
   ====================================*/

const HFS_LiveView = {
    activeCleanup: null,

    /**
     * Set content and open the window
     * @param {string} title - Title bar text
     * @param {string|HTMLElement} content - HTML string or DOM node
     * @param {Function} [onClose] - Optional cleanup callback when window closes
     */
    show: function (title, content, onClose = null) {
        let root = document.getElementById('live-view-root');
        if (!root) {
            injectLiveViewOverlay();
            root = document.getElementById('live-view-root');
        }

        const container = document.getElementById('live-view-container');
        const titleSpan = root.querySelector('.live-view-title');

        if (!root || !container || !titleSpan) return;

        // Run cleanup if a previous view registered one
        this.close();

        this.activeCleanup = onClose;
        titleSpan.innerText = title || 'Live View';

        if (typeof content === 'string') {
            container.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            container.innerHTML = '';
            container.appendChild(content);
        }

        root.style.display = 'flex';
    },

    ///Clear content and hide window
    close: function () {
        const root = document.getElementById('live-view-root');
        if (root) root.style.display = 'none';

        const container = document.getElementById('live-view-container');
        if (container) container.innerHTML = '';

        if (typeof this.activeCleanup === 'function') {
            this.activeCleanup();
            this.activeCleanup = null;
        }
    }
};

function injectLiveViewOverlay() {
    if (document.getElementById('live-view-root')) return;

    const overlay = document.createElement('div');
    overlay.id = 'live-view-root';
    overlay.innerHTML = `
        <div class='live-view-header'>
            <div class='title-wrapper'>
                <span class='arrow'></span>
                <span class='live-view-title'></span>
            </div>
            <button type="button" class='dialog-closer' onclick='HFS_LiveView.close()'>[X]</button>
        </div>
        <div id='live-view-container'></div>
    `;

    document.body.appendChild(overlay);
}

/* =================================
   ArtPlayer Video/Audio Module
   ================================= */

/* ==========================================================================
   ArtPlayer Video/Audio Module
   ========================================================================== */

const HFS_ArtPlayer = {
    artInstance: null,
    customSub: null,
    video_formats: /\.(mp4|mkv|avi|mov|webm|ogv|m4v|flv|3gp|mp3|wav|ogg|aac|m4a|flac|opus)$/i,
    activeVolumeListeners: null,
    mediaList: [],
    currentIndex: -1,

    getMediaFromDOM: function () {
        const hfsList = (typeof HFS !== 'undefined') ? (HFS.list || HFS.state?.list || HFS.entries) : null;
        if (Array.isArray(hfsList) && hfsList.length > 0) {
            const filtered = hfsList.filter(item => !item.isFolder && this.video_formats.test(item.name || ''));
            if (filtered.length > 0) return filtered;
        }

        const fileLinks = Array.from(document.querySelectorAll('a[href]'));
        const uniqueMedia = new Map();

        fileLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (this.video_formats.test(href)) {
                const cleanUrl = href.split('#')[0].split('?')[0];
                if (!uniqueMedia.has(cleanUrl)) {
                    const nameEl = link.querySelector('.entry-name') || link;
                    const name = nameEl.innerText ? nameEl.innerText.trim() : decodeURIComponent(cleanUrl.split('/').pop());
                    uniqueMedia.set(cleanUrl, { name, uri: href, url: href });
                }
            }
        });

        return Array.from(uniqueMedia.values());
    },

    loadSubtitle: function (subEntry) {
        if (!subEntry) return;

        this.customSub = subEntry;
        const subUrl = subEntry.uri || subEntry.url || ('/' + (subEntry.path || subEntry.name));
        const subType = subUrl.toLowerCase().includes('.vtt') ? 'vtt' : 'srt';

        if (this.artInstance) {
            this.artInstance.subtitle.switch(subUrl, { type: subType });
            this.artInstance.subtitle.show = true;
            this.artInstance.notice.show = `Loaded subtitle: ${subEntry.name}`;
        } else {
            if (typeof HFS !== 'undefined' && typeof HFS.notice === 'function') {
                HFS.notice(`Subtitle set: ${subEntry.name}`);
            } else if (typeof dialog !== 'undefined' && dialog.alert) {
                dialog.alert(`Loaded subtitle: ${subEntry.name}`);
            }
        }
    },

    play: async function (entry) {
        if (!entry) return;

        stopAllOtherMedia('art');

        // Populate media playlist and current index
        this.mediaList = this.getMediaFromDOM();
        const targetUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));

        this.currentIndex = this.mediaList.findIndex(item => {
            const itemUrl = item.uri || item.url || ('/' + (item.path || item.name));
            return itemUrl === targetUrl || decodeURIComponent(itemUrl) === decodeURIComponent(targetUrl);
        });

        if (this.currentIndex === -1) {
            this.mediaList = [entry];
            this.currentIndex = 0;
        }

        const title = entry.name || 'Media Player';
        const fileUrl = targetUrl;
        const isAudio = /\.(mp3|wav|ogg|aac|m4a|flac|opus)$/i.test(title);

        const savedVolStr = localStorage.getItem('hfs_audio_volume');
        const savedVolume = savedVolStr !== null ? parseFloat(savedVolStr) : 0.7;

        const container = document.createElement('div');
        container.className = 'live-view-media-wrapper';
        container.style.width = '100%';
        container.style.height = '100%';

        const mountPoint = document.createElement('div');
        mountPoint.style.width = '100%';
        mountPoint.style.height = 'calc(100% - 32px)';
        if (isAudio) {
            mountPoint.classList.add('is-audio-player');
        }

        container.appendChild(mountPoint);

        // Build Navigation Controls Row
        const controlsRow = document.createElement('div');
        controlsRow.className = 'live-view-gallery-controls';

        const prevBtn = document.createElement('a');
        prevBtn.href = 'javascript:';
        prevBtn.className = 'gallery-nav-btn';
        prevBtn.innerText = ' [ ❮ Prev ] ';
        prevBtn.style.opacity = this.currentIndex > 0 ? '1' : '0.3';
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.currentIndex > 0) this.play(this.mediaList[this.currentIndex - 1]);
        });

        const newTabBtn = document.createElement('a');
        newTabBtn.href = fileUrl;
        newTabBtn.target = '_blank';
        newTabBtn.rel = 'noopener noreferrer';
        newTabBtn.className = 'live-view-image-newtab-btn';
        newTabBtn.innerText = `🎬 [ ${this.currentIndex + 1}/${this.mediaList.length} ]`;
        newTabBtn.addEventListener('click', (e) => e.stopPropagation());

        const nextBtn = document.createElement('a');
        nextBtn.href = 'javascript:';
        nextBtn.className = 'gallery-nav-btn';
        nextBtn.innerText = ' [ Next ❯ ] ';
        nextBtn.style.opacity = this.currentIndex < this.mediaList.length - 1 ? '1' : '0.3';
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.currentIndex < this.mediaList.length - 1) this.play(this.mediaList[this.currentIndex + 1]);
        });

        controlsRow.appendChild(prevBtn);
        controlsRow.appendChild(newTabBtn);
        controlsRow.appendChild(nextBtn);

        container.appendChild(controlsRow);

        if (isAudio) {
            const miniPlayerBtn = document.createElement('a');
            miniPlayerBtn.href = 'javascript:';
            miniPlayerBtn.className = 'live-view-image-newtab-btn';
            miniPlayerBtn.innerText = '🎵 [ Move to Mini Player ]';

            miniPlayerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                HFS_ArtPlayer.destroy();
                if (typeof HFS_MiniPlayer !== 'undefined') {
                    HFS_MiniPlayer.loadAndPlay(entry);
                }
                HFS_LiveView.close();
            });

            container.appendChild(miniPlayerBtn);
        }

        HFS_LiveView.show(title, container, () => this.destroy());

        const root = document.getElementById('live-view-root');
        if (root) {
            root.classList.toggle('is-audio-mode', isAudio);
        }

        let subUrl = '';
        let matchedSubName = '';

        if (!isAudio) {
            if (this.customSub) {
                subUrl = this.customSub.uri || this.customSub.url || ('/' + (this.customSub.path || this.customSub.name));
                matchedSubName = this.customSub.name;
            } else {
                const currentList = Array.isArray(HFS?.list) ? HFS.list : [];
                let foundSub = currentList.find(item => !item.isFolder && /\.(srt|vtt)$/i.test(item.name || ''));
                if (foundSub) {
                    subUrl = foundSub.uri || foundSub.url || ('/' + (foundSub.path || foundSub.name));
                    matchedSubName = foundSub.name;
                }
            }
        }

        let artControls = [];

        if (isAudio) {
            const initialPct = (savedVolume * 100).toFixed(1);
            const initialIcon = savedVolume === 0 ? '🔇' : '🔊';

            artControls = [
                {
                    name: 'audio-volume',
                    position: 'left',
                    index: 20,
                    html: `
                        <div class="custom-audio-volume">
                            <span class="volume-icon">${initialIcon}</span>
                            <div class="volume-bar-track">
                                <div class="volume-bar-fill" style="width: ${initialPct}%;"></div>
                                <div class="volume-bar-handle" style="left: ${initialPct}%;"></div>
                            </div>
                        </div>
                    `,
                    mounted: ($elem) => {
                        const track = $elem.querySelector('.volume-bar-track');
                        const fill = $elem.querySelector('.volume-bar-fill');
                        const handle = $elem.querySelector('.volume-bar-handle');
                        const icon = $elem.querySelector('.volume-icon');

                        let isDragging = false;

                        const setVol = (e) => {
                            if (!HFS_ArtPlayer.artInstance) return;
                            const rect = track.getBoundingClientRect();
                            let percent = (e.clientX - rect.left) / rect.width;
                            percent = Math.max(0, Math.min(1, percent));

                            fill.style.width = (percent * 100) + '%';
                            handle.style.left = (percent * 100) + '%';

                            HFS_ArtPlayer.artInstance.volume = percent;
                            localStorage.setItem('hfs_audio_volume', percent);

                            icon.innerText = percent === 0 ? '🔇' : '🔊';
                        };

                        const onMouseMove = (e) => {
                            if (isDragging) setVol(e);
                        };
                        const onMouseUp = () => {
                            isDragging = false;
                        };

                        icon.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (!HFS_ArtPlayer.artInstance) return;
                            const art = HFS_ArtPlayer.artInstance;
                            art.muted = !art.muted;

                            if (art.muted) {
                                icon.innerText = '🔇';
                                fill.style.width = '0%';
                                handle.style.left = '0%';
                            } else {
                                icon.innerText = '🔊';
                                const vol = art.volume || 0.7;
                                fill.style.width = (vol * 100) + '%';
                                handle.style.left = (vol * 100) + '%';
                            }
                        });

                        track.addEventListener('mousedown', (e) => {
                            e.stopPropagation();
                            isDragging = true;
                            setVol(e);
                        });

                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);

                        this.activeVolumeListeners = () => {
                            window.removeEventListener('mousemove', onMouseMove);
                            window.removeEventListener('mouseup', onMouseUp);
                        };
                    }
                }
            ];
        } else {
            artControls = [
                {
                    position: 'right',
                    html: '💬 Subtitle',
                    tooltip: 'Toggle Subtitle',
                    click: function () {
                        if (HFS_ArtPlayer.artInstance) {
                            const show = HFS_ArtPlayer.artInstance.subtitle.show;
                            HFS_ArtPlayer.artInstance.subtitle.show = !show;
                            HFS_ArtPlayer.artInstance.notice.show = `Subtitle: ${!show ? 'ON' : 'OFF'}`;
                        }
                    },
                },
                {
                    position: 'right',
                    html: '▲',
                    tooltip: 'Increase Subtitle Size',
                    click: function () {
                        if (HFS_ArtPlayer.artInstance) {
                            const subEl = HFS_ArtPlayer.artInstance.template.$subtitle;
                            const currentSize = parseFloat(window.getComputedStyle(subEl).fontSize) || 22;
                            const newSize = currentSize + 2;
                            HFS_ArtPlayer.artInstance.subtitle.style('fontSize', newSize + 'px');
                            HFS_ArtPlayer.artInstance.notice.show = `Subtitle Size: ${newSize}px`;
                        }
                    },
                },
                {
                    position: 'right',
                    html: '▼',
                    tooltip: 'Decrease Subtitle Size',
                    click: function () {
                        if (HFS_ArtPlayer.artInstance) {
                            const subEl = HFS_ArtPlayer.artInstance.template.$subtitle;
                            const currentSize = parseFloat(window.getComputedStyle(subEl).fontSize) || 22;
                            const newSize = Math.max(10, currentSize - 2);
                            HFS_ArtPlayer.artInstance.subtitle.style('fontSize', newSize + 'px');
                            HFS_ArtPlayer.artInstance.notice.show = `Subtitle Size: ${newSize}px`;
                        }
                    },
                }
            ];
        }

        this.artInstance = new Artplayer({
            container: mountPoint,
            url: fileUrl,
            theme: '#00adb5',
            autoplay: true,
            volume: savedVolume,
            volumeControl: !isAudio,
            screenshot: true,
            pip: false,
            setting: !isAudio,
            flip: true,
            playbackRate: !isAudio,
            aspectRatio: !isAudio,
            fullscreen: !isAudio,
            fullscreenWeb: !isAudio,
            subtitleOffset: true,
            autoPlayback: true,
            moreVideoAttr: { crossOrigin: 'anonymous' },
            subtitle: (isAudio || !subUrl) ? {} : {
                url: subUrl,
                type: subUrl.toLowerCase().includes('.vtt') ? 'vtt' : 'srt',
                style: {
                    color: '#ffffff',
                    fontSize: '22px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                },
            },
            controls: artControls,
        });

        // Auto-play next video when current video ends
        /*
        this.artInstance.on('video:ended', () => {
            if (this.currentIndex < this.mediaList.length - 1) {
                this.play(this.mediaList[this.currentIndex + 1]);
            }
        });
        */

        this.artInstance.on('fullscreenWeb', (state) => {
            if (root) {
                root.classList.toggle('is-web-fullscreen', state);
            }
        });

        if (!isAudio && subUrl && this.artInstance) {
            this.artInstance.notice.show = `Loaded subtitle: ${matchedSubName}`;
        }
    },

    close: function () {
        HFS_LiveView.close();
    },

    destroy: function () {
        const root = document.getElementById('live-view-root');
        if (root) {
            root.classList.remove('is-web-fullscreen');
            root.classList.remove('is-audio-mode');
        }
        if (typeof this.activeVolumeListeners === 'function') {
            this.activeVolumeListeners();
            this.activeVolumeListeners = null;
        }
        if (this.artInstance) {
            this.artInstance.destroy();
            this.artInstance = null;
        }
    }
};

/* ============================================
   Text & Code Viewer with Syntax Highlighting
   ============================================ */

const TextViewer = {
    text_formats: /\.(txt|log|ini|cfg|conf|json|json5|yaml|yml|toml|xml|csv|tsv|md|rst|tex|html|htm|css|scss|sass|less|js|jsx|ts|tsx|py|c|cpp|hpp|h|cxx|cs|java|kt|go|rs|php|rb|swift|sql|sh|bash|zsh|bat|cmd|vbs|ps1|lrc|m3u|m3u8|env|gitattributes|gitignore|dockerfile|makefile)$/i,

    getLanguageAlias: function(ext) {
        const langMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'sh': 'bash',
            'zsh': 'bash',
            'yml': 'yaml',
            'md': 'markdown',
            'h': 'c',
            'hpp': 'cpp'
        };
        return langMap[ext] || ext || 'plaintext';
    },

    render: async function (entry) {
        if (!entry) return;

        const title = entry.name || 'Text File';
        const fileUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));
        const rawExt = (title.split('.').pop() || '').toLowerCase();
        const lang = this.getLanguageAlias(rawExt);

        try {
            const response = await fetch(fileUrl);
            const textData = await response.text();

            const container = document.createElement('div');
            container.className = 'live-view-text-wrapper';

            const pre = document.createElement('pre');
            pre.className = `code-block language-${lang}`;

            const code = document.createElement('code');
            code.className = `language-${lang}`;
            code.textContent = textData;

            pre.appendChild(code);
            container.appendChild(pre);

            HFS_LiveView.show(title, container);

            if (window.Prism) {
                Prism.highlightElement(code);
            }
        } catch (err) {
            HFS_LiveView.show(title, `<div class="live-view-error">Failed to load text file: ${err.message}</div>`);
        }
    }
};

/* ==========================================================================
   Image Gallery Viewer
   ========================================================================== */

const ImageViewer = {
    image_formats: /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|avif)$/i,
    currentList: [],
    currentIndex: -1,
    keyHandlerAttached: false,

    getImagesFromDOM: function () {
        const hfsList = (typeof HFS !== 'undefined') ? (HFS.list || HFS.state?.list || HFS.entries) : null;
        if (Array.isArray(hfsList) && hfsList.length > 0) {
            const filtered = hfsList.filter(item => !item.isFolder && this.image_formats.test(item.name || ''));
            if (filtered.length > 0) return filtered;
        }

        const fileLinks = Array.from(document.querySelectorAll('a[href]'));
        const uniqueImages = new Map();

        fileLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            if (this.image_formats.test(href)) {
                const cleanUrl = href.split('#')[0].split('?')[0];
                if (!uniqueImages.has(cleanUrl)) {
                    const nameEl = link.querySelector('.entry-name') || link;
                    const name = nameEl.innerText ? nameEl.innerText.trim() : decodeURIComponent(cleanUrl.split('/').pop());
                    uniqueImages.set(cleanUrl, { name, uri: href, url: href });
                }
            }
        });

        return Array.from(uniqueImages.values());
    },

    render: function (entry) {
        if (!entry) return;

        this.currentList = this.getImagesFromDOM();
        const targetUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));

        this.currentIndex = this.currentList.findIndex(item => {
            const itemUrl = item.uri || item.url || ('/' + (item.path || item.name));
            return itemUrl === targetUrl || decodeURIComponent(itemUrl) === decodeURIComponent(targetUrl);
        });

        if (this.currentIndex === -1) {
            this.currentList = [entry];
            this.currentIndex = 0;
        }

        // Attach key handler once when window is opened
        this.attachKeyHandler();

        // Initial render via HFS_LiveView.show
        const initialContent = this.buildGalleryDOM(this.currentIndex);
        const title = this.currentList[this.currentIndex]?.name || 'Image View';

        HFS_LiveView.show(title, initialContent, () => {
            this.detachKeyHandler();
        });
    },

    buildGalleryDOM: function (index) {
        const entry = this.currentList[index];
        const title = entry.name || 'Image View';
        const fileUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));

        const container = document.createElement('div');
        container.className = 'live-view-image-wrapper';

        const img = document.createElement('img');
        img.src = fileUrl;
        img.alt = title;
        img.className = 'live-view-image';

        const controlsRow = document.createElement('div');
        controlsRow.className = 'live-view-gallery-controls';

        // Prev Button
        const prevBtn = document.createElement('a');
        prevBtn.href = 'javascript:';
        prevBtn.className = 'gallery-nav-btn';
        prevBtn.innerText = ' [ ❮ Prev ] ';
        prevBtn.style.opacity = index > 0 ? '1' : '0.3';
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index > 0) this.showImageAtIndex(index - 1);
        });

        // Open in New Tab Button & Counter
        const newTabBtn = document.createElement('a');
        newTabBtn.href = fileUrl;
        newTabBtn.target = '_blank';
        newTabBtn.rel = 'noopener noreferrer';
        newTabBtn.className = 'live-view-image-newtab-btn';
        newTabBtn.innerText = `📷 [ ${index + 1}/${this.currentList.length} ]`;
        newTabBtn.addEventListener('click', (e) => e.stopPropagation());

        // Next Button
        const nextBtn = document.createElement('a');
        nextBtn.href = 'javascript:';
        nextBtn.className = 'gallery-nav-btn';
        nextBtn.innerText = ' [ Next ❯ ] ';
        nextBtn.style.opacity = index < this.currentList.length - 1 ? '1' : '0.3';
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index < this.currentList.length - 1) this.showImageAtIndex(index + 1);
        });

        controlsRow.appendChild(prevBtn);
        controlsRow.appendChild(newTabBtn);
        controlsRow.appendChild(nextBtn);

        container.appendChild(img);
        container.appendChild(controlsRow);

        return container;
    },

    showImageAtIndex: function (index) {
        if (index < 0 || index >= this.currentList.length) return;
        this.currentIndex = index;

        const container = document.getElementById('live-view-container');
        const titleSpan = document.querySelector('#live-view-root .live-view-title');

        if (!container) return;

        // Directly update the DOM content without triggering HFS_LiveView.close() cleanup!
        const newContent = this.buildGalleryDOM(index);
        container.innerHTML = '';
        container.appendChild(newContent);

        if (titleSpan) {
            titleSpan.innerText = this.currentList[index]?.name || 'Image View';
        }
    },

    attachKeyHandler: function () {
        if (this.keyHandlerAttached) return;

        this.onKeyDown = (e) => {
            const root = document.getElementById('live-view-root');
            if (!root || root.style.display === 'none') return;

            if (!root.querySelector('.live-view-image-wrapper')) return;

            const activeTag = document.activeElement?.tagName;
            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (this.currentIndex > 0) {
                    this.showImageAtIndex(this.currentIndex - 1);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                if (this.currentIndex < this.currentList.length - 1) {
                    this.showImageAtIndex(this.currentIndex + 1);
                }
            }
        };

        document.addEventListener('keydown', this.onKeyDown, true);
        this.keyHandlerAttached = true;
    },

    detachKeyHandler: function () {
        if (this.onKeyDown) {
            document.removeEventListener('keydown', this.onKeyDown, true);
            this.onKeyDown = null;
        }
        this.keyHandlerAttached = false;
    }
};
/* =======================
   HFS Mini Audio Player
   ======================= */


const HFS_MiniPlayer = {
    audioFormats: /\.(mp3|wav|ogg|aac|m4a|flac|opus)$/i,
    videoFormats: /\.(mp4|mkv|avi|mov|webm|ogv|m4v|flv|3gp)$/i,
    
    songlist: [],
    songlistShuffled: [],
    songlistStandard: [],
    songlistSubfolders: [],
    
    activeRootEntry: null,
    
    nowplaying: 0,
    playing: false,
    sequence: 'shuffle',
    includeSubfolders: false,
    includeVideos: false,

    audio: null,
    elemStatus: null,
    elemNowplaying: null,
    collapseTimer: null,

    init: function () {
        this.updatePlaylistFromDOM();
        this.renderUI();
        if (!this.audio) {
            this.audio = new Audio();
            const savedVolStr = localStorage.getItem('hfs_audio_volume');
            if (savedVolStr !== null) {
                this.audio.volume = parseFloat(savedVolStr);
            }
            this.audio.addEventListener('ended', () => this.play(1));
            this.audio.addEventListener('error', (e) => {
                console.error('Audio playback error on track:', this.audio.src, e);
                this.play(1);
            });
            this.setupMediaSession();
        }
    },

    // Always scan both audio and video files during folder discovery
    isScannableFormat: function(fileName) {
        if (!fileName) return false;
        return this.audioFormats.test(fileName) || this.videoFormats.test(fileName);
    },

    // Get active playlist based on the 'includeVideos' checkbox state
    getActivePlaylist: function() {
        const sourceList = (this.sequence === 'shuffle') ? this.songlistShuffled : this.songlist;
        if (this.includeVideos) {
            return sourceList;
        }
        // Filter out video files when unchecked
        return sourceList.filter(item => !this.videoFormats.test(item.url || item.name || ''));
    },

    getStandardDOMPlaylist: function () {
        if (typeof HFS !== 'undefined' && HFS.state && Array.isArray(HFS.state.list)) {
            return HFS.state.list
                .filter(entry => !entry.isFolder && this.isScannableFormat(entry.name || ''))
                .map(entry => ({
                    name: entry.name,
                    url: entry.uri || entry.url || ('/' + entry.name)
                }));
        }

        const fileLinks = Array.from(document.querySelectorAll('ul.dir li.file a[href]'));
        return fileLinks
            .filter(link => this.isScannableFormat(link.getAttribute('href') || ''))
            .map(link => {
                const href = link.getAttribute('href');
                const nameEl = link.querySelector('.entry-name');
                const name = nameEl ? nameEl.innerText.trim() : decodeURIComponent(href.split('/').pop());
                return { name, url: href };
            });
    },

    // Fetches files from a directory URL using ?get=list
    fetchFolderTracks: async function (folderUri) {
        try {
            const normalizedUri = folderUri.endsWith('/') ? folderUri : folderUri + '/';
            const res = await fetch(normalizedUri + '?get=list');
            if (!res.ok) return [];

            const textData = await res.text();
            const lines = textData.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

            const tracks = [];
            for (let rawUrl of lines) {
                let cleanPath = rawUrl;
                try {
                    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
                        cleanPath = new URL(rawUrl).pathname;
                    }
                } catch (e) {}

                cleanPath = '/' + cleanPath.replace(/^\//, '');

                if (this.isScannableFormat(cleanPath)) {
                    const displayName = decodeURIComponent(cleanPath.split('/').pop());
                    tracks.push({
                        name: displayName,
                        url: cleanPath
                    });
                }
            }
            return tracks;
        } catch (err) {
            console.error("Failed fetching folder tracks for:", folderUri, err);
            return [];
        }
    },

    updatePlaylistFromDOM: async function (rootEntry = null) {
        if (rootEntry) {
            this.activeRootEntry = rootEntry;
        }

        // 1. Standard DOM playlist for current page
        this.songlistStandard = this.getStandardDOMPlaylist();

        // 2. Scan subfolders if checked
        if (this.includeSubfolders && typeof HFS !== 'undefined' && HFS.state && Array.isArray(HFS.state.list)) {
            try {
                let baseFolderUri = HFS.state.uri || location.pathname;
                if (!baseFolderUri.endsWith('/')) baseFolderUri += '/';

                // Get current tracks from root folder
                let allTracks = [...this.songlistStandard];

                // Identify subfolder objects directly from HFS.state.list
                const subfolders = HFS.state.list.filter(e => e.isFolder);

                if (subfolders.length > 0) {
                    const subfolderPromises = subfolders.map(folder => {
                        let subUri = folder.uri || folder.url || (baseFolderUri + folder.name + '/');
                        return this.fetchFolderTracks(subUri);
                    });

                    const subResults = await Promise.all(subfolderPromises);
                    for (const subTracks of subResults) {
                        allTracks = allTracks.concat(subTracks);
                    }
                }

                this.songlistSubfolders = allTracks.length > 0 ? allTracks : [...this.songlistStandard];
            } catch (e) {
                console.error("Subfolder scan failed:", e);
                this.songlistSubfolders = [...this.songlistStandard];
            }
            this.songlist = [...this.songlistSubfolders];
        } else {
            this.songlistSubfolders = [];
            this.songlist = [...this.songlistStandard];
        }

        this.songlistShuffled = [...this.songlist].sort(() => 0.5 - Math.random());
    },

    autoExpandBriefly: function () {
        const playerEl = document.getElementById('audioplayer');
        if (!playerEl) return;

        const wrapper = playerEl.querySelector('.mini-nowplaying-wrapper');
        const toggleBtn = playerEl.querySelector('.mini-toggle-btn');
        if (!wrapper || !toggleBtn) return;

        if (this.collapseTimer) {
            clearTimeout(this.collapseTimer);
            this.collapseTimer = null;
        }

        wrapper.classList.remove('collapsed');
        toggleBtn.innerText = '❮';

        this.collapseTimer = setTimeout(() => {
            wrapper.classList.add('collapsed');
            toggleBtn.innerText = '❯';
            this.collapseTimer = null;
        }, 5000);
    },

    renderUI: function () {
        if (document.getElementById('audioplayer')) return;

        const targetContainer = document.querySelector('.part3 .left');
        if (!targetContainer) return;

        const savedVolStr = localStorage.getItem('hfs_audio_volume');
        const savedVolume = savedVolStr !== null ? parseFloat(savedVolStr) : 0.7;
        const initialPct = (savedVolume * 100).toFixed(1);
        const initialIcon = savedVolume === 0 ? '🔇' : '🔊';

        const playerSpan = document.createElement('span');
        playerSpan.id = 'audioplayer';
        playerSpan.className = 'animator-show';
        playerSpan.style.display = 'none';
        playerSpan.innerHTML = `
            <div class="mini-volume-wrapper">
                <a href="javascript:" class="mini-volume-btn">${initialIcon}</a>
                <div class="mini-volume-popup">
                    <div class="mini-volume-track">
                        <div class="mini-volume-fill" style="height: ${initialPct}%;"></div>
                        <div class="mini-volume-handle" style="bottom: ${initialPct}%;"></div>
                    </div>
                </div>
            </div>
            <div class="mini-settings-wrapper">
                <a href="javascript:" class="mini-settings-btn">⚙️</a>
                <div class="mini-settings-popup">
                    <div class="mini-settings-option">
                        <span>Mode:</span>
                        <select id="mini-player-mode">
                            <option value="shuffle" ${this.sequence === 'shuffle' ? 'selected' : ''}>Shuffle</option>
                            <option value="sequence" ${this.sequence === 'sequence' ? 'selected' : ''}>Sequential</option>
                        </select>
                    </div>
                    <label class="mini-settings-option" for="mini-player-subfolders">
                        <input type="checkbox" id="mini-player-subfolders" ${this.includeSubfolders ? 'checked' : ''} />
                        <span>Include Subfolders</span>
                    </label>
                    <label class="mini-settings-option" for="mini-player-videos">
                        <input type="checkbox" id="mini-player-videos" ${this.includeVideos ? 'checked' : ''} />
                        <span>Include Video Files</span>
                    </label>
                </div>
            </div>
            <a href="javascript:" data-player="next" data-player-alt="prev" data-tooltip="Click: Next | Right-Click: Prev">&nbsp;\\( •̀ ω •́ )\\✧ ♫&nbsp;</a>
            <a href="javascript:" data-player="pause">
                <span>&nbsp;►❙&nbsp;</span>
                <span data-player="status">Paused:</span>
            </a>
            <div class="mini-nowplaying-wrapper">
                <span data-player="nowplaying">Ready</span>
            </div>
            <a href="javascript:" class="mini-toggle-btn">&lt;</a>
        `;

        targetContainer.appendChild(playerSpan);

        this.elemStatus = playerSpan.querySelector('[data-player="status"]');
        this.elemNowplaying = playerSpan.querySelector('[data-player="nowplaying"]');

        const nextBtn = playerSpan.querySelector('[data-player="next"]');
        const pauseBtn = playerSpan.querySelector('[data-player="pause"]');
        const toggleBtn = playerSpan.querySelector('.mini-toggle-btn');
        const nowplayingWrapper = playerSpan.querySelector('.mini-nowplaying-wrapper');

        const modeSelect = playerSpan.querySelector('#mini-player-mode');
        const subfolderCheckbox = playerSpan.querySelector('#mini-player-subfolders');
        const videoCheckbox = playerSpan.querySelector('#mini-player-videos');

        modeSelect.addEventListener('change', (e) => {
            this.sequence = e.target.value;
            if (typeof HFS !== 'undefined' && typeof HFS.toast === 'function') {
                HFS.toast(`Playback Mode: ${this.sequence}`);
            }
        });

        subfolderCheckbox.addEventListener('change', async (e) => {
            this.includeSubfolders = e.target.checked;
            
            const currentTrack = this.songlist[this.nowplaying];
            await this.updatePlaylistFromDOM(this.activeRootEntry);

            if (currentTrack) {
                const targetList = (this.sequence === 'shuffle') ? this.songlistShuffled : this.songlist;
                const newIndex = targetList.findIndex(item => item.url === currentTrack.url);
                if (newIndex !== -1) {
                    this.nowplaying = newIndex;
                }
            }

            if (typeof HFS !== 'undefined' && typeof HFS.toast === 'function') {
                HFS.toast(`Include Subfolders: ${this.includeSubfolders ? 'ON' : 'OFF'}`);
            }
        });

        videoCheckbox.addEventListener('change', (e) => {
            this.includeVideos = e.target.checked;

            const activeList = this.getActivePlaylist();
            if (this.nowplaying >= activeList.length) {
                this.nowplaying = 0;
            }

            if (typeof HFS !== 'undefined' && typeof HFS.toast === 'function') {
                HFS.toast(`Include Video Files: ${this.includeVideos ? 'ON' : 'OFF'}`);
            }
        });

        toggleBtn.addEventListener('click', () => {
            if (this.collapseTimer) {
                clearTimeout(this.collapseTimer);
                this.collapseTimer = null;
            }
            const isCollapsed = nowplayingWrapper.classList.toggle('collapsed');
            toggleBtn.innerText = isCollapsed ? '❯' : '❮';
        });

        nextBtn.addEventListener('click', () => this.play(1));
        pauseBtn.addEventListener('click', () => this.playing ? this.pause() : this.play(0));

        nextBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.play(-1);
        });

        const volWrapper = playerSpan.querySelector('.mini-volume-wrapper');
        const volBtn = playerSpan.querySelector('.mini-volume-btn');
        const volTrack = playerSpan.querySelector('.mini-volume-track');
        const volFill = playerSpan.querySelector('.mini-volume-fill');
        const volHandle = playerSpan.querySelector('.mini-volume-handle');

        let isDragging = false;

        const updateUI = (vol, isMuted = false) => {
            const pct = isMuted ? 0 : Math.max(0, Math.min(100, vol * 100));
            volFill.style.height = pct + '%';
            volHandle.style.bottom = pct + '%';
            volBtn.innerText = (pct === 0 || isMuted) ? '🔇' : '🔊';
        };

        const setVolume = (vol) => {
            vol = Math.max(0, Math.min(1, vol));
            if (this.audio) {
                this.audio.volume = vol;
                this.audio.muted = false;
            }
            localStorage.setItem('hfs_audio_volume', vol);
            updateUI(vol);
        };

        const handleTrackCalc = (e) => {
            const rect = volTrack.getBoundingClientRect();
            let percent = (rect.bottom - e.clientY) / rect.height;
            percent = Math.max(0, Math.min(1, percent));
            setVolume(percent);
        };

        volBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.audio) return;

            if (this.audio.muted || this.audio.volume === 0) {
                const savedVolStr = localStorage.getItem('hfs_audio_volume');
                let targetVol = savedVolStr !== null ? parseFloat(savedVolStr) : 0.7;
                if (targetVol === 0) targetVol = 0.7;
                setVolume(targetVol);
            } else {
                this.audio.muted = true;
                updateUI(this.audio.volume, true);
            }
        });

        volWrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (!this.audio) return;
            const delta = e.deltaY < 0 ? 0.05 : -0.05;
            setVolume(this.audio.volume + delta);
        }, { passive: false });

        volTrack.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDragging = true;
            handleTrackCalc(e);
        });

        window.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                handleTrackCalc(e);
            }
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    },

    showPlayer: function () {
        const playerEl = document.getElementById('audioplayer');
        if (playerEl) {
            playerEl.style.display = 'inline-flex';
        }
    },

    loadAndPlay: async function (entry) {
        if (!entry) return;
        stopAllOtherMedia('mini');

        this.activeRootEntry = entry;
        await this.updatePlaylistFromDOM(entry);
        this.showPlayer();
        this.autoExpandBriefly();

        let fileUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));
        try {
            if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
                fileUrl = new URL(fileUrl).pathname;
            }
        } catch (e) {}

        const fileName = entry.name || decodeURIComponent(fileUrl.split('/').pop());
        const activeList = this.getActivePlaylist();

        const foundIndex = activeList.findIndex(item => item.url === fileUrl || decodeURIComponent(item.url) === decodeURIComponent(fileUrl));
        if (foundIndex !== -1) {
            this.nowplaying = foundIndex;
        }

        if (this.audio) {
            this.audio.src = fileUrl;
            this.audio.play();
            this.playing = true;
            if (this.elemNowplaying) this.elemNowplaying.innerText = fileName;
            if (this.elemStatus) this.elemStatus.innerText = 'Playing:';
            this.updateMediaSession();
        }
    },

    play: function (offset = 0) {
        const activeList = this.getActivePlaylist();
        if (!activeList.length) return;

        stopAllOtherMedia('mini');
        this.showPlayer();

        if (offset !== 0 || !this.audio.src) {
            let count = this.nowplaying + offset;
            if (count < 0) {
                count = activeList.length + count;
            } else if (count >= activeList.length) {
                count = count % activeList.length;
            }
            this.nowplaying = count;

            const currentTrack = activeList[count];
            this.audio.src = currentTrack.url;
            if (this.elemNowplaying) this.elemNowplaying.innerText = currentTrack.name;

            this.autoExpandBriefly();
        }

        this.audio.play();
        this.playing = true;
        if (this.elemStatus) this.elemStatus.innerText = 'Playing:';
        this.updateMediaSession();
    },

    pause: function () {
        if (this.audio) this.audio.pause();
        this.playing = false;
        if (this.elemStatus) this.elemStatus.innerText = 'Paused:';
    },

    setupMediaSession: function () {
        if (!('mediaSession' in navigator)) return;
        navigator.mediaSession.setActionHandler('play', () => this.play(0));
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('stop', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.play(-1));
        navigator.mediaSession.setActionHandler('nexttrack', () => this.play(1));
    },

    updateMediaSession: function () {
        if (!('mediaSession' in navigator)) return;
        const activeList = this.getActivePlaylist();
        const currentTrack = activeList[this.nowplaying];
        if (!currentTrack) return;

        const parts = currentTrack.name.replace(/\.[^/.]+$/, '').split(' - ').reverse();
        navigator.mediaSession.metadata = new MediaMetadata({
            title: parts[0] || currentTrack.name,
            artist: parts[1] || 'HFS Player'
        });
    }
};

function initMiniPlayerWhenReady() {
    if (document.querySelector('.part3 .left')) {
        HFS_MiniPlayer.init();
    }
    if (!document.querySelector('ul.dir li.file')) {
        setTimeout(initMiniPlayerWhenReady, 300);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initMiniPlayerWhenReady);
} else {
    initMiniPlayerWhenReady();
}