
/*! Copyright (C) TetraLoom LLC - All Rights Reserved
 *  Unauthorized copying of this file, via any medium is strictly prohibited
 *  Proprietary and confidential
 *  Written by Noah Franks <TetraLoom@pm.me>, April 2020 */

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    window.location.replace("/paint/mobile/");

const canvas   = document.getElementById('main-layer');
const ui_layer = document.getElementById(  'ui-layer');
const paint    = document.getElementById(     'paint');
const pay      = document.getElementById(       'pay');
const box      = document.getElementById(       'box');
var   pick     = document.getElementById(      'pick');
var   qrcode   = document.getElementById(    'qrcode');
const natrium  = document.getElementById(   'natrium');
const audio    = document.getElementById(      'jazz');

audio.volume = 0.175;    // don't blow out peoples ears

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

const tiles_wide  = 390;                               // width of place image in tiles
const tiles_tall  = 206;                               // -----------------------------
const qrcode_size = 256;

var view_width  = ceil(window.innerWidth  * 0.900);    // dimensions before alterations
var view_height = ceil(window.innerHeight * 0.850);    // -----------------------------
var scale       = ceil(Math.max(view_width / tiles_wide, view_height / tiles_tall));
var zoom = 1;

var isFullscreen = false;

// fullscreen capabilities
function canFullscreen() {
    const method = paint.requestFullscreen || paint.mozRequestFullscreen;
    return method !== undefined;
}
function goFullscreen() {
    
    zoom = Math.max(window.innerWidth / view_width, window.innerHeight / view_height);
    
    const trans = 'scale(' + zoom + ')';
    canvas.style.MozTransform    = trans;
    canvas.style.WebkitTransform = trans;
    
    canvas.style.left = floor((canvas.width *zoom - window.innerWidth )/2) + 'px';    // move back using new units
    canvas.style.top  = floor((canvas.height*zoom - window.innerHeight)/2) + 'px';    // -------------------------
    
    if      (paint.requestFullscreen      ) paint.requestFullscreen();
    else if (paint.mozRequestFullscreen   ) paint.mozRequestFullscreen();
}
paint.addEventListener("fullscreenchange", event => {
    
    isFullscreen = !isFullscreen;
    
    if (!isFullscreen) {
	    zoom = 1;
	    const trans = 'scale(' + zoom + ')';
	    canvas.style.MozTransform    = trans;
	    canvas.style.WebkitTransform = trans;
	    canvas.style.left = 0 + 'px';    // move back using new units
	    canvas.style.top  = 0 + 'px';    // -------------------------
	    pay .style.display = 'none';
        pick.style.display = 'none';
	    selected = false;
    }
    draw_ui();
});

if (canFullscreen()) {
    
    scale = floor(Math.min(view_width / tiles_wide, view_height / tiles_tall));
    
    // alter dimensions to fit the scale
    if (view_height < view_width) {
	    view_height = tiles_tall * scale;
	    view_width  = floor(view_height * tiles_wide / tiles_tall);
    } else {
	    view_width  = tiles_wide * scale;
	    view_height = floor(view_width *  tiles_tall / tiles_wide);
    }
}

paint.style.width = view_width  + 'px', paint.style.height = view_height + 'px';
ui_layer.width    = screen.width      , ui_layer.height = screen.height;
canvas.width      = scale * tiles_wide,   canvas.height = scale * tiles_tall;

const dpr  = window.devicePixelRatio || 1;    // could be used to enable high-dpi drawing

function create_context(source) {
    
    var rect = source.getBoundingClientRect();
    
    //source.width  = rect.width  * dpr;
    //source.height = rect.height * dpr;
    
    var ctx = source.getContext('2d');
    //ctx.scale(dpr, dpr);
    return ctx;
}

const mtx = create_context(canvas  );
const utx = create_context(ui_layer);

mtx.clearRect(0, 0,   canvas.width,   canvas.height);
utx.clearRect(0, 0, ui_layer.width, ui_layer.height);
mtx.fillStyle = '#202020';
mtx.fillRect(0, 0, canvas.width, canvas.height);


var stx = 0, sty = 0;
var selected = false;

var current_code = null;
var recents = [];

