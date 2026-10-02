'use strict';

//==========================================
// Helper Functions & ArtPlayer Module
//==========================================

let currentPath = location.pathname;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ==========================================
// Generic Live File View Window Module
// ==========================================

const HFS_LiveView = {
    activeCleanup: null,

    /**
     * Set content and open the window
     * @param {string} title - Header text
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

    /**
     * Clear content and hide window
     */
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

//LIVE VIEW MODULES
const HFS_ArtPlayer = {
    artInstance: null,
    customSub: null,
    video_formats: /\.(mp4|mkv|avi|mov|webm|ogv|m4v|flv|3gp|mp3|wav|ogg|aac|m4a|flac|opus)$/i,

    // Dynamic subtitle switcher
    loadSubtitle: function (subEntry) {
        if (!subEntry) return;

        this.customSub = subEntry;
        const subUrl = subEntry.uri || subEntry.url || ('/' + (subEntry.path || subEntry.name));
        const subType = subUrl.toLowerCase().includes('.vtt') ? 'vtt' : 'srt';

        if (this.artInstance) {
            // Update active ArtPlayer subtitle instance dynamically
            this.artInstance.subtitle.switch(subUrl, { type: subType });
            this.artInstance.subtitle.show = true;
            this.artInstance.notice.show = `Loaded subtitle: ${subEntry.name}`;
        } else {
            if (typeof HFS.notice === 'function') {
                HFS.notice(`Subtitle set: ${subEntry.name}`);
            } else {
                dialog.alert(`Loaded subtitle: ${subEntry.name}`);
            }
        }
    },

    play: async function (entry) {
        if (!entry) return;

        const title = entry.name || 'Media Player';
        const fileUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));

        const mountPoint = document.createElement('div');
        mountPoint.style.width = '100%';
        mountPoint.style.height = '100%';

        HFS_LiveView.show(title, mountPoint, () => this.destroy());

        await loadScript('https://cdn.jsdelivr.net/npm/artplayer/dist/artplayer.js');

        const isAudio = /\.(mp3|wav|ogg|aac|m4a|flac|opus)$/i.test(title);
        let subUrl = '';
        let matchedSubName = '';

        if (!isAudio) {
            if (this.customSub) {
                subUrl = this.customSub.uri || this.customSub.url || ('/' + (this.customSub.path || this.customSub.name));
                matchedSubName = this.customSub.name;
            } else {
                const currentList = Array.isArray(HFS.list) ? HFS.list : [];
                let foundSub = currentList.find(item => !item.isFolder && /\.(srt|vtt)$/i.test(item.name || ''));
                if (foundSub) {
                    subUrl = foundSub.uri || foundSub.url || ('/' + (foundSub.path || foundSub.name));
                    matchedSubName = foundSub.name;
                }
            }
        }

        this.artInstance = new Artplayer({
            container: mountPoint,
            url: fileUrl,
            theme: '#00adb5',
            autoplay: true,
            screenshot: true,
            pip: true,
            setting: true,
            flip: true,
            playbackRate: true,
            aspectRatio: true,
            fullscreen: true,
            fullscreenWeb: true,
            subtitleOffset: true,
            autoPlayback: true,
            moreVideoAttr: { crossOrigin: 'anonymous' },
            subtitle: {
                url: subUrl,
                type: subUrl.toLowerCase().includes('.vtt') ? 'vtt' : 'srt',
                style: {
                    color: '#ffffff',
                    fontSize: '22px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                },
            },
            controls: [
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
            ],
            contextmenu: [
                {
                    html: 'Copy Direct URL',
                    click(contextmenu) {
                        navigator.clipboard.writeText(window.location.origin + fileUrl);
                        if (HFS_ArtPlayer.artInstance) {
                            HFS_ArtPlayer.artInstance.notice.show = 'Direct link copied!';
                        }
                        contextmenu.show = false;
                    },
                },
            ],
        });

        if (subUrl && this.artInstance) {
            this.artInstance.notice.show = `Loaded subtitle: ${matchedSubName}`;
        }
    },

    close: function () {
        HFS_LiveView.close();
    },

    destroy: function () {
        if (this.artInstance) {
            this.artInstance.destroy();
            this.artInstance = null;
        }
    }
};

