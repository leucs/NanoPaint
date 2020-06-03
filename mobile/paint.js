
/*! Copyright (C) TetraLoom LLC - All Rights Reserved
 *  Unauthorized copying of this file, via any medium is strictly prohibited
 *  Proprietary and confidential
 *  Written by Noah Franks <TetraLoom@pm.me>, April 2020 */

const canvas   = document.getElementById('main-layer');
const ui_layer = document.getElementById(  'ui-layer');
const paint    = document.getElementById(     'paint');
const pay      = document.getElementById(       'pay');
const box      = document.getElementById(       'box');
var   pick     = document.getElementById(      'pick');
var   qrcode   = document.getElementById(    'qrcode');
const natrium  = document.getElementById(   'natrium');
const audio    = document.getElementById(      'jazz');

var music_ready = false;
audio.volume = 0.175;

var picker = new Picker({
    parent: pick,
    popup: false,
    alpha: false,
});

function floor(x) { return Math.floor(x); };
function ceil(x)  { return Math.ceil(x);  };
function round(x) { return Math.round(x); };

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var view_width  = ceil(window.innerWidth  * 0.900);    // dimensions when not in full screen
var view_height = ceil(window.innerHeight * 0.900);    // ----------------------------------

paint.style.width = view_width  + 'px', paint.style.height = view_height + 'px';

const tiles_wide = 390;
const tiles_tall = 206;
var   scale = ceil(Math.max(view_width / tiles_wide, view_height / tiles_tall) + 3);
var   zoom  = 1;

ui_layer.width = scale * tiles_wide, ui_layer.height = scale * tiles_tall;
canvas.width   = scale * tiles_wide,   canvas.height = scale * tiles_tall;

const mtx = canvas  .getContext('2d');
const utx = ui_layer.getContext('2d');

mtx.clearRect(0, 0,   canvas.width,   canvas.height);
utx.clearRect(0, 0, ui_layer.width, ui_layer.height);
mtx.fillStyle = '#202020';
mtx.fillRect(0, 0, canvas.width, canvas.height);


var stx = 0, sty = 0;
var selected = false;
var isScrolling = false;

var qrcode_size = 192;

var current_code = null;
var recents = [];

function make_qr(rgb) {
    
    const encoded = (stx +
		             tiles_wide *                          sty +
		             tiles_wide * tiles_tall *             rgb[0] +
		             tiles_wide * tiles_tall * 256 *       rgb[1] +
		             tiles_wide * tiles_tall * 256 * 256 * rgb[2]).toString();
    
    const amount  = '1' + '0'.repeat(27 - encoded.length) + encoded;
    const payload = "nano:nano_3j3dtp68ubnibm78un7ge7jqn9hr9a8g4xf94tg1nosn9818pw44cee7noku?amount=" + amount;
    
    current_code = parseInt(encoded);
    natrium.href = payload;
    
    qrcode.innerHTML = new QRCode({
        content: payload,
        color: "#000000",
        background: "#ffffff",
        ecl: "M",
        width:  qrcode_size,
        height: qrcode_size,
        padding: 4,
    }).svg();
    
    pay.style.display = "block";
}

picker.onChange = color => {
    box.style.borderColor = color.rgbString;
    make_qr(color.rgba);
};
picker.onDone = () => {
    picker.hide();
};

function lookup(x, y) {
    return y * tiles_wide + x;
}

var   grid     = [];
const changing = [];

for (var t = 0; t < tiles_wide * tiles_tall; t++) {
    grid.push("202020");
    changing.push(null);
}

(function () {
    
    const xhr = new XMLHttpRequest();
    
    xhr.addEventListener('load', event => {
        
        const response = JSON.parse(xhr.responseText);
        
        grid = response.grid;
        
        for (var t = 0; t < tiles_wide * tiles_tall; t++) {
            
            const x = t % tiles_wide;
            const y = (t - x) / tiles_wide;
            
            mtx.fillStyle = '#' + grid[t];
            mtx.fillRect(scale*x, scale*y, scale, scale);
        }
    });
    
    xhr.addEventListener('error', event => {
	    window.location.href = "https://tetraloom.com/";
    });
    
    xhr.open('POST', 'https://tetraloom.com/paint/');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send();
})();

audio.addEventListener("canplay", event => {
    music_ready = true;
    audio.play();
});

var mx = view_width / 2;
var my = view_width / 2;

function aesthetic_match(hex_string) {
    
    const r = parseInt(hex_string.substring(0, 2), 16);
    const g = parseInt(hex_string.substring(2, 4), 16);
    const b = parseInt(hex_string.substring(4, 6), 16);
    
    return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 125) ? "#000" : "#fff";
}

function enpath  (lambda) { utx.beginPath(); lambda(); utx.fill();   }
function enstroke(lambda) { utx.beginPath(); lambda(); utx.stroke(); }