function make_qr(rgb) {
    
    // bijective convolution
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
	    
	    audio.play();            // load this last
    });
    
    xhr.addEventListener('error', event => {
	    window.location.href = "https://tetraloom.com/";
    });
    
    xhr.open('POST', 'https://tetraloom.com/paint/');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send();
})();

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
    
    // draw fullscreen arrows
    if (!isFullscreen) {
	    utx.fillStyle = "#fff";
	    const vw = view_width;
	    enpath(() => { utx.moveTo(vw - 40,  8); utx.lineTo(vw - 40, 20); utx.lineTo(vw - 28,  8); });
	    enpath(() => { utx.moveTo(vw -  8,  8); utx.lineTo(vw -  8, 20); utx.lineTo(vw - 20,  8); });
	    enpath(() => { utx.moveTo(vw - 40, 40); utx.lineTo(vw - 40, 28); utx.lineTo(vw - 28, 40); });
	    enpath(() => { utx.moveTo(vw -  8, 40); utx.lineTo(vw -  8, 28); utx.lineTo(vw - 20, 40); });
	    
	    utx.strokeStyle = "#fff";
	    utx.lineWidth = 6;
	    enstroke(() => { utx.moveTo(vw - 36, 36); utx.lineTo(vw - 12, 12); });
	    enstroke(() => { utx.moveTo(vw - 12, 36); utx.lineTo(vw - 36, 12); });
    }
    
    // draw music
    utx.fillStyle = "#fff";
    enpath(() => { utx.arc(15, 34, 6, 0, 2*Math.PI, false); });
    enpath(() => { utx.arc(32, 28, 6, 0, 2*Math.PI, false); });
    
    utx.strokeStyle = "#fff";
    utx.lineWidth = 6;
    enstroke(() => { utx.moveTo(15+3, 34); utx.lineTo(15+3, 15); });
    enstroke(() => { utx.moveTo(32+3, 28); utx.lineTo(32+3,  8); });
    
    enpath(() => {
	    utx.moveTo(15+3-3, 15+3); utx.lineTo(32+3+3,  8+3);
	    utx.lineTo(32+3+3,  8-3); utx.lineTo(15+3-3, 15-3);
    });
    
    if (audio.paused) {
	    utx.strokeStyle = "#d00";
	    utx.fillStyle   = "#d00";
	    utx.lineWidth = 4;
	    enstroke(() => { utx.moveTo(8, 32); utx.lineTo(40, 10); });
	    enpath  (() => { utx.arc( 8, 32, 2, 0, 2*Math.PI, false); });
	    enpath  (() => { utx.arc(40, 10, 2, 0, 2*Math.PI, false); });
    }
    
    // draw recents
    if (selected) {
	    const bottom = (isFullscreen ? screen.height : view_height);
	    
	    for (var i = 0; i < recents.length; i++) {
	        
	        const hex_string = recents[recents.length - i - 1];
	        
	        utx.fillStyle = aesthetic_match(hex_string);
	        enpath(() => {utx.arc(32 + 56*i, bottom - 32, 20, 0, 2*Math.PI, false); });
	        utx.fillStyle = '#' + hex_string;
	        enpath(() => {utx.arc(32 + 56*i, bottom - 32, 16, 0, 2*Math.PI, false); });
	    }
    }
    
    // draw no more if out of canvas
    if (mx - canvas.offsetLeft < 0 || my - canvas.offsetTop < 0 ||
	    mx - canvas.offsetLeft >= canvas.width*zoom || my - canvas.offsetTop >= canvas.height*zoom)
	    return;
    
    if (!selected) {
        stx = floor((mx - canvas.offsetLeft) / scale / zoom);
        sty = floor((my - canvas.offsetTop ) / scale / zoom);
    }
    
    // draw selector
    utx.fillStyle = aesthetic_match(grid[lookup(stx, sty)]);
    
    const xc = canvas.offsetLeft;    // correct for panning
    const yc = canvas.offsetTop;     // -------------------
    
    var px = Math.floor(zoom * scale / 5);
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

var dx = null, dy = null;
var last_top = 0, last_left = 0;
var moved = false;
var selected_cancelled = false;
var suppress_mouse = false;

function interperate_mouse(event) {
    mx = event.pageX - paint.offsetLeft;
    my = event.pageY - paint.offsetTop;
}

ui_layer.addEventListener('mouseout', event => {
    
    dx = null, dy = null;
    selected_cancelled = false;
    moved = false;
    
    if (!selected)
        utx.clearRect(0, 0, view_width, view_height);
});

ui_layer.addEventListener('mousedown', event => {
    
    interperate_mouse(event);
    
    if (mx <= 40 && my <= 40) {
	    (audio.paused) ? audio.play() : audio.pause();
	    suppress_mouse = true;
	    draw_ui();
	    return;
    }
    
    // if possible, enable fullscreen mode
    if (!isFullscreen && canFullscreen()) {
	    goFullscreen();
	    suppress_mouse = true;
	    dx = null, dy = null;
	    return;
    }
    
    if (selected) {
	    
	    const bottom = (isFullscreen ? screen.height : view_height);
	    
	    for (var i = 0; i < recents.length; i++) {
	        
	        const xPos = 32 + 56*i;
	        const yPos = bottom - 32;
	        const dist = (mx - xPos)*(mx - xPos) + (my - yPos)*(my - yPos);
	        
	        if (dist <= 20*20) {
		        picker.setColor('#' + recents[recents.length - i - 1], false);
		        suppress_mouse = true;
		        draw_ui();
		        return;
	        }
	    }
	    
	    pay .style.display = 'none';    // do this early
        pick.style.display = 'none';    // -------------
	    selected_cancelled = true;
	    selected = false;
	    draw_ui();
    }
    
    const style = window.getComputedStyle(canvas);
    
    dx = mx, dy = my;
    last_top  = parseInt(style.top);
    last_left = parseInt(style.left);
    moved = false;
});

