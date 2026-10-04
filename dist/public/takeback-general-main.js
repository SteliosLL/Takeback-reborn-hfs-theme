//HFS2 HELPER REMOVED :(
var Animator = /** @class */ (function () {
    function Animator(selector) {
        if (typeof selector == 'string') {
            this.elements = document.querySelectorAll(selector);
        }
        else {
            this.elements = [selector];
        }
        this.FRAME = 1000 / 60;
        // Edit CSS for controlling how to animate
        this.classShow = 'animator-show';
        this.classHide = 'animator-hide';
    }
    Animator.prototype.hide = function (timeout, callbackfn) {
        var _this = this;
        if (timeout === void 0) { timeout = 200; }
        if (callbackfn === void 0) { callbackfn = function () { return undefined; }; }
        this.elements.forEach(function (element) {
            element.style.transition = "all " + timeout + "ms";
            setTimeout(function () {
                element.classList.add(_this.classHide);
                element.classList.remove(_this.classShow);
            }, _this.FRAME);
            setTimeout(function () {
                element.style.transition = '';
                element.style.display = 'none';
                callbackfn();
            }, timeout - 1);
        });
    };
    Animator.prototype.show = function (timeout, callbackfn) {
        var _this = this;
        if (timeout === void 0) { timeout = 200; }
        if (callbackfn === void 0) { callbackfn = function () { return undefined; }; }
        this.elements.forEach(function (element) {
            element.classList.add(_this.classHide);
            element.style.transition = "all " + timeout + "ms";
            element.style.display = '';
            setTimeout(function () {
                element.classList.remove(_this.classHide);
                element.classList.add(_this.classShow);
            }, _this.FRAME);
            setTimeout(function () {
                element.style.transition = '';
                element.style.display = '';
                callbackfn();
            }, timeout);
        });
    };
    return Animator;
}());


function AnimatorConstructor(selector) { return new Animator(selector); }
var $ = AnimatorConstructor;
var TooltipManager = /** @class */ (function () {
    function TooltipManager() {
        var _this = this;
        this.elemTooltip = document.getElementById('tooltip');

        // Delegate mouseover event to the document
        document.addEventListener('mouseover', function (event) {
            var target = event.target.closest('*[data-tooltip]');
            if (target) {
                _this.show(target.getAttribute('data-tooltip'));
            }
        });

        // Delegate mouseout event to the document
        document.addEventListener('mouseout', function (event) {
            var target = event.target.closest('*[data-tooltip]');
            if (target) {
                _this.hide();
            }
        });
    }

    TooltipManager.prototype.show = function (message) {
        this.elemTooltip.innerText = message;
        $(this.elemTooltip).show();
    };

    TooltipManager.prototype.hide = function () {
        $(this.elemTooltip).hide();
    };

    return TooltipManager;
}());

function initToolTipMgr() {
  window.tooltip_manager = new TooltipManager();
  return window.tooltip_manager;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToolTipMgr);
} else {
  initToolTipMgr();
}


var Dialog = /** @class */ (function () {
    function Dialog() {
        this.sectionDialog = document.getElementById('dialog');
        this.elemDialog = document.createElement('div');
        $(this.elemDialog).hide();
        this.elemDialog.classList.add('dialog', 'dialog-default-font');
        this.elemText = document.createElement('p');
        var hr = document.createElement('hr');
        this.elemActions = document.createElement('p');
        this.elemActions.style.display = 'flex';
        this.elemActions.style.justifyContent = 'space-around';
        this.elemDialog.appendChild(this.elemText);
        this.elemDialog.appendChild(hr);
        this.elemDialog.appendChild(this.elemActions);
        this.sectionDialog.appendChild(this.elemDialog);
        this.close();
    }
    Dialog.prototype.clearActions = function () {
        this.elemActions.querySelectorAll('*').forEach(function (e) { return e.remove(); });
    };
    Dialog.prototype.showDialog = function () {
        this.sectionDialog.style.top = '0';
        this.sectionDialog.style.opacity = '1';
        $(this.elemDialog).show();
    };
    Dialog.prototype.close = function () {
        var _this = this;
        this.sectionDialog.style.opacity = '0';
        $(this.elemDialog).hide(undefined, function () { return _this.sectionDialog.style.top = '200%'; });
    };
    Dialog.prototype.alert = function (message, callbackfn) {
        var _this = this;
        if (callbackfn === void 0) { callbackfn = function () { return undefined; }; }
        function done() {
            this.close();
            callbackfn();
        }
        this.elemDialog.onkeyup = function (event) {
            if (event.key == 'Enter')
                done.bind(_this)();
        };
        this.elemText.innerText = message;
        this.clearActions();
        var ok = document.createElement('a');
        ok.innerText = 'OK';
        ok.href = 'javascript:';
        ok.classList.add('invert');
        ok.addEventListener('click', done.bind(this));
        this.elemActions.appendChild(ok);
        this.showDialog();
    };
    Dialog.prototype.confirm = function (message, callbackfn) {
        var _this = this;
        if (callbackfn === void 0) { callbackfn = function () { return undefined; }; }
        function done() {
            this.close();
            callbackfn();
        }
        this.elemDialog.onkeyup = function (event) {
            if (event.key == 'Enter')
                done.bind(_this)();
        };
        this.elemText.innerText = message;
        this.clearActions();
        var ok = document.createElement('a');
        ok.innerText = 'OK';
        ok.href = 'javascript:';
        ok.classList.add('invert');
        ok.addEventListener('click', done.bind(this));
        this.elemActions.appendChild(ok);
        var cancel = document.createElement('a');
        cancel.innerText = 'Cancel';
        cancel.href = 'javascript:';
        cancel.classList.add('invert');
        cancel.addEventListener('click', function () {
            _this.close();
        });
        this.elemActions.appendChild(cancel);
        this.showDialog();
    };
    Dialog.prototype.prompt = function (message, callbackfn) {
        var _this = this;
        if (callbackfn === void 0) { callbackfn = function (input) { return input; }; }
        function done() {
            this.close();
            callbackfn(elemInput.value);
        }
        this.elemText.innerText = message;
        var elemInput = document.createElement('input');
        var br = document.createElement('br');
        elemInput.type = 'text';
        elemInput.classList.add('prompt-input');
        elemInput.addEventListener('keyup', function (event) {
            if (event.key == 'Enter')
                done.bind(_this)();
        });
        this.elemText.appendChild(br);
        this.elemText.appendChild(elemInput);
        this.clearActions();
        var ok = document.createElement('a');
        ok.innerText = 'OK';
        ok.href = 'javascript:';
        ok.classList.add('invert');
        ok.addEventListener('click', done.bind(this));
        this.elemActions.appendChild(ok);
        var cancel = document.createElement('a');
        cancel.innerText = 'Cancel';
        cancel.href = 'javascript:';
        cancel.classList.add('invert');
        cancel.addEventListener('click', function () {
            _this.close();
        });
        this.elemActions.appendChild(cancel);
        this.showDialog();
        elemInput.focus();
    };
    return Dialog;
}());

function initDialog() {
  window.dialog = new Dialog();
  return window.dialog;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDialog);
} else {
  initDialog();
}
