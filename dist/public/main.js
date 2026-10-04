'use strict';

let currentPath = location.pathname;

// ==========================================
// Helper Functions 
// ==========================================

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

/*
  Modular Thumbnail Feature Handler
 */
function updateThumbnailVisibility() {
    const thumbBtn = document.getElementById('showthumb');
    const listWrapper = document.querySelector('.list-wrapper');

    if (!thumbBtn || !listWrapper) return;

    // Check if image files exist in current DOM and toggle button visibility based on image existence
    const hasImages = !!document.querySelector('.file a[href$=".jpg"], .file a[href$=".jpeg"], .file a[href$=".png"], .file a[href$=".gif"], .file a[href$=".webp"]');
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

function injectPart3() {
    if (document.querySelector('.part3')) return;
    const part3 = document.createElement('div');
    part3.className = 'part3';
    part3.innerHTML = `
        <div class="left"></div>
        <div class="right"></div>
    `;
    document.body.appendChild(part3);
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
// Main DOM injection and observer setup
// ==========================================

function injectCustomElements() {
    //Observer handling dialog animations, text inputs, navigation resets, and thumbnail updates
    const globalObserver = new MutationObserver((mutations) => {
        resetToListViewOnNavigation();
        updateThumbnailVisibility();

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

    globalObserver.observe(document.body, { childList: true, subtree: true });

    // inject base elements
    injectHeadMetaTags();
    injectStructuralHeader();
    injectEarlyPart1();
    injectStructuralWrapper();
    if (typeof injectLiveViewOverlay === 'function') {
        injectLiveViewOverlay();
    }
    injectPart3();

    //Thumbnail click
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

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', () => {
        resetToListViewOnNavigation();
    });

    // Secondary Observer. Layout modifications
    const observedStuff = new Array(8).fill(0);
    let observeCounter = 0;
    let fallbackTimer = null;
    let isFinalized = false;

const finalizeLayout = () => {
    if (isFinalized) return;
    isFinalized = true;

    if (fallbackTimer) clearTimeout(fallbackTimer);
    obs.disconnect();

    // Reposition breadcrumb header
    const targetBreadcrumbs = document.getElementById('breadcrumbs-header-placeholder');
    const sourceHome = document.getElementById('breadcrumb-home');
    if (sourceHome && targetBreadcrumbs) {
        const headerElement = sourceHome.closest('header');
        if (headerElement && headerElement.parentNode !== targetBreadcrumbs.parentNode) {
            targetBreadcrumbs.parentNode.insertBefore(headerElement, targetBreadcrumbs);
            targetBreadcrumbs.remove();
        }
    }

    // Reposition menu bar
    const menuBar = document.getElementById('menu-bar');
    const targetRightStuff = document.getElementById('menu-panel-buttons');

    if (targetRightStuff && menuBar) {
        const selectBtn = document.getElementById('select-button');
        const uploadBtn = document.getElementById('upload-button');

        if (selectBtn) {
            selectBtn.setAttribute('data-tooltip', 'Select - Selection applies to "Zip" and "Delete" (when available), but you can also filter the list');
        }
        if (uploadBtn) {
            uploadBtn.setAttribute('data-tooltip', 'Upload some files to this folder');
        }

        //NOTE: DO NOT use Array.from(menuBar.children).reverse() to reorder the buttons. it breaks shit
        // Move menuBar without reordering its child nodes in JS
        targetRightStuff.appendChild(menuBar);
    }
};

    const obs = new MutationObserver(() => {
        const ZipBtn = document.getElementById('zip-button');
        const SearchBtn = document.getElementById('search-button');
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

        // Disconnect when required mutations occur
        if (observeCounter === 4) {
            finalizeLayout();
        }
    });

    obs.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });

    //Fallback timeout
    fallbackTimer = setTimeout(() => {
        finalizeLayout();
    }, 4000);
}

