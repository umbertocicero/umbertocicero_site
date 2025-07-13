document.addEventListener('DOMContentLoaded', function() {
    
    // Typewriter initialization
    var txt = ['Coding', 'Java', 'Gym', 'Wine & Beer', 'Arduino', 'Tennis', 'Soccer'];
    var app = document.getElementById('typewriter');

    var typewriter = new Typewriter(app, {
        loop: true,
        strings: txt,
        autoStart: true
    });

    // Age calculation
    let birthday = new Date("July 08, 1984").getFullYear();
    let thisYear = new Date().getFullYear();
    $("#about-text").text(function (_, ctx) {
        return ctx.replace("{{age}}", thisYear-birthday);
    });
});
