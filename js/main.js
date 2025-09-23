document.addEventListener('DOMContentLoaded', function() {
    // Age calculation
    let birthday = new Date("July 08, 1984").getFullYear();
    let thisYear = new Date().getFullYear();
    $("#about-text").text(function (_, ctx) {
        return ctx.replace("{{age}}", thisYear-birthday);
    });
});