const TextViewer = {
    text_formats: /\.(txt|log|ini|cfg|json|md|html|htm|js|css|py|c|cpp|h|sh|bat|vbs|ps1|lrc|m3u|m3u8)$/i,

    render: async function (entry) {
        if (!entry) return;

        const title = entry.name || 'Text File';
        const fileUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));

        try {
            const response = await fetch(fileUrl);
            const textData = await response.text();

            const textarea = document.createElement('textarea');
            textarea.className = 'takeback-textbox live-view-textbox';
            textarea.readOnly = true;
            textarea.value = textData;

            // Pushes the textarea directly into HFS_LiveView
            HFS_LiveView.show(title, textarea);
        } catch (err) {
            HFS_LiveView.show(title, `<div class="live-view-error">Failed to load text file: ${err.message}</div>`);
        }
    }
};

const ImageViewer = {
    image_formats: /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|avif)$/i,

    render: function (entry) {
        if (!entry) return;

        const title = entry.name || 'Image View';
        const fileUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));

        const container = document.createElement('div');
        container.className = 'live-view-image-wrapper';

        const img = document.createElement('img');
        img.src = fileUrl;
        img.alt = title;
        img.className = 'live-view-image';

        container.appendChild(img);

        HFS_LiveView.show(title, container);
    }
};
function resetToListViewOnNavigation() {
    if (location.pathname !== currentPath) {
        currentPath = location.pathname;
        
        // Disable thumbnail view state
        applyThumbnails(false);

        // Reset button text
        const thumbBtn = document.getElementById('showthumb');
        if (thumbBtn) {
            thumbBtn.textContent = '📸 Photo Thumbnails';
        }
    }
}

function processFieldInputs(container = document) {
    if (!container.querySelectorAll) return;
    const selector = '.field input:not([type="checkbox"]):not([type="radio"]), input[name="input"]:not([type="checkbox"]):not([type="radio"])';
    container.querySelectorAll(selector).forEach((input) => {
        input.classList.add('takeback-textbox');
    });
}

function stripLinks(container = document) {
    if (!container.querySelectorAll) return;
    container.querySelectorAll('a[href="?get=zip"]').forEach((a) => {
        if (!a.id || a.id.trim() === '') {
            a.removeAttribute('style');
            a.style.cssText = 'all: unset !important; cursor: pointer !important;';
        }
    });
}

function formatDialogClosers(container) {
    if (!container || !container.querySelectorAll) return;
    const selector = '.dialog-closer';
    const updateText = (btn) => {
        if (btn.textContent !== '[X]') {
            btn.textContent = '[X]';
        }
    };
    if (container.matches?.(selector)) updateText(container);
    container.querySelectorAll(selector).forEach(updateText);
}

/**
 * Modular Thumbnail Feature Handler
 * Manages visibility, image swapping, and view toggling
 */
function updateThumbnailVisibility() {
    const thumbBtn = document.getElementById('showthumb');
    const listWrapper = document.querySelector('.list-wrapper');

    if (!thumbBtn || !listWrapper) return;

    // Check if image files exist in current DOM
    const hasImages = !!document.querySelector('.file a[href$=".jpg"], .file a[href$=".jpeg"], .file a[href$=".png"], .file a[href$=".gif"], .file a[href$=".webp"]');

    // Toggle button visibility based on image existence
    thumbBtn.style.display = hasImages ? 'inline-block' : 'none';

    // Re-apply thumbnail images if React re-rendered the file list while in thumbnail mode
    if (listWrapper.classList.contains('thumb-mode')) {
        applyThumbnails(true);
    }
}

function applyThumbnails(enable) {
    const listWrapper = document.querySelector('.list-wrapper');
    if (!listWrapper) return;

    listWrapper.classList.toggle('thumb-mode', enable);

    document.querySelectorAll('.file a').forEach((a) => {
        const href = a.getAttribute('href');
        if (href && href.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            const iconSpan = a.querySelector('span:first-child');
            if (!iconSpan) return;

            if (enable) {
                if (!a.dataset.originalIcon) a.dataset.originalIcon = iconSpan.innerHTML;
                if (!iconSpan.querySelector('.file-thumb-img')) {
                    iconSpan.innerHTML = `<img src="${href}" class="file-thumb-img" alt="thumb" loading="lazy" />`;
                }
            } else if (a.dataset.originalIcon) {
                iconSpan.innerHTML = a.dataset.originalIcon;
            }
        }
    });
}

