//general variables

//Magenta source code: https://glitch.com/edit/#!/piano-genie
//Ml5.js - https://ml5js.org/docs/PitchDetection

var noteplaying = null;
var timeout;

//ml5.js

let audioContext;
let mic;
let pitch;
let lastNote = null;
let noteStack = [];
let noteStack2 = [];
let ready = false;


$(document).mousemove(function(event){
  // console.log(event.pageX);
  clearTimeout(timeout);
  timeout = setTimeout(function(){
    if(noteplaying != null){
      buttonUp(noteplaying);
      noteplaying = null;
    }
  }, 50);
  var width = $( document ).width();
  // var imgwidth = $( "#violinbow" ).width();
  // $("#violinbow").offset({left: (event.pageX - width/2) + 250});
  $('#violinbow').css({'left': event.clientX - 250});

  if(event.clientX > width/2 + 250 && event.clientX < width/2 - 250){
    if(noteplaying != null){
      buttonUp(noteplaying);
      noteplaying = null;
    }
  }

  if(ready && noteplaying == null && event.clientX < width/2 + 250 && event.clientX > width/2 - 250){
    const val = Math.floor(Math.random() * (+8 - +0)) + +0;
    const note = genie.nextFromKeyWhitelist(val, keyWhitelist, TEMPERATURE);
    const pitch = CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + note;
    player.playNoteDown(pitch, val);
    showNotes();
    heldButtonToVisualData.set(val, {note:note});
    noteplaying = val;
  }

});

function setup() {
  noCanvas();
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(startPitch);
}

function start(){
  getAudioContext().resume();
  $( this ).fadeOut( 1000, function() {
    $( this ).remove();
  });
  $( ".loader" ).fadeOut( 1000, function() {
    $( ".loader" ).remove();
    $( ".application").fadeIn();
  });
}

function startPitch() {
  pitch = ml5.pitchDetection('./model/', audioContext , mic.stream, modelLoaded);
}

function modelLoaded() {
  select('#status').html('Model Loaded');
  getPitch();
  setTimeout(showMainScreen, 500);
  ready = true;
}

function getPitch() {
  pitch.getPitch(function(err, frequency) {
    var volume = mic.getLevel();
    select('#result').html(frequency);
    select('#level').html(volume);
    if (frequency && volume > 0.05) {
      getClosestFrequency(frequency, volume);
    } else {
      select('#result').html('No pitch detected');
      var removeNote = noteStack.shift();
      buttonUp(removeNote);
      var removeNote2 = noteStack2.shift();
      buttonUp(removeNote2);
      lastNote = null;
    }
    getPitch();
  })
}

function getClosestFrequency(frequency, level){
  var frequencies = [196, 293, 440, 659];
  var val = 0;
  var minval = Math.abs (frequency - frequencies[0]);
  for (var i = 0; i < frequencies.length; i++) {
    var newdiff = Math.abs (frequency - frequencies[i]);
    if (newdiff < minval) {
      minval = newdiff;
      val = i;
    }
  }
  console.log(val);
  if(val != lastNote){
    //Note 1
    showNotes();
    const note = genie.nextFromKeyWhitelist(val, keyWhitelist, TEMPERATURE);
    const pitch = CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + note;
    player.playNoteDown(pitch, val);

    heldButtonToVisualData.set(val, {note:note});
    lastNote = val;
    noteStack.push(val);

    //Note 2
    const note2 = genie.nextFromKeyWhitelist(val+3, keyWhitelist, TEMPERATURE);
    const pitch2 = CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + note2;
    player.playNoteDown(pitch2, val+3);

    // Float it.
    // const noteToPaint2 = painter.addNote(val+3, rect2.getAttribute('x'), rect.getAttribute('width'));
    heldButtonToVisualData.set(val+3, {note:note2});
    noteStack2.push(val+3);
    // setTimeout(function(){ buttonUp(val); }, 2000);
  }
}

//Magenta

const CONSTANTS = {
  NUM_BUTTONS : 8,
  NOTES_PER_OCTAVE : 12,
  WHITE_NOTES_PER_OCTAVE : 7,
  LOWEST_PIANO_KEY_MIDI_NOTE : 21,
  GENIE_CHECKPOINT : '/model/checkpoint',
}

/*************************
 * MIDI or Magenta player
 ************************/
class Player {
  constructor() {
    this.player = new mm.SoundFontPlayer('soundfont');
    this.selectElement = document.getElementById('selectOut');
    this.loadAllSamples();
  }

  loadAllSamples() {
    const seq = {notes:[]};
    for (let i = 0; i < CONSTANTS.NOTES_PER_OCTAVE * OCTAVES; i++) {
      seq.notes.push({pitch: CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + i});
    }
    this.player.loadSamples(seq);
  }

  playNoteDown(pitch, button) {
      mm.Player.tone.context.resume();
      this.player.playNoteDown({pitch:pitch});
  }

  playNoteUp(pitch, button) {
      this.player.playNoteUp({pitch:pitch});
  }
}

/*************************
 * Consts for everyone!
 ************************/
let OCTAVES = 7;
let keyWhitelist;
let TEMPERATURE = getTemperature();

