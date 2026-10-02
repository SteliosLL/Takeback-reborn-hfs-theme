var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var StaticsManager = /** @class */ (function () {
    function StaticsManager() {
        var _this = this;
        this.typeMap = {
            audio: ['.mp3', '.ogg', '.wav', '.m4a'],
            video: ['.mp4', '.ogv', '.mpv', '.webm'],
            image: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            doc: ['.txt', '.html', '.htm'],
            playlist: ['.m3u', '.m3u8']
        };
        this.filelist = [];
        document.querySelectorAll('table#files tbody tr td:nth-child(1) a').forEach(function (element) { return _this.filelist.push(helper.uniformURI(element.href)); });
    }
    return StaticsManager;
}());

function staticsMgr() {
  window.statics = new StaticsManager();
  return window.statics;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', staticsMgr);
} else {
  staticsMgr();
}


var Player = /** @class */ (function () {
    function Player() {
        var _this = this;
        this.lyricsArea = document.querySelector('section.lyrics');
        this.sequence = 'shuffle';
        this.playing = false;
        if (navigator.mediaSession) {
            navigator.mediaSession.setActionHandler('play', function () { return _this.play(); });
            navigator.mediaSession.setActionHandler('pause', function () { return _this.pause(); });
            navigator.mediaSession.setActionHandler('stop', function () { return _this.pause(); });
            navigator.mediaSession.setActionHandler('previoustrack', function () { return _this.play(-1); });
            navigator.mediaSession.setActionHandler('nexttrack', function () { return _this.play(1); });
        }
        this.songlist = window.statics.filelist.filter(function (filename) { return window.statics.typeMap['audio'].some(function (format) { return filename.toLowerCase().endsWith(format); }); });
        if (this.songlist.length != 0)
            $('#audioplayer').show();
        this.nowplaying = 0;
        this.songlistShuffled = this.songlist.sort(function (a, b) { return 0.5 - Math.random(); });
        document.getElementById('audioplayer').querySelectorAll('*[data-player], *[data-player-alt]').forEach(function (element) {
            switch (element.getAttribute('data-player')) {
                case 'next':
                    element.addEventListener('click', function () {
                        _this.play(1);
                    });
                    break;
                case 'pause':
                    element.addEventListener('click', function () {
                        _this.playing ? _this.pause() : _this.play();
                    });
                    break;
                case 'status':
                    _this.elemStatus = element;
                    break;
                case 'nowplaying':
                    _this.elemNowplaying = element;
                    break;
            }
            switch (element.getAttribute('data-player-alt')) {
                case 'prev':
                    element.addEventListener('contextmenu', function (event) {
                        event.preventDefault();
                        _this.play(-1);
                    });
                    break;
                case 'sequence':
                    element.addEventListener('contextmenu', function (event) {
                        event.preventDefault();
                        if (_this.sequence == 'shuffle') {
                            _this.sequence = 'sequence';
                        }
                        else {
                            _this.sequence = 'shuffle';
                        }
                    });
                    break;
            }
        });
    }
    Player.prototype.play = function (offset) {
        var _this = this;
        if (offset === void 0) { offset = 0; }
        if (offset != 0 || this.audio.src == '') {
            var count = this.nowplaying + offset;
            if (count < 0)
                count = this.songlist.length + count;
            else if (count >= this.songlist.length)
                count = count % this.songlist.length;
            this.nowplaying = count;
            // Webkit browsers cannot handle <video> <track> src change properly
            // So create a new <video> everytime play
            this.audio = document.createElement('video');
            this.audio.classList.add('lyrics');
            this.lyricsArea.querySelectorAll('video').forEach(function (e) { return e.remove(); });
            this.lyricsArea.appendChild(this.audio);
            this.audio.onended = function () { return _this.play(1); };
            this.audio.onerror = function () { return _this.play(1); };
            this.audio.src = this.sequence == 'shuffle' ? this.songlistShuffled[count] : this.songlist[count];
            this.addLyricsFor(this.audio.src);
        }
        this.audio.play();
        this.elemStatus.innerText = '{.!Playing:.}';
        this.elemNowplaying.innerText = helper.getFilename(this.audio.src);
        this.playing = true;
        if (navigator.mediaSession) {
            var _a = window.helper.getFilename(this.audio.src).split(' - ').reverse(), title = _a[0], artist = _a[1];
            var filename_1 = this.audio.src.split('.').slice(0, -1).join('.');
            var possibleArtworks = ['.jpg', '.png'].map(function (x) { return filename_1 + x; });
            var foundArtwork = possibleArtworks.filter(function (x) { return window.statics.filelist.indexOf(x) != -1; })[0];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                artwork: foundArtwork ? [{
                        src: foundArtwork,
                        type: 'image/' + foundArtwork.split('.').slice(-1)[0],
                        sizes: '192x192'
                    }] : []
            });
        }
    };
    Player.prototype.pause = function () {
        this.audio.pause();
        this.elemStatus.innerText = '{.!Paused:.}';
        this.playing = false;
    };
    Player.prototype.convertLrcToVtt = function (lrc) {
        var lines = lrc.split('\n');
        return 'WEBVTT\n\n' + lines.map(function (item, index) {
            if (/^\[[a-z]{2}:(.*?)\]$/.test(item) || item.trim() == '')
                return ''; // Delete metadata
            item += lines[index + 1] || '[59:59.99]';
            item = item.replace(/^\[(.+?)\](.*?)\[(.+?)\](.*?)$/, '\n$10 --> $30\n$2\n').replace(/ ?\/ ?/g, '\n');
            return item;
        }).join('\n');
    };
    Player.prototype.addLyricsFor = function (file) {
        var _this = this;
        var lrcFile = helper.uniformURI(file.split('.').slice(0, -1).join('.') + '.lrc');
        if (window.statics.filelist.indexOf(lrcFile) == -1) {
            $(this.lyricsArea).hide();
            return;
        }
        fetch(lrcFile).then(function (r) { return r.text(); }).then(function (t) {
            var commonText = t.replace(/\r?\n/g, '\n');
            var vtt = _this.convertLrcToVtt(commonText);
            // let track = this.lyricsArea.querySelector('track');
            var track = document.createElement('track');
            track.kind = 'captions';
            track.default = true;
            _this.audio.appendChild(track);
            track.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt;charset=utf-8' }));
            $(_this.lyricsArea).show();
        });
    };
    return Player;
}());