function injectHeadMetaTags() {
    if (document.getElementById('takeback-meta-tags')) return;
    const metaContainer = document.createElement('div');
    metaContainer.id = 'takeback-meta-tags';
    metaContainer.innerHTML = `
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="theme-color" content="#000000">
        <meta name="description" content="This is a file sharing site.">
    `;
    const headTarget = document.head || document.getElementsByTagName('head')[0] || document.documentElement;
    while (metaContainer.firstChild) {
        headTarget.appendChild(metaContainer.firstChild);
    }
}

function injectStructuralHeader() {
    if (document.getElementById('takeback-header-section')) return;
    const headerSection = document.createElement('section');
    headerSection.id = 'takeback-header-section';
    headerSection.className = 'part0 takeback-reborn-mod';
    headerSection.innerHTML = `
        <h1>HTTP File Server</h1>
        <nav>
            <span>
                <a id="breadcrumbs-header-placeholder" href="/">🏠 Home</a>
            </span>
            <div style="height: 4px;"></div>
            <form id="search-form" class="search" action="./" method="GET">
                <input type="search" name="search" placeholder="Search" />
                <a href="#" onclick="document.getElementById('search-form').submit();" class="invert" data-tooltip="Search" style="font-size: 1.3rem; text-decoration: none; cursor: pointer;">🔍</a>
                <a href="#" onclick="event.preventDefault(); document.getElementById('search-button')?.click();" class="invert" data-tooltip="Advanced Search" style="font-size: 1.3rem; text-decoration: none; cursor: pointer;">🔍⚙️</a>
            </form>
            <span id="right-stuff" class="right">
                <span id="menu-panel-buttons">
                    <!-- PLACEHOLDER FOR THE BUTTONS -->
                </span>
                <a href="#" onclick="event.preventDefault(); document.getElementById('upload-button')?.click();" class="invert" data-tooltip="Upload some files to this folder">⇧ Upload</a>
                <a href="#" onclick="event.preventDefault(); document.getElementById('login-button')?.click();">👤Login</a>
            </span>
        </nav>
        <p>
            <a href="?get=zip" id="zip-button2" onclick="event.preventDefault(); document.getElementById('zip-button')?.click();">
                <span><b>[Zip Current Folder]</b></span>
            </a>
        </p>
    `;
    document.body.insertBefore(headerSection, document.body.firstChild);
}

function injectEarlyPart1() {
    if (document.querySelector('.part1')) return;
    const part1Section = document.createElement('section');
    part1Section.className = 'part1';
    part1Section.style.display = 'none';
    part1Section.innerHTML = `
        <a class="invert" href="#" id="sortExtension" data-tooltip="Click to sort files by extension">🔷</a>
        <a class="invert" href="#" id="sortItem" data-tooltip="Click to sort files by name"> Item </a>
        <a class="invert" href="#" id="showthumb" data-tooltip="Show thumbnails of photos" style="display: none;">📸 Photo Thumbnails</a>
        <a class="invert" href="#" id="sortSize" data-tooltip="Click to sort files by size"> Size </a>
        <a class="invert" href="#" id="sortLastModified" data-tooltip="Click to sort files by time">Last Modified</a>
    `;
    document.body.appendChild(part1Section);
}

function injectStructuralWrapper() {
    if (document.getElementById('takeback-structural-wrapper')) return;
    const hasBackgroundImage = false;
    const bgClass = hasBackgroundImage ? "background-image" : "background";
    const injectionContainer = document.createElement('div');
    injectionContainer.id = 'takeback-structural-wrapper';
    injectionContainer.innerHTML = `
        <section class="${bgClass}"></section>
        <section class="background-mask"></section>
        <section class="takeback-reborn-mod" id="dialog" style="opacity: 0; top: 200%;"></section>
        <section class="takeback-reborn-mod" id="tooltip" style="display: none;"></section>
    `;
    document.body.insertBefore(injectionContainer, document.body.firstChild);
}

// ==========================================
// 2. Main DOM Injection & Observer Setup
// ==========================================