const heldButtonToVisualData = new Map();
let mouseDownButton = null;

const player = new Player();
const genie = new mm.PianoGenie(CONSTANTS.GENIE_CHECKPOINT);

initEverything();

/*************************
 * Basic UI bits
 ************************/
function initEverything() {
  genie.initialize().then(() => {
    console.log('🧞‍♀️ ready!');
    playBtn.textContent = 'Play';
    playBtn.removeAttribute('disabled');
    playBtn.classList.remove('loading');
  });

  // Start the drawing loop.
  onWindowResize();
  // window.requestAnimationFrame(() => painter.drawLoop());

  // Event listeners.
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('orientationchange', onWindowResize);
  window.addEventListener('hashchange', () => TEMPERATURE = getTemperature());
}

function showMainScreen() {
  document.addEventListener('keydown',onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  const note = genie.nextFromKeyWhitelist(0, keyWhitelist, TEMPERATURE);
  genie.resetState();
}

/*************************
 * Button actions
 ************************/
function buttonDown(button, fromKeyDown) {
  // If we're already holding this button down, nothing new to do.
  // console.log(button, fromKeyDown);
  showNotes();

  if (heldButtonToVisualData.has(button)) {
    return;
  }

  const el = document.getElementById(`btn${button}`);
  if (!el)
    return;
  el.setAttribute('active', true);

  const note = genie.nextFromKeyWhitelist(button, keyWhitelist, TEMPERATURE);
  const pitch = CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + note;

  // Hear it.
  player.playNoteDown(pitch, button);
  heldButtonToVisualData.set(button, {note:note});
}

function showNotes(){
  const val = Math.floor(Math.random() * (+7 - +1)) + +1;
  console.log(val);
  const val2 = Math.floor(Math.random() * (+8 - +0)) + +0;
  var randomselection = ["&#9835;", "&#9833;", "&#9834;", "&#9836;", "&#9835;&#9833;", "&#9833;&#9834;", "&#9834;&#9835", "&#9835;&#9834",];
  var node = document.getElementsByClassName('notes')[0];
  var divnode = document.createElement('div');
  divnode.innerHTML = randomselection[val2];
  divnode.setAttribute('class', 'note' + val);
  node.appendChild(divnode);
  setTimeout(function(){
    divnode.remove();
  }, 2000);
}

function buttonUp(button) {
  // console.log(button);
  const el = document.getElementById(`btn${button}`);
  if (!el)
    return;
  el.removeAttribute('active');

  const thing = heldButtonToVisualData.get(button);
  if (thing) {
    const pitch = CONSTANTS.LOWEST_PIANO_KEY_MIDI_NOTE + thing.note;
    player.playNoteUp(pitch, button);
  }
  heldButtonToVisualData.delete(button);
}

/*************************
 * Events
 ************************/
function onKeyDown(event) {
  // Keydown fires continuously and we don't want that.
  if (event.repeat) {
    return;
  }
  else if (event.keyCode === 48) { // 0
    console.log('🧞‍♀️ resetting!');
    genie.resetState();
  } else {
    const button = getButtonFromKeyCode(event.keyCode);
    if (button != null) {
      buttonDown(button, true);
    }
  }
}

function onKeyUp(event) {
    const button = getButtonFromKeyCode(event.keyCode);
    if (button != null) {
      buttonUp(button);
    }
}

function onWindowResize() {
  OCTAVES = window.innerWidth > 700 ? 7 : 3;
  const bonusNotes = OCTAVES > 6 ? 4 : 0;  // starts on an A, ends on a C.
  const totalNotes = CONSTANTS.NOTES_PER_OCTAVE * OCTAVES + bonusNotes;
  const totalWhiteNotes = CONSTANTS.WHITE_NOTES_PER_OCTAVE * OCTAVES + (bonusNotes - 1);
  keyWhitelist = Array(totalNotes).fill().map((x,i) => {
    if (OCTAVES > 6) return i;
    // Starting 3 semitones up on small screens (on a C), and a whole octave up.
    return i + 3 + CONSTANTS.NOTES_PER_OCTAVE;
  });
}

/*************************
 * Utils and helpers
 ************************/
const keyToButtonMap = [65,83,68,70,74,75,76,186];
function getButtonFromKeyCode(keyCode) {
  let button = keyCode - 49;
  if (button >= 0 && button < CONSTANTS.NUM_BUTTONS) {
    return button;
  } else if (keyCode === 59) {
    // In Firefox ; has a different keycode. No, I'm not kidding.
    return 7;
  } else {
    button = keyToButtonMap.indexOf(keyCode);
    if (button >= 0 && button < CONSTANTS.NUM_BUTTONS) {
      return button;
    }
  }
  return null;
}

function getTemperature() {
  const hash = parseFloat(parseHashParameters()['temperature']) || 0.25;
  const newTemp = Math.min(1, hash);
  console.log('🧞‍♀️ temperature = ', newTemp);
  return newTemp;
}

function parseHashParameters() {
  const hash = window.location.hash.substring(1);
  const params = {}
  hash.split('&').map(hk => {
    let temp = hk.split('=');
    params[temp[0]] = temp[1]
  });
  return params;
}
