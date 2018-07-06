window.onload = function(){
  // https://safi.me.uk/typewriterjs/

var i = 0;
var txt = ['Coding', 'Java', 'Arduino', 'Gym', 'Tennis'];
var speed = 50;

var app = document.getElementById('typewriter');

var typewriter = new Typewriter(app, {
    loop: true,
    strings: txt,
    autoStart: true
});

};