function injectCustomElements() {
    // Dialog Animation & Input Observer
    const dialogObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches?.('dialog, .dialog, .animator-show') || node.querySelector?.('dialog, .dialog')) {
                        const targetDialog = node.matches?.('dialog, .dialog, .animator-show') ? node : node.querySelector('dialog, .dialog');
                        if (targetDialog.dataset.isAnimatingClose) return;

                        targetDialog.dataset.isAnimatingClose = 'true';
                        mutation.target.appendChild(node);
                        targetDialog.classList.remove('animator-show');
                        targetDialog.classList.add('animator-hide');

                        setTimeout(() => node.remove(), 100);
                    }
                }
            });

            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const isTextInput = node.matches?.('input') && node.type !== 'checkbox' && node.type !== 'radio';

                    if (node.matches?.('div.field')) {
                        const input = node.querySelector('input:not([type="checkbox"]):not([type="radio"])');
                        if (input) input.classList.add('takeback-textbox');
                    } else if (isTextInput && (node.closest('.field') || node.getAttribute('name') === 'input')) {
                        node.classList.add('takeback-textbox');
                    }

                    if (node.matches?.('a[href="?get=zip"]') && (!node.id || node.id.trim() === '')) {
                        node.removeAttribute('style');
                        node.style.cssText = 'all: unset !important; cursor: pointer !important;';
                    }

                    if (node.querySelectorAll) {
                        processFieldInputs(node);
                        stripLinks(node);
                        formatDialogClosers(node);
                    }

                    setTimeout(() => {
                        processFieldInputs(node);
                        stripLinks(node);
                        formatDialogClosers(node);
                    }, 0);
                }
            });
        }
    });

    dialogObserver.observe(document.body, { childList: true, subtree: true });


    // Inject Base Elements & Live View Window Overlay DOM
    injectHeadMetaTags();
    injectStructuralHeader();
    injectEarlyPart1();
    injectStructuralWrapper();
    injectLiveViewOverlay();

    // Global Event Delegation for Thumbnail Click Handler
    document.addEventListener('click', (e) => {
        const thumbBtn = e.target.closest('#showthumb');
        if (!thumbBtn) return;

        e.preventDefault();
        e.stopPropagation();

        const listWrapper = document.querySelector('.list-wrapper');
        if (!listWrapper) return;

        const isThumbMode = listWrapper.classList.contains('thumb-mode');
        const nextState = !isThumbMode;

        thumbBtn.textContent = nextState ? '📋 List View' : '📸 Photo Thumbnails';
        applyThumbnails(nextState);
    });

    // Persistent Observer for Dynamic Page Updates & Thumbnail Checking
    const thumbObserver = new MutationObserver(() => {
        resetToListViewOnNavigation();
        updateThumbnailVisibility();
    });
    thumbObserver.observe(document.body, { childList: true, subtree: true });

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', () => {
        resetToListViewOnNavigation();
    });

    // Secondary Observer. Layout Modifications. runs only at the begging of the page's life and then exits when it does its magic
    const observedStuff = new Array(8).fill(0);
    let observeCounter = 0;

    const obs = new MutationObserver(() => {
        const ZipBtn = document.getElementById('zip-button');
        const SearchBtn = document.getElementById('search-button');
        const uploadBtn = document.getElementById('upload-button');
        const loginBtn = document.getElementById('login-button');
        const optionsBtn = document.getElementById('options-button');
        const selectBtn = document.getElementById('select-button');
        const part1Section = document.querySelector('.part1');
        const menuBar = document.getElementById('menu-bar');
        const listWrapperElement = document.querySelector('.list-wrapper');

        if (ZipBtn && !observedStuff[0]) {
            observedStuff[0] = 1;
            observeCounter++;
            ZipBtn.style.display = 'none';
        }
        if (SearchBtn && !observedStuff[1]) {
            observedStuff[1] = 1;
            observeCounter++;
            SearchBtn.style.display = 'none';
        }
        if (uploadBtn && !observedStuff[2]) {
            observedStuff[2] = 1;
            observeCounter++;
            uploadBtn.style.display = 'none';
        }
        if (loginBtn && !observedStuff[3]) {
            observedStuff[3] = 1;
            observeCounter++;
            loginBtn.style.display = 'none';
        }
        if (optionsBtn && !observedStuff[4]) {
            observedStuff[4] = 1;
            observeCounter++;
        }
        if (selectBtn && !observedStuff[5]) {
            observedStuff[5] = 1;
            observeCounter++;
        }   
        if (part1Section && listWrapperElement && !observedStuff[6]) {
            observedStuff[6] = 1;
            observeCounter++;
            listWrapperElement.insertBefore(part1Section, listWrapperElement.firstChild);
            part1Section.style.display = '';
        }
        if (menuBar && !observedStuff[7]) {
            observedStuff[7] = 1;
            observeCounter++;
        }   

        // Disconnect layout observer when base UI components are secured
        if (observeCounter === 8) {
            obs.disconnect();

            // reposition breadcrumbs (navigation controls)
            const targetAnchorBreadcrumbs = document.getElementById('breadcrumbs-header-placeholder');
            const sourceAnchorBreadcrumbs = document.getElementById('breadcrumb-home');
            if (sourceAnchorBreadcrumbs && targetAnchorBreadcrumbs) {
                const headerElement = sourceAnchorBreadcrumbs?.closest('header');
                if (headerElement) {
                    headerElement.id = 'breadcrumbs-header';
                    targetAnchorBreadcrumbs.replaceWith(headerElement);
                }
            }

            // reposition remaining buttons off the bottom menu bar
            const targetAnchorRightStuff = document.getElementById('menu-panel-buttons');
            if (targetAnchorRightStuff) {
                selectBtn.setAttribute('data-tooltip', 'Select - Selection applies to &quot;Zip&quot; and &quot;Delete&quot; (when available), but you can also filter the list');
                targetAnchorRightStuff.prepend(selectBtn, optionsBtn);
            }
        }
    });

    obs.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
}