// ===============================
// HFS Event Hooks and Listeners
// ===============================
HFS.onEvent('entryIcon', ({ entry }) => {
    if (entry.isFolder) return '<span aria-hidden="true" role="img" class="icon" style="margin-right: 0.1em;">📁</span>';

    const ext = (entry.ext || '').toLowerCase();

    const icon = (symbol, color) => 
        `<span aria-hidden="true" role="img" class="icon" style="color: ${color}; margin-right: 0.1em;">${symbol}</span>`;

    switch (ext) {
        case 'psd': case 'psb': case 'xcf': case 'ai': case 'eps': case 'kra': case 'clip':
            return icon('📸', '#5AE');
        case 'mp3': case 'aac': case 'm4a': case 'flac': case 'wav': case 'ogg': case 'opus': case 'wma': case 'alac': case 'aiff': case 'mid': case 'midi':
            return icon('🔊\u{FE0E}', 'green');
        case 'mp4': case 'm4v': case 'avi': case 'webm': case 'ogv': case 'flv': case 'mkv': case 'mov': case 'wmv': case 'mpg': case 'mpeg': case 'ts': case '3gp':
            return icon('📺', 'teal');
        case 'msi': case 'tar.gz': case 'tgz': case 'tar': case 'gz': case 'bz2': case 'xz': case '7z': case 'deb': case 'rpm': case 'zip': case 'rar': case 'cab':
            return icon('📦\u{FE0E}', 'brown');
        case 'exe': case 'vbs': case 'bat': case 'cmd': case 'sh': case 'bash': case 'ps1': case 'pyc': case 'apk': case 'appimage': case 'jar':
            return icon('🔷\u{FE0E}', '#5AE');
        case 'c': case 'cpp': case 'h': case 'hpp': case 'cxx': case 'gcc': case 'py': case 'js': case 'jsx': case 'ts': case 'tsx': case 'cs': case 'java': case 'php': case 'rb': case 'go': case 'rs': case 'swift': case 'kt': case 'sql':
            return icon('⌨\u{FE0E}', 'yellow');
        case 'rtf': case 'doc': case 'docx': case 'odt': case 'xls': case 'xlsx': case 'csv': case 'ods': case 'ppt': case 'pptx': case 'odp': case 'pub':
            return icon('📝\u{FE0E}', 'gray');
        case 'txt': case 'ini': case 'htm': case 'html': case 'css': case 'scss': case 'cfg': case 'conf': case 'json': case 'json5': case 'yaml': case 'yml': case 'toml': case 'xml': case 'm3u': case 'm3u8': case 'lrc': case 'md': case 'log':
            return icon('📑', 'thistle');
        case 'swf':
            return icon('⚡\u{FE0E}', 'gold');
        case 'ico': case 'cur':
            return icon('🥚\u{FE0E}', 'wheat');
        case 'iso': case 'img': case 'dda': case 'vmdk': case 'vhd': case 'vhdx': case 'dmg':
            return icon('💿', 'white');
        case 'epub': case 'pdf': case 'mobi': case 'azw3': case 'djvu': case 'cbr': case 'cbz':
            return icon('📕', 'inherit');
        case 'png': case 'jpg': case 'jpeg': case 'webp': case 'avif': case 'svg': case 'gif': case 'bmp': case 'tiff': case 'tif': case 'heic':
            return icon('🖼️', 'inherit');
        default:
            return icon('📄\u{FE0E}', 'inherit');
    }
});

