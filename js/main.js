window.onload = function(){
  // https://safi.me.uk/typewriterjs/

	var i = 0;
	var txt = ['Coding', 'Java', 'Gym', 'Arduino', 'Tennis', 'Soccer', 'Beer'];
	var speed = 70;

	var app = document.getElementById('typewriter');

	var typewriter = new Typewriter(app, {
		loop: true,
		strings: txt,
		autoStart: true
	});

	let birthday = new Date("July 08, 1984").getFullYear();
	let thisYear = new Date().getFullYear();
	$("#about-text").text(function (_, ctx) {
		return ctx.replace("{{age}}", thisYear-birthday);
	});
};