// ==========================================
// 3. HFS Event Hooks & Listeners
// ==========================================
HFS.onEvent('entryIcon', ({ entry }) => {
    if (entry.isFolder) return '<span aria-hidden="true" role="img" class="icon" style="margin-right: 0.1em;">📁</span>';

    const ext = (entry.ext || '').toLowerCase();

    // Helper function using HFS3 wrapper markup with right spacing
    const icon = (symbol, color) => 
        `<span aria-hidden="true" role="img" class="icon" style="color: ${color}; margin-right: 0.1em;">${symbol}</span>`;

    switch (ext) {
        // Working Picture (Photoshop & GIMP)
        case 'psd':
        case 'xcf':
            return icon('📸', '#5AE');

        // Audio/Music
        case 'mp3':
        case 'aac':
        case 'm4a':
        case 'wav':
        case 'ogg':
        case 'opus':
            return icon('🔊\u{FE0E}', 'green');

        // Video
        case 'mp4':
        case 'avi':
        case 'webm':
        case 'ogv':
        case 'flv':
        case 'mkv':
            return icon('📺', 'teal');

        // Installation Pack / Archives
        case 'msi':
        case 'tar.gz':
        case 'deb':
        case 'rpm':
        case 'zip':
        case 'rar':
            return icon('📦\u{FE0E}', 'brown');

        // Executable/Script
        case 'exe':
        case 'vbs':
        case 'bat':
        case 'sh':
        case 'ps1':
        case 'pyc':
        case 'apk':
            return icon('🔷\u{FE0E}', '#5AE');

        // Code
        case 'c':
        case 'cpp':
        case 'h':
        case 'cxx':
        case 'gcc':
        case 'py':
        case 'js':
            return icon('⌨\u{FE0E}', 'yellow');

        // Working Document
        case 'rtf':
        case 'doc':
        case 'docx':
        case 'odt':
        case 'xls':
        case 'xlsx':
        case 'ods':
        case 'ppt':
        case 'pptx':
        case 'odp':
            return icon('📝\u{FE0E}', 'gray');

        // Other Text
        case 'txt':
        case 'ini':
        case 'htm':
        case 'html':
        case 'cfg':
        case 'json':
        case 'm3u':
        case 'm3u8':
        case 'lrc':
        case 'md':
            return icon('📑', 'thistle');

        // Flash
        case 'swf':
            return icon('⚡\u{FE0E}', 'gold');

        // Icon
        case 'ico':
            return icon('🥚\u{FE0E}', 'wheat');

        // (Data) Image
        case 'iso':
        case 'img':
        case 'dda':
            return icon('💿', 'white');

        // E-Books
        case 'epub':
        case 'pdf':
            return icon('📕', 'inherit');

        // Standard Images
        case 'png':
        case 'jpg':
        case 'gif':
            return icon('🖼️', 'inherit');

        default:
            return '';
    }
});