function initPlayer() {
  window.player = new Player();
  return window.player;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlayer);
} else {
  initPlayer();
}

var Previewer = /** @class */ (function () {
    // Also file control menu
    function Previewer() {
        var _this = this;
        this.selectedFiles = [];
        document.querySelectorAll('.part1 table#files tbody tr td:nth-child(1) a').forEach(function (element) {
            var path = helper.getPath(element.href); // href contains http://.../
            if (path.endsWith('/'))
                return;
            element.addEventListener('click', function (event) {
                event.preventDefault();
                event.cancelBubble = true; // prevent selecting item, just preview
                _this.preview(path);
                _this.selectedFiles = [path];
                _this.initMenu('file');
            });
        });
        document.querySelectorAll('table#files tbody tr').forEach(function (element) {
            element.addEventListener('click', function () {
                element.classList.toggle('selected');
                _this.selectedFiles = __spreadArray([], document.querySelectorAll('table#files tbody tr.selected')).map(function (x) { return helper.getPath(x.querySelector('td:nth-child(1) a').href); });
                _this.initMenu('selections');
            });
        });
        $('#preview').show();
        document.getElementById('preview').querySelectorAll('*[data-preview]').forEach(function (element) {
            switch (element.getAttribute('data-preview')) {
                case 'close':
                    element.addEventListener('click', function () {
                        _this.close();
                        _this.initMenu();
                    });
                    break;
                case 'title':
                    _this.elemTitle = element;
                    break;
                case 'menu':
                    _this.elemMenu = element;
                    break;
                case 'content':
                    _this.elemContent = element;
                    break;
            }
        });
        this.elemTitle.innerText = helper.getFilename(window.HFS.folder.slice(0, -1));
        this.initMenu();
    }
    Previewer.prototype.delete = function (items) {
        window.dialog.confirm('{.!Delete @items@?.}'.replace('@items@', items.map(function (x) { return helper.getFilename(x); }).join('; ')), function () {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', window.HFS.folder);
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
            xhr.onload = function () {
                window.dialog.alert('{.!Success.}', function () { return location.href = (items[0] == window.HFS.folder ? '../' : './'); });
            };
            xhr.send("action=delete&selection=" + items.join('&selection='));
        });
    };
    Previewer.prototype.move = function (items) {
        window.dialog.prompt('{.!Move items to:.}', function (target) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', './?mode=section&id=ajax.move');
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
            xhr.onload = function () {
                window.dialog.alert('{.!Success.}', function () { return location.href = (items[0] == window.HFS.folder ? '../' : './'); });
            };
            xhr.send("path=" + helper.getDirname(items[0]) + "&from=" + items.map(function (x) { return helper.getFilename(x); }).join(':') + "&to=" + target + "&token=" + window.HFS.sid);
        });
    };
    Previewer.prototype.rename = function (items) {
        if (items.length > 1) {
            window.dialog.alert('{.!Can only rename 1 file.}');
            return;
        }
        window.dialog.prompt('{.!Rename item to:.}', function (target) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', './?mode=section&id=ajax.rename');
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
            xhr.onload = function () {
                window.dialog.alert('{.!Success.}', function () { return location.href = (items[0] == window.HFS.folder ? '../' : './'); });
            };
            xhr.send("from=" + items.join(':') + "&to=" + target + "&token=" + window.HFS.sid);
        });
    };
    Previewer.prototype.comment = function (items) {
        window.dialog.prompt('{.!Enter comment:.}', function (comment) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', './?mode=section&id=ajax.comment');
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=utf-8");
            xhr.onload = function () {
                window.dialog.alert('{.!Success.}', function () { return location.href = (items[0] == window.HFS.folder ? '../' : './'); });
            };
            xhr.send("files=" + items.join(':') + "&text=" + comment + "&token=" + window.HFS.sid);
        });
    };
    Previewer.prototype.archive = function (items) {
        var form = document.createElement('form');
        form.style.display = 'none';
        form.action = './?mode=archive&recursive';
        form.method = 'POST';
        items.forEach(function (path) {
            var input = document.createElement('input');
            form.append(input);
            input.type = 'hidden';
            input.name = 'selection';
            input.value = helper.getFilename(path);
        });
        document.body.appendChild(form);
        form.submit();
    };
	var subtitles = null;
    Previewer.prototype.initMenu = function (type) {
        var _this = this;
        if (type === void 0) { type = 'folder'; }
        function createButton(name, action) {
            var a = document.createElement('a');
            var span = document.createElement('span');
            span.classList.add('menuitem');
            span.innerText = name;
            a.addEventListener('click', action.bind(this));
            a.href = 'javascript:';
            a.style.margin = '0 0.2em';
            a.appendChild(span);
            return a;
        }
        var mark = document.createElement('span');
        mark.style.margin = '0 0.2em';
        var menu = [mark];		 
        switch (type) {
            case 'folder':
                mark.innerText = '{.!Folder:.}';
                if (window.HFS.can_delete) {
                    menu.push(createButton('{.!Delete.}', function () { return _this.delete([window.HFS.folder]); }));
                    if (window.HFS.can_move) {
                        menu.push(createButton('{.!Move.}', function () { return _this.move([window.HFS.folder]); }));
                    }
                    if (window.HFS.can_rename) {
                        menu.push(createButton('{.!Rename.}', function () { return _this.rename([window.HFS.folder]); }));
                    }
                    if (window.HFS.can_comment) {
                        menu.push(createButton('{.!Comment.}', function () { return _this.comment([window.HFS.folder]); }));
                    }
                }
                break;
            case 'file':
                mark.innerText = '{.!File:.}';
                if (window.HFS.can_delete) {
                    menu.push(createButton('{.!Delete.}', function () { return _this.delete(_this.selectedFiles); }));
                    if (window.HFS.can_move) {
                        menu.push(createButton('{.!Move.}', function () { return _this.move(_this.selectedFiles); }));
                    }
                    if (window.HFS.can_rename) {
                        menu.push(createButton('{.!Rename.}', function () { return _this.rename(_this.selectedFiles); }));
                    }
                    if (window.HFS.can_comment) {
                        menu.push(createButton('{.!Comment.}', function () { return _this.comment(_this.selectedFiles); }));
                    }
                }
				//create button for subtitles
                if (_this.selectedFiles[0].includes('.srt') || _this.selectedFiles[0].includes('.vtt'))
                {
                 //console.log(decodeURIComponent(location.href + helper.getFilename(_this.selectedFiles[0]))) ;
                 menu.push(createButton('{.!Load subtitles.}', function () { subtitles=location.href + helper.getFilename(_this.selectedFiles[0]);  dialog.alert(subtitles);  dialog.alert('{.!✔ Subtitles Loaded!.}'); }));
//_this.selectedFiles[0];  .slice(1,_this.selectedFiles[0].length
			   }
			
                break;
            case 'selections':
                mark.innerText = '{.!Selections:.}';
                menu.push(createButton('{.!Select All.}', function () { return document.querySelectorAll('table#files tbody tr').forEach(function (e) { return e.classList.add('selected'); }); }));
                menu.push(createButton('{.!Invert.}', function () { return document.querySelectorAll('table#files tbody tr').forEach(function (e) { return e.classList.toggle('selected'); }); }));
                menu.push(createButton('{.!Mask.}', function () { return window.dialog.prompt('{.!Enter mask to select.}', function (mask) {
                    var isRegex = /^\/.+\/$/.test(mask);
                    if (isRegex)
                        mask = mask.slice(1, -1);
                    else
                        mask = mask.replace(/\*/g, '.*').replace(/\?/, '.?');
                    document.querySelectorAll('table#files tbody tr td a').forEach(function (a) {
                        if (helper.uniformURI(a.href).match(new RegExp(mask)) !== null) {
                            a.parentElement.parentElement.classList.add('selected');
                        }
                        else {
                            a.parentElement.parentElement.classList.remove('selected');
                        }
                    });
                }); }));
                if (window.HFS.can_delete) {
                    menu.push(createButton('{.!Delete.}', function () { return _this.delete(_this.selectedFiles); }));
                    if (window.HFS.can_move) {
                        menu.push(createButton('{.!Move.}', function () { return _this.move(_this.selectedFiles); }));
                    }
                    if (window.HFS.can_rename) {
                        menu.push(createButton('{.!Rename.}', function () { return _this.rename(_this.selectedFiles); }));
                    }
                    if (window.HFS.can_comment) {
                        menu.push(createButton('{.!Comment.}', function () { return _this.comment(_this.selectedFiles); }));
                    }
                }
                menu.push(createButton('{.!Archive.}', function () { return _this.archive(_this.selectedFiles); }));
               
                break;
        }
        this.elemMenu.querySelectorAll('*').forEach(function (e) { return e.remove(); });
        if (menu.length > 1)
            for (var _i = 0, menu_1 = menu; _i < menu_1.length; _i++) {
                var i = menu_1[_i];
                this.elemMenu.appendChild(i);
            }
    };
    Previewer.prototype.close = function () {
        this.elemContent.querySelectorAll('*').forEach(function (e) { return e.remove(); });
        this.elemTitle.innerText = helper.getFilename(window.HFS.folder.slice(0, -1));
    };
    Previewer.prototype.convertSrtToVtt = function (srt) {
        return 'WEBVTT\n\n' + srt.replace(/\{\\([ibu])\}/g, '</$1>').replace(/\{\\([ibu])1\}/g, '<$1>').replace(/\{([ibu])\}/g, '<$1>').replace(/\{\/([ibu])\}/g, '</$1>').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2').concat('\n\n');
    };
    Previewer.prototype.preview = function (url) {
        var _this = this;
        this.close();
        this.elemTitle.innerText = helper.getFilename(url);
        var type = 'unknown';
        for (var i in window.statics.typeMap) {
            if (window.statics.typeMap[i].some(function (format) { return url.toLowerCase().endsWith(format); })) {
                type = i;
                break;
            }
        }
        var wrapperContent = document.createElement('div');
        var wrapperActions = document.createElement('div');
		  //create button to shrink/expand mini window when viewing text and html files
			   				
			   
        switch (type) {
            case 'audio':
                var audio = document.createElement('audio');
                audio.controls = true;
                audio.src = url;
                wrapperContent.appendChild(audio);
                audio.play();
                var a0 = document.createElement('a');
                a0.href = 'javascript:';
                a0.innerText = '[ {.!Move to mini player.} ]';
                a0.addEventListener('click', function () {
                    _this.close.bind(_this)();
                    window.player.sequence = 'shuffle';
                    window.player.nowplaying = 0;
                    var number = window.player.songlistShuffled.map(function (x) { return helper.getPath(x); }).indexOf(url);
                    window.player.play(number);
                });
                wrapperActions.appendChild(a0);
                break;
            case 'video':
                

                var video = document.createElement('video');
                video.controls = true;
                video.src = url;
                wrapperContent.appendChild(video);
			    		
                video.play();
                var srtName =decodeURIComponent( video.src.split('.').slice(0, -1).join('.') + '.srt');
                var vttName =decodeURIComponent( video.src.split('.').slice(0, -1).join('.') + '.vtt');
                if (subtitles != null){         
                    if (subtitles.includes('.srt')){
                      srtName = decodeURIComponent(subtitles);
					  vttName = "";
                    }
				    else if(subtitles.includes('.vtt')){
                      srtName = "";
					  vttName = decodeURIComponent(subtitles);
					 // dialog.alert(subtitles);
                    }
                  }    
               			 //   dialog.alert(srtName);

                if (window.statics.filelist.indexOf(vttName) != -1) {
					 								
                  //  dialog.alert(vttName);
                    var track = document.createElement('track');
                    track.default = true;
                    track.kind = 'captions';
                    track.src = vttName;
                    video.appendChild(track);
					 
                }
                else if (window.statics.filelist.indexOf(srtName) != -1) {	
			     	//dialog.alert(vttName);
                    var track_1 = document.createElement('track');
                    track_1.default = true;
                    track_1.kind = 'captions';
                    fetch(srtName).then(function (r) { return r.text(); }).then(function (t) {
                        var commonText = t.replace(/\r?\n/g, '\n');
                        var vtt = _this.convertSrtToVtt(commonText);
                        track_1.src = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt;charset=utf-8' }));
                    });
                    video.appendChild(track_1);
                }
                break;
            case 'image':
                var img = document.createElement('img');
                img.src = url;
                wrapperContent.appendChild(img);
                var a1 = document.createElement('a');
                a1.href = 'javascript:';
                a1.innerText = '[ {.!Start Slideshow.} ]';
                a1.addEventListener('click', function () {
                    _this.close.bind(_this)();
                    _this.slideshow();
                });
                wrapperActions.appendChild(a1);
                break;
            case 'doc':
                var iframe = document.createElement('iframe');
                iframe.src = url;
			    wrapperContent.style.width = "700px"; iframe.style.width = "700px";
				
                wrapperContent.appendChild(iframe);
                break;
            case 'playlist':
                var span1 = document.createElement('span');
                span1.innerText = '{.!This is a playlist..}';
                wrapperContent.appendChild(span1);
                var a2 = document.createElement('a');
                a2.href = 'javascript:';
                a2.innerText = '[ {.!Play.} ]';
                a2.addEventListener('click', function () {
                    window.player.sequence = 'sequence';
                    window.player.nowplaying = -1;
                    fetch(url).then(function (r) { return r.text(); }).then(function (t) {
                        window.player.songlist = t.split('\n').map(function (x) {
                            return helper.uniformURI(((x[0] == '\'' && x.slice(-1) == '\'') || (x[0] == '"' && x.slice(-1) == '"')) ? x.slice(1, -1) : x);
                        }).filter(function (x) { return x.trim() != ''; });
                        window.player.play(1);
                        _this.close.bind(_this)();
                    });
                });
                wrapperActions.appendChild(a2);
                break;
            default:
                var span0 = document.createElement('span');
                span0.classList.add('nopreview');
                span0.innerText = '{.!No preview available.}';
                wrapperContent.appendChild(span0);
                break;
        }
        this.elemContent.appendChild(wrapperContent);
        var download = document.createElement('a');
        var span = document.createElement('span');
        span.innerText = '[ {.!Download.} ]';
        download.appendChild(span);
        download.classList.add('download');
        download.href = url;
        download.download = helper.getFilename(url);
        wrapperActions.appendChild(download);
        this.elemContent.appendChild(wrapperActions);
    };
    Previewer.prototype.slideshow = function () {
        var pictures = window.statics.filelist.filter(function (x) { return window.statics.typeMap['image'].some(function (y) { return x.endsWith(y); }); });
        var slideshow = document.querySelector('.slideshow');
        var imgs = slideshow.querySelectorAll('img');
        var n = 0;
        document.body.style.overflow = 'hidden';
        function switchslide() {
            imgs[1].src = pictures[n];
            imgs[1].style.opacity = '1';
            setTimeout(function () {
                imgs[0].src = pictures[n++];
                n %= pictures.length;
                imgs[1].style.opacity = '0';
            }, 1000);
        }
        var interval = setInterval(switchslide, 5000);
        switchslide();
        slideshow.oncontextmenu = function (event) {
            event.preventDefault();
            $(slideshow).hide();
            document.body.style.overflow = '';
            clearInterval(interval);
        };
        $(slideshow).show();
    };
    return Previewer;
}());