function draw_ui() {
    
    utx.clearRect(0, 0, ui_layer.width, ui_layer.height);
    
    // draw music
    if (music_ready && !isScrolling) {
	    
	    const xo = paint.scrollLeft;    // offsets
	    const yo = paint.scrollTop;     // -------
	    
	    utx.fillStyle = "#fff";
	    enpath(() => { utx.arc(xo+15, yo+34, 6, 0, 2*Math.PI, false); });
	    enpath(() => { utx.arc(xo+32, yo+28, 6, 0, 2*Math.PI, false); });
	    
	    utx.strokeStyle = "#fff";
	    utx.lineWidth = 6;
	    enstroke(() => { utx.moveTo(xo+15+3, yo+34); utx.lineTo(xo+15+3, yo+15); });
	    enstroke(() => { utx.moveTo(xo+32+3, yo+28); utx.lineTo(xo+32+3, yo+ 8); });
	    
	    enpath(() => {
            utx.moveTo(xo+15+3-3, yo+15+3); utx.lineTo(xo+32+3+3, yo+ 8+3);
            utx.lineTo(xo+32+3+3, yo+ 8-3); utx.lineTo(xo+15+3-3, yo+15-3);
	    });
	    
	    if (audio.paused) {
            utx.strokeStyle = "#d00";
            utx.fillStyle   = "#d00";
            utx.lineWidth = 4;
            enstroke(() => { utx.moveTo(xo+8, yo+32); utx.lineTo(xo+40, yo+10); });
            enpath  (() => { utx.arc(xo+ 8, yo+32, 2, 0, 2*Math.PI, false); });
            enpath  (() => { utx.arc(xo+40, yo+10, 2, 0, 2*Math.PI, false); });
	    }
    }
    
    // draw recents
    if (selected && !isScrolling) {
	    for (var i = 0; i < recents.length; i++) {
	        
	        const hex_string = recents[recents.length - i - 1];
	        var   horizontal = paint.scrollLeft + 32 + 56*i;
	        var   vertical   = paint.scrollTop;
	        const ySelector  = round((sty*scale*zoom + canvas.offsetTop) + 0.5*scale*zoom);
	        
	        if (ySelector > paint.scrollTop + view_height / 2) {
		        vertical += 24;
		        
		        if (music_ready)
		            horizontal += 40 + 16;
	        } else {
		        vertical += view_height - 32;
	        }
	        
	        utx.fillStyle = aesthetic_match(hex_string);
	        enpath(() => {utx.arc(horizontal, vertical, 20, 0, 2*Math.PI, false); });
	        utx.fillStyle = '#' + hex_string;
	        enpath(() => {utx.arc(horizontal, vertical, 16, 0, 2*Math.PI, false); });
	    }
    }
    
    // draw no more if out of canvas
    if (mx - canvas.offsetLeft < 0 || my - canvas.offsetTop < 0 ||
	    mx - canvas.offsetLeft >= canvas.width*zoom || my - canvas.offsetTop >= canvas.height*zoom)
	    return;
    
    // there's no hover on mobile
    if (!selected)
	    return;
    
    // draw selector
    utx.fillStyle = aesthetic_match(grid[lookup(stx, sty)]);
    
    const xc = canvas.offsetLeft;    // correct for panning
    const yc = canvas.offsetTop;     // -------------------
    
    var px = Math.floor(zoom * scale / 3);
    px = (px >= 1 ? px : 1);
    
    utx.fillRect(xc + scale * zoom * stx             , yc + scale * zoom * sty             , 2*px,   px);
    utx.fillRect(xc + scale * zoom * stx             , yc + scale * zoom * sty             ,   px, 2*px);
    utx.fillRect(xc + scale * zoom * (stx + 1) - 2*px, yc + scale * zoom * sty             , 2*px,   px);
    utx.fillRect(xc + scale * zoom * (stx + 1) -   px, yc + scale * zoom * sty             ,   px, 2*px);
    utx.fillRect(xc + scale * zoom * stx             , yc + scale * zoom * (sty + 1) -   px, 2*px,   px);
    utx.fillRect(xc + scale * zoom * stx             , yc + scale * zoom * (sty + 1) - 2*px,   px, 2*px);
    utx.fillRect(xc + scale * zoom * (stx + 1) - 2*px, yc + scale * zoom * (sty + 1) -   px, 2*px,   px);
    utx.fillRect(xc + scale * zoom * (stx + 1) -   px, yc + scale * zoom * (sty + 1) - 2*px,   px, 2*px);
}

var last_top = 0, last_left = 0;
var selected_cancelled = false;
var suppress_mouse = false;

function interperate_mouse(event) {
    mx = event.pageX - paint.offsetLeft;
    my = event.pageY - paint.offsetTop;
}