// File menu context action: Handle Subtitles & Unified Live Window View
HFS.onEvent('fileMenu', ({ entry }) => {
    if (!entry || entry.isFolder) return [];

    const fileName = entry.name || '';
    const isSub = /\.(srt|vtt)$/i.test(fileName);
    const isMedia = HFS_ArtPlayer.video_formats.test(fileName);
    const isText = TextViewer.text_formats.test(fileName);
    const isImage = ImageViewer.image_formats.test(fileName);

    if (!isSub && !isMedia && !isText && !isImage) return [];

    const items = [];

    // Option 1: Load subtitles
    if (isSub) {
        items.push({
            id: 'load-subtitle-file',
            icon: 'chat',
            label: HFS.t("Load subtitles"),
            onClick() {
                HFS_ArtPlayer.loadSubtitle(entry);
            }
        });
    }

    // Option 2: Unified Live Window View
    if (isMedia || isText || isImage) {
        items.push({
            id: 'open-in-live-window',
            icon: 'play',
            label: HFS.t("View in Live Window"),
            onClick() {
                if (isMedia) {
                    HFS_ArtPlayer.play(entry);
                } else if (isText) {
                    TextViewer.render(entry);
                } else if (isImage) {
                    ImageViewer.render(entry);
                }
            }
        });
    }

    return items;
});

// Display direct Live View play button next to file names
HFS.onEvent('afterEntryName', ({ entry }, { setOrder }) => {
    if (!entry || entry.isFolder) return;

    const fileName = entry.name || '';
    const isMedia = HFS_ArtPlayer.video_formats.test(fileName);
    const isText = TextViewer.text_formats.test(fileName);
    const isImage = ImageViewer.image_formats.test(fileName);

    if (isMedia || isText || isImage) {
        setOrder(-1);

        return HFS.iconBtn('play', (ev) => {
            ev.stopPropagation();
            if (isMedia) {
                HFS_ArtPlayer.play(entry);
            } else if (isText) {
                TextViewer.render(entry);
            } else if (isImage) {
                ImageViewer.render(entry);
            }
        }, {
            className: 'live-view-btn',
            title: HFS.t("View in Live Window")
        });
    }
});



if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCustomElements);
} else {
    injectCustomElements();
}

// Close live view window on 'Escape' key press
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        HFS_LiveView.close();
    }
});

// ----------Dialog backdrop click management-----------
document.addEventListener('mousedown', (e) => {
    const dialog = e.target.closest('dialog, .dialog');
    if (dialog) {
        dialog.dataset.startedInside = 'true';
    } else {
        document.querySelectorAll('dialog, .dialog').forEach(d => delete d.dataset.startedInside);
    }
}, true);

document.addEventListener('click', (e) => {
    const dialog = e.target.closest('dialog, .dialog');
    if (!dialog) {
        const activeDialog = document.querySelector('dialog[data-started-inside="true"], .dialog[data-started-inside="true"]');
        if (activeDialog) {
            e.stopPropagation();
            e.preventDefault();
            delete activeDialog.dataset.startedInside;
        }
    }
}, true);

document.addEventListener('mouseup', () => {
    setTimeout(() => {
        document.querySelectorAll('dialog, .dialog').forEach(d => delete d.dataset.startedInside);
    }, 0);
}, true);
//---------------end----------------

function applyHfsSort(sortValue) {
    let sortSelect = document.getElementById('option-sort-by');
    if (sortSelect) {
        sortSelect.value = sortValue;
        sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    const optionsBtn = document.getElementById('options-button');
    if (!optionsBtn) return;

    // wait for the dialog to show up to hide it
    const observer = new MutationObserver((mutations) => {
        const select = document.getElementById('option-sort-by');
        if (select) {
            // found. change value
            select.value = sortValue;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            // close the dialog
            const closeBtn = document.querySelector('.dialog .dialog-closer, .dialog-closer');
            if (closeBtn) closeBtn.click();

            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // hide the dialog
    const style = document.createElement('style');
    style.id = 'zero-flash-override';
    style.textContent = `
        #dialog, .dialog, dialog, .dialog-backdrop {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            animation: none !important;
            transition: none !important;
        }
    `;
    document.head.appendChild(style);

    optionsBtn.click();

    // restore dialog styles
    setTimeout(() => {
        style.remove();
        observer.disconnect();
    }, 100);
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#sortLastModified')) {
        e.preventDefault();
        applyHfsSort('time');
    }
    if (e.target.closest('#sortItem')) {
        e.preventDefault();
        applyHfsSort('name');
    }
    if (e.target.closest('#sortExtension')) {
        e.preventDefault();
        applyHfsSort('extension');
    }
    if (e.target.closest('#sortSize')) {
        e.preventDefault();
        applyHfsSort('size');
    }
});