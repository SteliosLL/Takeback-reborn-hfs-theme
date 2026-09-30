'use strict';

function injectCustomElements() {

		function processFieldInputs(container = document) {
			if (!container.querySelectorAll) return;

			// Only target text-like inputs (excluding checkboxes, radios, etc.)
			const selector = '.field input:not([type="checkbox"]):not([type="radio"]), input[name="input"]:not([type="checkbox"]):not([type="radio"])';
			
			container.querySelectorAll(selector).forEach((input) => {
				input.classList.add('takeback-textbox');
			});
		}

		function stripZipLinks(container = document) {
			if (!container.querySelectorAll) return;

			container.querySelectorAll('a[href="?get=zip"]').forEach((a) => {
				if (!a.id || a.id.trim() === '') {
					// Strip any existing inline style attributes
					a.removeAttribute('style');
					
					// Force reset all standard and theme styles directly
					a.style.cssText = 'all: unset !important; cursor: pointer !important;';
				}
			});
		}
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // 1. Handle Removed Nodes (Dialog Exit Animation)
                mutation.removedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches?.('dialog, .dialog, .animator-show') || node.querySelector?.('dialog, .dialog')) {
                            const targetDialog = node.matches?.('dialog, .dialog, .animator-show') ? node : node.querySelector('dialog, .dialog');

                            if (targetDialog.dataset.isAnimatingClose) return;

                            // Re-attach node temporarily to play collapse animation
                            targetDialog.dataset.isAnimatingClose = 'true';
                            mutation.target.appendChild(node);

                            targetDialog.classList.remove('animator-show');
                            targetDialog.classList.add('animator-hide');

                            setTimeout(() => {
                                node.remove();
                            }, 100);
                        }
                    }
                });

			mutation.addedNodes.forEach((node) => {
				if (node.nodeType === Node.ELEMENT_NODE) {
					// Exclude checkboxes/radios explicitly when checking node matches directly
					const isTextInput = node.matches?.('input') && 
										node.type !== 'checkbox' && 
										node.type !== 'radio';

					if (node.matches?.('div.field')) {
						const input = node.querySelector('input:not([type="checkbox"]):not([type="radio"])');
						if (input) input.classList.add('takeback-textbox');
					} else if (isTextInput && (node.closest('.field') || node.getAttribute('name') === 'input')) {
						node.classList.add('takeback-textbox');
					}

					// --- Zip Links Processing ---
					if (node.matches?.('a[href="?get=zip"]') && (!node.id || node.id.trim() === '')) {
						node.removeAttribute('style');
						node.style.cssText = 'all: unset !important; cursor: pointer !important;';
					}

					// --- Subtree Processing ---
					if (node.querySelectorAll) {
						processFieldInputs(node);
						stripZipLinks(node);
					}
					
					setTimeout(() => {
						processFieldInputs(node);
						stripZipLinks(node);
					}, 0);
				}
			});
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });




    // --- 2. Inject Head Meta Tags ---
    if (!document.getElementById('takeback-meta-tags')) {
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


	// --- 3. Inject Structural Header HTML at Top of Body ---
		if (!document.getElementById('takeback-header-section')) {
			const headerSection = document.createElement('section');
			headerSection.id = 'takeback-header-section';
			headerSection.className = 'part0 takeback-reborn-mod';
			headerSection.innerHTML = `
				<h1>HTTP File Server</h1>
				<nav>
					<span>
						<a id="breadcrumbs-header-spot" href="/">🏠 Home</a>
					</span>
					<span class="right">
						<!--<span>👤 Guest</span>-->
						<a href="#" onclick="event.preventDefault(); document.getElementById('login-button')?.click();">👤Login</a>
					</span>
					<div style="height: 4px;"></div>
					<form id="search-form" class="search" action="./" method="GET">
						<input type="search" name="search" placeholder="Search" />
						<a href="#" onclick="document.getElementById('search-form').submit();" class="invert" data-tooltip="Search" style="font-size: 1.3rem; text-decoration: none; cursor: pointer;">🔍</a>
						<a href="#" onclick="event.preventDefault(); document.getElementById('search-button')?.click();" class="invert" data-tooltip="Advanced Search" style="font-size: 1.3rem; text-decoration: none; cursor: pointer;">🔍⚙️</a>
					</form>
					<span class="right">
						<a href="#" onclick="event.preventDefault(); document.getElementById('upload-button')?.click();" class="invert" data-tooltip="Upload some files to this folder">⇧ Upload</a>
					</span>
				</nav>
				<p>
					<a href="?get=zip" id="zip-button2" onclick="event.preventDefault(); document.getElementById('zip-button')?.click();">
						<span><b>[Zip Current Folder]</span>
					</a>
				</p>
			`;

			// Prepend directly to body
			document.body.insertBefore(headerSection, document.body.firstChild);
		}

	// 2. Watch for future DOM changes and remove it as soon as it appears
	let zipBtnObserved = false;
	let searchBtnObserved = false;
	let uploadBtnObserved = false;
	let loginBtnObserved = false;
	let observeCounter = 0;
	const obs = new MutationObserver(() => {
	  const ZipBtn = document.getElementById('zip-button');
	  const SearchBtn = document.getElementById('search-button');
	  const uploadBtn = document.getElementById('upload-button');
	  const loginBtn = document.getElementById('login-button');

	  
	  if (ZipBtn && !zipBtnObserved) {
		zipBtnObserved = true;
		observeCounter++;
		
		//originalZipBtn.id = 'original-hidden-zip-button';
		ZipBtn.style.display = 'none';
	  }
	  if (SearchBtn && !searchBtnObserved) {
		searchBtnObserved = true;
		observeCounter++;
		
		//originalSearchBtn.id = 'original-hidden-search-button';
		SearchBtn.style.display = 'none';
	  }
	  if (uploadBtn && !uploadBtnObserved) {
		uploadBtnObserved = true;
		observeCounter++;
		
		uploadBtn.style.display = 'none';
	  }
	   if (loginBtn && !loginBtnObserved) {
		loginBtnObserved = true;
		observeCounter++;
		
		loginBtn.style.display = 'none';
	  }
	  

	  //We are clear to inject our own html
	  if (observeCounter === 4)
	  {		  
		obs.disconnect();

		//Reposition the breacrumbs header
		const targetAnchor = document.getElementById('breadcrumbs-header-spot');
		const sourceAnchor = document.getElementById('breadcrumb-home');
		if (sourceAnchor && targetAnchor) {
			const headerElement = sourceAnchor?.closest('header');

			if (headerElement) {
				headerElement.id = 'breadcrumbs-header';
				targetAnchor.replaceWith(headerElement);
			}
		}

		const targetElement = document.querySelector('.list-wrapper');
		if (targetElement) {
		targetElement.insertAdjacentHTML('afterbegin', `
				<section class="part1">
					<thead>
					<tr>
						<td>
							<a class="invert" href="./?sort=e" data-tooltip="Click to sort files by extension">&nbsp;🔷</a>
							<a class="invert" href="./?sort=n" data-tooltip="Click to sort files by name">
								Item (1)
							</a>
							<a id="showthumb" class="invert" href="javascript:" data-tooltip="Show thumbnails of photos" style="display: none; margin-left: 2em;">
								📸 Photo Thumbnails
							</a>
						</td>
						<td>
							<a class="invert" href="./?sort=!t" data-tooltip="Click to sort files by time [ Format:mm/dd/yyyy ]">
								Last Modified
							</a>
						</td>
						<td>
							<a class="invert" href="./?sort=s" data-tooltip="Click to sort files by size">
								Size
							</a>
						</td>
					</tr>
				</thead>
			</section>
		`);
		}
	}
	 
	});

	obs.observe(document.body || document.documentElement, {
	  childList: true,
	  subtree: true
	});
	

    // --- 4. Inject Background & Dialog Layout Wrapper ---
    const hasBackgroundImage = false; 
    const bgClass = hasBackgroundImage ? "background-image" : "background";

    if (!document.getElementById('takeback-structural-wrapper')) {
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


}



HFS.onEvent('entryIcon', ({ entry }) => {
    // Folders
    if (entry.isFolder) {
      return '📁'
    }

    // Map by extension
    switch (entry.ext) {
      case 'png':
      case 'jpg':
      case 'gif':
        return '🖼️'
      case 'mp3':
      case 'wav':
        return '🎵'
      case 'mp4':
      case 'mkv':
        return '🎬'
      case 'zip':
      case 'rar':
        return '📦'
      case 'pdf':
        return '📕'
      case 'txt':
      case 'md':
        return '📝'
      default:
        return ''
    }
  })

// Safely inject crap when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCustomElements);
} else {
    injectCustomElements();
}

// 1. Mark the dialog whenever a drag or click starts inside it
document.addEventListener('mousedown', (e) => {
    const dialog = e.target.closest('dialog, .dialog');
    if (dialog) {
        dialog.dataset.startedInside = 'true';
    } else {
        // Reset state on all dialogs if mouse started outside
        document.querySelectorAll('dialog, .dialog').forEach(d => {
            delete d.dataset.startedInside;
        });
    }
}, true);

// 2. Prevent backdrop clicks if the mouse down started inside the dialog
document.addEventListener('click', (e) => {
    const dialog = e.target.closest('dialog, .dialog');
    
    // If clicking the backdrop/overlay while selection started inside the dialog, block closing
    if (!dialog) {
        const activeDialog = document.querySelector('dialog[data-started-inside="true"], .dialog[data-started-inside="true"]');
        if (activeDialog) {
            e.stopPropagation();
            e.preventDefault();
            delete activeDialog.dataset.startedInside;
        }
    }
}, true);

// 3. Clear flag on mouseup
document.addEventListener('mouseup', () => {
    setTimeout(() => {
        document.querySelectorAll('dialog, .dialog').forEach(d => {
            delete d.dataset.startedInside;
        });
    }, 0);
}, true);