function initPreviewer() {
  window.previewer = new Previewer();
  return window.previewer;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreviewer);
} else {
  initPreviewer();
}


var ThumbsManager = /** @class */ (function () {
    function ThumbsManager() {
        this.buttonShowThumb = document.getElementById('showthumb');
        this.buttonShowThumb.addEventListener('click', this.showThumb.bind(this));
        if (window.statics.filelist.some(function (x) { return window.statics.typeMap['image'].some(function (y) { return x.endsWith(y); }); })) {
            $(this.buttonShowThumb).show();
        }
        ;
        this.shown = false;
    }
    ThumbsManager.prototype.showThumb = function () {
        if (this.shown)
            return;
        this.shown = true;
        var items = document.querySelectorAll('table#files tbody tr td:nth-child(1)');
        var imgs = [];
        items.forEach(function (element) {
            var a = element.querySelector('a');
            if (window.statics.typeMap['image'].some(function (x) { return a.href.toLowerCase().endsWith(x); })) {
                var img = document.createElement('img');
                img.classList.add('thumb');
                // img.loading = 'lazy';    // Breaks our purpose
                img.setAttribute('data-src', a.href);
                element.prepend(img);
                imgs.push(img);
            }
        });
        var count = 0;
        function showNextThumb() {
            imgs[count].src = imgs[count].getAttribute('data-src');
            if (imgs[count + 1]) {
                imgs[count].addEventListener('load', function () {
                    setTimeout(showNextThumb, 181);
                });
            }
            count++;
        }
        showNextThumb();
    };
    return ThumbsManager;
}());

function initThumbsManager() {
  window.thumbs_manager = new ThumbsManager();
  return window.thumbs_manager;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThumbsManager);
} else {
  initThumbsManager();
}