ui_layer.addEventListener('mousedown', event => {
    
    interperate_mouse(event, false);
    
    if (mx <= 40 && my <= 40) {
        (audio.paused) ? audio.play() : audio.pause();
        suppress_mouse = true;
	    draw_ui();
        return;
    }
    
    if (selected) {
	    for (var i = 0; i < recents.length; i++) {
	        
	        const ySelector  = round((sty*scale*zoom + canvas.offsetTop) + 0.5*scale*zoom);
	        const vertical   = 
		          ((ySelector > paint.scrollTop + view_height / 2) ? 32 : view_height - 32);
	        
	        var   xPos = 32 + 56*i;
	        const yPos = vertical;
	        
	        if (ySelector > paint.scrollTop + view_height / 2 && music_ready)
		        xPos += 40 + 16;
	        
	        const dist = (mx - xPos)*(mx - xPos) + (my - yPos)*(my - yPos);
	        
	        if (dist <= 24*24) {
		        suppress_mouse = true;
		        picker.setColor('#' + recents[recents.length - i - 1], false);
		        picker.show();
		        draw_ui();
		        return;
	        }
	    }
	    
        pick.style.display = 'none';
	    selected_cancelled = true;
	    selected = false;
    } else {
	    stx = floor((mx - canvas.offsetLeft + paint.scrollLeft) / scale / zoom);
	    sty = floor((my - canvas.offsetTop  + paint.scrollTop ) / scale / zoom);
    }
    
    draw_ui();
    event.stopPropagation();
});

ui_layer.addEventListener('mouseup', event => {
    
    interperate_mouse(event);
    
    if (suppress_mouse) {
	    suppress_mouse = false;
	    return;
    }
    
    if (selected_cancelled) {
	    selected_cancelled = false;
	    return;
    }
    
    selected = !selected;
    
    if (!selected)
        pick.style.display = 'none';    // do this early
    
    const ySelector = round((sty*scale*zoom + canvas.offsetTop) + 0.5*scale*zoom);
    
    picker.setColor('#' + grid[lookup(stx, sty)], false);
    picker.show();
    
    pick.style.left = floor((view_width - 250) / 2 + paint.scrollLeft) + 'px';
    
    if (ySelector < paint.scrollTop + view_height / 2) pick.style.top  = ySelector       + 64 + 'px';
    else                                               pick.style.top  = ySelector - 329 - 64 + 'px';
    
    pick.style.display = selected ? 'block' : 'none';
    draw_ui();
    event.stopPropagation();
});

var scroll_timer = null;
paint.addEventListener('scroll', event => {
    
    isScrolling = true;
    draw_ui();
    
    if (scroll_timer !== null)
	    clearTimeout(scroll_timer);
    
    scroll_timer = setTimeout(() => {
	    isScrolling = false;
	    draw_ui();
    }, 100);
});

async function change(x, y, to) {
    
    changing[lookup(x, y)] = to;
    
    while (grid[lookup(x, y)] !== to && changing[lookup(x, y)] === to) {
        
        const color = grid[lookup(x, y)];
        
        var new_color = '';
        
        for (var i = 0; i < 3; i++) {
            
            const channel = parseInt(color.charAt(2*i) + color.charAt(2*i + 1), 16);
            const target  = parseInt(   to.charAt(2*i) +    to.charAt(2*i + 1), 16);
            
            const diff = channel - target;
            
            if      (diff < 0) new_color += (channel + 1 < 16 ? "0" : "") + (channel + 1).toString(16);
            else if (diff > 0) new_color += (channel - 1 < 16 ? "0" : "") + (channel - 1).toString(16);
            else               new_color += (channel     < 16 ? "0" : "") + (channel    ).toString(16);
        }
        
        grid[lookup(x, y)] = new_color;
        
        await sleep(16);
        
        mtx.fillStyle = '#' + grid[lookup(x, y)];
        mtx.fillRect(scale * x, scale * y, scale, scale);
    }
}

const socket = io.connect({path: '/paint/socket.io', secure: true});

socket.on('update', encoded => {    // untrusted (TetraLoom.com rebroadcast)
    
    const user_initiated = encoded === current_code;
    
    const x = encoded % tiles_wide; encoded = (encoded - x) / tiles_wide;
    const y = encoded % tiles_tall; encoded = (encoded - y) / tiles_tall;
    const r = encoded % 256;        encoded = (encoded - r) / 256;
    const g = encoded % 256;        encoded = (encoded - g) / 256;
    const b = encoded % 256;
    
    const hex_string = ''
          + (r < 16 ? '0' : '') + r.toString(16)
          + (g < 16 ? '0' : '') + g.toString(16)
          + (b < 16 ? '0' : '') + b.toString(16);
    
    change(x, y, hex_string);
    
    if (!recents.includes(hex_string))
	    recents.push(hex_string);
    
    if (!user_initiated)
	    return;
    
    selected = false;
    pick.style.display = 'none';
    draw_ui();
});