HFS.onEvent('fileMenu', ({ entry }) => {
    if (!entry || entry.isFolder) return [];

    const fileName = entry.name || '';
    const fileUrl = entry.uri || entry.url || ('/' + (entry.path || entry.name));
    
    const isPdf = /\.pdf$/i.test(fileName);
    const isSub = /\.(srt|vtt)$/i.test(fileName);
    const isAudio = /\.(mp3|wav|ogg|aac|m4a|flac|opus)$/i.test(fileName);
    const isMedia = typeof HFS_ArtPlayer !== 'undefined' && HFS_ArtPlayer.video_formats ? HFS_ArtPlayer.video_formats.test(fileName) : false;
    const isText = typeof TextViewer !== 'undefined' && TextViewer.text_formats ? TextViewer.text_formats.test(fileName) : false;
    const isImage = typeof ImageViewer !== 'undefined' && ImageViewer.image_formats ? ImageViewer.image_formats.test(fileName) : false;

    if (!isPdf && !isSub && !isMedia && !isText && !isImage) return [];

    const items = [];

    //View in new tab filemenu entry for PDF filesd
    if (isPdf) {
        items.push({
            id: 'open-pdf-new-tab',
            icon: 'link',
            label: HFS.t("📕 View in New Tab"),
            onClick() {
                window.open(fileUrl, '_blank', 'noopener,noreferrer');
            }
        });
    }

    if (isSub && typeof HFS_ArtPlayer !== 'undefined') {
        items.push({
            id: 'load-subtitle-file',
            icon: '💬',
            label: HFS.t("Load subtitles"),
            onClick() {
                HFS_ArtPlayer.loadSubtitle(entry);
            }
        });
    }

    if (isAudio && typeof HFS_MiniPlayer !== 'undefined') {
        items.push({
            id: 'play-mini-audio-player',
            icon: 'play',
            label: HFS.t("Play with Mini audio player"),
            onClick() {
                if (typeof HFS_ArtPlayer !== 'undefined' && HFS_ArtPlayer.artInstance) {
                    if (typeof HFS_ArtPlayer.artInstance.pause === 'function') {
                        HFS_ArtPlayer.artInstance.pause();
                    } else if (HFS_ArtPlayer.artInstance.video) {
                        HFS_ArtPlayer.artInstance.video.pause();
                    }
                }
                HFS_MiniPlayer.loadAndPlay(entry);
            }
        });
    }

    return items;
});

// Display direct Live View play button next to file names
HFS.onEvent('afterEntryName', ({ entry }, { setOrder }) => {
    if (!entry || entry.isFolder) return;

    const fileName = entry.name || '';
    const isMedia = typeof HFS_ArtPlayer !== 'undefined' && HFS_ArtPlayer.video_formats ? HFS_ArtPlayer.video_formats.test(fileName) : false;
    const isText = typeof TextViewer !== 'undefined' && TextViewer.text_formats ? TextViewer.text_formats.test(fileName) : false;
    const isImage = typeof ImageViewer !== 'undefined' && ImageViewer.image_formats ? ImageViewer.image_formats.test(fileName) : false;

    if (isMedia || isText || isImage) {
        setOrder(-1);

        return HFS.iconBtn('play', (ev) => {
            ev.stopPropagation();
            if (isMedia && typeof HFS_ArtPlayer !== 'undefined') {
                HFS_ArtPlayer.play(entry);
            } else if (isText && typeof TextViewer !== 'undefined') {
                TextViewer.render(entry);
            } else if (isImage && typeof ImageViewer !== 'undefined') {
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

// Close live view window on "Escape" key press
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && typeof HFS_LiveView !== 'undefined') {
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
            // Only block click if the active dialog is actually visible in the viewport
            if (activeDialog.offsetWidth > 0 && activeDialog.offsetHeight > 0) {
                e.stopPropagation();
                e.preventDefault();
            }
            delete activeDialog.dataset.startedInside;
        }
    }
}, true);
document.addEventListener('mouseup', () => {
    setTimeout(() => {
        document.querySelectorAll('dialog, .dialog').forEach(d => delete d.dataset.startedInside);
    }, 0);
}, true);
//-------------------end---------------------

function applyHfsSort(sortValue) {
    let sortSelect = document.getElementById('option-sort-by');
    if (sortSelect) {
        sortSelect.value = sortValue;
        sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }

    const optionsBtn = document.getElementById('options-button');
    if (!optionsBtn) return;

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

    const cleanup = () => {
        if (style.parentNode) style.remove();
        observer.disconnect();
    };

    const observer = new MutationObserver(() => {
        const select = document.getElementById('option-sort-by');
        if (select) {
            select.value = sortValue;
            select.dispatchEvent(new Event('change', { bubbles: true }));

            const closeBtn = document.querySelector('.dialog .dialog-closer, .dialog-closer');
            if (closeBtn) closeBtn.click();

            cleanup();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    optionsBtn.click();
    setTimeout(cleanup, 2000);
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