ui_layer.addEventListener('mousemove', event => {
    
    interperate_mouse(event);
    
    if (suppress_mouse)
	    return;
    
    moved = true;
    
    if (dx) {
	    canvas.style.left = last_left + (mx - dx) + 'px';
	    canvas.style.top  = last_top  + (my - dy) + 'px';
    }
    
    draw_ui();
});

ui_layer.addEventListener('mouseup', event => {
    
    interperate_mouse(event);
    
    dx = null, dy = null;
    
    if (suppress_mouse) {
	    suppress_mouse = false;
	    return;
    }
    
    if (selected_cancelled) {
	    selected_cancelled = false;
	    return;
    }
    
    if (moved) return;
    
    selected = !selected;
    
    if (!selected) {
        pay .style.display = 'none';    // do this early
        pick.style.display = 'none';    // -------------
    }
    
    const xSelector = round((stx*scale*zoom + canvas.offsetLeft) + 0.5*scale*zoom);
    const ySelector = round((sty*scale*zoom + canvas.offsetTop ) + 0.5*scale*zoom);
    
    const working_width  = isFullscreen ? screen.width  : view_width;
    const working_height = isFullscreen ? screen.height : view_height;
    
    picker.setColor('#' + grid[lookup(stx, sty)], false);
    picker.show();
    
    if (xSelector < working_width  / 2) pick.style.left = xSelector       + 64 + 'px';
    else                                pick.style.left = xSelector - 250 - 64 + 'px';
    
    if (ySelector < working_height / 2) pick.style.top  = ySelector       + 64 + 'px';
    else                                pick.style.top  = ySelector - 329 - 64 + 'px';
    
    pay.style.left = floor((working_width  - qrcode_size)/2) + 'px';
    pay.style.top  = floor((working_height - qrcode_size)/2) + 'px';
    
    const xPick = parseInt(pick.style.left);
    var   xPay  = parseInt(pay .style.left);
    
    if (xPick >= xPay && xPick - xPay < 64 + qrcode_size)
	    if (xSelector < working_width / 2) xPay = xPick + 250 + 48;
    else                               xPay -= (16 + 64 + qrcode_size - (xPick - xPay));
    else if (xPick <= xPay && xPay - xPick < 250 + 32)
	    if (xSelector > working_width / 2) xPay = xPick - 16 - 64 - qrcode_size;
    else                               xPay += (16 + 32 + 250 - (xPay - xPick));
    
    pay.style.left = xPay + 'px';
    
    pay .style.display = selected ? 'block' : 'none';
    pick.style.display = selected ? 'block' : 'none';
    draw_ui();
});

ui_layer.addEventListener('wheel', event => {
    
    if (!isFullscreen && canFullscreen())
	    return;
    
    const style = window.getComputedStyle(canvas);
    
    interperate_mouse(event);
    
    const rho = event.deltaY < 0 ? 1.04 : 1 / 1.04;
    const copy = zoom;
    
    zoom = (rho * zoom >= 5.5) ? 5.5 : (rho * zoom <= 1/scale) ? 1/scale : rho * zoom;
    
    const priorLeft = canvas.offsetLeft;                                   // location of corner before zoom
    const priorTop  = canvas.offsetTop ;                                   // ------------------------------
    
    canvas.style.left = (event.pageX - paint.offsetLeft) + 'px';           // move corner -> cursor
    canvas.style.top  = (event.pageY - paint.offsetTop ) + 'px';           // ---------------------
    
    const trans = 'scale(' + zoom + ')';                                   // zoom in on cursor
    canvas.style.MozTransform    = trans;                                  // -----------------
    canvas.style.WebkitTransform = trans;                                  // -----------------
    
    const interumLeft = canvas.offsetLeft;                                 // location of corner at cursor
    const interumTop  = canvas.offsetTop;                                  // ----------------------------
    
    const xDelta = priorLeft - interumLeft;                                // displacement so far in old units
    const yDelta = priorTop  - interumTop;                                 // --------------------------------
    
    canvas.style.left = interumLeft + round(xDelta*(zoom/copy)) + 'px';    // move back using new units
    canvas.style.top  = interumTop  + round(yDelta*(zoom/copy)) + 'px';    // -------------------------

    draw_ui();
    event.preventDefault();
}, false);

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

socket.on('update', encoded => {    // trusted (TetraLoom.com)
    
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
    
    if (user_initiated) {
	    selected = false;
	    pay .style.display = 'none';
	    pick.style.display = 'none';
	    draw_ui();
    }
});
