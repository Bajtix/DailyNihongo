/*
    Copyright (C) 2023  bajtixone

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>. 
*/


const $ = (arg) => document.querySelector(arg);

var translation_wheel_thread = undefined;
var background_image_thread = undefined;
var svg_load_thread = undefined;
var sentence_load_thread = undefined;
var link_load_thread = undefined;
var drawing_timeout_threads = {}

var translation_index = 0;

var lock_switching = false;
var lock_broken = false;

const translation_time = 2000;
const background_delay = 1000;
const svg_delay = 500;

const levels = {
    'n5': {
        name: 'n5',
        endpoint: "./vocab/n5/",
        count: 669
    },
    'n4': {
        name: 'n4',
        endpoint: "./vocab/n4/",
        count: 635
    }
};

var vocab_level = levels.n5; // this will be deduced from the url
var current_vocab_id = Math.round((new Date().getTime()) / (1000 * 3600 * 24)) % vocab_level.count;

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
} // crypto is not available on all devices in 2023...

window.onload = load_current_stuff;
window.onhashchange = load_current_stuff;

function sleep(ms) { // helper function
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function load_current_stuff() {
    var params = {
        'jlpt': 'n5',
        'id': Math.round((new Date().getTime()) / (1000 * 3600 * 24))
    };

    window.location.hash.split('#').forEach(val => {
        if (val == "") return;
        if (val.matchAll('=').length == 0) return;
        var k = val.split('=')[0].toLowerCase();
        var v = val.split('=')[1].toLowerCase();
        console.log("URL arg", k, "=", v);
        if (k in params) params[k] = v;
    });

    if (params.jlpt in levels) {
        vocab_level = levels[params.jlpt];
    } else {
        console.warn("Invalid jlpt level, ignoring");
    }

    if (parseInt(params.id) !== undefined) {
        current_vocab_id = params.id % vocab_level.count;
        console.log("Found actual id to be", current_vocab_id);
    } else {
        console.warn("Invalid id, ignoring");
    }

    await noscroll_kanji(await fetch_vocab(vocab_level, current_vocab_id));
}

async function fetch_vocab(level, id) {
    console.log("Fetching", id, "from", level);
    vocab_level = level;
    return (await fetch(`${level.endpoint}/${id}.json`)).json();
}

//#region Loading Resources

function set_card(id, vocab) {
    $(`#${id} .kanji`).innerHTML = vocab.kanji;
    $(`#${id} .reading`).innerHTML = vocab.read;
    $(`#${id} .trans-top`).innerHTML = vocab.en[0];
    $(`#${id} .trans-bot`).innerHTML = vocab.en[0];

    translation_index = 1;
    clearInterval(translation_wheel_thread);

    if (vocab.en.length > 1) {
        translation_wheel_thread = setInterval(async () => {
            await swap_translation(id, vocab.en[translation_index]);
            translation_index++;
            if (translation_index >= vocab.en.length) translation_index = 0;
        }, translation_time);
    }
}

async function load_bg(vocab, instant) {
    clearTimeout(background_image_thread);
    background_image_thread = setTimeout(() => {
        $("#bg-preload").src = `${vocab.pic.src}`;
        $("#bg-image").style.backgroundImage = `url("${$('#bg-preload').src}")`;
    }, instant ? 0 : background_delay); // wait a second before starting the image loading

    $("#bg-static").style.backgroundColor = `${vocab.pic.col}`;
    $("#photo-credit").innerText = `${vocab.pic.author} @ pexels.com`;
    $('#bg-image').removeAttribute("scr");
}

async function bg_ready() {
    await sleep(200); // corresponds to transition duration in #background>#bg-image
    $('#bg-image').setAttribute("scr", "");
}

async function load_svgs(vocab, instant) {
    clearTimeout(svg_load_thread);
    $('#writing').removeAttribute("scr");
    svg_load_thread = setTimeout(async () => {
        var parent = document.createElement("div");
        parent.className = "writing-svgs";
        await sleep(200);
        if ($("#writing-container .writing-svgs"))
            $("#writing-container .writing-svgs").remove();

        vocab.svg.forEach(async (element, i) => {
            const svgname = element.split('.')[0];
            var obj = document.createElement('object');
            obj.data = `./charsvg/${element}`;

            obj.addEventListener("load", () => {
                const svg = obj.contentDocument.querySelector("svg");
                const numbers = svg.getElementById(`kvg:StrokeNumbers_${svgname}`);
                const strokes = svg.getElementById(`kvg:StrokePaths_${svgname}`);

                // prepare the character for animation
                svg.style.setProperty("--anim-progress", "0");
                svg.style.setProperty("--number-opacity", "0");
                svg.style.setProperty("cursor", "pointer");
                const cnt = strokes.querySelectorAll('path').length;

                var total_length = 0;

                strokes.querySelectorAll('path').forEach((path, pid) => {
                    const len = path.getTotalLength();
                    total_length += len;
                    path.style.setProperty("stroke-dasharray", `${len}px ${len}px`);
                    path.style.setProperty("--anim-odr", `calc(min(max(0, calc(var(--anim-progress) - ${pid / cnt})), ${1 / cnt}) * ${cnt})`); //dear god
                    path.style.setProperty("stroke-dashoffset", `calc((1 - var(--anim-odr)) * ${len}px)`);
                });

                numbers.querySelectorAll('text').forEach((path, pid) => {
                    path.style.setProperty("--anim-odr", `calc(min(max(0, calc(var(--anim-progress) - ${pid / cnt})), ${1 / cnt}) * ${cnt})`);
                    path.style.setProperty("opacity", `var(--number-opacity)`);
                    path.style.setProperty("transition", `opacity 1s`);
                    path.style.setProperty("font-size", `calc(var(--anim-odr) * 50%)`);
                });

                $('#writing').setAttribute("scr", "");

                svg.addEventListener("click", () => {
                    animate_kanji_drawing(obj, total_length / 50);
                    svg.style.setProperty("--number-opacity", 0.3);
                });

                const th = $('#main').clientHeight / 2;

                if (window.scrollY > th) {
                    animate_kanji_drawing(obj, 5);
                } else {
                    const f = () => {
                        if (window.scrollY > th) {
                            animate_kanji_drawing(obj, 5);
                            window.removeEventListener("scroll", f);
                        }
                    };
                    window.addEventListener("scroll", f);
                }
            });

            obj.setAttribute("uuid", uuidv4());
            parent.appendChild(obj);
        });

        $('#writing-container').appendChild(parent);
    }, instant ? 0 : svg_delay);
}

async function fetch_sentences(vocab, instant) {
    clearTimeout(sentence_load_thread);
    $('#sentences').removeAttribute("scr");
    sentence_load_thread = setTimeout(async () => {
        var api_link = `./debug-sentence-fetch.php?vocab=${encodeURIComponent(vocab.kanji)}`;
        console.log("Fetching sentences from " + api_link);
        var data = await (await fetch(api_link)).json();
        var parent = document.createElement("div");
        parent.className = "sentence-results";
        await sleep(200);
        $("#sentences .sentence-results")?.remove();

        data.results.forEach((val, index) => {
            var sentence = val.text;
            var translation = "";
            for (i = 0; i < val.translations.length; i++) {
                if (val.translations[i].length > 0) {
                    translation = val.translations[i][0].text;
                    break;
                }
            }

            var transcription = ('transcriptions' in val && val.transcriptions.length > 0) ? val.transcriptions[0].text : null;

            if (transcription != null && transcription.match(/\[(.*?)\]/g) != null) {
                transcription.match(/\[(.*?)\]/g).forEach(match => {
                    var kana = match.split('|')[1].replace(']', '').trim();
                    var kanji = match.split('|')[0].replace('[', '').trim();
                    if (kana == "" || kanji == "") {
                        if (kana == "" && kanji == "") {
                            transcription = transcription.replace(match, "");
                        }
                        else if (kana == "")
                            transcription = transcription.replace(match, kanji);
                        else if (kanji == "") {
                            transcription = transcription.replace(match, kana);
                        }
                    } else {
                        transcription = transcription.replace(match, `<span class="kana-kanji" kana="${kana}" kanji="${kanji}"></span>`);
                    }
                });

                sentence = transcription;
            }

            var mn = document.createElement("div");
            mn.className = "sentence";
            var jp = document.createElement("p");
            jp.className = "jp";
            var en = document.createElement("p");
            en.className = "en";

            jp.innerHTML = sentence;
            en.innerHTML = translation;

            const makelnk = (id) => {
                var lnk = document.createElement("div");
                var jisho_link = document.createElement("a");
                jisho_link.className = "in";
                var tato_link = document.createElement("a");
                tato_link.className = "in";
                lnk.className = "ln " + id;
                jisho_link.innerHTML = `<img src="./assets/question-circle.svg" />`;
                jisho_link.href = `https://jisho.org/search/${encodeURIComponent(val.text)}`;
                jisho_link.target = "_blank";

                tato_link.innerHTML = `<img src="./assets/message-2.svg" />`;
                tato_link.href = `https://tatoeba.org/en/sentences/search?from=jpn&query=${encodeURIComponent(val.text)}&to=eng`;
                tato_link.target = "_blank";
                lnk.appendChild(tato_link);
                lnk.appendChild(jisho_link);
                return lnk;
            }

            mn.appendChild(makelnk("lnbef")); // and this kids why you should just use a framework
            mn.appendChild(jp);
            mn.appendChild(makelnk("lnaft"));
            mn.appendChild(en);


            parent.appendChild(mn);
        });

        $('#sentences').appendChild(parent);
        $("#sentences").setAttribute("scr", "");
    }, instant ? 0 : svg_delay);
}

async function load_links(vocab, instant) {
    clearTimeout(link_load_thread);
    $('#links').removeAttribute("scr");
    link_load_thread = setTimeout(async () => {
        await sleep(200);
        const coded = encodeURIComponent(vocab.kanji);
        $('#takoboto-link').href = `https://takoboto.jp/?q=${coded}`;
        $('#jisho-link').href = `https://jisho.org/search/${coded}`;
        $('#tatoeba-link').href = `https://tatoeba.org/en/sentences/search?from=jpn&query=${coded}&to=eng`;
        $('#perma-link').href = `${window.location.href.replace(window.location.hash, "")}#jlpt=${vocab_level.name}#id=${current_vocab_id}`;
        $('#links').setAttribute("scr", "");
    }, instant ? 0 : svg_delay);
}

//#endregion

//#region Animated Transitions
async function swap_translation(card, new_text) {
    const top = $(`#${card} .trans-top`);
    const bot = $(`#${card} .trans-bot`);
    const ct = $(`#${card} .translation`);

    bot.innerHTML = new_text;

    const previous = top.innerHTML;

    ct.setAttribute("scr", "");

    await sleep(1000);

    if (top.innerHTML == previous) // thread lock of sorts
        top.innerHTML = new_text;

    ct.removeAttribute("scr");
}

async function scroll_kanji(new_vocab, dir) {
    load_bg(new_vocab, false);
    load_svgs(new_vocab, false);
    load_links(new_vocab, false);
    fetch_sentences(new_vocab, false);

    if (lock_switching) {
        set_card("real-card", new_vocab)
        set_card("anim-card", new_vocab)
        lock_broken = true;
        return;
    }

    lock_broken = false;
    lock_switching = true;
    $('#kanji-display').setAttribute('dir', dir);
    set_card("anim-card", new_vocab);
    await sleep(10);
    if (!lock_broken)
        $('#kanji-display').setAttribute('scr', '');
    await sleep(500);
    if (!lock_broken)
        set_card("real-card", new_vocab)
    $('#kanji-display').removeAttribute("scr");
    lock_switching = false;
}

async function animate_kanji_drawing(obj, time = 5) {
    const uuid = obj.getAttribute("uuid");
    if (uuid in drawing_timeout_threads) {
        drawing_timeout_threads[uuid].forEach(v => clearTimeout(v));
    }

    drawing_timeout_threads[uuid] = [];

    console.log("Animating " + uuid);
    const framerate = 30;

    const svg = obj.contentDocument.querySelector("svg");
    for (i = 0; i < time * framerate; i++) {
        const v = i; // js trickery 
        const de = i * 1000 / framerate;
        var t = setTimeout(() => {
            requestAnimationFrame(() => {
                svg.style.setProperty("--anim-progress", v / (time * framerate));
            });
        }, de);
        drawing_timeout_threads[uuid].push(t);
    }
}

//#endregion

async function swap_next() {
    current_vocab_id++;
    if (current_vocab_id >= vocab_level.count) current_vocab_id = 0;
    await scroll_kanji(await fetch_vocab(vocab_level, current_vocab_id), 'l')
}

async function swap_previous() {
    current_vocab_id--;
    if (current_vocab_id < 0) current_vocab_id = vocab_level.count - 1;
    await scroll_kanji(await fetch_vocab(vocab_level, current_vocab_id), 'r')
}

async function noscroll_kanji(new_vocab) {
    set_card("real-card", new_vocab)
    load_bg(new_vocab, false);
    load_svgs(new_vocab, true);
    load_links(new_vocab, true);
    fetch_sentences(new_vocab, true);
}